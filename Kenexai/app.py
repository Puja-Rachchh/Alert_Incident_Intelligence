from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from src.helper import download_hugging_face_embeddings
from langchain_pinecone import PineconeVectorStore
from dotenv import load_dotenv
from pathlib import Path
from huggingface_hub import InferenceClient
import os

# ----------------- Flask App -----------------
app = Flask(__name__)
CORS(app)  # cross-origin requests (frontend like React can call backend)

# ----------------- Load Environment Variables -----------------
dotenv_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=dotenv_path)

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
HUGGINGFACE_API_TOKEN = os.getenv("HUGGINGFACE_API_TOKEN")

if not PINECONE_API_KEY or not HUGGINGFACE_API_TOKEN:
    raise ValueError("❌ Missing API keys! Please set PINECONE_API_KEY and HUGGINGFACE_API_TOKEN in .env")

# ----------------- HuggingFace Setup -----------------
HF_MODEL = "mistralai/Mistral-7B-Instruct-v0.3"
hf_client = InferenceClient(token=HUGGINGFACE_API_TOKEN)

# ----------------- Embeddings + Pinecone -----------------
embeddings = download_hugging_face_embeddings()
index_name = "alertchat"

docsearch = PineconeVectorStore.from_existing_index(
    index_name=index_name,
    embedding=embeddings
)
retriever = docsearch.as_retriever(search_type="similarity", search_kwargs={"k": 3})

# ----------------- System Prompt -----------------
system_prompt = """You are KenexAI, a highly intelligent document assistant. You answer questions by carefully reading and understanding the CONTEXT provided below.

## HOW TO ANSWER:
1. **Read the entire context thoroughly** before answering. The context contains real text extracted from uploaded PDF documents.
2. **Synthesize the information** — don't just copy-paste raw text. Rephrase it into a clear, well-structured, human-friendly answer.
3. **Be comprehensive but concise** — cover all relevant points from the context in 2-5 sentences. Use bullet points if listing multiple items.
4. **Connect the dots** — if the answer spans multiple context chunks, combine the information into one coherent response.
5. **Use natural language** — write as if you're explaining to a friend. Avoid robotic or overly formal tone.

## RULES:
- ONLY use information from the provided context. Never make up facts.
- If the context contains relevant information, ALWAYS provide an answer — even if partial.
- If the context has NO relevant information at all, say: "I couldn't find information about that in the uploaded documents."
- Never say "based on the context" or "according to the documents" — just answer naturally.
- If asked about skills, projects, experience, education, etc., extract ALL relevant details from the context.

## FORMATTING:
- Use **bold** for important terms or names
- Use bullet points (•) for lists
- Keep paragraphs short and readable"""

# ----------------- RAG Function -----------------
def run_rag(query: str):
    """Retrieve relevant documents and generate response using HuggingFace with intelligent fallback."""
    try:
        docs = retriever.invoke(query)
        
        # Build numbered context from retrieved chunks for clarity
        context_parts = []
        for i, doc in enumerate(docs, 1):
            context_parts.append(f"[Document {i}]:\n{doc.page_content}")
        context = "\n\n".join(context_parts)

        # Build messages for chat completion
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Here is the relevant context retrieved from the documents:\n\n{context}\n\n---\nNow answer this question clearly and helpfully: {query}"}
        ]

        response = hf_client.chat_completion(
            model=HF_MODEL,
            messages=messages,
            max_tokens=1024,
            temperature=0.5,
            top_p=0.9,
        )

        answer = response.choices[0].message.content if response.choices else None
        if answer and answer.strip():
            return answer.strip()
        return "⚠️ No response generated. Please try rephrasing your question."
    
    except Exception as e:
        # Fallback: Extract intelligent answer from retrieved documents
        error_msg = str(e)
        if "429" in error_msg or "rate" in error_msg.lower():
            print(f"⚠️ HuggingFace rate limit. Using fallback extraction mode.")
        else:
            print(f"⚠️ HuggingFace error: {error_msg}")
        
        # Retrieve documents and extract direct answers
        try:
            docs = retriever.invoke(query)
        except Exception:
            docs = []

        if docs:
            # Combine all relevant content
            all_content = " ".join([doc.page_content for doc in docs])
            
            # Extract a concise answer by taking the first relevant sentence/paragraph
            sentences = all_content.split(".")
            answer = ""
            for sentence in sentences:
                if sentence.strip():
                    answer += sentence.strip() + ". "
                    if len(answer) > 300:  # Keep it concise
                        break
            
            return answer.strip() if answer.strip() else "Information found in documents but unable to extract direct answer."
        else:
            return "No relevant information found about that topic."


# ----------------- Routes -----------------
@app.route("/")
def home():
    return render_template("index.html")


@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    msg = data.get("text")

    if not msg:
        return jsonify({"error": "No text provided"}), 400

    print(f"👤 User: {msg}")
    response_text = run_rag(msg)
    print(f"🤖 Agent: {response_text}")

    return jsonify({"replies": [response_text]})


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy", "model": HF_MODEL, "index": index_name})


# ----------------- Main -----------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
