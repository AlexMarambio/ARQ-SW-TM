import json
import os
import psycopg
from soa_lib import connect_to_bus, send_message, receive_message

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://repararia:repararia_dev@postgres:5432/repararia")
SERVICE_NAME = "audit"

def get_db_connection():
    return psycopg.connect(DATABASE_URL)

def handle_listar_eventos(payload):
    limit = min(int(payload.get("limit", 50)), 100)
    offset = int(payload.get("offset", 0))
    entidad = payload.get("entidad")
    id_usuario = payload.get("id_usuario")
    
    conn = get_db_connection()
    cur = conn.cursor()
    query = "SELECT * FROM auditoria WHERE 1=1"
    params = []
    
    if entidad:
        query += " AND entidad = %s"
        params.append(entidad)
    if id_usuario:
        query += " AND id_usuario = %s"
        params.append(id_usuario)
    
    query += " ORDER BY fecha_hora DESC LIMIT %s OFFSET %s"
    params.extend([limit, offset])
    
    cur.execute(query, params)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    
    eventos = []
    for row in rows:
        eventos.append({
            "id_auditoria": row[0],
            "id_usuario": row[1],
            "accion": row[2],
            "entidad": row[3],
            "entidad_id": row[4],
            "detalle": row[5],
            "ip_origen": row[6],
            "fecha_hora": row[7].isoformat() if row[7] else None
        })
    return {"status": "success", "data": eventos}

def handle_get_evento(payload):
    evento_id = payload.get("id_auditoria")
    if not evento_id:
        return {"status": "error", "error_code": "VALIDATION_ERROR", "error_message": "Se requiere id_auditoria", "status_code": 400}
    
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM auditoria WHERE id_auditoria = %s", (evento_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    
    if not row:
        return {"status": "error", "error_code": "NOT_FOUND", "error_message": "Evento no encontrado", "status_code": 404}
    
    return {
        "status": "success",
        "data": {
            "id_auditoria": row[0],
            "id_usuario": row[1],
            "accion": row[2],
            "entidad": row[3],
            "entidad_id": row[4],
            "detalle": row[5],
            "ip_origen": row[6],
            "fecha_hora": row[7].isoformat() if row[7] else None
        }
    }

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
            
            if operation == "LISTAR_EVENTOS":
                result = handle_listar_eventos(payload)
            elif operation == "GET_EVENTO":
                result = handle_get_evento(payload)
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