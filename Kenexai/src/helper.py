from langchain_huggingface import HuggingFaceEmbeddings


def download_hugging_face_embeddings():
    """Download and return the HuggingFace embeddings model."""
    model_name = "sentence-transformers/all-MiniLM-L6-v2"
    embeddings = HuggingFaceEmbeddings(model_name=model_name)
    return embeddings
