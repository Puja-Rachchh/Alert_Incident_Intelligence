"""Script to generate a clean, fixed version of trials.ipynb"""
import json

PROJECT_DIR = r"C:\Users\272749\OneDrive\Attachments\Desktop\Kenexai"
ENV_PATH = rf"{PROJECT_DIR}\.env"
DATA_DIR = rf"{PROJECT_DIR}\data"
INDEX_NAME = "alertchat"

cells = []

def code_cell(source_lines):
    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "id": None,
        "metadata": {},
        "outputs": [],
        "source": source_lines
    })

def md_cell(source_lines):
    cells.append({
        "cell_type": "markdown",
        "id": None,
        "metadata": {},
        "source": source_lines
    })

# --- Cell 1: Imports ---
md_cell(["# PDF Document Agent with RAG Pipeline\n",
         "### Using LangChain, Pinecone, and Gemini"])

# --- Cell 2: Install dependencies (optional) ---
code_cell([
    "# Uncomment below if packages are not installed\n",
    "# !pip install langchain langchain-core langchain-community langchain-pinecone \\\n",
    "#     langchain-google-genai pinecone python-dotenv pypdf langchain-huggingface"
])

# --- Cell 3: Core imports ---
code_cell([
    "import os\n",
    "import time\n",
    "from typing import List\n",
    "\n",
    "from langchain_community.document_loaders import PyPDFLoader, DirectoryLoader\n",
    "from langchain.text_splitter import RecursiveCharacterTextSplitter\n",
    "from langchain.schema import Document"
])

# --- Cell 4: Load environment variables ---
code_cell([
    "from dotenv import load_dotenv\n",
    "\n",
    f'load_dotenv(r"{ENV_PATH}")\n',
    "\n",
    'PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")\n',
    'GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")\n',
    "\n",
    'os.environ["PINECONE_API_KEY"] = PINECONE_API_KEY\n',
    'os.environ["GOOGLE_API_KEY"] = GEMINI_API_KEY\n',
    "\n",
    'print("Environment loaded successfully!" if PINECONE_API_KEY and GEMINI_API_KEY else "ERROR: Missing API keys!")'
])

# --- Cell 5: Load PDF files ---
md_cell(["## Step 1: Load and Process PDF Documents"])

code_cell([
    "def load_pdf_files(data_dir):\n",
    '    """Load all PDF files from a directory."""\n',
    "    loader = DirectoryLoader(\n",
    "        data_dir,\n",
    '        glob="*.pdf",\n',
    "        loader_cls=PyPDFLoader\n",
    "    )\n",
    "    documents = loader.load()\n",
    "    return documents\n",
    "\n",
    f'data_path = r"{DATA_DIR}"\n',
    "extracted_data = load_pdf_files(data_path)\n",
    'print(f"Loaded {len(extracted_data)} page(s) from PDFs")'
])

# --- Cell 6: Filter to minimal docs ---
code_cell([
    "def filter_to_minimal_docs(docs: List[Document]) -> List[Document]:\n",
    '    """Return documents with only source in metadata."""\n',
    "    minimal_docs: List[Document] = []\n",
    "    for doc in docs:\n",
    '        src = doc.metadata.get("source")\n',
    "        minimal_docs.append(\n",
    "            Document(\n",
    "                page_content=doc.page_content,\n",
    '                metadata={"source": src}\n',
    "            )\n",
    "        )\n",
    "    return minimal_docs\n",
    "\n",
    "minimal_docs = filter_to_minimal_docs(extracted_data)\n",
    "minimal_docs"
])

# --- Cell 7: Text splitting ---
md_cell(["## Step 2: Split Documents into Chunks"])

code_cell([
    "def text_split(docs):\n",
    '    """Split documents into smaller chunks."""\n',
    "    text_splitter = RecursiveCharacterTextSplitter(\n",
    "        chunk_size=500,\n",
    "        chunk_overlap=20,\n",
    "    )\n",
    "    return text_splitter.split_documents(docs)\n",
    "\n",
    "texts_chunk = text_split(minimal_docs)\n",
    'print(f"Number of chunks: {len(texts_chunk)}")'
])

# --- Cell 8: Embeddings ---
md_cell(["## Step 3: Create Embeddings"])

code_cell([
    "from langchain_huggingface import HuggingFaceEmbeddings\n",
    "\n",
    "def download_embeddings():\n",
    '    """Download and return the HuggingFace embeddings model."""\n',
    '    model_name = "sentence-transformers/all-MiniLM-L6-v2"\n',
    "    return HuggingFaceEmbeddings(model_name=model_name)\n",
    "\n",
    "embedding = download_embeddings()\n",
    "\n",
    "# Verify embedding dimension\n",
    'vector = embedding.embed_query("Hello world")\n',
    'print(f"Embedding dimension: {len(vector)}")'
])

# --- Cell 9: Pinecone setup ---
md_cell(["## Step 4: Setup Pinecone Vector Store"])

code_cell([
    "from pinecone import Pinecone, ServerlessSpec\n",
    "\n",
    "pc = Pinecone(api_key=PINECONE_API_KEY)\n",
    f'index_name = "{INDEX_NAME}"\n',
    "\n",
    "# Create index if it doesn't exist (dimension=384 for all-MiniLM-L6-v2)\n",
    "if not pc.has_index(index_name):\n",
    "    pc.create_index(\n",
    "        name=index_name,\n",
    "        dimension=384,\n",
    '        metric="cosine",\n',
    '        spec=ServerlessSpec(cloud="aws", region="us-east-1")\n',
    "    )\n",
    '    print(f"Created index: {index_name}")\n',
    "    time.sleep(10)  # Wait for index to be ready\n",
    "else:\n",
    '    print(f"Index {index_name} already exists")\n',
    "\n",
    "index = pc.Index(index_name)\n",
    "print(index.describe_index_stats())"
])

# --- Cell 10: Upsert documents ---
code_cell([
    "from langchain_pinecone import PineconeVectorStore\n",
    "\n",
    "docsearch = PineconeVectorStore.from_documents(\n",
    "    documents=texts_chunk,\n",
    "    embedding=embedding,\n",
    "    index_name=index_name\n",
    ")\n",
    'print("Documents uploaded to Pinecone successfully!")'
])

# --- Cell 11: Load existing index (alternative) ---
md_cell(["## Step 5: Load Existing Index (use this after first run)"])

code_cell([
    "# Uncomment below to load from existing index instead of re-uploading\n",
    "# from langchain_pinecone import PineconeVectorStore\n",
    "# docsearch = PineconeVectorStore.from_existing_index(\n",
    "#     index_name=index_name,\n",
    "#     embedding=embedding\n",
    "# )\n",
    '# print("Loaded existing index")'
])

# --- Cell 12: Add more data (optional) ---
md_cell(["## Optional: Add More Documents to Index"])

code_cell([
    "# Example: Add a custom document\n",
    "# new_doc = Document(\n",
    '#     page_content="Your custom content here",\n',
    '#     metadata={"source": "Custom"}\n',
    "# )\n",
    "# docsearch.add_documents(documents=[new_doc])"
])

# --- Cell 13: Setup retriever ---
md_cell(["## Step 6: Setup Retriever and RAG Chain"])

code_cell([
    'retriever = docsearch.as_retriever(search_type="similarity", search_kwargs={"k": 3})\n',
    "\n",
    "# Test retrieval\n",
    'retrieved_docs = retriever.invoke("projects")\n',
    'print(f"Retrieved {len(retrieved_docs)} documents")\n',
    "retrieved_docs"
])

# --- Cell 14: Setup LLM (Gemini) ---
code_cell([
    "from langchain_google_genai import ChatGoogleGenerativeAI\n",
    "\n",
    "llm = ChatGoogleGenerativeAI(\n",
    "    api_key=GEMINI_API_KEY,\n",
    '    model="gemini-2.0-flash"\n',
    ")\n",
    'print("Gemini LLM initialized!")'
])

# --- Cell 15: Create RAG chain ---
code_cell([
    "from langchain.chains import create_retrieval_chain\n",
    "from langchain.chains.combine_documents import create_stuff_documents_chain\n",
    "from langchain_core.prompts import ChatPromptTemplate\n",
    "\n",
    'system_prompt = """You are an intelligent PDF Document Agent.\n',
    "Your role is to analyze PDF documents and answer questions accurately.\n",
    "If you don't know the answer, say that you don't know.\n",
    "Use three sentences maximum and keep the answer concise.\n",
    "\n",
    'Document Content: {context}"""\n',
    "\n",
    "prompt = ChatPromptTemplate.from_messages([\n",
    '    ("system", system_prompt),\n',
    '    ("human", "{input}"),\n',
    "])\n",
    "\n",
    "question_answer_chain = create_stuff_documents_chain(llm, prompt)\n",
    "rag_chain = create_retrieval_chain(retriever, question_answer_chain)\n",
    'print("RAG chain ready!")'
])

# --- Cell 16: Query examples ---
md_cell(["## Step 7: Ask Questions"])

code_cell([
    'response = rag_chain.invoke({"input": "What are the projects?"})\n',
    'print(response["answer"])'
])

code_cell([
    'response = rag_chain.invoke({"input": "What are the technical skills?"})\n',
    'print(response["answer"])'
])

code_cell([
    'response = rag_chain.invoke({"input": "What is the education background?"})\n',
    'print(response["answer"])'
])

# Build the notebook
import uuid
for cell in cells:
    if cell.get("id") is None:
        cell["id"] = str(uuid.uuid4())[:8]

notebook = {
    "cells": cells,
    "metadata": {
        "kernelspec": {
            "display_name": "Python 3",
            "language": "python",
            "name": "python3"
        },
        "language_info": {
            "codemirror_mode": {"name": "ipython", "version": 3},
            "file_extension": ".py",
            "mimetype": "text/x-python",
            "name": "python",
            "nbformat_minor": 5,
            "pygments_lexer": "ipython3",
            "version": "3.10.0"
        }
    },
    "nbformat": 4,
    "nbformat_minor": 5
}

# Backup old notebook
import shutil
shutil.copy(
    rf"{PROJECT_DIR}\trials.ipynb",
    rf"{PROJECT_DIR}\trials_backup.ipynb"
)

# Write fixed notebook
with open(rf"{PROJECT_DIR}\trials.ipynb", "w", encoding="utf-8") as f:
    json.dump(notebook, f, indent=1, ensure_ascii=False)

print("✅ Fixed notebook saved to trials.ipynb")
print("📋 Backup saved to trials_backup.ipynb")
