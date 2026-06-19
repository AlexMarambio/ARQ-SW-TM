import os, json, uuid
from fastapi import HTTPException
from soa_lib import connect_to_bus, send_message, receive_message, flush_socket
import logging

logger = logging.getLogger(__name__)

BUS_HOST = os.getenv("BUS_HOST", "bus")
BUS_PORT = int(os.getenv("BUS_PORT", 5000))

def call_service(service_name: str, operation: str, payload: dict, auth: dict = None):
    sock = connect_to_bus(BUS_HOST, BUS_PORT)
    flush_socket(sock)  # Limpiar cualquier mensaje pendiente
    msg = {"operation": operation, "payload": payload, "auth": auth or {}, "request_id": str(uuid.uuid4())}
    
    msg_str = json.dumps(msg)
    print(f"[DEBUG] Enviando a {service_name}: {msg_str[:200]}...")
    send_message(sock, service_name, msg_str)
    
    raw = receive_message(sock)
    sock.close()
    
    print(f"[DEBUG] Longitud raw recibida: {len(raw)} bytes")
    print(f"[DEBUG] Prefijo (7 bytes): {raw[:7]}")
    
    if len(raw) < 7:
        raise HTTPException(500, "Respuesta inválida del bus")
    
    # Intentar decodificar
    try:
        json_part = raw[7:].decode('utf-8')
        print(f"[DEBUG] JSON decodificado longitud: {len(json_part)} chars")
        print(f"[DEBUG] JSON primeros 200 chars: {json_part[:200]}")
        print(f"[DEBUG] JSON últimos 100 chars: {json_part[-100:]}")
    except Exception as e:
        print(f"[ERROR] Error decodificando: {e}")
        print(f"[ERROR] Bytes raw[7:100]: {raw[7:100]}")
        raise HTTPException(500, f"Error decodificando respuesta: {str(e)}")
    
    # Verificar si el JSON está completo
    if not json_part.endswith('}'):
        print(f"[WARN] El JSON no termina con '}}' - puede estar truncado")
        # Intentar encontrar el último '}' válido
        last_brace = json_part.rfind('}')
        if last_brace != -1:
            json_part = json_part[:last_brace+1]
            print(f"[WARN] Recortado hasta el último '}}'")
    
    try:
        resp = json.loads(json_part)
    except json.JSONDecodeError as e:
        print(f"[ERROR] JSON inválido: {e}")
        print(f"[ERROR] String problemático: {json_part[e.pos-50:e.pos+50]}")
        raise HTTPException(500, f"Respuesta inválida del servicio {service_name}")
    
    if resp.get("status") != "success":
        raise HTTPException(status_code=resp.get("status_code", 400), detail=resp.get("error_message", "Error"))
    
    return resp.get("data")