from fastapi import APIRouter, Request
from call_service import call_service

router = APIRouter(prefix="/facturacion", tags=["Facturación"])

@router.post("/create_factura/{id_orden}")
async def create_factura(id_orden: int):
    return call_service("factu", "CREATE_FACTURA", {"id_orden": id_orden})

@router.post("/registrar_pago/{id_factura}")
async def registrar_pago(id_factura: int, request: Request):
    body = await request.json()
    body["id_factura"] = id_factura
    return call_service("factu", "REGISTRAR_PAGO", body)

@router.get("/list_facturas")
async def list_facturas(limit: int = 100, offset: int = 0, estado: str = None):
    params = {"limit": limit, "offset": offset}
    if estado:
        params["estado"] = estado
    return call_service("factu", "LIST_FACTURAS", params)

@router.get("/get_by/{id_factura}")
async def get_factura(id_factura: int):
    return call_service("factu", "GET_FACTURA", {"id_factura": id_factura})

@router.get("/get_by_orden/{id_orden}")
async def factura_by_orden(id_orden: int):
    return call_service("factu", "FACTURA_BY_ORDEN", {"id_orden": id_orden})

# @router.get("/reporte_facturas/ingresos")
# async def reporte_ingresos(periodo: str = "mes", fecha_inicio: str = None, fecha_fin: str = None):
#     params = {"periodo": periodo}
#     if fecha_inicio and fecha_fin:
#         params["fecha_inicio"] = fecha_inicio
#         params["fecha_fin"] = fecha_fin
#     return call_service("factu", "REPORTE_INGRESOS", params)