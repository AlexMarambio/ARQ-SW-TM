const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
};

export async function apiRequest<T>(
  path: string,
  { method = "GET", body, auth = true }: RequestOptions = {},
): Promise<T> {
  const headers = new Headers();
  headers.set("Accept", "application/json");

  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (auth && accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    credentials: "include",
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data?.detail?.error_message ??
      data?.detail ??
      "No fue posible completar la solicitud";
    throw new Error(typeof message === "string" ? message : JSON.stringify(message));
  }

  return data as T;
}

// Parametros para API

export type UserInfo = {
  "id": number;
  "nombre": string; 
  "email": string;
  "rol": "administrador" | "mecanico" | "sysadmin";
};

export type LoginResponse = {
  token: string;
  user: UserInfo;
  //user_id: number;
  //rol: "administrador" | "mecanico" | "sysadmin";
};

export type Orden = {
  id_orden: number;
  estado: string;
  descripcion_problema?: string;
  diagnostico?: string;
  fecha_ingreso?: string;
  fecha_estimada?: string;
  mecanico?: string;
  id_mecanico?: number | null;
  vehiculo?: {
    marca?: string;
    modelo?: string;
    patente?: string;
  };
  costo_total?: number;
  token_acceso_publico?: string;
};

export type Repuesto = {
  id_repuesto: number;
  codigo: string;
  nombre: string;
  stock_actual: number;
  stock_minimo: number;
  precio_unitario: number;
};
