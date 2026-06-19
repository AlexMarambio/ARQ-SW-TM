import json
import os
import psycopg
from soa_lib import connect_to_bus, send_message, receive_message
from auditoria_utils import registrar_auditoria

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://repararia:repararia_dev@postgres:5432/repararia")
SERVICE_NAME = "inven"

def get_db_connection():
    return psycopg.connect(DATABASE_URL)

def repuesto_to_dict(row):
    """Convierte una fila de repuesto en diccionario (con nueva estructura)."""
    return {
        "id_repuesto": row[0],
        "nombre": row[1],
        "descripcion": row[2],
        "sku": row[3],
        "stock_actual": row[4],
        "stock_minimo": row[5],
        "precio_unitario": float(row[6]) if row[6] else 0.0,
        "proveedor": row[7]
    }

def handle_list_repuestos(payload):
    limit = int(payload.get("limit", 100))
    offset = int(payload.get("offset", 0))
    search = payload.get("search", "")
    conn = get_db_connection()
    cur = conn.cursor()
    query = """
        SELECT id_repuesto, nombre, descripcion, sku, stock_actual, stock_minimo, precio_unitario, proveedor
        FROM repuesto
        WHERE (nombre ILIKE %s OR sku ILIKE %s)
        ORDER BY id_repuesto
        LIMIT %s OFFSET %s
    """
    like = f"%{search}%"
    cur.execute(query, (like, like, limit, offset))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    repuestos = [repuesto_to_dict(row) for row in rows]
    return {"status": "success", "data": repuestos}

def handle_create_repuesto(payload):
    data = payload.get("payload", {})



    auth = payload.get("auth") or {}
    id_usuario = auth.get("user_id")
    nombre = data.get("nombre")
    descripcion = data.get("descripcion")
    sku = data.get("sku")
    stock_actual = data.get("stock_actual", 0)
    stock_minimo = data.get("stock_minimo", 5)
    precio_unitario = data.get("precio_unitario", 0.0)
    proveedor = data.get("proveedor")
    
    if not nombre or not sku:
        return {"status": "error", "error_code": "VALIDATION_ERROR", "error_message": "Faltan nombre o sku", "status_code": 400}
    
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """INSERT INTO repuesto (nombre, descripcion, sku, stock_actual, stock_minimo, precio_unitario, proveedor)
               VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id_repuesto""",
            (nombre, descripcion, sku, stock_actual, stock_minimo, precio_unitario, proveedor)
        )
        new_id = cur.fetchone()[0]
        conn.commit()
        cur.execute("SELECT * FROM repuesto WHERE id_repuesto = %s", (new_id,))
        new_repuesto = repuesto_to_dict(cur.fetchone())
        registrar_auditoria(id_usuario, "CREATE", "repuesto", new_id, f"Repuesto creado: {nombre} (SKU: {sku})")
        return {"status": "success", "data": new_repuesto}
    except psycopg.IntegrityError as e:
        conn.rollback()
        if "repuesto_sku_key" in str(e):
            return {"status": "error", "error_code": "CONFLICT", "error_message": "El SKU ya existe", "status_code": 409}
        return {"status": "error", "error_code": "DB_ERROR", "error_message": str(e), "status_code": 500}
    finally:
        cur.close()
        conn.close()

def handle_get_repuesto(payload):
    repuesto_id = payload.get("id_repuesto")
    if not repuesto_id:
        return {"status": "error", "error_code": "VALIDATION_ERROR", "error_message": "Se requiere id_repuesto", "status_code": 400}
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM repuesto WHERE id_repuesto = %s", (repuesto_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    if not row:
        return {"status": "error", "error_code": "NOT_FOUND", "error_message": "Repuesto no encontrado", "status_code": 404}
    return {"status": "success", "data": repuesto_to_dict(row)}

def handle_update_repuesto(payload):
    auth = payload.get("auth") or {}
    id_usuario = auth.get("user_id")
    repuesto_id = payload.get("id_repuesto")
    if not repuesto_id:
        return {"status": "error", "error_code": "VALIDATION_ERROR", "error_message": "Se requiere id_repuesto", "status_code": 400}
    allowed_fields = ["nombre", "descripcion", "sku", "stock_actual", "stock_minimo", "precio_unitario", "proveedor"]
    updates = []
    values = []
    for field in allowed_fields:
        if field in payload:
            updates.append(f"{field} = %s")
            values.append(payload[field])
    if not updates:
        return {"status": "error", "error_code": "VALIDATION_ERROR", "error_message": "No hay campos para actualizar", "status_code": 400}
    values.append(repuesto_id)
    query = f"UPDATE repuesto SET {', '.join(updates)} WHERE id_repuesto = %s RETURNING id_repuesto"
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(query, values)
        if cur.rowcount == 0:
            return {"status": "error", "error_code": "NOT_FOUND", "error_message": "Repuesto no encontrado", "status_code": 404}
        conn.commit()
        cur.execute("SELECT * FROM repuesto WHERE id_repuesto = %s", (repuesto_id,))
        updated = repuesto_to_dict(cur.fetchone())
        registrar_auditoria(id_usuario, "UPDATE", "repuesto", repuesto_id, f"Repuesto ID {repuesto_id} actualizado")
        return {"status": "success", "data": updated}
    except psycopg.IntegrityError as e:
        conn.rollback()
        if "repuesto_sku_key" in str(e):
            return {"status": "error", "error_code": "CONFLICT", "error_message": "El SKU ya existe", "status_code": 409}
        return {"status": "error", "error_code": "DB_ERROR", "error_message": str(e), "status_code": 500}
    finally:
        cur.close()
        conn.close()

def handle_delete_repuesto(payload):
    auth = payload.get("auth") or {}
    id_usuario = auth.get("user_id")
    repuesto_id = payload.get("id_repuesto")
    if not repuesto_id:
        return {"status": "error", "error_code": "VALIDATION_ERROR", "error_message": "Se requiere id_repuesto", "status_code": 400}
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id_orden FROM orden_repuesto WHERE id_repuesto = %s LIMIT 1", (repuesto_id,))
        if cur.fetchone():
            return {"status": "error", "error_code": "CONFLICT", "error_message": "El repuesto está asociado a órdenes", "status_code": 409}
        cur.execute("DELETE FROM repuesto WHERE id_repuesto = %s RETURNING id_repuesto", (repuesto_id,))
        if cur.rowcount == 0:
            return {"status": "error", "error_code": "NOT_FOUND", "error_message": "Repuesto no encontrado", "status_code": 404}
        conn.commit()
        registrar_auditoria(id_usuario, "DELETE", "repuesto", repuesto_id, f"Repuesto eliminado ID {repuesto_id}")
        return {"status": "success", "data": {"id_repuesto": repuesto_id, "deleted": True}}
    except Exception as e:
        conn.rollback()
        return {"status": "error", "error_code": "DB_ERROR", "error_message": str(e), "status_code": 500}
    finally:
        cur.close()
        conn.close()

def handle_get_alertas_stock(payload):
    umbral = int(payload.get("umbral", 5))
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id_repuesto, nombre, sku, stock_actual FROM repuesto WHERE stock_actual < %s ORDER BY stock_actual ASC",
        (umbral,)
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()
    alertas = [{"id_repuesto": r[0], "nombre": r[1], "sku": r[2], "stock_actual": r[3]} for r in rows]
    return {"status": "success", "data": alertas}

def handle_ajustar_stock(payload):
    auth = payload.get("auth") or {}
    id_usuario = auth.get("user_id")
    repuesto_id = payload.get("id_repuesto")
    nuevo_stock = payload.get("nuevo_stock")
    if not repuesto_id or nuevo_stock is None:
        return {"status": "error", "error_code": "VALIDATION_ERROR", "error_message": "Se requiere id_repuesto y nuevo_stock", "status_code": 400}
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("UPDATE repuesto SET stock_actual = %s WHERE id_repuesto = %s RETURNING id_repuesto", (nuevo_stock, repuesto_id))
        if cur.rowcount == 0:
            return {"status": "error", "error_code": "NOT_FOUND", "error_message": "Repuesto no encontrado", "status_code": 404}
        conn.commit()
        registrar_auditoria(id_usuario, "AJUSTAR_STOCK", "repuesto", repuesto_id, f"Nuevo stock: {nuevo_stock}")
        return {"status": "success", "data": {"id_repuesto": repuesto_id, "nuevo_stock": nuevo_stock}}
    except Exception as e:
        conn.rollback()
        return {"status": "error", "error_code": "DB_ERROR", "error_message": str(e), "status_code": 500}
    finally:
        cur.close()
        conn.close()

def handle_get_by_sku(payload):
    sku = payload.get("sku")
    if not sku:
        return {"status": "error", "error_code": "VALIDATION_ERROR", "error_message": "Se requiere sku", "status_code": 400}
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM repuesto WHERE sku = %s", (sku,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    if not row:
        return {"status": "error", "error_code": "NOT_FOUND", "error_message": "Repuesto no encontrado", "status_code": 404}
    return {"status": "success", "data": repuesto_to_dict(row)}

# ================= BUCLE PRINCIPAL ================= (sin cambios estructurales, solo usar payload["auth"])
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
            if operation == "LIST_REPUESTOS":
                result = handle_list_repuestos(payload)
            elif operation == "CREATE_REPUESTO":
                payload["auth"] = auth
                result = handle_create_repuesto(payload)
            elif operation == "GET_REPUESTO":
                result = handle_get_repuesto(payload)
            elif operation == "UPDATE_REPUESTO":
                payload["auth"] = auth
                result = handle_update_repuesto(payload)
            elif operation == "DELETE_REPUESTO":
                payload["auth"] = auth
                result = handle_delete_repuesto(payload)
            elif operation == "GET_ALERTAS_STOCK":
                result = handle_get_alertas_stock(payload)
            elif operation == "AJUSTAR_STOCK":
                payload["auth"] = auth
                result = handle_ajustar_stock(payload)
            elif operation == "GET_REPUESTO_BY_SKU":
                result = handle_get_by_sku(payload)
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