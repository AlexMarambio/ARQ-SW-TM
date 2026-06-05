from fastapi import APIRouter, Request, Depends
from call_service import call_service
from auth_dependency import get_current_user

router = APIRouter(prefix="/cliente", tags=["Cliente"])

@router.get("/list_clientes")
async def list_clientes(limit: int = 5, offset: int = 0, search: str = "", current_user: dict = Depends(get_current_user)):
    params = {"limit": limit, "offset": offset, "search": search}
    return call_service("clien", "LIST_CLIENTES", params, auth=current_user)

@router.post("/create_cliente")
async def create_cliente(request: Request, current_user: dict = Depends(get_current_user)):
    body = await request.json()
    return call_service("clien", "CREATE_CLIENTE", body, auth=current_user)

@router.get("/get_cliente/{id_cliente}")
async def get_cliente(id_cliente: int, current_user: dict = Depends(get_current_user)):
    return call_service("clien", "GET_CLIENTE", {"id_cliente": id_cliente}, auth=current_user)

@router.put("/update_cliente/{id_cliente}")
async def update_cliente(id_cliente: int, request: Request, current_user: dict = Depends(get_current_user)):
    body = await request.json()
    body["id_cliente"] = id_cliente
    return call_service("clien", "UPDATE_CLIENTE", body, auth=current_user)

@router.delete("/delete_cliente/{id_cliente}")
async def delete_cliente(id_cliente: int, current_user: dict = Depends(get_current_user)):
    return call_service("clien", "DELETE_CLIENTE", {"id_cliente": id_cliente}, auth=current_user)