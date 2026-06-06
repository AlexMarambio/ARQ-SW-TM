from fastapi import APIRouter, Request, Depends
from call_service import call_service
from auth_dependency import get_current_user

router = APIRouter(prefix="/ia", tags=["Inteligencia Artificial"])

@router.post("/tecnico/consulta")
async def consulta_tecnica(request: Request, current_user: dict = Depends(get_current_user)):
    """Consulta al asistente técnico (RAG) sobre documentación del taller."""
    body = await request.json()
    # El servicio IA espera: {"pregunta": "cómo cambiar bujías?", "tenant_id": "taller_01"}
    return call_service("iabot", "CONSULTA_TECNICA", body, auth=current_user)

@router.post("/negocio/consulta")
async def consulta_negocio(request: Request, current_user: dict = Depends(get_current_user)):
    """Consulta al asistente de negocio (métricas, KPIs, etc.)"""
    body = await request.json()
    return call_service("iabot", "CONSULTA_NEGOCIO", body, auth=current_user)