from rag import embedder, chroma
import uuid

tenant_id = "taller_01"
collection_name = f"tecnico_{tenant_id}"

# Obtener o crear la colección
collection = chroma.get_or_create_collection(name=collection_name)

# Leer el archivo TXT
with open("/app/docs/prueba.txt", "r", encoding="utf-8") as f:
    texto = f.read()

# Dividir por secciones (doble salto de línea)
chunks = [chunk.strip() for chunk in texto.split("\n\n") if chunk.strip()]

print(f"📄 Archivo leído: {len(chunks)} secciones encontradas")

# Generar embeddings
print("🔄 Generando embeddings...")
vectores = embedder.encode(chunks).tolist()

# Preparar IDs y metadatos
ids = [str(uuid.uuid4()) for _ in chunks]
metadatos = [{"fuente": "prueba.txt", "seccion": i+1} for i in range(len(chunks))]

# Guardar en ChromaDB
collection.add(
    documents=chunks,
    embeddings=vectores,
    ids=ids,
    metadatas=metadatos
)

print(f"✅ Ingestados {len(chunks)} fragmentos en colección '{collection_name}'")
print("\n📑 Fragmentos guardados:")
for i, chunk in enumerate(chunks, 1):
    print(f"\n--- Sección {i} ---")
    print(chunk[:150] + "..." if len(chunk) > 150 else chunk)