from fastapi import APIRouter, Request, Depends
from call_service import call_service
from auth_dependency import get_current_user

router = APIRouter(prefix="/ia", tags=["Inteligencia Artificial"])

@router.post("/tecnico/consulta")
async def consulta_tecnica(request: Request, current_user: dict = Depends(get_current_user)):
    """Consulta al asistente técnico (RAG) sobre documentación del taller."""
    body = await request.json()
    # El servicio IA espera: {"pregunta": "cómo cambiar bujías?", "tenant_id": "taller_01"}
    return call_service("iabot", "CONSULTA_TECNICA", body, auth=current_user)

@router.post("/ia/negocio/consulta")
async def consulta_negocio(body: dict, current_user: dict = Depends(get_current_user)):
    pregunta = body["pregunta"]

    # Junta lo esencial del negocio. Reusa exactamente las mismas
    # llamadas que ya usan tus otras rutas REST.
    ordenes = call_service("orden", "LIST_ORDENES", {"limit": 100}, auth=current_user)
    # kpis = call_service("dashb", "KPI_ADMIN", {}, auth=current_user)
    stock_bajo = call_service("inven", "LIST_REPUESTOS", {"limit": 100, "offset": 0, "search": ""}, auth=current_user)
    print(ordenes)
    print(stock_bajo)
    contexto_datos = {
        "ordenes_activas": ordenes,
        # "kpis": kpis,
        "repuestos_stock_bajo": stock_bajo,
    }

    payload = {"pregunta": pregunta, "contexto_datos": contexto_datos}
    return call_service("iabot", "CONSULTA_NEGOCIO", payload, auth=current_user)