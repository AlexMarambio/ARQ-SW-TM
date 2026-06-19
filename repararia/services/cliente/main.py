import json
import os
import psycopg
from soa_lib import connect_to_bus, send_message, receive_message
from auditoria_utils import registrar_auditoria

# ================= CONFIGURACIÓN =================
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://repararia:repararia_dev@postgres:5432/repararia")
SERVICE_NAME = "clien"   # 5 caracteres

# ================= FUNCIONES DE BASE DE DATOS =================
def get_db_connection():
    return psycopg.connect(DATABASE_URL)

def cliente_to_dict(row):
    """Convierte una fila de cliente en diccionario."""
    return {
        "id_cliente": row[0],
        "rut": row[1],
        "email": row[2],
        "nombre": row[3],
        "telefono": row[4],
        "direccion": row[5],
        "fecha_registro": row[6].isoformat() if row[6] else None
    }

# ================= MANEJADORES DE OPERACIONES =================
def handle_list_clientes(payload):
    """Lista clientes con paginación y filtros simples."""
    limit = int(payload.get("limit", 100))
    offset = int(payload.get("offset", 0))
    search = payload.get("search", "")
    conn = get_db_connection()
    cur = conn.cursor()
    query = """
        SELECT id_cliente, rut, email, nombre, telefono, direccion, fecha_registro
        FROM cliente
        WHERE (nombre ILIKE %s OR rut ILIKE %s OR email ILIKE %s)
        ORDER BY id_cliente
        LIMIT %s OFFSET %s
    """
    like = f"%{search}%"
    cur.execute(query, (like, like, like, limit, offset))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    clientes = [cliente_to_dict(row) for row in rows]
    return {"status": "success", "data": clientes}

def handle_create_cliente(payload):
    auth = payload.get("auth") or {}
    id_usuario = auth.get("user_id")
    """Crea un nuevo cliente."""
    rut = payload.get("rut")
    email = payload.get("email")
    nombre = payload.get("nombre")
    telefono = payload.get("telefono")
    direccion = payload.get("direccion")
    if not rut or not email or not nombre:
        return {
            "status": "error",
            "error_code": "VALIDATION_ERROR",
            "error_message": "Faltan campos obligatorios (rut, email, nombre)",
            "status_code": 400
        }
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO cliente (rut, email, nombre, telefono, direccion) VALUES (%s, %s, %s, %s, %s) RETURNING id_cliente",
            (rut, email, nombre, telefono, direccion)
        )
        new_id = cur.fetchone()[0]
        conn.commit()
        # Recuperar el cliente recién creado
        cur.execute(
            "SELECT id_cliente, rut, email, nombre, telefono, direccion, fecha_registro FROM cliente WHERE id_cliente = %s",
            (new_id,)
        )
        new_cliente = cliente_to_dict(cur.fetchone())
        registrar_auditoria(
            id_usuario=id_usuario,
            accion="CREATE",
            entidad="cliente",
            entidad_id=new_id,
            detalle=f"Cliente creado: {nombre} (RUT: {rut})"
        )

        return {"status": "success", "data": new_cliente}
    
    except psycopg.IntegrityError as e:
        conn.rollback()
        if "cliente_rut_key" in str(e):
            return {"status": "error", "error_code": "CONFLICT", "error_message": "El RUT ya existe", "status_code": 409}
        if "cliente_email_key" in str(e):
            return {"status": "error", "error_code": "CONFLICT", "error_message": "El email ya existe", "status_code": 409}
        return {"status": "error", "error_code": "DB_ERROR", "error_message": str(e), "status_code": 500}
    finally:
        cur.close()
        conn.close()

def handle_get_cliente(payload):
    """Obtiene un cliente por ID."""
    cliente_id = payload.get("id_cliente")
    if not cliente_id:
        return {"status": "error", "error_code": "VALIDATION_ERROR", "error_message": "Se requiere id_cliente", "status_code": 400}
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id_cliente, rut, email, nombre, telefono, direccion, fecha_registro FROM cliente WHERE id_cliente = %s",
        (cliente_id,)
    )
    row = cur.fetchone()
    cur.close()
    conn.close()
    if not row:
        return {"status": "error", "error_code": "NOT_FOUND", "error_message": "Cliente no encontrado", "status_code": 404}
    return {"status": "success", "data": cliente_to_dict(row)}

def handle_update_cliente(payload):
    """Actualiza un cliente existente."""
    auth = payload.get("auth") or {}
    id_usuario = auth.get("user_id")
    cliente_id = payload.get("id_cliente")
    if not cliente_id:
        return {"status": "error", "error_code": "VALIDATION_ERROR", "error_message": "Se requiere id_cliente", "status_code": 400}
    # Construir dinámicamente los campos a actualizar
    allowed_fields = ["rut", "email", "nombre", "telefono", "direccion"]
    updates = []
    values = []
    campos_actualizados = []
    for field in allowed_fields:
        if field in payload:
            updates.append(f"{field} = %s")
            values.append(payload[field])
            campos_actualizados.append(field)
    if not updates:
        return {"status": "error", "error_code": "VALIDATION_ERROR", "error_message": "No hay campos para actualizar", "status_code": 400}
    values.append(cliente_id)
    query = f"UPDATE cliente SET {', '.join(updates)} WHERE id_cliente = %s RETURNING id_cliente"
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(query, values)
        if cur.rowcount == 0:
            return {"status": "error", "error_code": "NOT_FOUND", "error_message": "Cliente no encontrado", "status_code": 404}
        conn.commit()

        registrar_auditoria(
            id_usuario=id_usuario,
            accion="UPDATE",
            entidad="cliente",
            entidad_id=cliente_id,
            detalle=f"Cliente ID {cliente_id} actualizado. Campos modificados: {', '.join(campos_actualizados)}"
        )
        # Obtener el cliente actualizado
        cur.execute(
            "SELECT id_cliente, rut, email, nombre, telefono, direccion, fecha_registro FROM cliente WHERE id_cliente = %s",
            (cliente_id,)
        )
        updated = cliente_to_dict(cur.fetchone())
        return {"status": "success", "data": updated}
    except psycopg.IntegrityError as e:
        conn.rollback()
        if "cliente_rut_key" in str(e):
            return {"status": "error", "error_code": "CONFLICT", "error_message": "El RUT ya existe", "status_code": 409}
        if "cliente_email_key" in str(e):
            return {"status": "error", "error_code": "CONFLICT", "error_message": "El email ya existe", "status_code": 409}
        return {"status": "error", "error_code": "DB_ERROR", "error_message": str(e), "status_code": 500}
    finally:
        cur.close()
        conn.close()

def handle_delete_cliente(payload):
    """Elimina (borrado físico) un cliente. Ojo: eliminará en cascada sus vehículos y órdenes."""
    auth = payload.get("auth") or {}
    id_usuario = auth.get("user_id")
    cliente_id = payload.get("id_cliente")
    if not cliente_id:
        return {"status": "error", "error_code": "VALIDATION_ERROR", "error_message": "Se requiere id_cliente", "status_code": 400}
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT nombre, rut FROM cliente WHERE id_cliente = %s", (cliente_id,))
        cliente = cur.fetchone()
        if not cliente:
            return {"status": "error", "error_code": "NOT_FOUND", "error_message": "Cliente no encontrado", "status_code": 404}
        nombre, rut = cliente

        # Eliminar
        cur.execute("DELETE FROM cliente WHERE id_cliente = %s RETURNING id_cliente", (cliente_id,))

        registrar_auditoria(
            id_usuario=id_usuario,
            accion="DELETE",
            entidad="cliente",
            entidad_id=cliente_id,
            detalle=f"Cliente eliminado: {nombre} (RUT: {rut})"
        )
        return {"status": "success", "data": {"id_cliente": cliente_id, "deleted": True}}
    except Exception as e:
        conn.rollback()
        return {"status": "error", "error_code": "DB_ERROR", "error_message": str(e), "status_code": 500}
    finally:
        cur.close()
        conn.close()

# ================= BUCLE PRINCIPAL =================
def main():
    BUS_HOST = os.getenv("BUS_HOST", "localhost")
    BUS_PORT = int(os.getenv("BUS_PORT", "5000"))
    sock = connect_to_bus(BUS_HOST, BUS_PORT)

    # Registrar servicio en el bus
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
            # Extraer payload (saltar 5 bytes del nombre)
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
            auth = req.get("auth", {})  # No se usa en este servicio, pero podría para auditoría
            request_id = req.get("request_id")

            print(f"Operación: {operation}, request_id: {request_id}")

            if operation == "LIST_CLIENTES":
                result = handle_list_clientes(payload)
            elif operation == "CREATE_CLIENTE":
                payload["auth"] = auth 
                result = handle_create_cliente(payload)
            elif operation == "GET_CLIENTE":
                result = handle_get_cliente(payload)
            elif operation == "UPDATE_CLIENTE":
                payload["auth"] = auth
                result = handle_update_cliente(payload)
            elif operation == "DELETE_CLIENTE":
                payload["auth"] = auth
                result = handle_delete_cliente(payload)
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