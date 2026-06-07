import chromadb
from sentence_transformers import SentenceTransformer
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
import os
from dotenv import load_dotenv

load_dotenv()

# Umbral mínimo de similitud — fragmentos bajo este score se ignoran
# ChromaDB devuelve distancias: más cercano a 0 = más relevante
# Un valor sobre 1.2 generalmente indica que el fragmento no es relevante
DISTANCIA_MAXIMA = 1.2

# Mínimo de fragmentos útiles para llamar al LLM
FRAGMENTOS_MINIMOS = 1

# Límite de caracteres del contexto enviado al LLM
# Evita prompts gigantes si los fragmentos son muy largos
MAX_CHARS_CONTEXTO = 3000

print("Cargando modelo de embeddings...")
embedder = SentenceTransformer("all-MiniLM-L6-v2")

print("Conectando a ChromaDB...")
chroma = chromadb.HttpClient(
    host=os.getenv("CHROMA_HOST", "localhost"),
    port=int(os.getenv("CHROMA_PORT", 8000))
)

def get_llm():
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("No se encontró GOOGLE_API_KEY")
    return ChatGoogleGenerativeAI(
        model="gemini-2.0-flash-lite",
        google_api_key=api_key,
        temperature=0.2,
        max_tokens=512,  # Reducido — respuestas técnicas no necesitan ser largas
    )

def get_collection(tenant_id: str):
    return chroma.get_or_create_collection(name=f"tecnico_{tenant_id}")

def buscar_contexto(pregunta: str, tenant_id: str, n_resultados: int = 4) -> dict:
    """
    Busca fragmentos relevantes y filtra por calidad.
    Retorna un dict con el contexto y metadata útil para decidir
    si vale la pena llamar al LLM.
    """
    collection = get_collection(tenant_id)

    # Verificar que la collection tiene documentos
    count = collection.count()
    if count == 0:
        return {
            "contexto": "",
            "fragmentos_utiles": 0,
            "razon_rechazo": "sin_documentos"
        }

    vector = embedder.encode(pregunta).tolist()

    resultados = collection.query(
        query_embeddings=[vector],
        n_results=min(n_resultados, count),  # no pedir más de los que hay
        include=["documents", "distances"]
    )

    documentos = resultados["documents"][0]
    distancias = resultados["distances"][0]

    # Filtrar fragmentos que no superan el umbral de relevancia
    fragmentos_utiles = [
        doc for doc, dist in zip(documentos, distancias)
        if dist <= DISTANCIA_MAXIMA
    ]

    if len(fragmentos_utiles) < FRAGMENTOS_MINIMOS:
        return {
            "contexto": "",
            "fragmentos_utiles": len(fragmentos_utiles),
            "razon_rechazo": "baja_relevancia",
            "mejor_distancia": round(distancias[0], 4) if distancias else None
        }

    # Truncar contexto para no exceder el límite de caracteres
    contexto_completo = "\n\n---\n\n".join(fragmentos_utiles)
    contexto_truncado = contexto_completo[:MAX_CHARS_CONTEXTO]
    if len(contexto_completo) > MAX_CHARS_CONTEXTO:
        contexto_truncado += "\n[contexto truncado]"

    return {
        "contexto": contexto_truncado,
        "fragmentos_utiles": len(fragmentos_utiles),
        "razon_rechazo": None
    }

def consultar_llm(pregunta: str, contexto: str) -> str:
    """Llama al LLM solo cuando hay contexto válido."""
    
    # Prompt compacto — cada palabra que eliminas son tokens que ahorras
    prompt = f"""Eres asistente técnico de un taller BMW. Usa SOLO la documentación para responder. Si no está en la documentación, dilo.

DOCUMENTACIÓN:
{contexto}

PREGUNTA: {pregunta}

RESPUESTA:"""

    llm = get_llm()
    response = llm.invoke([HumanMessage(content=prompt)])
    return response.content