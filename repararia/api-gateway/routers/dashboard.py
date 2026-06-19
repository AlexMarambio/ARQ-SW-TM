from fastapi import APIRouter, Depends, HTTPException
from call_service import call_service
from auth_dependency import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard y Reportes"])

@router.get("/kpi/admin")
async def kpi_admin(current_user: dict = Depends(get_current_user)):
    if current_user["rol"] not in ("administrador", "sysadmin"):
        raise HTTPException(403, "No autorizado")
    return call_service("dashb", "KPI_ADMIN", {}, auth=current_user)

@router.get("/kpi/mecanico/{id_mecanico}")
async def kpi_mecanico(id_mecanico: int, current_user: dict = Depends(get_current_user)):
    # Permitir solo al propio mecánico o a admin
    if current_user["rol"] not in ("administrador", "sysadmin") and current_user["user_id"] != id_mecanico:
        raise HTTPException(403, "No autorizado")
    return call_service("dashb", "KPI_MECANICO", {"id_mecanico": id_mecanico}, auth=current_user)

@router.get("/reporte/ordenes")
async def reporte_ordenes(limit: int = 10, offset: int = 0, estado: str = None, fecha_desde: str = None, fecha_hasta: str = None, current_user: dict = Depends(get_current_user)):
    if current_user["rol"] not in ("administrador", "sysadmin"):
        raise HTTPException(403, "No autorizado")
    params = {"limit": limit, "offset": offset}
    if estado:
        params["estado"] = estado
    if fecha_desde:
        params["fecha_desde"] = fecha_desde
    if fecha_hasta:
        params["fecha_hasta"] = fecha_hasta
    return call_service("dashb", "REPORTE_ORDENES", params, auth=current_user)

@router.get("/reporte/clientes")
async def reporte_clientes(limit: int = 10, offset: int = 0, current_user: dict = Depends(get_current_user)):
    if current_user["rol"] not in ("administrador", "sysadmin"):
        raise HTTPException(403, "No autorizado")
    return call_service("dashb", "REPORTE_CLIENTES", {"limit": limit, "offset": offset}, auth=current_user)

@router.get("/reporte/repuestos")
async def reporte_repuestos(limit: int = 10, current_user: dict = Depends(get_current_user)):
    if current_user["rol"] not in ("administrador", "sysadmin"):
        raise HTTPException(403, "No autorizado")
    return call_service("dashb", "REPORTE_REPUESTOS", {"limit": limit}, auth=current_user)