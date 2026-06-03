import os
import json
import uuid
from fastapi import FastAPI, Request, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from soa_lib import connect_to_bus, send_message, receive_message

app = FastAPI(title="RepararIA API Gateway con Bus SOA", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

BUS_HOST = os.getenv("BUS_HOST", "bus")
BUS_PORT = int(os.getenv("BUS_PORT", 5000))

def call_service(service_name: str, operation: str, payload: dict, auth: dict = None):
    sock = connect_to_bus(BUS_HOST, BUS_PORT)
    req_id = str(uuid.uuid4())
    msg = {"operation": operation, "payload": payload, "auth": auth or {}, "request_id": req_id}
    send_message(sock, service_name, json.dumps(msg))
    raw = receive_message(sock)
    sock.close()
    # Formato esperado: b'service_nameOK{...}'
    if len(raw) < 7:
        raise HTTPException(500, "Respuesta inválida del bus")
    json_part = raw[7:].decode()
    resp = json.loads(json_part)
    if resp.get("status") != "success":
        status = resp.get("status_code", 400)
        raise HTTPException(status_code=status, detail=resp.get("error_message", "Error"))
    return resp.get("data")

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/auth/login")
async def login(request: Request):
    body = await request.json()
    return call_service("auten", "LOGIN", body)

@app.post("/auth/register")
async def register(request: Request):
    body = await request.json()
    return call_service("auten", "REGISTER", body)

@app.get("/auth/getme")
async def me(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(401, "Falta token")
    token = authorization.replace("Bearer ", "")
    return call_service("auten", "GET_ME", {}, auth={"token": token})

# Aquí puedes agregar los demás endpoints (clientes, ordenes, etc.) con el mismo patrón