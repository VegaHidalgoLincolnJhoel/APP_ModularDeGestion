// Único punto de acceso a la API — evita `fetch` suelto desperdigado por
// los componentes, así headers, manejo de errores y base URL quedan en un
// solo lugar. Los tipos de acá siguen docs/openapi.yaml al pie de la letra;
// si el backend cambia una forma de respuesta, este archivo se actualiza
// junto con el contrato, no antes.
//
// TODO(offline): mientras no exista el store local (IndexedDB) + cola de
// sync (POST /negocios/{id}/sync, ver docs/openapi.yaml), cualquier
// escritura hecha desde acá se pierde si no hay red.

const BASE_URL = import.meta.env.VITE_API_URL;

// --- sesión: token en localStorage + aviso global cuando el backend
// rechaza por 401. Es un módulo plano (no un componente), así que no
// puede usar useNavigate directo — quien quiera reaccionar a un 401
// (típicamente el AuthProvider, que sí vive dentro del Router) se
// suscribe con onUnauthorized.
const TOKEN_KEY = "gestion:token";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // localStorage puede fallar (modo privado, cuota) — no hay mucho más
    // que hacer, la sesión simplemente no persiste entre recargas.
  }
}

type UnauthorizedListener = () => void;
let unauthorizedListeners: UnauthorizedListener[] = [];

export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.push(listener);
  return () => {
    unauthorizedListeners = unauthorizedListeners.filter((l) => l !== listener);
  };
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public detail?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // Se arma con Headers en vez de un spread de objetos para no perder
  // Content-Type cuando el caller manda sus propios headers (ej. Authorization).
  const headers = new Headers({ "Content-Type": "application/json" });
  if (init?.headers) {
    new Headers(init.headers).forEach((value, key) => headers.set(key, value));
  }
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });

  if (res.status === 401) {
    // Token ausente, vencido o inválido — se limpia y se avisa; el
    // AuthProvider decide qué hacer (redirigir a /login), acá no se sabe
    // de rutas.
    setToken(null);
    unauthorizedListeners.forEach((listener) => listener());
  }

  if (!res.ok) {
    const body = await res.text();
    let detail: unknown;
    try {
      detail = body ? JSON.parse(body) : undefined;
    } catch {
      detail = body;
    }
    // FastAPI devuelve errores simples como {"detail": "mensaje humano"} —
    // si el body sigue esa forma, .message queda con el texto limpio en
    // vez del JSON crudo. Los 409 con detail estructurado (candidatos de
    // duplicado, stock bajo mínimo) no matchean esto y caen al body tal
    // cual, pero esos ya se manejan por su propia subclase de error, no
    // leyendo .message.
    const message =
      detail && typeof detail === "object" && typeof (detail as { detail?: unknown }).detail === "string"
        ? (detail as { detail: string }).detail
        : body || res.statusText;
    throw new ApiError(res.status, message, detail);
  }

  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

function json(body: unknown): RequestInit {
  return { method: "POST", body: JSON.stringify(body) };
}

function jsonPatch(body: unknown): RequestInit {
  return { method: "PATCH", body: JSON.stringify(body) };
}

// --- tipos: reflejan components/schemas de docs/openapi.yaml ---
// Los montos llegan como string (Decimal en el backend, no float) —
// ver ../lib/format.ts para mostrarlos/editarlos.

export interface Negocio {
  id: number;
  nombre: string;
  rubro: string;
  modulos_activos: Record<string, unknown>;
  plan_estado: string;
  fecha_ultimo_pago: string | null;
  link_sunat: string | null;
  modulo_rus_activo: boolean;
}

export interface NegocioCreate {
  nombre: string;
  rubro: string;
  modulos_activos?: Record<string, unknown>;
  plan_estado?: string;
  fecha_ultimo_pago?: string | null;
  link_sunat?: string | null;
  modulo_rus_activo?: boolean;
  usuario_inicial?: {
    nombre: string;
    rol: string;
    username: string;
    password?: string;
  };
}
export type NegocioUpdate = Partial<Omit<Negocio, "id">>;

export interface Usuario {
  id: number;
  negocio_id: number | null;
  nombre: string;
  rol: string;
  username?: string;
  activo?: boolean;
}

export interface UsuarioCreate {
  nombre: string;
  rol: string;
  username: string;
  password?: string;
}

export interface UsuarioUpdate {
  nombre?: string;
  rol?: string;
  password?: string;
  activo?: boolean;
}

export interface Producto {
  id: number;
  negocio_id: number;
  nombre: string;
  medida: string | null;
  marca: string | null;
  estado_uso: string | null;
  precio_lista: string;
  precio_compra: string;
  clasificacion: string | null;
  stock_actual: number;
  stock_minimo: number;
  activo: boolean;
}

export interface ClienteVehiculo {
  id: number;
  negocio_id: number;
  nombre_cliente: string;
  telefono: string | null;
  placa: string | null;
  marca_vehiculo: string | null;
  modelo_vehiculo: string | null;
  tipo_aceite: string | null;
  intervalo_meses: number | null;
  fecha_ultimo_servicio: string | null;
  /** La calcula el servidor a partir de fecha_ultimo_servicio +
   * intervalo_meses — nunca se manda al crear/editar. */
  fecha_proximo_mantenimiento: string | null;
  activo: boolean;
}

export interface Movimiento {
  id: number;
  negocio_id: number;
  usuario_id: number;
  producto_id: number;
  cliente_vehiculo_id: number | null;
  tipo: string;
  descripcion: string | null;
  precio_lista: string;
  precio_final: string;
  monto_capital: number;
  metodo_pago: string | null;
  fecha: string;
}

export type MovimientoCreate = Omit<Movimiento, "id" | "negocio_id" | "monto_capital"> & {
  monto_capital?: number | null;
};

export interface CierreCaja {
  id: number;
  negocio_id: number;
  periodo: string;
  fecha_inicio: string;
  fecha_fin: string;
  total_bruto: string;
  total_capital: string;
  total_ganancia: string;
  total_efectivo: string;
  total_digital: string;
}

export interface CierreCajaCreate {
  periodo: string;
  fecha_inicio: string;
  fecha_fin: string;
}

/** Registro auditado (feed de SUNAT) — requiere modulo_rus_activo. Para
 * una corrección simple sin ese rastro está ajustarStock más abajo. */
export interface RegistroCompra {
  id: number;
  negocio_id: number;
  producto_id: number;
  cantidad: number;
  costo_unitario: string;
  fecha: string;
}

export interface RegistroCompraCreate {
  producto_id: number;
  cantidad: number;
  costo_unitario: string;
  fecha?: string | null;
}

/** Se lanza cuando el backend responde 409 a una venta que deja el stock
 * bajo el mínimo — el flujo debe mostrar el modal de confirmación y
 * reintentar con confirmarBajoMinimo: true. */
export class StockBajoMinimoError extends ApiError {}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  rol: string;
  negocio_id: number | null;
  nombre: string;
}

export const api = {
  login: (username: string, password: string) =>
    request<LoginResponse>("/auth/login", json({ username, password })),

  listNegocios: () => request<Negocio[]>("/negocios"),
  getNegocio: (id: number) => request<Negocio>(`/negocios/${id}`),
  createNegocio: (payload: NegocioCreate) =>
    request<Negocio>("/negocios", json(payload)),
  updateNegocio: (id: number, payload: NegocioUpdate) =>
    request<Negocio>(`/negocios/${id}`, jsonPatch(payload)),

  listUsuarios: (negocioId: number) =>
    request<Usuario[]>(`/negocios/${negocioId}/usuarios`),
  createUsuario: (negocioId: number, payload: UsuarioCreate) =>
    request<Usuario>(`/negocios/${negocioId}/usuarios`, json(payload)),
  updateUsuario: (negocioId: number, usuarioId: number, payload: UsuarioUpdate) =>
    request<Usuario>(`/negocios/${negocioId}/usuarios/${usuarioId}`, jsonPatch(payload)),

  listProductos: (negocioId: number) =>
    request<Producto[]>(`/negocios/${negocioId}/productos`),

  /** 403 si el negocio no tiene modulos_activos.clientes_vehiculos — el
   * caller debe chequear eso antes de llamar, no solo capturar el error. */
  listClientesVehiculos: (negocioId: number, activo?: boolean) => {
    const qs = activo === undefined ? "" : `?activo=${activo}`;
    return request<ClienteVehiculo[]>(`/negocios/${negocioId}/clientes-vehiculos${qs}`);
  },

  listMovimientos: (negocioId: number) =>
    request<Movimiento[]>(`/negocios/${negocioId}/movimientos`),

  async createMovimiento(
    negocioId: number,
    payload: MovimientoCreate,
    { confirmarBajoMinimo = false }: { confirmarBajoMinimo?: boolean } = {},
  ) {
    const qs = confirmarBajoMinimo ? "?confirmar_bajo_minimo=true" : "";
    try {
      return await request<Movimiento>(
        `/negocios/${negocioId}/movimientos${qs}`,
        json(payload),
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        throw new StockBajoMinimoError(err.status, err.message, err.detail);
      }
      throw err;
    }
  },

  listCierresCaja: (negocioId: number) =>
    request<CierreCaja[]>(`/negocios/${negocioId}/cierres-caja`),
  createCierreCaja: (negocioId: number, payload: CierreCajaCreate) =>
    request<CierreCaja>(`/negocios/${negocioId}/cierres-caja`, json(payload)),

  /** Gateado por modulo_rus_activo (403 si no está activo). Suma
   * `cantidad` a stock_actual y queda como historial para SUNAT. */
  listRegistroCompras: (negocioId: number) =>
    request<RegistroCompra[]>(`/negocios/${negocioId}/registro-compras`),
  createRegistroCompra: (negocioId: number, payload: RegistroCompraCreate) =>
    request<RegistroCompra>(`/negocios/${negocioId}/registro-compras`, json(payload)),

  /** Corrección directa de stock_actual, siempre disponible (no depende
   * de modulo_rus_activo) y sin rastro auditado — para eso está
   * registro-compras. delta positivo repone, negativo corrige. El
   * backend responde 400 con detail de texto plano si delta es 0 o si
   * dejaría el stock negativo. */
  ajustarStock: (negocioId: number, productoId: number, delta: number) =>
    request<Producto>(
      `/negocios/${negocioId}/productos/${productoId}/ajustar-stock`,
      json({ delta }),
    ),
};
