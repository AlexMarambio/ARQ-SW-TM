import json
import os
import psycopg
from datetime import datetime, date
from decimal import Decimal
from soa_lib import connect_to_bus, send_message, receive_message
from auditoria_utils import registrar_auditoria

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://repararia:repararia_dev@postgres:5432/repararia")
SERVICE_NAME = "orden"   # 5 caracteres

def get_db_connection():
    return psycopg.connect(DATABASE_URL)

def orden_to_dict(row):
    # row: (id_orden, id_cliente, id_vehiculo, id_mecanico, fecha_ingreso, fecha_estimada, fecha_entrega,
    #       descripcion_problema, diagnostico, trabajos_realizados, estado, costo_total, observaciones)
    return {
        "id_orden": row[0],
        "id_cliente": row[1],
        "id_vehiculo": row[2],
        "id_mecanico": row[3],
        "fecha_ingreso": row[4].isoformat() if row[4] else None,
        "fecha_estimada": row[5].isoformat() if row[5] else None,
        "fecha_entrega": row[6].isoformat() if row[6] else None,
        "descripcion_problema": row[7],
        "diagnostico": row[8],
        "trabajos_realizados": row[9],
        "estado": row[10],
        "costo_total": float(row[11]) if row[11] else 0.0,
        "observaciones": row[12]
    }

def orden_repuesto_to_dict(row):
    return {
        "id_orden": row[0],
        "id_repuesto": row[1],
        "cantidad": row[2],
        "precio_unitario_momento": float(row[3])
    }

# ================= MANEJADORES =================
def handle_list_ordenes(payload):
    limit = min(int(payload.get("limit", 5)), 10)   # Máximo 10 registros
    offset = int(payload.get("offset", 0))
    estado = payload.get("estado")
    conn = get_db_connection()
    cur = conn.cursor()
    query = """
        SELECT o.id_orden, o.estado, o.fecha_ingreso, o.costo_total,
               c.nombre as cliente_nombre, v.patente
        FROM orden_trabajo o
        JOIN cliente c ON o.id_cliente = c.id_cliente
        JOIN vehiculo v ON o.id_vehiculo = v.id_vehiculo
    """
    params = []
    if estado:
        query += " WHERE o.estado = %s"
        params.append(estado)
    query += " ORDER BY o.id_orden LIMIT %s OFFSET %s"
    params.extend([limit, offset])
    cur.execute(query, params)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    ordenes = []
    for row in rows:
        ordenes.append({
            "id_orden": row[0],
            "estado": row[1],
            "fecha_ingreso": row[2].isoformat() if row[2] else None,
            "costo_total": float(row[3]) if row[3] else 0.0,
            "cliente": row[4],
            "patente": row[5]
        })
    return {"status": "success", "data": ordenes}

def handle_create_orden(payload):
    # Campos requeridos: id_cliente, id_vehiculo, descripcion_problema
    id_cliente = payload.get("id_cliente")
    id_vehiculo = payload.get("id_vehiculo")
    id_mecanico = payload.get("id_mecanico")  # opcional
    descripcion_problema = payload.get("descripcion_problema")
    fecha_estimada = payload.get("fecha_estimada")  # string ISO date
    if not all([id_cliente, id_vehiculo, descripcion_problema]):
        return {"status": "error", "error_code": "VALIDATION_ERROR", "error_message": "Faltan campos obligatorios", "status_code": 400}
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Verificar cliente y vehículo
        cur.execute("SELECT id_cliente FROM cliente WHERE id_cliente = %s", (id_cliente,))
        if not cur.fetchone():
            return {"status": "error", "error_code": "NOT_FOUND", "error_message": "Cliente no existe", "status_code": 404}
        cur.execute("SELECT id_vehiculo FROM vehiculo WHERE id_vehiculo = %s", (id_vehiculo,))
        if not cur.fetchone():
            return {"status": "error", "error_code": "NOT_FOUND", "error_message": "Vehículo no existe", "status_code": 404}
        # Si id_mecanico se proporciona, verificar que sea un usuario con rol 'mecanico' o 'administrador'
        if id_mecanico:
            cur.execute("SELECT id_usuario FROM usuario WHERE id_usuario = %s AND rol IN ('mecanico','administrador')", (id_mecanico,))
            if not cur.fetchone():
                return {"status": "error", "error_code": "VALIDATION_ERROR", "error_message": "Mecánico inválido", "status_code": 400}
        estado = "pendiente"
        fecha_ingreso = datetime.now()
        cur.execute(
            "INSERT INTO orden_trabajo (id_cliente, id_vehiculo, id_mecanico, fecha_ingreso, fecha_estimada, descripcion_problema, estado, costo_total) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, 0) RETURNING id_orden",
            (id_cliente, id_vehiculo, id_mecanico, fecha_ingreso, fecha_estimada, descripcion_problema, estado)
        )
        new_id = cur.fetchone()[0]
        conn.commit()
        cur.execute("SELECT * FROM orden_trabajo WHERE id_orden = %s", (new_id,))
        new_orden = orden_to_dict(cur.fetchone())
        registrar_auditoria(
            id_usuario=id_usuario,
            accion="CREATE",
            entidad="orden_trabajo",
            entidad_id=new_id,
            detalle=f"Orden creada para el cliente ID {id_cliente}"
        )
        return {"status": "success", "data": new_orden}
    except Exception as e:
        conn.rollback()
        return {"status": "error", "error_code": "DB_ERROR", "error_message": str(e), "status_code": 500}
    finally:
        cur.close()
        conn.close()

def handle_get_orden(payload):
    orden_id = payload.get("id_orden")
    if not orden_id:
        return {"status": "error", "error_code": "VALIDATION_ERROR", "error_message": "Se requiere id_orden", "status_code": 400}
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM orden_trabajo WHERE id_orden = %s", (orden_id,))
    row = cur.fetchone()
    if not row:
        return {"status": "error", "error_code": "NOT_FOUND", "error_message": "Orden no encontrada", "status_code": 404}
    orden = orden_to_dict(row)
    # Obtener repuestos asociados
    cur.execute("SELECT * FROM orden_repuesto WHERE id_orden = %s", (orden_id,))
    repuestos_rows = cur.fetchall()
    orden["repuestos"] = [orden_repuesto_to_dict(r) for r in repuestos_rows]
    cur.close()
    conn.close()
    return {"status": "success", "data": orden}

def handle_update_orden(payload):
    orden_id = payload.get("id_orden")
    if not orden_id:
        return {"status": "error", "error_code": "VALIDATION_ERROR", "error_message": "Se requiere id_orden", "status_code": 400}
    allowed_fields = ["id_mecanico", "fecha_estimada", "diagnostico", "trabajos_realizados", "estado", "observaciones"]
    updates = []
    values = []
    for field in allowed_fields:
        if field in payload:
            updates.append(f"{field} = %s")
            values.append(payload[field])
    if not updates:
        return {"status": "error", "error_code": "VALIDATION_ERROR", "error_message": "No hay campos para actualizar", "status_code": 400}
    values.append(orden_id)
    query = f"UPDATE orden_trabajo SET {', '.join(updates)} WHERE id_orden = %s RETURNING id_orden"
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(query, values)
        if cur.rowcount == 0:
            return {"status": "error", "error_code": "NOT_FOUND", "error_message": "Orden no encontrada", "status_code": 404}
        conn.commit()
        # Devolver orden actualizada
        cur.execute("SELECT * FROM orden_trabajo WHERE id_orden = %s", (orden_id,))
        updated = orden_to_dict(cur.fetchone())
        registrar_auditoria(
            id_usuario=id_usuario,
            accion="UPDATE",
            entidad="orden_trabajo",
            entidad_id=orden_id,
            detalle=f"Orden ID {orden_id} actualizada. Campos modificados: {', '.join(campos_actualizados)}"
        )
        return {"status": "success", "data": updated}
    except Exception as e:
        conn.rollback()
        return {"status": "error", "error_code": "DB_ERROR", "error_message": str(e), "status_code": 500}
    finally:
        cur.close()
        conn.close()

def handle_agregar_repuesto(payload):
    orden_id = payload.get("id_orden")
    repuesto_id = payload.get("id_repuesto")
    cantidad = payload.get("cantidad")
    if not all([orden_id, repuesto_id, cantidad]):
        return {"status": "error", "error_code": "VALIDATION_ERROR", "error_message": "Faltan id_orden, id_repuesto o cantidad", "status_code": 400}
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Verificar orden existe
        cur.execute("SELECT id_orden FROM orden_trabajo WHERE id_orden = %s", (orden_id,))
        if not cur.fetchone():
            return {"status": "error", "error_code": "NOT_FOUND", "error_message": "Orden no encontrada", "status_code": 404}
        # Obtener precio y stock del repuesto
        cur.execute("SELECT precio_unitario, stock FROM repuesto WHERE id_repuesto = %s", (repuesto_id,))
        rep = cur.fetchone()
        if not rep:
            return {"status": "error", "error_code": "NOT_FOUND", "error_message": "Repuesto no encontrado", "status_code": 404}
        precio, stock = rep
        if stock < cantidad:
            return {"status": "error", "error_code": "STOCK_INSUFFICIENT", "error_message": "Stock insuficiente", "status_code": 409}
        # Insertar en orden_repuesto
        cur.execute(
            "INSERT INTO orden_repuesto (id_orden, id_repuesto, cantidad, precio_unitario_momento) VALUES (%s, %s, %s, %s)",
            (orden_id, repuesto_id, cantidad, precio)
        )
        # Actualizar stock
        cur.execute("UPDATE repuesto SET stock = stock - %s WHERE id_repuesto = %s", (cantidad, repuesto_id))
        # Recalcular costo_total (suma de repuestos)
        cur.execute(
            "SELECT COALESCE(SUM(orden_repuesto.cantidad * orden_repuesto.precio_unitario_momento), 0) FROM orden_repuesto WHERE id_orden = %s",
            (orden_id,)
        )
        total_repuestos = cur.fetchone()[0]
        cur.execute("UPDATE orden_trabajo SET costo_total = %s WHERE id_orden = %s", (total_repuestos, orden_id))
        conn.commit()
        return {"status": "success", "data": {"id_orden": orden_id, "id_repuesto": repuesto_id, "cantidad": cantidad, "precio_unitario_momento": float(precio)}}
    except psycopg.IntegrityError as e:
        conn.rollback()
        if "orden_repuesto_pkey" in str(e):
            return {"status": "error", "error_code": "CONFLICT", "error_message": "El repuesto ya está asociado a esta orden", "status_code": 409}
        return {"status": "error", "error_code": "DB_ERROR", "error_message": str(e), "status_code": 500}
    finally:
        cur.close()
        conn.close()

def handle_cerrar_orden(payload):
    orden_id = payload.get("id_orden")
    if not orden_id:
        return {"status": "error", "error_code": "VALIDATION_ERROR", "error_message": "Se requiere id_orden", "status_code": 400}
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Obtener orden actual
        cur.execute("SELECT estado, costo_total FROM orden_trabajo WHERE id_orden = %s", (orden_id,))
        row = cur.fetchone()
        if not row:
            return {"status": "error", "error_code": "NOT_FOUND", "error_message": "Orden no encontrada", "status_code": 404}
        estado, costo_total = row
        if estado == "entregado":
            return {"status": "error", "error_code": "BAD_REQUEST", "error_message": "La orden ya está cerrada", "status_code": 400}
        # Cambiar estado a 'listo' o 'entregado'? Por ahora, si se cierra se pone 'entregado'
        fecha_entrega = datetime.now()
        cur.execute(
            "UPDATE orden_trabajo SET estado = 'entregado', fecha_entrega = %s WHERE id_orden = %s",
            (fecha_entrega, orden_id)
        )
        # Crear factura (placeholder, sin servicio de facturación)
        # Insertar en tabla factura
        cur.execute(
            "INSERT INTO factura (id_orden, monto_total, estado_pago, metodo_pago) VALUES (%s, %s, 'pendiente', NULL) RETURNING id_factura",
            (orden_id, costo_total)
        )
        factura_id = cur.fetchone()[0]
        conn.commit()
        return {"status": "success", "data": {"id_orden": orden_id, "estado": "entregado", "id_factura": factura_id, "costo_total": float(costo_total)}}
    except Exception as e:
        conn.rollback()
        return {"status": "error", "error_code": "DB_ERROR", "error_message": str(e), "status_code": 500}
    finally:
        cur.close()
        conn.close()

def handle_cambiar_estado(payload):
    orden_id = payload.get("id_orden")
    nuevo_estado = payload.get("estado")
    if not orden_id or not nuevo_estado:
        return {"status": "error", "error_code": "VALIDATION_ERROR", "error_message": "Se requiere id_orden y estado", "status_code": 400}
    valid_estados = ['pendiente', 'en_taller', 'en_reparacion', 'listo', 'entregado']
    if nuevo_estado not in valid_estados:
        return {"status": "error", "error_code": "VALIDATION_ERROR", "error_message": "Estado inválido", "status_code": 400}
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("UPDATE orden_trabajo SET estado = %s WHERE id_orden = %s RETURNING id_orden", (nuevo_estado, orden_id))
        if cur.rowcount == 0:
            return {"status": "error", "error_code": "NOT_FOUND", "error_message": "Orden no encontrada", "status_code": 404}
        conn.commit()
        return {"status": "success", "data": {"id_orden": orden_id, "estado": nuevo_estado}}
    except Exception as e:
        conn.rollback()
        return {"status": "error", "error_code": "DB_ERROR", "error_message": str(e), "status_code": 500}
    finally:
        cur.close()
        conn.close()

def handle_publica_orden(payload):
    # Consulta pública por token o patente (simplificado: por id_orden o patente)
    token = payload.get("token_acceso_publico")  # podría ser el id_orden o patente
    if not token:
        return {"status": "error", "error_code": "VALIDATION_ERROR", "error_message": "Se requiere token de acceso", "status_code": 400}
    conn = get_db_connection()
    cur = conn.cursor()
    # Se asume que el token es el id_orden
    try:
        orden_id = int(token)
        cur.execute("SELECT * FROM orden_trabajo WHERE id_orden = %s", (orden_id,))
        row = cur.fetchone()
        if not row:
            return {"status": "error", "error_code": "NOT_FOUND", "error_message": "Orden no encontrada", "status_code": 404}
        orden = orden_to_dict(row)
        # No devolver información sensible
        orden.pop("costo_total", None)
        return {"status": "success", "data": orden}
    except ValueError:
        return {"status": "error", "error_code": "INVALID_TOKEN", "error_message": "Token inválido", "status_code": 400}
    finally:
        cur.close()
        conn.close()

# ================= BUCLE PRINCIPAL =================
def main():
    BUS_HOST = os.getenv("BUS_HOST", "localhost")
    BUS_PORT = int(os.getenv("BUS_PORT", 5000))
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
            if operation == "LIST_ORDENES":
                result = handle_list_ordenes(payload)
            elif operation == "CREATE_ORDEN":
                result = handle_create_orden(payload)
            elif operation == "GET_ORDEN":
                result = handle_get_orden(payload)
            elif operation == "UPDATE_ORDEN":
                result = handle_update_orden(payload)
            elif operation == "AGREGAR_REPUESTO":
                result = handle_agregar_repuesto(payload)
            elif operation == "CERRAR_ORDEN":
                result = handle_cerrar_orden(payload)
            elif operation == "CAMBIAR_ESTADO":
                result = handle_cambiar_estado(payload)
            elif operation == "GET_ORDEN_PUBLICA":
                result = handle_publica_orden(payload)
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