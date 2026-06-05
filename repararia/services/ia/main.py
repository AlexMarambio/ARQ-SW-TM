from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from rag import buscar_contexto, consultar_llm
import os

app = FastAPI(title="RepararIA - Servicio de IA")

# Respuestas por defecto según el motivo — el LLM nunca se llama en estos casos
RESPUESTAS_DEFAULT = {
    "sin_documentos": (
        "Este taller aún no tiene documentación técnica cargada. "
        "Contacta al administrador para cargar los manuales."
    ),
    "baja_relevancia": (
        "No encontré documentación suficientemente relevante para responder esa consulta. "
        "Intenta reformular la pregunta o consulta el manual directamente."
    ),
}

class ConsultaTecnica(BaseModel):
    pregunta: str
    tenant_id: str
    id_mecanico: str | None = None

class ConsultaNegocio(BaseModel):
    pregunta: str
    tenant_id: str

@app.post("/ia/tecnico/consulta")
def consulta_tecnica(body: ConsultaTecnica):
    try:
        resultado = buscar_contexto(body.pregunta, body.tenant_id)

        # Si no hay contexto útil, responde sin tocar el LLM
        if not resultado["contexto"]:
            razon = resultado.get("razon_rechazo", "baja_relevancia")
            return {
                "respuesta": RESPUESTAS_DEFAULT.get(razon, RESPUESTAS_DEFAULT["baja_relevancia"]),
                "fuente": "default",
                "fragmentos_usados": 0,
                "razon": razon
            }

        # Solo aquí se consumen tokens
        respuesta = consultar_llm(body.pregunta, resultado["contexto"])
        return {
            "respuesta": respuesta,
            "fuente": "RAG",
            "fragmentos_usados": resultado["fragmentos_utiles"]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/ia/tecnico/health")
def health():
    return {"status": "ok", "chroma_host": os.getenv("CHROMA_HOST", "localhost")}