import json
import socket
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from uuid import uuid4

from soa_lib import connect_to_bus, receive_message, send_message


class TCPServiceError(Exception):
    def __init__(
        self,
        error_code: str = "SERVICE_ERROR",
        error_message: str = "Error en servicio interno",
        status_code: int = 502,
    ) -> None:
        self.error_code = error_code
        self.error_message = error_message
        self.status_code = status_code
        super().__init__(error_message)


@dataclass(frozen=True)
class TCPServiceRoute:
    service: str
    host: str
    port: int


class ReparariaTCPClient:
    """
    Cliente reutilizable para JSON sobre TCP.

    Usa sin modificaciones las funciones de SOA/soa_lib.py. Para mantener el
    contrato requerido por RepararIA, el JSON viaja como payload completo y el
    nombre de servicio SOA se envia vacio.
    """

    def __init__(self, timeout_seconds: float = 8.0) -> None:
        self.timeout_seconds = timeout_seconds

    def call(
        self,
        route: TCPServiceRoute,
        operation: str,
        payload: dict[str, Any] | None = None,
        auth: dict[str, Any] | None = None,
        request_id: str | None = None,
    ) -> dict[str, Any]:
        request_id = request_id or str(uuid4())
        message = {
            "operation": operation,
            "service": route.service,
            "payload": payload or {},
            "request_id": request_id,
            "auth": auth or {},
        }

        try:
            with connect_to_bus(route.host, route.port) as sock:
                sock.settimeout(self.timeout_seconds)
                self._send_json(sock, message)
                response = self._receive_json(sock)
        except TimeoutError as exc:
            raise TCPServiceError(
                "TIMEOUT",
                f"Timeout llamando a {route.service}.{operation}",
                504,
            ) from exc
        except OSError as exc:
            raise TCPServiceError(
                "SERVICE_UNAVAILABLE",
                f"No fue posible conectar con {route.service}",
                503,
            ) from exc

        if response.get("request_id") != request_id:
            raise TCPServiceError(
                "REQUEST_ID_MISMATCH",
                "La respuesta TCP no coincide con la solicitud original",
                502,
            )

        return response

    def _send_json(self, sock: socket.socket, message: dict[str, Any]) -> None:
        raw = json.dumps(message, ensure_ascii=False, default=str).encode("utf-8")
        if len(raw) > 99999:
            raise TCPServiceError(
                "MESSAGE_TOO_LARGE",
                "El mensaje TCP supera el maximo soportado por el framing SOA",
                413,
            )
        send_message(sock, "", raw.decode("utf-8"))

    def _receive_json(self, sock: socket.socket) -> dict[str, Any]:
        raw_payload = receive_message(sock)
        if not raw_payload:
            raise TCPServiceError("EMPTY_RESPONSE", "El servicio no envio respuesta")
        try:
            response = json.loads(raw_payload.decode("utf-8"))
        except json.JSONDecodeError as exc:
            raise TCPServiceError(
                "INVALID_JSON",
                "El servicio envio JSON invalido",
            ) from exc

        if not isinstance(response, dict):
            raise TCPServiceError(
                "INVALID_RESPONSE",
                "La respuesta TCP debe ser un objeto JSON",
            )
        return response
