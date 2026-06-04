from fastapi import APIRouter
from call_service import call_service

router = APIRouter(prefix="/auditoria", tags=["Auditoría"])

@router.get("/historial")
async def listar_eventos(limit: int = 50, offset: int = 0, entidad: str = None, id_usuario: int = None):
    params = {"limit": limit, "offset": offset}
    if entidad:
        params["entidad"] = entidad
    if id_usuario:
        params["id_usuario"] = id_usuario
    return call_service("audit", "LISTAR_EVENTOS", params)

@router.get("/historial_by/{id_auditoria}")
async def get_evento(id_auditoria: int):
    return call_service("audit", "GET_EVENTO", {"id_auditoria": id_auditoria})