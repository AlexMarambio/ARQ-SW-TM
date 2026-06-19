from fastapi import APIRouter, Depends, HTTPException
from call_service import call_service
from auth_dependency import get_current_user

router = APIRouter(prefix="/auditoria", tags=["Auditoría"])

@router.get("/historial")
async def listar_eventos(limit: int = 50, offset: int = 0, entidad: str = None, id_usuario: int = None, current_user: dict = Depends(get_current_user)):
    if current_user["rol"] not in ("administrador", "sysadmin"):
        raise HTTPException(403, "No autorizado")
    params = {"limit": limit, "offset": offset}
    if entidad:
        params["entidad"] = entidad
    if id_usuario:
        params["id_usuario"] = id_usuario
    return call_service("audit", "LISTAR_EVENTOS", params, auth=current_user)

@router.get("/historial_by/{id_auditoria}")
async def get_evento(id_auditoria: int, current_user: dict = Depends(get_current_user)):
    return call_service("audit", "GET_EVENTO", {"id_auditoria": id_auditoria}, auth=current_user)