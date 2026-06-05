from fastapi import APIRouter, Request, Depends
from call_service import call_service
from auth_dependency import get_current_user

router = APIRouter(prefix="/vehiculo", tags=["Vehiculo"])

@router.get("/list_vehiculos")
async def list_vehiculos(limit: int = 100, offset: int = 0, search: str = "", current_user: dict = Depends(get_current_user)):
    return call_service("vehic", "LIST_VEHICULOS", {"limit": limit, "offset": offset, "search": search}, auth=current_user)

@router.post("/create_vehiculo")
async def create_vehiculo(request: Request, current_user: dict = Depends(get_current_user)):
    body = await request.json()
    return call_service("vehic", "CREATE_VEHICULO", body, auth=current_user)

@router.get("/get_vehiculo/{id_vehiculo}")
async def get_vehiculo(id_vehiculo: int, current_user: dict = Depends(get_current_user)):
    return call_service("vehic", "GET_VEHICULO", {"id_vehiculo": id_vehiculo}, auth=current_user)

@router.put("/update_vehiculo/{id_vehiculo}")
async def update_vehiculo(id_vehiculo: int, request: Request, current_user: dict = Depends(get_current_user)):
    body = await request.json()
    body["id_vehiculo"] = id_vehiculo
    return call_service("vehic", "UPDATE_VEHICULO", body, auth=current_user)

@router.delete("/delete_vehiculo/{id_vehiculo}")
async def delete_vehiculo(id_vehiculo: int, current_user: dict = Depends(get_current_user)):
    return call_service("vehic", "DELETE_VEHICULO", {"id_vehiculo": id_vehiculo}, auth=current_user)

@router.get("/by_cliente/{id_cliente}")
async def vehiculos_by_cliente(id_cliente: int, current_user: dict = Depends(get_current_user)):
    return call_service("vehic", "VEHICULOS_BY_CLIENTE", {"id_cliente": id_cliente}, auth=current_user)