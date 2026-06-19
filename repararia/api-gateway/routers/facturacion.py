from fastapi import APIRouter, Request, Depends
from call_service import call_service
from auth_dependency import get_current_user

router = APIRouter(prefix="/facturacion", tags=["Facturación"])

@router.post("/create_factura/{id_orden}")
async def create_factura(id_orden: int, current_user: dict = Depends(get_current_user)):
    return call_service("factu", "CREATE_FACTURA", {"id_orden": id_orden}, auth=current_user)

@router.post("/registrar_pago/{id_factura}")
async def registrar_pago(id_factura: int, request: Request, current_user: dict = Depends(get_current_user)):
    body = await request.json()
    body["id_factura"] = id_factura
    return call_service("factu", "REGISTRAR_PAGO", body, auth=current_user)

@router.get("/list_facturas")
async def list_facturas(limit: int = 100, offset: int = 0, estado: str = None, current_user: dict = Depends(get_current_user)):
    params = {"limit": limit, "offset": offset}
    if estado:
        params["estado"] = estado
    return call_service("factu", "LIST_FACTURAS", params, auth=current_user)

@router.get("/get_by/{id_factura}")
async def get_factura(id_factura: int, current_user: dict = Depends(get_current_user)):
    return call_service("factu", "GET_FACTURA", {"id_factura": id_factura}, auth=current_user)

@router.get("/get_by_orden/{id_orden}")
async def factura_by_orden(id_orden: int, current_user: dict = Depends(get_current_user)):
    return call_service("factu", "FACTURA_BY_ORDEN", {"id_orden": id_orden}, auth=current_user)

# @router.get("/reporte_facturas/ingresos")
# async def reporte_ingresos(periodo: str = "mes", fecha_inicio: str = None, fecha_fin: str = None):
#     params = {"periodo": periodo}
#     if fecha_inicio and fecha_fin:
#         params["fecha_inicio"] = fecha_inicio
#         params["fecha_fin"] = fecha_fin
#     return call_service("factu", "REPORTE_INGRESOS", params)