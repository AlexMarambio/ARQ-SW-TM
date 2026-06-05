import chromadb
from sentence_transformers import SentenceTransformer
import os

# Modelo de embeddings — corre local, no necesita API key
embedder = SentenceTransformer("all-MiniLM-L6-v2")

# Cliente ChromaDB apuntando al contenedor
chroma = chromadb.HttpClient(
    host=os.getenv("CHROMA_HOST", "localhost"),
    port=int(os.getenv("CHROMA_PORT", 8000))
)

def get_collection(tenant_id: str):
    """Cada taller tiene su propio namespace (collection)."""
    return chroma.get_or_create_collection(name=f"tecnico_{tenant_id}")

def buscar_contexto(pregunta: str, tenant_id: str, n_resultados: int = 4) -> str:
    """Busca los fragmentos más relevantes para la pregunta."""
    collection = get_collection(tenant_id)
    vector = embedder.encode(pregunta).tolist()
    
    resultados = collection.query(
        query_embeddings=[vector],
        n_results=n_resultados
    )
    
    # Junta los fragmentos en un solo bloque de contexto
    fragmentos = resultados["documents"][0]
    return "\n\n---\n\n".join(fragmentos)

def consultar_llm(pregunta: str, contexto: str) -> str:
    """Arma el prompt y llama al LLM."""
    from openai import OpenAI  # o usa Groq con el mismo SDK

    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    # Para Groq: OpenAI(api_key=os.getenv("GROQ_API_KEY"), base_url="https://api.groq.com/openai/v1")

    prompt = f"""Eres un asistente técnico especializado en vehículos BMW para un taller mecánico.
Usa SOLO la siguiente documentación técnica para responder. Si no encuentras la respuesta, dilo claramente.

DOCUMENTACIÓN TÉCNICA:
{contexto}

PREGUNTA DEL MECÁNICO:
{pregunta}

RESPUESTA:"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",  # o "llama3-8b-8192" para Groq
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2  # bajo = más preciso, menos creativo
    )
    return response.choices[0].message.content