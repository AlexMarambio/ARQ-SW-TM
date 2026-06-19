import json
import os
import psycopg
from datetime import datetime
from decimal import Decimal
from soa_lib import connect_to_bus, send_message, receive_message
from auditoria_utils import registrar_auditoria

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://repararia:repararia_dev@postgres:5432/repararia")
SERVICE_NAME = "factu"

def get_db_connection():
    return psycopg.connect(DATABASE_URL)

def factura_to_dict(row):
    # row: (id_factura, id_orden, fecha_emision, monto_neto, iva, monto_total, estado_pago, metodo_pago)
    return {
        "id_factura": row[0],
        "id_orden": row[1],
        "fecha_emision": row[2].isoformat() if row[2] else None,
        "monto_neto": float(row[3]) if row[3] else 0.0,
        "iva": float(row[4]) if row[4] else 0.0,
        "monto_total": float(row[5]) if row[5] else 0.0,
        "estado_pago": row[6],
        "metodo_pago": row[7]
    }

def handle_create_factura(payload):
    auth = payload.get("auth") or {}
    id_usuario = auth.get("user_id")
    id_orden = payload.get("id_orden")
    if not id_orden:
        return {"status": "error", "error_code": "VALIDATION_ERROR", "error_message": "Se requiere id_orden", "status_code": 400}
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT estado, costo_total FROM orden_trabajo WHERE id_orden = %s", (id_orden,))
        orden = cur.fetchone()
        if not orden:
            return {"status": "error", "error_code": "NOT_FOUND", "error_message": "Orden no encontrada", "status_code": 404}
        estado, costo_neto = orden
        if estado != 'entregado':
            return {"status": "error", "error_code": "BAD_REQUEST", "error_message": "La orden aún no está cerrada (entregada)", "status_code": 400}
        cur.execute("SELECT id_factura FROM factura WHERE id_orden = %s", (id_orden,))
        if cur.fetchone():
            return {"status": "error", "error_code": "CONFLICT", "error_message": "Ya existe una factura para esta orden", "status_code": 409}
        fecha_emision = datetime.now()
        iva = costo_neto * Decimal('0.19')
        monto_total = costo_neto + iva
        estado_pago = "pendiente"
        cur.execute(
            """INSERT INTO factura (id_orden, fecha_emision, monto_neto, iva, monto_total, estado_pago, metodo_pago)
               VALUES (%s, %s, %s, %s, %s, %s, NULL) RETURNING id_factura""",
            (id_orden, fecha_emision, costo_neto, iva, monto_total, estado_pago)
        )
        factura_id = cur.fetchone()[0]
        conn.commit()
        cur.execute("SELECT * FROM factura WHERE id_factura = %s", (factura_id,))
        new_factura = factura_to_dict(cur.fetchone())
        registrar_auditoria(id_usuario, "CREATE", "factura", factura_id, f"Factura creada para orden {id_orden}")
        return {"status": "success", "data": new_factura}
    except Exception as e:
        conn.rollback()
        return {"status": "error", "error_code": "DB_ERROR", "error_message": str(e), "status_code": 500}
    finally:
        cur.close()
        conn.close()

def handle_registrar_pago(payload):
    auth = payload.get("auth") or {}
    id_usuario = auth.get("user_id")
    id_factura = payload.get("id_factura")
    metodo_pago = payload.get("metodo_pago")
    if not id_factura or not metodo_pago:
        return {"status": "error", "error_code": "VALIDATION_ERROR", "error_message": "Se requiere id_factura y metodo_pago", "status_code": 400}
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT estado_pago FROM factura WHERE id_factura = %s", (id_factura,))
        row = cur.fetchone()
        if not row:
            return {"status": "error", "error_code": "NOT_FOUND", "error_message": "Factura no encontrada", "status_code": 404}
        if row[0] == 'pagado':
            return {"status": "error", "error_code": "BAD_REQUEST", "error_message": "La factura ya está pagada", "status_code": 400}
        cur.execute("UPDATE factura SET estado_pago = 'pagado', metodo_pago = %s WHERE id_factura = %s", (metodo_pago, id_factura))
        conn.commit()
        registrar_auditoria(id_usuario, "UPDATE", "factura", id_factura, f"Pago registrado. Método: {metodo_pago}")
        return {"status": "success", "data": {"id_factura": id_factura, "estado_pago": "pagado", "metodo_pago": metodo_pago}}
    except Exception as e:
        conn.rollback()
        return {"status": "error", "error_code": "DB_ERROR", "error_message": str(e), "status_code": 500}
    finally:
        cur.close()
        conn.close()

def handle_list_facturas(payload):
    limit = int(payload.get("limit", 100))
    offset = int(payload.get("offset", 0))
    estado = payload.get("estado")
    conn = get_db_connection()
    cur = conn.cursor()
    query = "SELECT * FROM factura"
    params = []
    if estado:
        query += " WHERE estado_pago = %s"
        params.append(estado)
    query += " ORDER BY id_factura LIMIT %s OFFSET %s"
    params.extend([limit, offset])
    cur.execute(query, params)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    facturas = [factura_to_dict(row) for row in rows]
    return {"status": "success", "data": facturas}

def handle_get_factura(payload):
    id_factura = payload.get("id_factura")
    if not id_factura:
        return {"status": "error", "error_code": "VALIDATION_ERROR", "error_message": "Se requiere id_factura", "status_code": 400}
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM factura WHERE id_factura = %s", (id_factura,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    if not row:
        return {"status": "error", "error_code": "NOT_FOUND", "error_message": "Factura no encontrada", "status_code": 404}
    return {"status": "success", "data": factura_to_dict(row)}

def handle_factura_by_orden(payload):
    id_orden = payload.get("id_orden")
    if not id_orden:
        return {"status": "error", "error_code": "VALIDATION_ERROR", "error_message": "Se requiere id_orden", "status_code": 400}
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM factura WHERE id_orden = %s", (id_orden,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    if not row:
        return {"status": "error", "error_code": "NOT_FOUND", "error_message": "Factura no encontrada para esta orden", "status_code": 404}
    return {"status": "success", "data": factura_to_dict(row)}

def handle_reporte_ingresos(payload):
    periodo = payload.get("periodo", "mes")
    fecha_inicio = payload.get("fecha_inicio")
    fecha_fin = payload.get("fecha_fin")
    conn = get_db_connection()
    cur = conn.cursor()
    if fecha_inicio and fecha_fin:
        cur.execute("SELECT SUM(monto_total) FROM factura WHERE estado_pago = 'pagado' AND fecha_emision BETWEEN %s AND %s", (fecha_inicio, fecha_fin))
    else:
        if periodo == "dia":
            cur.execute("SELECT SUM(monto_total) FROM factura WHERE estado_pago = 'pagado' AND DATE(fecha_emision) = CURRENT_DATE")
        elif periodo == "mes":
            cur.execute("SELECT SUM(monto_total) FROM factura WHERE estado_pago = 'pagado' AND EXTRACT(YEAR_MONTH FROM fecha_emision) = EXTRACT(YEAR_MONTH FROM CURRENT_DATE)")
        elif periodo == "año":
            cur.execute("SELECT SUM(monto_total) FROM factura WHERE estado_pago = 'pagado' AND EXTRACT(YEAR FROM fecha_emision) = EXTRACT(YEAR FROM CURRENT_DATE)")
        else:
            return {"status": "error", "error_code": "VALIDATION_ERROR", "error_message": "Período inválido", "status_code": 400}
    total = cur.fetchone()[0] or 0.0
    cur.close()
    conn.close()
    return {"status": "success", "data": {"total_ingresos": float(total)}}

# ================= BUCLE PRINCIPAL ================= (similar, inyectar auth)
def main():
    BUS_HOST = os.getenv("BUS_HOST", "localhost")
    BUS_PORT = int(os.getenv("BUS_PORT", "5000"))
    sock = connect_to_bus(BUS_HOST, BUS_PORT)
    send_message(sock, "sinit", SERVICE_NAME)
    init_resp = receive_message(sock)
    print(f"Registro del servicio '{SERVICE_NAME}': {init_resp.decode() if init_resp else 'None'}")
    while True:
        try:
            raw = receive_message(sock)
            if not raw:
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
            auth = req.get("auth", {})
            if operation == "CREATE_FACTURA":
                payload["auth"] = auth
                result = handle_create_factura(payload)
            elif operation == "REGISTRAR_PAGO":
                payload["auth"] = auth
                result = handle_registrar_pago(payload)
            elif operation == "LIST_FACTURAS":
                result = handle_list_facturas(payload)
            elif operation == "GET_FACTURA":
                result = handle_get_factura(payload)
            elif operation == "FACTURA_BY_ORDEN":
                result = handle_factura_by_orden(payload)
            elif operation == "REPORTE_INGRESOS":
                result = handle_reporte_ingresos(payload)
            else:
                result = {"status": "error", "error_code": "OPERATION_NOT_FOUND", "error_message": f"Operación '{operation}' no soportada", "status_code": 400}
            if request_id:
                result["request_id"] = request_id
            send_message(sock, SERVICE_NAME, json.dumps(result))
        except Exception as e:
            print(f"Error: {e}")
            try:
                send_message(sock, SERVICE_NAME, json.dumps({"status": "error", "error_message": str(e)}))
            except:
                pass

if __name__ == "__main__":
    main()