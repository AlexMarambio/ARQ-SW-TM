import os
from typing import Any
from uuid import uuid4

import jwt
from fastapi import Depends, FastAPI, Header, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from tcp_client import ReparariaTCPClient, TCPServiceError, TCPServiceRoute


app = FastAPI(title="RepararIA API Gateway", version="0.1.0")
tcp_client = ReparariaTCPClient()

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

ROUTES = {
    "auth": TCPServiceRoute(
        service="autenticacion",
        host=os.getenv("AUTH_SERVICE_HOST", "servicio-autenticacion"),
        port=int(os.getenv("AUTH_SERVICE_PORT", "5001")),
    ),
    "clientes": TCPServiceRoute(
        service="clientes",
        host=os.getenv("CLIENTES_SERVICE_HOST", "servicio-clientes"),
        port=int(os.getenv("CLIENTES_SERVICE_PORT", "5002")),
    ),
    "ordenes": TCPServiceRoute(
        service="ordenes",
        host=os.getenv("ORDENES_SERVICE_HOST", "servicio-ordenes"),
        port=int(os.getenv("ORDENES_SERVICE_PORT", "5003")),
    ),
    "inventario": TCPServiceRoute(
        service="inventario",
        host=os.getenv("INVENTARIO_SERVICE_HOST", "servicio-inventario"),
        port=int(os.getenv("INVENTARIO_SERVICE_PORT", "5004")),
    ),
    "facturacion": TCPServiceRoute(
        service="facturacion",
        host=os.getenv("FACTURACION_SERVICE_HOST", "servicio-facturacion"),
        port=int(os.getenv("FACTURACION_SERVICE_PORT", "5005")),
    ),
}

ERROR_STATUS = {
    "NOT_FOUND": 404,
    "UNAUTHORIZED": 401,
    "FORBIDDEN": 403,
    "VALIDATION_ERROR": 422,
    "STOCK_INSUFFICIENT": 409,
    "CONFLICT": 409,
}

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def current_auth(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token JWT requerido")

    token = authorization.removeprefix("Bearer ").strip()
    try:
        claims = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Token JWT invalido") from exc

    return {
        "user_id": claims.get("sub") or claims.get("user_id"),
        "rol": claims.get("rol"),
    }


async def body_or_empty(request: Request) -> dict[str, Any]:
    if request.headers.get("content-length") in (None, "0"):
        return {}
    body = await request.json()
    if not isinstance(body, dict):
        raise HTTPException(status_code=422, detail="El cuerpo debe ser un objeto JSON")
    return body


def dispatch(
    route_name: str,
    operation: str,
    payload: dict[str, Any] | None = None,
    auth: dict[str, Any] | None = None,
) -> dict[str, Any]:
    try:
        response = tcp_client.call(
            route=ROUTES[route_name],
            operation=operation,
            payload=payload,
            auth=auth,
            request_id=str(uuid4()),
        )
    except TCPServiceError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail={
                "error_code": exc.error_code,
                "error_message": exc.error_message,
            },
        ) from exc

    if response.get("status") == "error":
        error_code = response.get("error_code") or "SERVICE_ERROR"
        raise HTTPException(
            status_code=ERROR_STATUS.get(error_code, 500),
            detail={
                "request_id": response.get("request_id"),
                "error_code": error_code,
                "error_message": response.get("error_message"),
            },
        )

    return response.get("data") or {}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/auth/login")
async def login(request: Request, response: Response) -> dict[str, Any]:
    data = dispatch("auth", "LOGIN", await body_or_empty(request))
    if token := data.get("token"):
        response.set_cookie(
            key="access_token",
            value=token,
            httponly=True,
            secure=os.getenv("COOKIE_SECURE", "false").lower() == "true",
            samesite="lax",
        )
    return data


@app.post("/auth/logout")
async def logout(
    request: Request,
    response: Response,
    auth: dict[str, Any] = Depends(current_auth),
) -> dict[str, Any]:
    data = dispatch("auth", "LOGOUT", await body_or_empty(request), auth)
    response.delete_cookie("access_token")
    return data


@app.get("/clientes")
def list_clientes(
    request: Request,
    auth: dict[str, Any] = Depends(current_auth),
) -> dict[str, Any]:
    return dispatch("clientes", "LIST_CLIENTES", dict(request.query_params), auth)


@app.post("/clientes")
async def create_cliente(
    request: Request,
    auth: dict[str, Any] = Depends(current_auth),
) -> dict[str, Any]:
    return dispatch("clientes", "CREATE_CLIENTE", await body_or_empty(request), auth)


@app.get("/clientes/{id_cliente}")
def get_cliente(id_cliente: int, auth: dict[str, Any] = Depends(current_auth)) -> dict[str, Any]:
    return dispatch("clientes", "GET_CLIENTE", {"id_cliente": id_cliente}, auth)


@app.put("/clientes/{id_cliente}")
async def update_cliente(
    id_cliente: int,
    request: Request,
    auth: dict[str, Any] = Depends(current_auth),
) -> dict[str, Any]:
    payload = await body_or_empty(request)
    payload["id_cliente"] = id_cliente
    return dispatch("clientes", "UPDATE_CLIENTE", payload, auth)


@app.delete("/clientes/{id_cliente}")
def delete_cliente(
    id_cliente: int,
    auth: dict[str, Any] = Depends(current_auth),
) -> dict[str, Any]:
    return dispatch("clientes", "DELETE_CLIENTE", {"id_cliente": id_cliente}, auth)


@app.get("/ordenes")
def list_ordenes(
    request: Request,
    auth: dict[str, Any] = Depends(current_auth),
) -> dict[str, Any]:
    return dispatch("ordenes", "LIST_ORDENES", dict(request.query_params), auth)


@app.post("/ordenes")
async def create_orden(
    request: Request,
    auth: dict[str, Any] = Depends(current_auth),
) -> dict[str, Any]:
    return dispatch("ordenes", "CREATE_ORDEN", await body_or_empty(request), auth)


@app.get("/ordenes/publica/{token_acceso_publico}")
def get_orden_publica(token_acceso_publico: str) -> dict[str, Any]:
    return dispatch(
        "ordenes",
        "GET_ORDEN_PUBLICA",
        {"token_acceso_publico": token_acceso_publico},
    )


@app.get("/ordenes/{id_orden}")
def get_orden(id_orden: int, auth: dict[str, Any] = Depends(current_auth)) -> dict[str, Any]:
    return dispatch("ordenes", "GET_ORDEN", {"id_orden": id_orden}, auth)


@app.patch("/ordenes/{id_orden}/estado")
async def cambiar_estado(
    id_orden: int,
    request: Request,
    auth: dict[str, Any] = Depends(current_auth),
) -> dict[str, Any]:
    payload = await body_or_empty(request)
    payload["id_orden"] = id_orden
    return dispatch("ordenes", "CAMBIAR_ESTADO", payload, auth)


@app.post("/ordenes/{id_orden}/repuestos")
async def agregar_repuesto(
    id_orden: int,
    request: Request,
    auth: dict[str, Any] = Depends(current_auth),
) -> dict[str, Any]:
    payload = await body_or_empty(request)
    payload["id_orden"] = id_orden
    return dispatch("ordenes", "AGREGAR_REPUESTO", payload, auth)


@app.post("/ordenes/{id_orden}/cerrar")
def cerrar_orden(
    id_orden: int,
    auth: dict[str, Any] = Depends(current_auth),
) -> dict[str, Any]:
    return dispatch("ordenes", "CERRAR_ORDEN", {"id_orden": id_orden}, auth)


@app.get("/repuestos")
def list_repuestos(
    request: Request,
    auth: dict[str, Any] = Depends(current_auth),
) -> dict[str, Any]:
    return dispatch("inventario", "LIST_REPUESTOS", dict(request.query_params), auth)


@app.get("/repuestos/alertas")
def get_alertas_stock(auth: dict[str, Any] = Depends(current_auth)) -> dict[str, Any]:
    return dispatch("inventario", "GET_ALERTAS_STOCK", {}, auth)


@app.post("/facturas/{id_factura}/pago")
async def registrar_pago(
    id_factura: int,
    request: Request,
    auth: dict[str, Any] = Depends(current_auth),
) -> dict[str, Any]:
    payload = await body_or_empty(request)
    payload["id_factura"] = id_factura
    return dispatch("facturacion", "REGISTRAR_PAGO", payload, auth)
