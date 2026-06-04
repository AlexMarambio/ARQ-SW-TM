from fastapi import APIRouter, Request
from call_service import call_service

router = APIRouter(prefix="/repuesto", tags=["Repuesto"])

@router.get("/list_repuestos")
async def list_repuestos(limit: int = 100, offset: int = 0, search: str = ""):
    return call_service("inven", "LIST_REPUESTOS", {"limit": limit, "offset": offset, "search": search})

@router.post("/create_repuesto")
async def create_repuesto(request: Request):
    body = await request.json()
    return call_service("inven", "CREATE_REPUESTO", body)

@router.get("/get_by/{id_repuesto}")
async def get_repuesto(id_repuesto: int):
    return call_service("inven", "GET_REPUESTO", {"id_repuesto": id_repuesto})

@router.put("/update_by/{id_repuesto}")
async def update_repuesto(id_repuesto: int, request: Request):
    body = await request.json()
    body["id_repuesto"] = id_repuesto
    return call_service("inven", "UPDATE_REPUESTO", body)

@router.delete("/delete_by/{id_repuesto}")
async def delete_repuesto(id_repuesto: int):
    return call_service("inven", "DELETE_REPUESTO", {"id_repuesto": id_repuesto})

@router.get("/stock_repuesto")
async def alertas_stock(umbral: int = 5):
    return call_service("inven", "GET_ALERTAS_STOCK", {"umbral": umbral})

@router.put("/ajustar_stock_by/{id_repuesto}")
async def ajustar_stock(id_repuesto: int, request: Request):
    body = await request.json()
    body["id_repuesto"] = id_repuesto
    return call_service("inven", "AJUSTAR_STOCK", body)

@router.get("/get_by_sku/{sku}")
async def get_by_sku(sku: str):
    return call_service("inven", "GET_REPUESTO_BY_SKU", {"sku": sku})