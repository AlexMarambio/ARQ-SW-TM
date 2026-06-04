import os, json, uuid
from fastapi import HTTPException
from soa_lib import connect_to_bus, send_message, receive_message

BUS_HOST = os.getenv("BUS_HOST", "bus")
BUS_PORT = int(os.getenv("BUS_PORT", 5000))

def call_service(service_name: str, operation: str, payload: dict, auth: dict = None):
    sock = connect_to_bus(BUS_HOST, BUS_PORT)
    msg = {"operation": operation, "payload": payload, "auth": auth or {}, "request_id": str(uuid.uuid4())}
    send_message(sock, service_name, json.dumps(msg))
    raw = receive_message(sock)
    sock.close()
    if len(raw) < 7:
        raise HTTPException(500, "Respuesta inválida del bus")
    json_part = raw[7:].decode()
    resp = json.loads(json_part)
    if resp.get("status") != "success":
        raise HTTPException(status_code=resp.get("status_code", 400), detail=resp.get("error_message", "Error"))
    return resp.get("data")