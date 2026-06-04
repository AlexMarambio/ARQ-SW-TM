import json
import os
import psycopg
from soa_lib import connect_to_bus, send_message, receive_message

# ================= CONFIGURACIÓN =================
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://repararia:repararia_dev@postgres:5432/repararia")
SERVICE_NAME = "inven"   # 5 caracteres

# ================= FUNCIONES BASE =================
def get_db_connection():
    return psycopg.connect(DATABASE_URL)

def repuesto_to_dict(row):
    """Convierte una fila de repuesto en diccionario."""
    return {
        "id_repuesto": row[0],
        "nombre": row[1],
        "descripcion": row[2],
        "sku": row[3],
        "stock": row[4],
        "precio_unitario": float(row[5]) if row[5] else 0.0
    }

# ================= MANEJADORES =================
def handle_list_repuestos(payload):
    """Lista repuestos con paginación y filtros."""
    limit = int(payload.get("limit", 100))
    offset = int(payload.get("offset", 0))
    search = payload.get("search", "")
    conn = get_db_connection()
    cur = conn.cursor()
    query = """
        SELECT id_repuesto, nombre, descripcion, sku, stock, precio_unitario
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
    """Crea un nuevo repuesto."""
    nombre = payload.get("nombre")
    descripcion = payload.get("descripcion")
    sku = payload.get("sku")
    stock = payload.get("stock", 0)
    precio_unitario = payload.get("precio_unitario", 0)
    
    if not nombre or not sku:
        return {
            "status": "error",
            "error_code": "VALIDATION_ERROR",
            "error_message": "Faltan nombre o sku",
            "status_code": 400
        }
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO repuesto (nombre, descripcion, sku, stock, precio_unitario) "
            "VALUES (%s, %s, %s, %s, %s) RETURNING id_repuesto",
            (nombre, descripcion, sku, stock, precio_unitario)
        )
        new_id = cur.fetchone()[0]
        conn.commit()
        # Recuperar el repuesto recién creado
        cur.execute("SELECT * FROM repuesto WHERE id_repuesto = %s", (new_id,))
        new_repuesto = repuesto_to_dict(cur.fetchone())
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
    """Obtiene un repuesto por ID."""
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
    """Actualiza un repuesto."""
    repuesto_id = payload.get("id_repuesto")
    if not repuesto_id:
        return {"status": "error", "error_code": "VALIDATION_ERROR", "error_message": "Se requiere id_repuesto", "status_code": 400}
    allowed_fields = ["nombre", "descripcion", "sku", "stock", "precio_unitario"]
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
        # Obtener el repuesto actualizado
        cur.execute("SELECT * FROM repuesto WHERE id_repuesto = %s", (repuesto_id,))
        updated = repuesto_to_dict(cur.fetchone())
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
    """Elimina un repuesto (solo si no está asociado a órdenes)."""
    repuesto_id = payload.get("id_repuesto")
    if not repuesto_id:
        return {"status": "error", "error_code": "VALIDATION_ERROR", "error_message": "Se requiere id_repuesto", "status_code": 400}
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Verificar si está asociado a alguna orden
        cur.execute("SELECT id_orden FROM orden_repuesto WHERE id_repuesto = %s LIMIT 1", (repuesto_id,))
        if cur.fetchone():
            return {"status": "error", "error_code": "CONFLICT", "error_message": "El repuesto está asociado a órdenes", "status_code": 409}
        cur.execute("DELETE FROM repuesto WHERE id_repuesto = %s RETURNING id_repuesto", (repuesto_id,))
        if cur.rowcount == 0:
            return {"status": "error", "error_code": "NOT_FOUND", "error_message": "Repuesto no encontrado", "status_code": 404}
        conn.commit()
        return {"status": "success", "data": {"id_repuesto": repuesto_id, "deleted": True}}
    except Exception as e:
        conn.rollback()
        return {"status": "error", "error_code": "DB_ERROR", "error_message": str(e), "status_code": 500}
    finally:
        cur.close()
        conn.close()

def handle_get_alertas_stock(payload):
    """Lista repuestos con stock bajo el umbral."""
    umbral = int(payload.get("umbral", 5))
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id_repuesto, nombre, sku, stock FROM repuesto WHERE stock < %s ORDER BY stock ASC",
        (umbral,)
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()
    alertas = [{"id_repuesto": r[0], "nombre": r[1], "sku": r[2], "stock": r[3]} for r in rows]
    return {"status": "success", "data": alertas}

def handle_ajustar_stock(payload):
    repuesto_id = payload.get("id_repuesto")
    nuevo_stock = payload.get("nuevo_stock")
    if not repuesto_id or nuevo_stock is None:
        return {"status": "error", "error_code": "VALIDATION_ERROR", "error_message": "Se requiere id_repuesto y nuevo_stock", "status_code": 400}
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("UPDATE repuesto SET stock = %s WHERE id_repuesto = %s RETURNING id_repuesto", (nuevo_stock, repuesto_id))
        if cur.rowcount == 0:
            return {"status": "error", "error_code": "NOT_FOUND", "error_message": "Repuesto no encontrado", "status_code": 404}
        conn.commit()
        return {"status": "success", "data": {"id_repuesto": repuesto_id, "nuevo_stock": nuevo_stock}}
    except Exception as e:
        conn.rollback()
        return {"status": "error", "error_code": "DB_ERROR", "error_message": str(e), "status_code": 500}
    finally:
        cur.close()
        conn.close()

def handle_get_by_sku(payload):
    """Busca repuesto por SKU."""
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

            if operation == "LIST_REPUESTOS":
                result = handle_list_repuestos(payload)
            elif operation == "CREATE_REPUESTO":
                result = handle_create_repuesto(payload)
            elif operation == "GET_REPUESTO":
                result = handle_get_repuesto(payload)
            elif operation == "UPDATE_REPUESTO":
                result = handle_update_repuesto(payload)
            elif operation == "DELETE_REPUESTO":
                result = handle_delete_repuesto(payload)
            elif operation == "GET_ALERTAS_STOCK":
                result = handle_get_alertas_stock(payload)
            elif operation == "AJUSTAR_STOCK":
                result = handle_ajustar_stock(payload)
            elif operation == "GET_REPUESTO_BY_SKU":
                result = handle_get_by_sku(payload)
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