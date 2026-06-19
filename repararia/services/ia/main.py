import json
import os
from soa_lib import connect_to_bus, send_message, receive_message
from rag import buscar_contexto, consultar_llm, consultar_llm_negocio

SERVICE_NAME = "iabot"  # 5 caracteres: ia más tres espacios

# Respuestas por defecto cuando no hay contexto o es irrelevante
RESPUESTAS_DEFAULT = {
    "sin_documentos": (
        "Este taller aún no tiene documentación técnica cargada. "
        "Contacta al administrador para cargar los manuales."
    ),
    "baja_relevancia": (
        "No encontré documentación suficientemente relevante para responder esa consulta. "
        "Intenta reformular la pregunta o consulta el manual directamente."
    ),
}

def handle_consulta_tecnica(payload):
    pregunta = payload.get("pregunta")
    tenant_id = payload.get("tenant_id", "taller_01")
    if not pregunta:
        return {"status": "error", "error_code": "VALIDATION_ERROR", "error_message": "Falta pregunta", "status_code": 400}
    
    resultado = buscar_contexto(pregunta, tenant_id)
    
    # Si no hay contexto o no es relevante, devolver respuesta por defecto
    if not resultado["contexto"] or resultado.get("razon_rechazo") in ("sin_documentos", "baja_relevancia"):
        razon = resultado.get("razon_rechazo", "baja_relevancia")
        return {
            "status": "success",
            "data": {
                "respuesta": RESPUESTAS_DEFAULT.get(razon, RESPUESTAS_DEFAULT["baja_relevancia"]),
                "fuente": "default",
                "fragmentos_usados": 0,
                "razon": razon
            }
        }
    
    # Hay contexto relevante, consultamos al LLM
    try:
        respuesta = consultar_llm(pregunta, resultado["contexto"])
        return {
            "status": "success",
            "data": {
                "respuesta": respuesta,
                "fuente": "RAG",
                "fragmentos_usados": resultado.get("fragmentos_utiles", 0)
            }
        }
    except Exception as e:
        error_msg = str(e)
        # Manejar específicamente errores de rate limiting
        if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
            return {
                "status": "success",  # Devolver éxito pero con mensaje amigable
                "data": {
                    "respuesta": "El servicio de inteligencia artificial está experimentando alta demanda en este momento. Por favor, espera unos segundos y vuelve a intentarlo.",
                    "fuente": "error_recovery",
                    "fragmentos_usados": resultado.get("fragmentos_utiles", 0),
                    "error_temporal": True
                }
            }
        else:
            # Otros errores del LLM
            return {
                "status": "error",
                "error_code": "LLM_ERROR",
                "error_message": f"Error al consultar el asistente: {error_msg}",
                "status_code": 500
            }

def handle_consulta_negocio(payload):
    pregunta = payload.get("pregunta")
    contexto_datos = payload.get("contexto_datos", {})

    if not pregunta:
        return {"status": "error", "error_code": "VALIDATION_ERROR", "error_message": "Falta pregunta", "status_code": 400}

    try:
        respuesta = consultar_llm_negocio(pregunta, contexto_datos)
        return {
            "status": "success",
            "data": {"respuesta": respuesta, "fuente": "negocio_datos_reales"}
        }
    except Exception as e:
        error_msg = str(e)
        if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
            return {
                "status": "success",
                "data": {
                    "respuesta": "El servicio de IA está con alta demanda. Intenta de nuevo en unos segundos.",
                    "fuente": "error_recovery",
                    "error_temporal": True
                }
            }
        return {"status": "error", "error_code": "LLM_ERROR", "error_message": error_msg, "status_code": 500}

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
                break
            service_name_received = raw[:5].decode().strip()
            if service_name_received != SERVICE_NAME.strip():
                continue
            payload_bytes = raw[5:]
            if not payload_bytes:
                continue
            req = json.loads(payload_bytes.decode('utf-8'))
            operation = req.get("operation")
            payload = req.get("payload", {})
            request_id = req.get("request_id")
            if operation == "CONSULTA_TECNICA":
                result = handle_consulta_tecnica(payload)
            elif operation == "CONSULTA_NEGOCIO":
                result = handle_consulta_negocio(payload)
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