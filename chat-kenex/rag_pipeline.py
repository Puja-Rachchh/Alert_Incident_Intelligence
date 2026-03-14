import os
import time
from typing import List

from dotenv import load_dotenv
from langchain_community.document_loaders import DirectoryLoader, TextLoader, PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import Document
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_pinecone import PineconeVectorStore
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate
from pinecone import Pinecone, ServerlessSpec

# ── Load environment ──────────────────────────────────────────────
load_dotenv()

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
HUGGINGFACE_API_TOKEN = os.getenv("HUGGINGFACE_API_TOKEN")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "alertchat")

os.environ["PINECONE_API_KEY"] = PINECONE_API_KEY or ""
os.environ["HUGGINGFACEHUB_API_TOKEN"] = HUGGINGFACE_API_TOKEN or ""

# ── SRE System Prompt ─────────────────────────────────────────────
SYSTEM_PROMPT = """You are an intelligent SRE AI Copilot for an Alert Incident Intelligence platform.
Your job is to help IT teams quickly understand, diagnose, and resolve system incidents.

You will receive:
- A triggered alert from monitoring tools (servers, apps, network, or security)
- Relevant context retrieved from past incidents, runbooks, and resolution docs

Your response MUST always follow this exact structure:

---

🔴 INCIDENT SUMMARY
Write 2-3 clear sentences explaining what is happening, which system is affected,
and how serious it appears to be. Use simple language for general IT staff.

---

🔍 ROOT CAUSE ANALYSIS
Provide the most likely root cause based on the alert and retrieved context.
Format:
  - Primary cause: [most probable reason]
  - Contributing factors: [any secondary issues]
  - Confidence level: [High / Medium / Low] — explain why

---

🛠️ RESOLUTION STEPS
Provide numbered, actionable steps to resolve the issue immediately.
1. First action (with exact command or UI step if possible)
2. Second action
3. Verification step — how to confirm the issue is resolved

---

⚠️ ESCALATION ADVICE
- Should this be escalated? [Yes / No / Monitor]
- If Yes → Escalate to: [team name or role]
- Urgency level: [P1 Critical / P2 High / P3 Medium / P4 Low]
- Reason: [one sentence justification]

---

📚 RELATED PAST INCIDENTS
List up to 3 similar past incidents from the retrieved context.
Format: "Incident ID | Service | Brief description | How it was resolved"

---

RULES:
- Never use technical jargon without a brief explanation
- If retrieved context is insufficient, clearly say: "Limited historical data — manual investigation recommended"
- Keep the entire response under 400 words
- Always prioritize speed of resolution over completeness

Retrieved Context:
{context}"""


# ── Document Loading ─────────────────────────────────────────────
def load_documents(data_dir: str) -> List[Document]:
    """Load both PDF and text files from a directory."""
    all_docs: List[Document] = []

    # Load text files
    try:
        txt_loader = DirectoryLoader(
            data_dir,
            glob="**/*.txt",
            loader_cls=TextLoader,
            loader_kwargs={"encoding": "utf-8"},
        )
        all_docs.extend(txt_loader.load())
    except Exception as e:
        print(f"[WARN] Text loading: {e}")

    # Load PDF files
    try:
        pdf_loader = DirectoryLoader(
            data_dir,
            glob="**/*.pdf",
            loader_cls=PyPDFLoader,
        )
        all_docs.extend(pdf_loader.load())
    except Exception as e:
        print(f"[WARN] PDF loading: {e}")

    print(f"[INFO] Loaded {len(all_docs)} document(s) from '{data_dir}'")
    return all_docs


def split_documents(docs: List[Document]) -> List[Document]:
    """Split documents into smaller chunks for embedding."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
        separators=["\n=====================", "\n\n", "\n", ". ", " ", ""],
    )
    chunks = splitter.split_documents(docs)
    print(f"[INFO] Split into {len(chunks)} chunks")
    return chunks


# ── Embeddings ───────────────────────────────────────────────────
def get_embeddings() -> HuggingFaceEmbeddings:
    """Return HuggingFace embeddings model (384‑dim)."""
    return HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2"
    )


# ── Pinecone Vector Store ───────────────────────────────────────
def setup_pinecone(index_name: str | None = None):
    """Create or connect to a Pinecone index."""
    index_name = index_name or PINECONE_INDEX_NAME
    pc = Pinecone(api_key=PINECONE_API_KEY)

    if not pc.has_index(index_name):
        pc.create_index(
            name=index_name,
            dimension=384,
            metric="cosine",
            spec=ServerlessSpec(cloud="aws", region="us-east-1"),
        )
        print(f"[INFO] Created Pinecone index: {index_name}")
        time.sleep(10)
    else:
        print(f"[INFO] Pinecone index '{index_name}' already exists")

    return pc.Index(index_name)


# ── Ingest Pipeline ─────────────────────────────────────────────
def ingest_documents(data_dir: str, index_name: str | None = None) -> str:
    """Full ingest pipeline: load → split → embed → store in Pinecone."""
    index_name = index_name or PINECONE_INDEX_NAME

    # Load & split
    docs = load_documents(data_dir)
    if not docs:
        return "No documents found to ingest."

    chunks = split_documents(docs)

    # Embeddings
    embedding = get_embeddings()

    # Ensure index exists
    setup_pinecone(index_name)

    # Upload to Pinecone
    PineconeVectorStore.from_documents(
        documents=chunks,
        embedding=embedding,
        index_name=index_name,
    )

    msg = f"✅ Ingested {len(docs)} document(s) → {len(chunks)} chunks into '{index_name}'"
    print(f"[INFO] {msg}")
    return msg


# ── Custom HuggingFace Chat LLM ──────────────────────────────────
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage
from langchain_core.outputs import ChatResult, ChatGeneration
from huggingface_hub import InferenceClient
from typing import Any, Optional


class HuggingFaceChatLLM(BaseChatModel):
    """Custom LangChain ChatModel using HuggingFace InferenceClient."""

    client: Any = None
    model_id: str = "Qwen/Qwen2.5-1.5B-Instruct"
    temperature: float = 0.5
    max_tokens: int = 1024

    class Config:
        arbitrary_types_allowed = True

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.client = InferenceClient(token=HUGGINGFACE_API_TOKEN)

    @property
    def _llm_type(self) -> str:
        return "huggingface-chat"

    def _generate(
        self,
        messages: list[BaseMessage],
        stop: Optional[list[str]] = None,
        **kwargs,
    ) -> ChatResult:
        # Convert LangChain messages to HuggingFace format
        hf_messages = []
        for msg in messages:
            if msg.type == "system":
                hf_messages.append({"role": "system", "content": msg.content})
            elif msg.type == "human":
                hf_messages.append({"role": "user", "content": msg.content})
            elif msg.type == "ai":
                hf_messages.append({"role": "assistant", "content": msg.content})
            else:
                hf_messages.append({"role": "user", "content": msg.content})

        response = self.client.chat_completion(
            model=self.model_id,
            messages=hf_messages,
            max_tokens=self.max_tokens,
            temperature=self.temperature,
        )

        content = response.choices[0].message.content
        return ChatResult(
            generations=[ChatGeneration(message=AIMessage(content=content))]
        )


# ── RAG Chain ────────────────────────────────────────────────────
def get_rag_chain(index_name: str | None = None):
    """Build and return a ready‑to‑use RAG chain with HuggingFace LLM."""
    index_name = index_name or PINECONE_INDEX_NAME

    # Retriever
    embedding = get_embeddings()
    vectorstore = PineconeVectorStore.from_existing_index(
        index_name=index_name,
        embedding=embedding,
    )
    retriever = vectorstore.as_retriever(
        search_type="similarity", search_kwargs={"k": 3}
    )

    # LLM — try models in order of preference
    models_to_try = [
        "Qwen/Qwen2.5-1.5B-Instruct",
        "HuggingFaceH4/zephyr-7b-beta",
    ]

    llm = None
    for model_id in models_to_try:
        try:
            candidate = HuggingFaceChatLLM(model_id=model_id)
            # Smoke test
            candidate.invoke("Hello")
            llm = candidate
            print(f"[INFO] Using HuggingFace model: {model_id}")
            break
        except Exception as e:
            print(f"[WARN] Model {model_id} failed: {str(e)[:120]}")
            continue

    if llm is None:
        raise RuntimeError("No HuggingFace model available. Check API token.")

    # Prompt
    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        ("human", "{input}"),
    ])

    # Chain
    question_answer_chain = create_stuff_documents_chain(llm, prompt)
    rag_chain = create_retrieval_chain(retriever, question_answer_chain)

    print("[INFO] RAG chain initialized with HuggingFace LLM")
    return rag_chain


# ── Quick test ───────────────────────────────────────────────────
if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "ingest":
        data_dir = sys.argv[2] if len(sys.argv) > 2 else "./data"
        ingest_documents(data_dir)
    else:
        chain = get_rag_chain()
        query = "ALERT: Server web-prod-01 CPU usage at 98% for the last 15 minutes"
        print(f"\n📝 Query: {query}\n")
        result = chain.invoke({"input": query})
        print(result["answer"])
