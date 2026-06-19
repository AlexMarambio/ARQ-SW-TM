const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

// ─────────────────────────────────────────────────────────────
// Token management
// ─────────────────────────────────────────────────────────────

let _accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  _accessToken = token;
}

export function getAccessToken(): string | null {
  return _accessToken;
}

// ─────────────────────────────────────────────────────────────
// Core HTTP layer
// ─────────────────────────────────────────────────────────────

type RequestOptions = {
  method?: string;
  body?: unknown;
  /** Si false, omite el header Authorization (rutas públicas). Default: true */
  auth?: boolean;
};

/**
 * Función base de fetch. Lanza Error con el mensaje de la API en respuestas no-2xx.
 * Las rutas protegidas inyectan el JWT desde el token almacenado en módulo.
 */
export async function apiRequest<T>(
  path: string,
  { method = "GET", body, auth = true }: RequestOptions = {},
): Promise<T> {
  const headers = new Headers();
  headers.set("Accept", "application/json");

  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (auth && _accessToken) {
    headers.set("Authorization", `Bearer ${_accessToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    credentials: "include",
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    // Mapeo explícito de códigos HTTP a mensajes amigables
    const backendMsg: string | undefined =
      data?.detail?.error_message ??
      data?.detail ??
      data?.message ??
      undefined;

    const friendlyMsg = backendMsg
      ? (typeof backendMsg === "string" ? backendMsg : JSON.stringify(backendMsg))
      : HTTP_ERRORS[response.status] ?? "No fue posible completar la solicitud.";

    throw new ApiError(friendlyMsg, response.status);
  }

  return data as T;
}

/** Error estructurado que incluye el código HTTP de la respuesta */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const HTTP_ERRORS: Record<number, string> = {
  400: "La solicitud tiene datos inválidos.",
  401: "Sesión expirada. Por favor inicia sesión nuevamente.",
  403: "No tienes permisos para realizar esta acción.",
  404: "El recurso solicitado no existe.",
  409: "Conflicto: el recurso ya existe o está en uso.",
  500: "Error interno del servidor. Intenta más tarde.",
};

/**
 * Helper que desenvuelve el envelope SOA { status, data } cuando esta presente.
 * Si la respuesta ya es el array/objeto directo, lo retorna tal cual.
 */
async function soaRequest<T>(path: string, options?: RequestOptions): Promise<T> {
  const raw = await apiRequest<SoaEnvelope<T> | T>(path, options);

  if (
    raw !== null &&
    typeof raw === "object" &&
    "status" in (raw as object) &&
    "data" in (raw as object)
  ) {
    return (raw as SoaEnvelope<T>).data;
  }
  return raw as T;
}

// ─────────────────────────────────────────────────────────────
// Tipos genericos compartidos
// ─────────────────────────────────────────────────────────────

/** Envelope del API Gateway SOA */
export interface SoaEnvelope<T> {
  status: "success" | "error";
  data: T;
  message?: string;
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

function buildQS(params: Record<string, string | number | boolean | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== "") qs.set(key, String(val));
  }
  return qs.toString() ? `?${qs}` : "";
}

// ─────────────────────────────────────────────────────────────
// MÓDULO: Autenticación
// ─────────────────────────────────────────────────────────────

export type UserRol = "administrador" | "mecanico" | "sysadmin";

export interface IUserInfo {
  id: number;
  nombre: string;
  email: string;
  rol: UserRol;
}

export interface ILoginResponse {
  token: string;
  user: IUserInfo;
}

export interface IRegisterPayload {
  nombre: string;
  email: string;
  password: string;
  rol: UserRol;
}

// Aliases de compatibilidad (componentes existentes los usan)
export type UserInfo = IUserInfo;
export type LoginResponse = ILoginResponse;

export const authApi = {
  login: (email: string, password: string) =>
    apiRequest<ILoginResponse>("/auth/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    }),

  register: (payload: IRegisterPayload) =>
    apiRequest<IUserInfo>("/auth/register", {
      method: "POST",
      body: payload,
      auth: false,
    }),

  getMe: () => apiRequest<IUserInfo>("/auth/getme"),
};

// ─────────────────────────────────────────────────────────────
// MÓDULO: Clientes
// ─────────────────────────────────────────────────────────────

export interface ICliente {
  id_cliente: number;
  rut: string;
  email: string;
  nombre: string;
  telefono?: string;
  direccion?: string;
  fecha_registro?: string;
}

export interface ICreateCliente {
  rut: string;
  email: string;
  nombre: string;
  telefono?: string;
  direccion?: string;
}

export interface IUpdateCliente {
  nombre?: string;
  telefono?: string;
  direccion?: string;
  email?: string;
  rut?: string;
}

export const clienteApi = {
  list: (params?: PaginationParams & { search?: string }) =>
    soaRequest<ICliente[]>(
      `/cliente/list_clientes${buildQS({ ...params })}`,
    ),

  get: (id: number) =>
    soaRequest<ICliente>(`/cliente/get_cliente/${id}`),

  create: (body: ICreateCliente) =>
    soaRequest<ICliente>("/cliente/create_cliente", { method: "POST", body }),

  update: (id: number, body: IUpdateCliente) =>
    soaRequest<ICliente>(`/cliente/update_cliente/${id}`, { method: "PUT", body }),

  delete: (id: number) =>
    soaRequest<void>(`/cliente/delete_cliente/${id}`, { method: "DELETE" }),
};

// ─────────────────────────────────────────────────────────────
// MÓDULO: Vehículos
// ─────────────────────────────────────────────────────────────

export interface IVehiculo {
  id_vehiculo: number;
  id_cliente: number;
  marca: string;
  modelo: string;
  anio: number;
  patente: string;
  kilometraje: number;
  color?: string;
}

export interface ICreateVehiculo {
  id_cliente: number;
  marca: string;
  modelo: string;
  anio: number;
  patente: string;
  kilometraje?: number;
  color?: string;
}

export interface IUpdateVehiculo {
  marca?: string;
  modelo?: string;
  anio?: number;
  patente?: string;
  kilometraje?: number;
  color?: string;
}

export const vehiculoApi = {
  list: (params?: PaginationParams & { search?: string }) =>
    soaRequest<IVehiculo[]>(
      `/vehiculo/list_vehiculos${buildQS({ ...params })}`,
    ),

  get: (id: number) =>
    soaRequest<IVehiculo>(`/vehiculo/get_vehiculo/${id}`),

  byCliente: (idCliente: number) =>
    soaRequest<IVehiculo[]>(`/vehiculo/by_cliente/${idCliente}`),

  create: (body: ICreateVehiculo) =>
    soaRequest<IVehiculo>("/vehiculo/create_vehiculo", { method: "POST", body }),

  update: (id: number, body: IUpdateVehiculo) =>
    soaRequest<IVehiculo>(`/vehiculo/update_vehiculo/${id}`, { method: "PUT", body }),

  delete: (id: number) =>
    soaRequest<void>(`/vehiculo/delete_vehiculo/${id}`, { method: "DELETE" }),
};

// ─────────────────────────────────────────────────────────────
// MÓDULO: Repuestos e Inventario
// ─────────────────────────────────────────────────────────────

export interface IRepuesto {
  id_repuesto: number;
  nombre: string;
  /** Código único del repuesto — campo `sku` en la API */
  sku: string;
  descripcion?: string;
  stock_actual: number;
  stock_minimo: number;
  precio_unitario: number;
  proveedor?: string;
}

export interface ICreateRepuesto {
  nombre: string;
  sku: string;
  descripcion?: string;
  stock_actual?: number;
  stock_minimo?: number;
  precio_unitario?: number;
  proveedor?: string;
}

export interface IUpdateRepuesto {
  nombre?: string;
  stock_actual?: number;
  precio_unitario?: number;
  proveedor?: string;
}

export const repuestoApi = {
  list: (params?: PaginationParams & { search?: string }) =>
    soaRequest<IRepuesto[]>(
      `/repuesto/list_repuestos${buildQS({ ...params })}`,
    ),

  get: (id: number) =>
    soaRequest<IRepuesto>(`/repuesto/get_by/${id}`),

  getBySku: (sku: string) =>
    soaRequest<IRepuesto>(`/repuesto/get_by_sku/${encodeURIComponent(sku)}`),

  /** Retorna los repuestos bajo el umbral de stock mínimo */
  stockAlertas: (umbral = 5) =>
    soaRequest<IRepuesto[]>(`/repuesto/stock_repuesto?umbral=${umbral}`),

  create: (body: ICreateRepuesto) =>
    soaRequest<IRepuesto>("/repuesto/create_repuesto", { method: "POST", body }),

  update: (id: number, body: IUpdateRepuesto) =>
    soaRequest<IRepuesto>(`/repuesto/update_by/${id}`, { method: "PUT", body }),

  /**
   * Ajusta el stock a un valor absoluto.
   * ⚠️ El campo del body es `nuevo_stock`, no `stock_actual`.
   */
  ajustarStock: (id: number, nuevoStock: number) =>
    soaRequest<IRepuesto>(`/repuesto/ajustar_stock_by/${id}`, {
      method: "PUT",
      body: { nuevo_stock: nuevoStock },
    }),

  delete: (id: number) =>
    soaRequest<void>(`/repuesto/delete_by/${id}`, { method: "DELETE" }),
};

// ─────────────────────────────────────────────────────────────
// MÓDULO: Órdenes de Trabajo
// ─────────────────────────────────────────────────────────────

/** Estados válidos según la API. No usar "en_taller" ni "en_reparacion". */
export type EstadoOrden = "pendiente" | "en_proceso" | "listo" | "entregado";

export interface IOrden {
  id_orden: number;
  id_cliente: number;
  id_vehiculo: number;
  id_mecanico?: number | null;
  descripcion: string;
  estado: EstadoOrden;
  costo_total?: number;
  fecha_ingreso?: string;
  token_acceso_publico?: string;
  // Campos enriquecidos por el gateway
  cliente?: string;
  patente?: string;
  mecanico?: string;
  vehiculo?: {
    marca?: string;
    modelo?: string;
    patente?: string;
  };
}

export interface ICreateOrden {
  id_cliente: number;
  id_vehiculo: number;
  id_mecanico: number;
  descripcion: string;
  estado?: EstadoOrden;
}

/** Respuesta del endpoint público — sin datos personales */
export interface IOrdenPublica {
  estado: EstadoOrden;
  fecha_estimada?: string | null;
  vehiculo?: {
    marca?: string;
    modelo?: string;
    anio?: number;
    color?: string;
  };
}

export const ordenesApi = {
  list: (params?: PaginationParams & { estado?: EstadoOrden }) =>
    soaRequest<IOrden[]>(
      `/ordenes/orden_list${buildQS({ ...params })}`,
    ),

  get: (id: number) =>
    soaRequest<IOrden>(`/ordenes/get_by/${id}`),

  /**
   * Consulta pública por token de seguimiento — sin autenticación.
   * Endpoint: GET /ordenes/orden_publica_tkn/{token}
   */
  getPublic: (token: string) =>
    apiRequest<IOrdenPublica>(
      `/ordenes/orden_publica_tkn/${encodeURIComponent(token)}`,
      { auth: false },
    ),

  create: (body: ICreateOrden) =>
    soaRequest<IOrden>("/ordenes/create_orden", { method: "POST", body }),

  update: (
    id: number,
    body: Partial<Pick<IOrden, "descripcion" | "id_mecanico" | "costo_total">>,
  ) => soaRequest<IOrden>(`/ordenes/update_by/${id}`, { method: "PUT", body }),

  /** PATCH — cambia el estado de la orden a cualquier valor válido */
  cambiarEstado: (id: number, estado: EstadoOrden) =>
    soaRequest<IOrden>(`/ordenes/change_by/${id}/estado`, {
      method: "PATCH",
      body: { estado },
    }),

  /** Agrega un repuesto del inventario a una orden existente */
  addRepuesto: (idOrden: number, idRepuesto: number, cantidad: number) =>
    soaRequest<void>(`/ordenes/add_by/${idOrden}/repuestos`, {
      method: "POST",
      body: { id_repuesto: idRepuesto, cantidad },
    }),

  /** Cierra la orden y cambia estado a "entregado" */
  cerrar: (id: number) =>
    soaRequest<IOrden>(`/ordenes/close_by/${id}/cerrar`, { method: "POST" }),
};

// ─────────────────────────────────────────────────────────────
// MÓDULO: Facturación
// ─────────────────────────────────────────────────────────────

export type EstadoFactura = "pendiente" | "pagado";
export type MetodoPago = "efectivo" | "tarjeta" | "transferencia";

export interface IFactura {
  id_factura: number;
  id_orden: number;
  fecha_emision: string;
  monto_neto?: number;
  /** IVA calculado automáticamente (19%) */
  iva?: number;
  monto_total: number;
  estado_pago: EstadoFactura;
  metodo_pago?: MetodoPago;
}

export const facturacionApi = {
  list: (params?: PaginationParams & { estado?: EstadoFactura }) =>
    soaRequest<IFactura[]>(
      `/facturacion/list_facturas${buildQS({ ...params })}`,
    ),

  get: (id: number) =>
    soaRequest<IFactura>(`/facturacion/get_by/${id}`),

  getByOrden: (idOrden: number) =>
    soaRequest<IFactura>(`/facturacion/get_by_orden/${idOrden}`),

  /**
   * Genera la factura para una orden cerrada (estado "entregado").
   * El IVA (19%) se calcula automáticamente sobre `costo_total`.
   */
  crear: (idOrden: number) =>
    soaRequest<IFactura>(`/facturacion/create_factura/${idOrden}`, {
      method: "POST",
    }),

  registrarPago: (idFactura: number, metodoPago: MetodoPago) =>
    soaRequest<IFactura>(`/facturacion/registrar_pago/${idFactura}`, {
      method: "POST",
      body: { metodo_pago: metodoPago },
    }),
};

// ─────────────────────────────────────────────────────────────
// MÓDULO: Auditoría
// ─────────────────────────────────────────────────────────────

export type EntidadAuditoria =
  | "cliente"
  | "vehiculo"
  | "repuesto"
  | "factura"
  | "orden";

export interface IEventoAuditoria {
  id_auditoria: number;
  id_usuario: number;
  accion: string;
  entidad: EntidadAuditoria;
  detalle: string;
  fecha_hora: string;
}

export const auditoriaApi = {
  list: (
    params?: PaginationParams & {
      entidad?: EntidadAuditoria;
      id_usuario?: number;
    },
  ) =>
    soaRequest<IEventoAuditoria[]>(
      `/auditoria/historial${buildQS({ ...params })}`,
    ),

  get: (id: number) =>
    soaRequest<IEventoAuditoria>(`/auditoria/historial_by/${id}`),
};

// ─────────────────────────────────────────────────────────────
// MÓDULO: Dashboard y Reportes
// ─────────────────────────────────────────────────────────────

export interface IKpiAdmin {
  ordenes_activas: number;
  ingresos_mes: number;
  ingresos_totales: number;
  costo_promedio_orden: number;
  top_clientes: Array<{ nombre: string; ordenes: number }>;
  total_mecanicos: number;
  ordenes_por_estado: Partial<Record<EstadoOrden, number>>;
}

export interface IKpiMecanico {
  total_ordenes: number;
  completadas: number;
  ingresos_generados: number;
  tiempo_promedio_dias: number;
  ultima_orden?: {
    id_orden: number;
    estado: EstadoOrden;
    fecha: string;
  };
}

export interface IReporteOrden {
  id_orden: number;
  estado: EstadoOrden;
  total?: number;
  fecha_ingreso?: string;
  cliente?: string;
}

export interface IReporteCliente {
  id_cliente: number;
  nombre: string;
  total_ordenes: number;
  gasto_total: number;
}

export interface IReporteRepuesto {
  id_repuesto: number;
  nombre: string;
  sku: string;
  cantidad_total: number;
  ingresos_totales?: number;
}

export const dashboardApi = {
  /** KPIs globales del taller — solo administrador / sysadmin */
  kpiAdmin: () => soaRequest<IKpiAdmin>("/dashboard/kpi/admin"),

  /** KPIs personales de un mecánico */
  kpiMecanico: (idMecanico: number) =>
    soaRequest<IKpiMecanico>(`/dashboard/kpi/mecanico/${idMecanico}`),

  /** Reporte de órdenes con filtros de fecha y estado */
  reporteOrdenes: (
    params?: PaginationParams & {
      estado?: EstadoOrden;
      fecha_desde?: string;
      fecha_hasta?: string;
    },
  ) =>
    soaRequest<IReporteOrden[]>(
      `/dashboard/reporte/ordenes${buildQS({ ...params })}`,
    ),

  /** Reporte de clientes ordenado por gasto descendente */
  reporteClientes: (params?: PaginationParams) =>
    soaRequest<IReporteCliente[]>(
      `/dashboard/reporte/clientes${buildQS({ ...params })}`,
    ),

  /** Reporte de repuestos más utilizados */
  reporteRepuestos: (params?: { limit?: number }) =>
    soaRequest<IReporteRepuesto[]>(
      `/dashboard/reporte/repuestos${buildQS({ ...params })}`,
    ),
};

// ─────────────────────────────────────────────────────────────
// Legacy types — compatibilidad con componentes existentes
// ─────────────────────────────────────────────────────────────

/**
 * @deprecated Usa IOrden en componentes nuevos.
 * Mantenido para retrocompatibilidad con Dashboard.tsx y Ordenes.tsx.
 */
export type Orden = {
  id_orden: number;
  estado: string;
  descripcion_problema?: string;
  descripcion?: string;
  diagnostico?: string;
  fecha_ingreso?: string;
  fecha_estimada?: string;
  mecanico?: string;
  id_mecanico?: number | null;
  vehiculo?: { marca?: string; modelo?: string; patente?: string };
  costo_total?: number;
  token_acceso_publico?: string;
  cliente?: string;
  patente?: string;
};

/**
 * @deprecated Usa IRepuesto en componentes nuevos.
 * El campo `codigo` es un alias del campo `sku` retornado por la API.
 */
export type Repuesto = {
  id_repuesto: number;
  /** Alias de `sku` — algunos endpoints retornan el campo con este nombre */
  codigo: string;
  sku?: string;
  nombre: string;
  stock_actual: number;
  stock_minimo: number;
  precio_unitario: number;
};

// ─────────────────────────────────────────────────────────────
// MÓDULO: IA Técnica (asistente para mecánicos)
// ─────────────────────────────────────────────────────────────

export const iaTecnicoApi = {
  /**
   * Consulta al asistente técnico (RAG) sobre manuales y procedimientos.
   * @param pregunta - Texto de la consulta
   * @param tenantId - Identificador del taller (por defecto "taller_01")
   * @returns { respuesta: string }
   */
consulta: (pregunta: string, tenantId: string = "taller_01") =>
    apiRequest<{ respuesta: string | { text?: string; message?: string; content?: string; [key: string]: any } }>(
      "/ia/tecnico/consulta",
      {
        method: "POST",
        body: { pregunta, tenant_id: tenantId },
        auth: true,
      }
    ),
};