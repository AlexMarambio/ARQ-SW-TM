from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from rag import buscar_contexto, consultar_llm

app = FastAPI(title="RepararIA - Servicio de IA")

class ConsultaTecnica(BaseModel):
    pregunta: str
    tenant_id: str
    id_mecanico: str | None = None

class ConsultaNegocio(BaseModel):
    pregunta: str
    tenant_id: str

@app.post("/ia/tecnico/consulta")
def consulta_tecnica(body: ConsultaTecnica):
    """Chatbot técnico para mecánicos — usa RAG."""
    try:
        contexto = buscar_contexto(body.pregunta, body.tenant_id)
        if not contexto:
            return {"respuesta": "No encontré documentación relevante para esa consulta."}
        respuesta = consultar_llm(body.pregunta, contexto)
        return {"respuesta": respuesta, "fuente": "RAG"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/ia/tecnico/health")
def health():
    return {"status": "ok"}