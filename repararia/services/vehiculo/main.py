import json
import os
import psycopg
from soa_lib import connect_to_bus, send_message, receive_message
from auditoria_utils import registrar_auditoria

# ================= CONFIGURACIÓN =================
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://repararia:repararia_dev@postgres:5432/repararia")
SERVICE_NAME = "vehic"   # 5 caracteres

# ================= FUNCIONES DE BASE DE DATOS =================
def get_db_connection():
    return psycopg.connect(DATABASE_URL)

def vehiculo_to_dict(row):
    """Convierte una fila de vehiculo en diccionario."""
    return {
        "id_vehiculo": row[0],
        "id_cliente": row[1],
        "marca": row[2],
        "modelo": row[3],
        "anio": row[4],
        "patente": row[5],
        "kilometraje": row[6],
        "color": row[7],
        "fecha_registro": row[8].isoformat() if row[8] else None
    }

# ================= MANEJADORES DE OPERACIONES =================
def handle_list_vehiculos(payload):
    """Lista vehículos con paginación y filtros."""
    limit = int(payload.get("limit", 100))
    offset = int(payload.get("offset", 0))
    search = payload.get("search", "")
    conn = get_db_connection()
    cur = conn.cursor()
    query = """
        SELECT id_vehiculo, id_cliente, marca, modelo, anio, patente, kilometraje, color, fecha_registro
        FROM vehiculo
        WHERE (marca ILIKE %s OR modelo ILIKE %s OR patente ILIKE %s)
        ORDER BY id_vehiculo
        LIMIT %s OFFSET %s
    """
    like = f"%{search}%"
    cur.execute(query, (like, like, like, limit, offset))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    vehiculos = [vehiculo_to_dict(row) for row in rows]
    return {"status": "success", "data": vehiculos}

def handle_create_vehiculo(payload):
    """Crea un nuevo vehículo asociado a un cliente."""
    auth = payload.get("auth") or {}
    id_usuario = auth.get("user_id")
    id_cliente = payload.get("id_cliente")
    marca = payload.get("marca")
    modelo = payload.get("modelo")
    anio = payload.get("anio")
    patente = payload.get("patente")
    kilometraje = payload.get("kilometraje", 0)
    color = payload.get("color")
    
    if not all([id_cliente, marca, modelo, anio, patente]):
        return {
            "status": "error",
            "error_code": "VALIDATION_ERROR",
            "error_message": "Faltan campos obligatorios (id_cliente, marca, modelo, anio, patente)",
            "status_code": 400
        }
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Verificar que el cliente exista
        cur.execute("SELECT id_cliente FROM cliente WHERE id_cliente = %s", (id_cliente,))
        if not cur.fetchone():
            return {"status": "error", "error_code": "NOT_FOUND", "error_message": "Cliente no existe", "status_code": 404}
        
        cur.execute(
            "INSERT INTO vehiculo (id_cliente, marca, modelo, anio, patente, kilometraje, color) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id_vehiculo",
            (id_cliente, marca, modelo, anio, patente, kilometraje, color)
        )
        new_id = cur.fetchone()[0]
        conn.commit()
        # Obtener el vehículo recién creado
        cur.execute(
            "SELECT id_vehiculo, id_cliente, marca, modelo, anio, patente, kilometraje, color, fecha_registro "
            "FROM vehiculo WHERE id_vehiculo = %s",
            (new_id,)
        )
        new_vehiculo = vehiculo_to_dict(cur.fetchone())
        registrar_auditoria(
            id_usuario=id_usuario,
            accion="CREATE",
            entidad="vehiculo",
            entidad_id=new_id,
            detalle=f"Vehículo creado: {marca} {modelo} (Patente: {patente})"
        )

        return {"status": "success", "data": new_vehiculo}
    except psycopg.IntegrityError as e:
        conn.rollback()
        if "vehiculo_patente_key" in str(e):
            return {"status": "error", "error_code": "CONFLICT", "error_message": "La patente ya existe", "status_code": 409}
        return {"status": "error", "error_code": "DB_ERROR", "error_message": str(e), "status_code": 500}
    finally:
        cur.close()
        conn.close()

def handle_get_vehiculo(payload):
    """Obtiene un vehículo por ID."""
    vehiculo_id = payload.get("id_vehiculo")
    if not vehiculo_id:
        return {"status": "error", "error_code": "VALIDATION_ERROR", "error_message": "Se requiere id_vehiculo", "status_code": 400}
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id_vehiculo, id_cliente, marca, modelo, anio, patente, kilometraje, color, fecha_registro "
        "FROM vehiculo WHERE id_vehiculo = %s",
        (vehiculo_id,)
    )
    row = cur.fetchone()
    cur.close()
    conn.close()
    if not row:
        return {"status": "error", "error_code": "NOT_FOUND", "error_message": "Vehículo no encontrado", "status_code": 404}
    return {"status": "success", "data": vehiculo_to_dict(row)}

def handle_update_vehiculo(payload):
    """Actualiza un vehículo existente."""
    auth = payload.get("auth") or {}
    id_usuario = auth.get("user_id")
    vehiculo_id = payload.get("id_vehiculo")
    if not vehiculo_id:
        return {"status": "error", "error_code": "VALIDATION_ERROR", "error_message": "Se requiere id_vehiculo", "status_code": 400}
    allowed_fields = ["marca", "modelo", "anio", "patente", "kilometraje", "color"]
    updates = []
    values = []
    for field in allowed_fields:
        if field in payload:
            updates.append(f"{field} = %s")
            values.append(payload[field])
    if not updates:
        return {"status": "error", "error_code": "VALIDATION_ERROR", "error_message": "No hay campos para actualizar", "status_code": 400}
    values.append(vehiculo_id)
    query = f"UPDATE vehiculo SET {', '.join(updates)} WHERE id_vehiculo = %s RETURNING id_vehiculo"
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(query, values)
        if cur.rowcount == 0:
            return {"status": "error", "error_code": "NOT_FOUND", "error_message": "Vehículo no encontrado", "status_code": 404}
        conn.commit()
        # Obtener el vehículo actualizado
        cur.execute(
            "SELECT id_vehiculo, id_cliente, marca, modelo, anio, patente, kilometraje, color, fecha_registro "
            "FROM vehiculo WHERE id_vehiculo = %s",
            (vehiculo_id,)
        )
        updated = vehiculo_to_dict(cur.fetchone())
        registrar_auditoria(
            id_usuario=id_usuario,
            accion="UPDATE",
            entidad="vehiculo",
            entidad_id=vehiculo_id,
            detalle=f"Vehículo ID {vehiculo_id} actualizado"
        )
        return {"status": "success", "data": updated}
    except psycopg.IntegrityError as e:
        conn.rollback()
        if "vehiculo_patente_key" in str(e):
            return {"status": "error", "error_code": "CONFLICT", "error_message": "La patente ya existe", "status_code": 409}
        return {"status": "error", "error_code": "DB_ERROR", "error_message": str(e), "status_code": 500}
    finally:
        cur.close()
        conn.close()

def handle_delete_vehiculo(payload):
    """Elimina un vehículo (borrado físico)."""
    auth = payload.get("auth") or {}
    id_usuario = auth.get("user_id")
    vehiculo_id = payload.get("id_vehiculo")
    if not vehiculo_id:
        return {"status": "error", "error_code": "VALIDATION_ERROR", "error_message": "Se requiere id_vehiculo", "status_code": 400}
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("DELETE FROM vehiculo WHERE id_vehiculo = %s RETURNING id_vehiculo", (vehiculo_id,))
        if cur.rowcount == 0:
            return {"status": "error", "error_code": "NOT_FOUND", "error_message": "Vehículo no encontrado", "status_code": 404}
        conn.commit()
        registrar_auditoria(
            id_usuario=id_usuario,
            accion="DELETE",
            entidad="vehiculo",
            entidad_id=vehiculo_id,
            detalle=f"Vehículo eliminado: ID {vehiculo_id}"
        )
        return {"status": "success", "data": {"id_vehiculo": vehiculo_id, "deleted": True}}
    except Exception as e:
        conn.rollback()
        return {"status": "error", "error_code": "DB_ERROR", "error_message": str(e), "status_code": 500}
    finally:
        cur.close()
        conn.close()

def handle_vehiculos_by_cliente(payload):
    """Lista vehículos de un cliente específico."""
    cliente_id = payload.get("id_cliente")
    if not cliente_id:
        return {"status": "error", "error_code": "VALIDATION_ERROR", "error_message": "Se requiere id_cliente", "status_code": 400}
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id_vehiculo, id_cliente, marca, modelo, anio, patente, kilometraje, color, fecha_registro "
        "FROM vehiculo WHERE id_cliente = %s ORDER BY id_vehiculo",
        (cliente_id,)
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()
    vehiculos = [vehiculo_to_dict(row) for row in rows]
    return {"status": "success", "data": vehiculos}

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
            auth = req.get("auth", {})
            request_id = req.get("request_id")

            print(f"Operación: {operation}, request_id: {request_id}")

            if operation == "LIST_VEHICULOS":
                result = handle_list_vehiculos(payload)
            elif operation == "CREATE_VEHICULO":
                payload["auth"] = auth
                result = handle_create_vehiculo(payload)
            elif operation == "GET_VEHICULO":
                result = handle_get_vehiculo(payload)
            elif operation == "UPDATE_VEHICULO":
                payload["auth"] = auth
                result = handle_update_vehiculo(payload)
            elif operation == "DELETE_VEHICULO":
                payload["auth"] = auth
                result = handle_delete_vehiculo(payload)
            elif operation == "VEHICULOS_BY_CLIENTE":
                result = handle_vehiculos_by_cliente(payload)
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