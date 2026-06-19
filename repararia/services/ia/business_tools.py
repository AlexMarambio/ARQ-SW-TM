from gateway_client import gateway_get

def get_ordenes_activas(token: str) -> dict:
    """Cantidad y detalle de órdenes en estado en_proceso."""
    data = gateway_get("/ordenes/orden_list", params={"estado": "en_proceso", "limit": 100}, token=token)
    ordenes = data.get("ordenes", data) if isinstance(data, dict) else data
    return {"cantidad": len(ordenes), "ordenes": ordenes}

def get_clientes_recientes(token: str, limit: int = 5) -> dict:
    """Últimos clientes registrados o que coinciden con una búsqueda."""
    return gateway_get("/cliente/list_clientes", params={"limit": limit}, token=token)

def get_repuestos_stock_bajo(token: str, umbral: int = 5) -> dict:
    """Repuestos con stock por debajo del umbral mínimo."""
    return gateway_get("/repuesto/stock_repuesto", params={"umbral": umbral}, token=token)

def get_facturas_pendientes(token: str) -> dict:
    """Facturas con estado de pago pendiente."""
    return gateway_get("/facturacion/list_facturas", params={"estado": "pendiente"}, token=token)

def get_kpi_admin(token: str) -> dict:
    """Resumen general de KPIs del taller."""
    return gateway_get("/dashboard/kpi/admin", token=token)