from fastapi import APIRouter, Request, Depends
from call_service import call_service
from auth_dependency import get_current_user

router = APIRouter(prefix="/repuesto", tags=["Repuesto"])

@router.get("/list_repuestos")
async def list_repuestos(limit: int = 100, offset: int = 0, search: str = "", current_user: dict = Depends(get_current_user)):
    return call_service("inven", "LIST_REPUESTOS", {"limit": limit, "offset": offset, "search": search}, auth=current_user)

@router.post("/create_repuesto")
async def create_repuesto(request: Request, current_user: dict = Depends(get_current_user)):
    body = await request.json()
    return call_service("inven", "CREATE_REPUESTO", body, auth=current_user)

@router.get("/get_by/{id_repuesto}")
async def get_repuesto(id_repuesto: int, current_user: dict = Depends(get_current_user)):
    return call_service("inven", "GET_REPUESTO", {"id_repuesto": id_repuesto}, auth=current_user)

@router.put("/update_by/{id_repuesto}")
async def update_repuesto(id_repuesto: int, request: Request, current_user: dict = Depends(get_current_user)):
    body = await request.json()
    body["id_repuesto"] = id_repuesto
    return call_service("inven", "UPDATE_REPUESTO", body, auth=current_user)

@router.delete("/delete_by/{id_repuesto}")
async def delete_repuesto(id_repuesto: int, current_user: dict = Depends(get_current_user)):
    return call_service("inven", "DELETE_REPUESTO", {"id_repuesto": id_repuesto}, auth=current_user)

@router.get("/stock_repuesto")
async def alertas_stock(umbral: int = 5, current_user: dict = Depends(get_current_user)):
    return call_service("inven", "GET_ALERTAS_STOCK", {"umbral": umbral}, auth=current_user)

@router.put("/ajustar_stock_by/{id_repuesto}")
async def ajustar_stock(id_repuesto: int, request: Request, current_user: dict = Depends(get_current_user)):
    body = await request.json()
    body["id_repuesto"] = id_repuesto
    return call_service("inven", "AJUSTAR_STOCK", body, auth=current_user)

@router.get("/get_by_sku/{sku}")
async def get_by_sku(sku: str, current_user: dict = Depends(get_current_user)):
    return call_service("inven", "GET_REPUESTO_BY_SKU", {"sku": sku}, auth=current_user)