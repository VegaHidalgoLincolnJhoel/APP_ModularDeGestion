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

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });

  if (!res.ok) {
    const body = await res.text();
    let detail: unknown;
    try {
      detail = body ? JSON.parse(body) : undefined;
    } catch {
      detail = body;
    }
    throw new ApiError(res.status, body || res.statusText, detail);
  }

  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

function json(body: unknown): RequestInit {
  return { method: "POST", body: JSON.stringify(body) };
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

export type NegocioCreate = Omit<Negocio, "id">;

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
  metodo_pago: string | null;
  fecha: string;
}

export type MovimientoCreate = Omit<Movimiento, "id" | "negocio_id">;

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

/** Se lanza cuando el backend responde 409 a una venta que deja el stock
 * bajo el mínimo — el flujo debe mostrar el modal de confirmación y
 * reintentar con confirmarBajoMinimo: true. */
export class StockBajoMinimoError extends ApiError {}

export const api = {
  listNegocios: () => request<Negocio[]>("/negocios"),
  getNegocio: (id: number) => request<Negocio>(`/negocios/${id}`),
  createNegocio: (payload: NegocioCreate) =>
    request<Negocio>("/negocios", json(payload)),

  listProductos: (negocioId: number) =>
    request<Producto[]>(`/negocios/${negocioId}/productos`),

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
};
