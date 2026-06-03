import json
from soa_lib import connect_to_bus, send_message, receive_message

sock = connect_to_bus("localhost", 5000)

request = {
    "operation": "LOGIN",
    "payload": {"email": "admin@repararia.cl", "password": "Admin1234!"},
    "request_id": "test-login-1"
}
print("Enviando petición...")
send_message(sock, "auten", json.dumps(request))

resp_raw = receive_message(sock)
print("Raw recibido (bytes):", resp_raw)

if resp_raw:
    # Extraer los primeros 5 bytes (nombre del servicio) y el resto
    service_name = resp_raw[:5].decode().strip()
    payload_bytes = resp_raw[5:]
    print("Nombre del servicio en respuesta:", service_name)
    print("Payload bytes:", payload_bytes)
    print("Payload decodificado (string):", payload_bytes.decode(errors='replace'))
    try:
        payload_str = payload_bytes.decode('utf-8')
        resp = json.loads(payload_str)
        print("Respuesta JSON:", resp)
    except Exception as e:
        print("Error al decodificar JSON:", e)
else:
    print("No se recibió respuesta (timeout o conexión cerrada)")

sock.close()