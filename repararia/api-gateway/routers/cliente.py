from fastapi import APIRouter, Request
from call_service import call_service

router = APIRouter(prefix="/cliente", tags=["Cliente"])

@router.get("/list_clientes")
async def list_clientes(limit: int = 100, offset: int = 0, search: str = ""):
    return call_service("clien", "LIST_CLIENTES", {"limit": limit, "offset": offset, "search": search})

@router.post("/create_cliente")
async def create_cliente(request: Request):
    body = await request.json()
    return call_service("clien", "CREATE_CLIENTE", body)

@router.get("/get_cliente/{id_cliente}")
async def get_cliente(id_cliente: int):
    return call_service("clien", "GET_CLIENTE", {"id_cliente": id_cliente})

@router.put("/update_cliente/{id_cliente}")
async def update_cliente(id_cliente: int, request: Request):
    body = await request.json()
    body["id_cliente"] = id_cliente
    return call_service("clien", "UPDATE_CLIENTE", body)

@router.delete("/delete_cliente/{id_cliente}")
async def delete_cliente(id_cliente: int):
    return call_service("clien", "DELETE_CLIENTE", {"id_cliente": id_cliente})