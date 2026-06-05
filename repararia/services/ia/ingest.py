import chromadb
from sentence_transformers import SentenceTransformer
import PyPDF2
import os, uuid

embedder = SentenceTransformer("all-MiniLM-L6-v2")
chroma = chromadb.HttpClient(host="localhost", port=8000)

def chunk_texto(texto: str, tamano: int = 500, overlap: int = 50) -> list[str]:
    """Divide el texto en fragmentos con superposición."""
    palabras = texto.split()
    chunks = []
    i = 0
    while i < len(palabras):
        chunk = " ".join(palabras[i:i + tamano])
        chunks.append(chunk)
        i += tamano - overlap
    return chunks

def ingestar_pdf(ruta_pdf: str, tenant_id: str):
    """Carga un PDF, lo fragmenta y lo guarda en ChromaDB."""
    # Extraer texto
    with open(ruta_pdf, "rb") as f:
        reader = PyPDF2.PdfReader(f)
        texto = " ".join(page.extract_text() for page in reader.pages if page.extract_text())
    
    # Fragmentar
    chunks = chunk_texto(texto)
    print(f"  {len(chunks)} fragmentos generados")
    
    # Generar embeddings y guardar
    collection = chroma.get_or_create_collection(name=f"tecnico_{tenant_id}")
    vectores = embedder.encode(chunks).tolist()
    ids = [str(uuid.uuid4()) for _ in chunks]
    
    collection.add(
        documents=chunks,
        embeddings=vectores,
        ids=ids,
        metadatas=[{"fuente": os.path.basename(ruta_pdf)}] * len(chunks)
    )
    print(f"  Guardado en collection 'tecnico_{tenant_id}'")

# Uso directo:
# python ingest.py
if __name__ == "__main__":
    ingestar_pdf("docs/manual_bmw_serie3.pdf", tenant_id="taller_01")