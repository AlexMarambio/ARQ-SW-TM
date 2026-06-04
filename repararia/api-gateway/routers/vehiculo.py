from fastapi import APIRouter, Request
from call_service import call_service

router = APIRouter(prefix="/vehiculo", tags=["Vehiculo"])

@router.get("/list_vehiculos")
async def list_vehiculos(limit: int = 100, offset: int = 0, search: str = ""):
    return call_service("vehic", "LIST_VEHICULOS", {"limit": limit, "offset": offset, "search": search})

@router.post("/create_vehiculo")
async def create_vehiculo(request: Request):
    body = await request.json()
    return call_service("vehic", "CREATE_VEHICULO", body)

@router.get("/get_vehiculo/{id_vehiculo}")
async def get_vehiculo(id_vehiculo: int):
    return call_service("vehic", "GET_VEHICULO", {"id_vehiculo": id_vehiculo})

@router.put("/update_vehiculo/{id_vehiculo}")
async def update_vehiculo(id_vehiculo: int, request: Request):
    body = await request.json()
    body["id_vehiculo"] = id_vehiculo
    return call_service("vehic", "UPDATE_VEHICULO", body)

@router.delete("/delete_vehiculo/{id_vehiculo}")
async def delete_vehiculo(id_vehiculo: int):
    return call_service("vehic", "DELETE_VEHICULO", {"id_vehiculo": id_vehiculo})

@router.get("/by_cliente/{id_cliente}")
async def vehiculos_by_cliente(id_cliente: int):
    return call_service("vehic", "VEHICULOS_BY_CLIENTE", {"id_cliente": id_cliente})