import json
import os
import bcrypt
import jwt
import psycopg
from datetime import datetime, timedelta
from soa_lib import connect_to_bus, send_message, receive_message

# ================= CONFIGURACIÓN =================

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://repararia:repararia_dev@postgres:5432/repararia")
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_ALGORITHM = "HS256"
JWT_EXP_HOURS = 8

# Nombre del servicio (5 caracteres, según protocolo del bus)
SERVICE_NAME = "auten"

# ================= FUNCIONES DE BASE DE DATOS =================
def get_db_connection():
    return psycopg.connect(DATABASE_URL)

def get_user_by_email(email):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id_usuario, nombre, email, password_hash, rol FROM usuario WHERE email = %s AND activo = true",
        (email,)
    )
    user = cur.fetchone()
    cur.close()
    conn.close()
    return user

def get_user_by_id(user_id):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id_usuario, nombre, email, rol FROM usuario WHERE id_usuario = %s AND activo = true",
        (user_id,)
    )
    user = cur.fetchone()
    cur.close()
    conn.close()
    return user

def create_user(nombre, email, password_hash, rol):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO usuario (nombre, email, password_hash, rol, activo) VALUES (%s, %s, %s, %s, true) RETURNING id_usuario",
            (nombre, email, password_hash, rol)
        )
        user_id = cur.fetchone()[0]
        conn.commit()
        return user_id
    except psycopg.IntegrityError:
        conn.rollback()
        raise ValueError("El email ya existe")
    finally:
        cur.close()
        conn.close()

# ================= JWT =================
def generate_token(user_id, rol):
    payload = {
        "user_id": user_id,
        "rol": rol,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXP_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token):
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        return None

def verify_password(plain, hashed):
    return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))

def hash_password(plain):
    return bcrypt.hashpw(plain.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

# ================= MANEJADORES DE OPERACIONES =================
def handle_login(payload):
    email = payload.get("email")
    password = payload.get("password")
    if not email or not password:
        return {
            "status": "error",
            "error_code": "VALIDATION_ERROR",
            "error_message": "Faltan email o contraseña",
            "status_code": 400
        }
    user = get_user_by_email(email)
    if not user or not verify_password(password, user[3]):
        return {
            "status": "error",
            "error_code": "UNAUTHORIZED",
            "error_message": "Credenciales inválidas",
            "status_code": 401
        }
    token = generate_token(user[0], user[4])
    return {
        "status": "success",
        "data": {
            "token": token,
            "user": {
                "id": user[0],
                "nombre": user[1],
                "email": user[2],
                "rol": user[4]
            }
        }
    }

def handle_register(payload):
    nombre = payload.get("nombre")
    email = payload.get("email")
    password = payload.get("password")
    rol = payload.get("rol", "mecanico")
    if not nombre or not email or not password:
        return {
            "status": "error",
            "error_code": "VALIDATION_ERROR",
            "error_message": "Faltan nombre, email o contraseña",
            "status_code": 400
        }
    if rol not in ("administrador", "mecanico", "sysadmin"):
        return {
            "status": "error",
            "error_code": "VALIDATION_ERROR",
            "error_message": "Rol inválido",
            "status_code": 400
        }
    try:
        hashed = hash_password(password)
        user_id = create_user(nombre, email, hashed, rol)
        token = generate_token(user_id, rol)
        return {
            "status": "success",
            "data": {
                "token": token,
                "user": {
                    "id": user_id,
                    "nombre": nombre,
                    "email": email,
                    "rol": rol
                }
            }
        }
    except ValueError as e:
        return {
            "status": "error",
            "error_code": "CONFLICT",
            "error_message": str(e),
            "status_code": 409
        }

def handle_logout(payload):
    # Stateless – no se requiere acción en servidor
    return {
        "status": "success",
        "data": {"message": "Sesión cerrada exitosamente"}
    }

# def handle_validate_token(payload, auth):
#     # auth puede venir como dict con "token" (o directamente payload)
#     token = None
#     if auth and isinstance(auth, dict):
#         token = auth.get("token")
#     if not token:
#         token = payload.get("token")
#     if not token:
#         return {
#             "status": "error",
#             "error_code": "UNAUTHORIZED",
#             "error_message": "Token no proporcionado",
#             "status_code": 401
#         }
#     claims = decode_token(token)
#     if not claims:
#         return {
#             "status": "error",
#             "error_code": "UNAUTHORIZED",
#             "error_message": "Token inválido o expirado",
#             "status_code": 401
#         }
#     user_id = claims.get("user_id")
#     user = get_user_by_id(user_id)
#     if not user:
#         return {
#             "status": "error",
#             "error_code": "UNAUTHORIZED",
#             "error_message": "Usuario no existe o inactivo",
#             "status_code": 401
#         }
#     return {
#         "status": "success",
#         "data": {
#             "user_id": user[0],
#             "nombre": user[1],
#             "email": user[2],
#             "rol": user[3]
#         }
#     }

def handle_get_me(auth):
    # Espera que auth contenga el token en formato "Bearer <token>" o directamente el token
    token = None
    if auth and isinstance(auth, dict):
        token = auth.get("token")
    if not token:
        return {
            "status": "error",
            "error_code": "UNAUTHORIZED",
            "error_message": "Token no proporcionado",
            "status_code": 401
        }
    claims = decode_token(token)
    if not claims:
        return {
            "status": "error",
            "error_code": "UNAUTHORIZED",
            "error_message": "Token inválido o expirado",
            "status_code": 401
        }
    user_id = claims.get("user_id")
    user = get_user_by_id(user_id)
    if not user:
        return {
            "status": "error",
            "error_code": "NOT_FOUND",
            "error_message": "Usuario no encontrado",
            "status_code": 404
        }
    return {
        "status": "success",
        "data": {
            "id": user[0],
            "nombre": user[1],
            "email": user[2],
            "rol": user[3]
        }
    }

# ================= BUCLE PRINCIPAL DEL SERVICIO =================
def main():
    BUS_HOST = os.getenv("BUS_HOST", "localhost")
    BUS_PORT = int(os.getenv("BUS_PORT", "5000"))
    sock = connect_to_bus(BUS_HOST, BUS_PORT)
    # Registrar el servicio en el bus
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
                print(f"Mensaje dirigido a otro servicio: {service_name_received}, ignorando.")
                continue
            payload_bytes = raw[5:]
            if not payload_bytes:
                print("Payload vacío, ignorando.")
                continue
            # Parsear el JSON
            try:
                req = json.loads(payload_bytes.decode('utf-8'))
            except json.JSONDecodeError as e:
                print(f"Error decodificando JSON: {e}")
                error_resp = {
                    "status": "error",
                    "error_code": "INVALID_JSON",
                    "error_message": "Formato JSON inválido"
                }
                send_message(sock, SERVICE_NAME, json.dumps(error_resp))
                continue

            # Extraer campos
            operation = req.get("operation")
            payload = req.get("payload", {})
            auth = req.get("auth", {})
            request_id = req.get("request_id")

            print(f"Operación recibida: {operation}, request_id: {request_id}")

            # Enrutar según la operación
            if operation == "LOGIN":
                result = handle_login(payload)
            elif operation == "REGISTER":
                result = handle_register(payload)
            elif operation == "LOGOUT":
                result = handle_logout(payload)
            # elif operation == "VALIDATE_TOKEN":
            #     result = handle_validate_token(payload, auth)
            elif operation == "GET_ME":
                result = handle_get_me(auth)
            else:
                result = {
                    "status": "error",
                    "error_code": "OPERATION_NOT_FOUND",
                    "error_message": f"Operación '{operation}' no soportada",
                    "status_code": 400
                }

            # Incluir request_id en la respuesta para trazabilidad (opcional)
            if request_id:
                result["request_id"] = request_id

            # Enviar respuesta al bus
            send_message(sock, SERVICE_NAME, json.dumps(result))
            print(f"Respuesta enviada para {operation}")

        except Exception as e:
            print(f"Error en el bucle principal: {e}")
            # Intentar enviar una respuesta de error genérica
            try:
                error_resp = {
                    "status": "error",
                    "error_code": "INTERNAL_SERVER_ERROR",
                    "error_message": str(e)
                }
                send_message(sock, SERVICE_NAME, json.dumps(error_resp))
            except:
                pass

if __name__ == "__main__":
    main()