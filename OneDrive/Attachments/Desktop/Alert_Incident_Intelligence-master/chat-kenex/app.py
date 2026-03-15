import os
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# ── Global RAG chain (lazy‑loaded) ───────────────────────────────
_rag_chain = None


def _get_chain():
    """Lazily initialise the RAG chain so startup is fast."""
    global _rag_chain
    if _rag_chain is None:
        from rag_pipeline import get_rag_chain
        _rag_chain = get_rag_chain()
    return _rag_chain


# ── Routes ───────────────────────────────────────────────────────
@app.route("/")
def index():
    """Serve the chat UI."""
    return render_template("index.html")


@app.route("/api/chat", methods=["POST"])
def chat():
    """Handle an alert / query from the frontend."""
    data = request.get_json(force=True)
    query = data.get("query", "").strip()

    if not query:
        return jsonify({"error": "Query is required"}), 400

    try:
        chain = _get_chain()
        result = chain.invoke({"input": query})
        answer = result.get("answer", "No response generated.")

        # Extract source documents + metadata for transparency
        sources = []
        doc_types = set()
        services = set()
        context_docs = result.get("context", [])

        for doc in context_docs:
            src = doc.metadata.get("source", "Unknown")
            sources.append(os.path.basename(src))
            # Collect enriched metadata
            if doc.metadata.get("doc_type"):
                doc_types.add(doc.metadata["doc_type"])
            if doc.metadata.get("service") and doc.metadata["service"] != "Unknown":
                services.add(doc.metadata["service"])

        sources = list(set(sources))

        # Determine confidence based on context quality
        num_context = len(context_docs)
        if num_context >= 4:
            confidence = "high"
        elif num_context >= 2:
            confidence = "medium"
        else:
            confidence = "low"

        return jsonify({
            "answer": answer,
            "sources": sources,
            "confidence": confidence,
            "context_count": num_context,
            "doc_types": list(doc_types),
            "services": list(services),
        })
    except Exception as e:
        print(f"[ERROR] Chat: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/ingest", methods=["POST"])
def ingest():
    """Trigger document ingestion from the data/ folder."""
    try:
        from rag_pipeline import ingest_documents
        data_dir = os.path.join(os.path.dirname(__file__), "data")
        msg = ingest_documents(data_dir)
        # Reset chain so it picks up new vectors
        global _rag_chain
        _rag_chain = None
        return jsonify({"message": msg})
    except Exception as e:
        print(f"[ERROR] Ingest: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/health", methods=["GET"])
def health():
    """Simple health check."""
    return jsonify({"status": "ok"})


# ── Run ──────────────────────────────────────────────────────────
if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000, use_reloader=False)
