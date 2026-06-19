from fastapi import APIRouter, Request, Depends
from call_service import call_service
from auth_dependency import get_current_user

router = APIRouter(prefix="/ordenes", tags=["Ordenes de Trabajo"])

@router.get("/orden_list")
async def list_ordenes(limit: int = 100, offset: int = 0, estado: str = None, current_user: dict = Depends(get_current_user)):
    params = {"limit": limit, "offset": offset}
    if estado:
        params["estado"] = estado
    return call_service("orden", "LIST_ORDENES", params, auth=current_user)

@router.post("/create_orden")
async def create_orden(request: Request, current_user: dict = Depends(get_current_user)):
    body = await request.json()
    return call_service("orden", "CREATE_ORDEN", body, auth=current_user)

@router.get("/get_by/{id_orden}")
async def get_orden(id_orden: int, current_user: dict = Depends(get_current_user)):
    return call_service("orden", "GET_ORDEN", {"id_orden": id_orden}, auth=current_user)

@router.put("/update_by/{id_orden}")
async def update_orden(id_orden: int, request: Request, current_user: dict = Depends(get_current_user)):
    body = await request.json()
    body["id_orden"] = id_orden
    return call_service("orden", "UPDATE_ORDEN", body, auth=current_user)

@router.post("/add_by/{id_orden}/repuestos")
async def agregar_repuesto(id_orden: int, request: Request, current_user: dict = Depends(get_current_user)):
    body = await request.json()
    body["id_orden"] = id_orden
    return call_service("orden", "AGREGAR_REPUESTO", body, auth=current_user)

@router.post("/close_by/{id_orden}/cerrar")
async def cerrar_orden(id_orden: int, current_user: dict = Depends(get_current_user)):
    return call_service("orden", "CERRAR_ORDEN", {"id_orden": id_orden}, auth=current_user)

@router.patch("/change_by/{id_orden}/estado")
async def cambiar_estado(id_orden: int, request: Request, current_user: dict = Depends(get_current_user)):
    body = await request.json()
    body["id_orden"] = id_orden
    return call_service("orden", "CAMBIAR_ESTADO", body, auth=current_user)

# Endpoint público para obtener detalles de una orden sin autenticación (para clientes con token de acceso público)
@router.get("/orden_publica_tkn/{token}")
async def orden_publica(token: str):
    return call_service("orden", "GET_ORDEN_PUBLICA", {"token_acceso_publico": token})