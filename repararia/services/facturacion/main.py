import json
import os
import psycopg
from datetime import datetime
from decimal import Decimal
from soa_lib import connect_to_bus, send_message, receive_message
from auditoria_utils import registrar_auditoria

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://repararia:repararia_dev@postgres:5432/repararia")
SERVICE_NAME = "factu"   # 5 caracteres

def get_db_connection():
    return psycopg.connect(DATABASE_URL)

def factura_to_dict(row):
    # row: (id_factura, id_orden, fecha_emision, monto_total, estado_pago, metodo_pago)
    return {
        "id_factura": row[0],
        "id_orden": row[1],
        "fecha_emision": row[2].isoformat() if row[2] else None,
        "monto_total": float(row[3]) if row[3] else 0.0,
        "estado_pago": row[4],
        "metodo_pago": row[5]
    }

def handle_create_factura(payload):
    """
    Crea una factura a partir de una orden cerrada.
    Se espera que la orden exista y tenga estado 'entregado' o similar.
    """
    id_orden = payload.get("id_orden")
    if not id_orden:
        return {"status": "error", "error_code": "VALIDATION_ERROR", "error_message": "Se requiere id_orden", "status_code": 400}
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Verificar que la orden exista y obtener su costo_total
        cur.execute("SELECT estado, costo_total FROM orden_trabajo WHERE id_orden = %s", (id_orden,))
        orden = cur.fetchone()
        if not orden:
            return {"status": "error", "error_code": "NOT_FOUND", "error_message": "Orden no encontrada", "status_code": 404}
        estado, costo_total = orden
        if estado != 'entregado':
            return {"status": "error", "error_code": "BAD_REQUEST", "error_message": "La orden aún no está cerrada (entregada)", "status_code": 400}
        # Verificar si ya existe factura para esta orden
        cur.execute("SELECT id_factura FROM factura WHERE id_orden = %s", (id_orden,))
        if cur.fetchone():
            return {"status": "error", "error_code": "CONFLICT", "error_message": "Ya existe una factura para esta orden", "status_code": 409}
        # Crear factura
        fecha_emision = datetime.now()
        estado_pago = "pendiente"
        cur.execute(
            "INSERT INTO factura (id_orden, fecha_emision, monto_total, estado_pago, metodo_pago) "
            "VALUES (%s, %s, %s, %s, NULL) RETURNING id_factura",
            (id_orden, fecha_emision, costo_total, estado_pago)
        )
        factura_id = cur.fetchone()[0]
        conn.commit()
        # Devolver la factura creada
        cur.execute("SELECT * FROM factura WHERE id_factura = %s", (factura_id,))
        new_factura = factura_to_dict(cur.fetchone())

        registrar_auditoria(
            id_usuario=id_usuario,
            accion="CREATE",
            entidad="factura",
            entidad_id=factura_id,
            detalle=f"Factura creada para la orden ID {id_orden}"
        )
        return {"status": "success", "data": new_factura}
    except Exception as e:
        conn.rollback()
        return {"status": "error", "error_code": "DB_ERROR", "error_message": str(e), "status_code": 500}
    finally:
        cur.close()
        conn.close()

def handle_registrar_pago(payload):
    """Registra el pago de una factura."""
    id_factura = payload.get("id_factura")
    metodo_pago = payload.get("metodo_pago")   # 'efectivo', 'transferencia', 'tarjeta'
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
        cur.execute(
            "UPDATE factura SET estado_pago = 'pagado', metodo_pago = %s WHERE id_factura = %s",
            (metodo_pago, id_factura)
        )
        conn.commit()

        registrar_auditoria(
            id_usuario=id_usuario,
            accion="UPDATE",
            entidad="factura",
            entidad_id=id_factura,
            detalle=f"Factura ID {id_factura} actualizada. Estado: pagado, Método de pago: {metodo_pago}"
        )

        return {"status": "success", "data": {"id_factura": id_factura, "estado_pago": "pagado", "metodo_pago": metodo_pago}}
    except Exception as e:
        conn.rollback()
        return {"status": "error", "error_code": "DB_ERROR", "error_message": str(e), "status_code": 500}
    finally:
        cur.close()
        conn.close()

def handle_list_facturas(payload):
    """Lista facturas con paginación y filtros."""
    limit = int(payload.get("limit", 100))
    offset = int(payload.get("offset", 0))
    estado = payload.get("estado")   # 'pendiente', 'pagado', 'anulado'
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
    """Obtiene una factura por ID."""
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
    """Obtiene la factura asociada a una orden."""
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
    """Reporte de ingresos por período (día, mes, año)."""
    periodo = payload.get("periodo", "mes")   # dia, mes, año
    fecha_inicio = payload.get("fecha_inicio")
    fecha_fin = payload.get("fecha_fin")
    conn = get_db_connection()
    cur = conn.cursor()
    if fecha_inicio and fecha_fin:
        # rango personalizado
        cur.execute(
            "SELECT SUM(monto_total) FROM factura WHERE estado_pago = 'pagado' AND fecha_emision BETWEEN %s AND %s",
            (fecha_inicio, fecha_fin)
        )
    else:
        # períodos predefinidos
        if periodo == "dia":
            cur.execute(
                "SELECT SUM(monto_total) FROM factura WHERE estado_pago = 'pagado' AND DATE(fecha_emision) = CURRENT_DATE"
            )
        elif periodo == "mes":
            cur.execute(
                "SELECT SUM(monto_total) FROM factura WHERE estado_pago = 'pagado' AND "
                "EXTRACT(YEAR_MONTH FROM fecha_emision) = EXTRACT(YEAR_MONTH FROM CURRENT_DATE)"
            )
        elif periodo == "año":
            cur.execute(
                "SELECT SUM(monto_total) FROM factura WHERE estado_pago = 'pagado' AND "
                "EXTRACT(YEAR FROM fecha_emision) = EXTRACT(YEAR FROM CURRENT_DATE)"
            )
        else:
            return {"status": "error", "error_code": "VALIDATION_ERROR", "error_message": "Período inválido", "status_code": 400}
    total = cur.fetchone()[0] or 0.0
    cur.close()
    conn.close()
    return {"status": "success", "data": {"total_ingresos": float(total)}}

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
                print("Conexión con el bus perdida. Reintentando...")
                break
            service_name_received = raw[:5].decode().strip()
            if service_name_received != SERVICE_NAME:
                print(f"Mensaje para otro servicio: {service_name_received}, ignorando.")
                continue
            payload_bytes = raw[5:]
            if not payload_bytes:
                print("Payload vacío")
                continue
            req = json.loads(payload_bytes.decode('utf-8'))
            operation = req.get("operation")
            payload = req.get("payload", {})
            request_id = req.get("request_id")

            print(f"Operación: {operation}, request_id: {request_id}")

            if operation == "CREATE_FACTURA":
                result = handle_create_factura(payload)
            elif operation == "REGISTRAR_PAGO":
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
                result = {
                    "status": "error",
                    "error_code": "OPERATION_NOT_FOUND",
                    "error_message": f"Operación '{operation}' no soportada",
                    "status_code": 400
                }

            if request_id:
                result["request_id"] = request_id

            send_message(sock, SERVICE_NAME, json.dumps(result))
            print(f"Respuesta enviada para {operation}")

        except Exception as e:
            print(f"Error en bucle principal: {e}")
            try:
                error_resp = {"status": "error", "error_code": "INTERNAL_SERVER_ERROR", "error_message": str(e)}
                send_message(sock, SERVICE_NAME, json.dumps(error_resp))
            except:
                pass

if __name__ == "__main__":
    main()