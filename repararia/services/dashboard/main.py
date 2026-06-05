import json
import os
import psycopg
from datetime import datetime, timedelta
from decimal import Decimal
from soa_lib import connect_to_bus, send_message, receive_message

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://repararia:repararia_dev@postgres:5432/repararia")
SERVICE_NAME = "dashb"   # 5 caracteres

def get_db_connection():
    return psycopg.connect(DATABASE_URL)

def handle_kpi_admin(payload):
    """Retorna KPIs para el administrador."""
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Órdenes activas (no entregadas)
        cur.execute("SELECT COUNT(*) FROM orden_trabajo WHERE estado != 'entregado'")
        ordenes_activas = cur.fetchone()[0] or 0

        # Ingresos del mes actual (facturas pagadas)
        cur.execute("""
            SELECT COALESCE(SUM(monto_total), 0)
            FROM factura
            WHERE estado_pago = 'pagado'
            AND DATE_TRUNC('month', fecha_emision) = DATE_TRUNC('month', CURRENT_DATE)
        """)
        ingresos_mes = float(cur.fetchone()[0]) or 0.0

        # Ingresos totales (todas pagadas)
        cur.execute("SELECT COALESCE(SUM(monto_total), 0) FROM factura WHERE estado_pago = 'pagado'")
        ingresos_totales = float(cur.fetchone()[0]) or 0.0

        # Promedio de costo por orden (solo órdenes con costo > 0)
        cur.execute("SELECT AVG(costo_total) FROM orden_trabajo WHERE costo_total > 0")
        avg_costo = float(cur.fetchone()[0]) if cur.fetchone()[0] else 0.0

        # Top 3 clientes (por cantidad de órdenes)
        cur.execute("""
            SELECT c.nombre, COUNT(o.id_orden) as total_ordenes
            FROM cliente c
            JOIN orden_trabajo o ON c.id_cliente = o.id_cliente
            GROUP BY c.id_cliente
            ORDER BY total_ordenes DESC
            LIMIT 3
        """)
        top_clientes = [{"nombre": row[0], "ordenes": row[1]} for row in cur.fetchall()]

        # Cantidad de mecánicos activos
        cur.execute("SELECT COUNT(*) FROM usuario WHERE rol = 'mecanico' AND activo = true")
        total_mecanicos = cur.fetchone()[0] or 0

        # Órdenes por estado
        cur.execute("""
            SELECT estado, COUNT(*)
            FROM orden_trabajo
            GROUP BY estado
        """)
        ordenes_por_estado = {row[0]: row[1] for row in cur.fetchall()}

        return {
            "status": "success",
            "data": {
                "ordenes_activas": ordenes_activas,
                "ingresos_mes": ingresos_mes,
                "ingresos_totales": ingresos_totales,
                "costo_promedio_orden": avg_costo,
                "top_clientes": top_clientes,
                "total_mecanicos": total_mecanicos,
                "ordenes_por_estado": ordenes_por_estado
            }
        }
    except Exception as e:
        return {"status": "error", "error_code": "DB_ERROR", "error_message": str(e), "status_code": 500}
    finally:
        cur.close()
        conn.close()

def handle_kpi_mecanico(payload):
    """Retorna KPIs para un mecánico específico (por id_mecanico)."""
    mecanico_id = payload.get("id_mecanico")
    if not mecanico_id:
        return {"status": "error", "error_code": "VALIDATION_ERROR", "error_message": "Se requiere id_mecanico", "status_code": 400}
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Órdenes asignadas a este mecánico
        cur.execute("SELECT COUNT(*) FROM orden_trabajo WHERE id_mecanico = %s", (mecanico_id,))
        total_ordenes = cur.fetchone()[0] or 0

        # Órdenes completadas (entregadas)
        cur.execute("SELECT COUNT(*) FROM orden_trabajo WHERE id_mecanico = %s AND estado = 'entregado'", (mecanico_id,))
        completadas = cur.fetchone()[0] or 0

        # Ingresos generados por sus órdenes (facturas pagadas)
        cur.execute("""
            SELECT COALESCE(SUM(f.monto_total), 0)
            FROM factura f
            JOIN orden_trabajo o ON f.id_orden = o.id_orden
            WHERE o.id_mecanico = %s AND f.estado_pago = 'pagado'
        """, (mecanico_id,))
        ingresos = float(cur.fetchone()[0]) or 0.0

        # Tiempo promedio de finalización (días entre fecha_ingreso y fecha_entrega)
        cur.execute("""
            SELECT AVG(EXTRACT(EPOCH FROM (fecha_entrega - fecha_ingreso))/86400)
            FROM orden_trabajo
            WHERE id_mecanico = %s AND fecha_entrega IS NOT NULL
        """, (mecanico_id,))
        avg_dias = cur.fetchone()[0]
        tiempo_promedio = round(float(avg_dias), 1) if avg_dias else 0.0

        # Orden más reciente
        cur.execute("""
            SELECT id_orden, estado, fecha_ingreso
            FROM orden_trabajo
            WHERE id_mecanico = %s
            ORDER BY fecha_ingreso DESC
            LIMIT 1
        """, (mecanico_id,))
        ultima = cur.fetchone()
        ultima_orden = {"id_orden": ultima[0], "estado": ultima[1], "fecha": ultima[2].isoformat()} if ultima else None

        return {
            "status": "success",
            "data": {
                "total_ordenes": total_ordenes,
                "completadas": completadas,
                "ingresos_generados": ingresos,
                "tiempo_promedio_dias": tiempo_promedio,
                "ultima_orden": ultima_orden
            }
        }
    except Exception as e:
        return {"status": "error", "error_code": "DB_ERROR", "error_message": str(e), "status_code": 500}
    finally:
        cur.close()
        conn.close()

def handle_reporte_ordenes(payload):
    """Reporte detallado de órdenes (con filtros) en formato lista (limitado por bus)."""
    limit = min(int(payload.get("limit", 10)), 20)
    offset = int(payload.get("offset", 0))
    estado = payload.get("estado")
    fecha_desde = payload.get("fecha_desde")
    fecha_hasta = payload.get("fecha_hasta")
    conn = get_db_connection()
    cur = conn.cursor()
    query = """
        SELECT o.id_orden, o.fecha_ingreso, o.estado, o.costo_total,
               c.nombre as cliente_nombre, v.patente, u.nombre as mecanico_nombre
        FROM orden_trabajo o
        JOIN cliente c ON o.id_cliente = c.id_cliente
        JOIN vehiculo v ON o.id_vehiculo = v.id_vehiculo
        LEFT JOIN usuario u ON o.id_mecanico = u.id_usuario
        WHERE 1=1
    """
    params = []
    if estado:
        query += " AND o.estado = %s"
        params.append(estado)
    if fecha_desde:
        query += " AND o.fecha_ingreso >= %s"
        params.append(fecha_desde)
    if fecha_hasta:
        query += " AND o.fecha_ingreso <= %s"
        params.append(fecha_hasta)
    query += " ORDER BY o.fecha_ingreso DESC LIMIT %s OFFSET %s"
    params.extend([limit, offset])
    cur.execute(query, params)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    reporte = []
    for row in rows:
        reporte.append({
            "id_orden": row[0],
            "fecha_ingreso": row[1].isoformat() if row[1] else None,
            "estado": row[2],
            "costo_total": float(row[3]) if row[3] else 0.0,
            "cliente": row[4],
            "patente": row[5],
            "mecanico": row[6]
        })
    return {"status": "success", "data": reporte}

def handle_reporte_clientes(payload):
    """Reporte de clientes con cantidad de órdenes y gasto total."""
    limit = min(int(payload.get("limit", 10)), 20)
    offset = int(payload.get("offset", 0))
    conn = get_db_connection()
    cur = conn.cursor()
    query = """
        SELECT c.id_cliente, c.nombre, c.rut, COUNT(o.id_orden) as ordenes, COALESCE(SUM(o.costo_total), 0) as gasto_total
        FROM cliente c
        LEFT JOIN orden_trabajo o ON c.id_cliente = o.id_cliente
        GROUP BY c.id_cliente
        ORDER BY gasto_total DESC
        LIMIT %s OFFSET %s
    """
    cur.execute(query, (limit, offset))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    reporte = []
    for row in rows:
        reporte.append({
            "id_cliente": row[0],
            "nombre": row[1],
            "rut": row[2],
            "ordenes": row[3],
            "gasto_total": float(row[4]) if row[4] else 0.0
        })
    return {"status": "success", "data": reporte}

def handle_reporte_repuestos(payload):
    """Reporte de repuestos más usados (cantidad total vendida)."""
    limit = min(int(payload.get("limit", 10)), 20)
    conn = get_db_connection()
    cur = conn.cursor()
    query = """
        SELECT r.id_repuesto, r.nombre, r.sku, SUM(or_.cantidad) as total_vendido
        FROM repuesto r
        JOIN orden_repuesto or_ ON r.id_repuesto = or_.id_repuesto
        GROUP BY r.id_repuesto
        ORDER BY total_vendido DESC
        LIMIT %s
    """
    cur.execute(query, (limit,))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    reporte = []
    for row in rows:
        reporte.append({
            "id_repuesto": row[0],
            "nombre": row[1],
            "sku": row[2],
            "total_vendido": row[3]
        })
    return {"status": "success", "data": reporte}

# ================= BUCLE PRINCIPAL =================
def main():
    BUS_HOST = os.getenv("BUS_HOST", "localhost")
    BUS_PORT = int(os.getenv("BUS_PORT", "5000"))
    sock = connect_to_bus(BUS_HOST, BUS_PORT)

    send_message(sock, "sinit", SERVICE_NAME)
    init_resp = receive_message(sock)
    print(f"Registro del servicio '{SERVICE_NAME}': {init_resp.decode() if init_resp else 'None'}")
    print(f"Servicio '{SERVICE_NAME}' escuchando en el bus...")

    while True:
        try:
            raw = receive_message(sock)
            if not raw:
                print("Conexión perdida")
                break
            service_name_received = raw[:5].decode().strip()
            if service_name_received != SERVICE_NAME:
                continue
            payload_bytes = raw[5:]
            if not payload_bytes:
                continue
            req = json.loads(payload_bytes.decode('utf-8'))
            operation = req.get("operation")
            payload = req.get("payload", {})
            request_id = req.get("request_id")

            print(f"Operación: {operation}, request_id: {request_id}")

            if operation == "KPI_ADMIN":
                result = handle_kpi_admin(payload)
            elif operation == "KPI_MECANICO":
                result = handle_kpi_mecanico(payload)
            elif operation == "REPORTE_ORDENES":
                result = handle_reporte_ordenes(payload)
            elif operation == "REPORTE_CLIENTES":
                result = handle_reporte_clientes(payload)
            elif operation == "REPORTE_REPUESTOS":
                result = handle_reporte_repuestos(payload)
            else:
                result = {"status": "error", "error_code": "OPERATION_NOT_FOUND", "error_message": f"Operación '{operation}' no soportada", "status_code": 400}

            if request_id:
                result["request_id"] = request_id
            send_message(sock, SERVICE_NAME, json.dumps(result))
            print(f"Respuesta enviada para {operation}")
        except Exception as e:
            print(f"Error: {e}")
            try:
                send_message(sock, SERVICE_NAME, json.dumps({"status": "error", "error_code": "INTERNAL_SERVER_ERROR", "error_message": str(e)}))
            except:
                pass

if __name__ == "__main__":
    main()