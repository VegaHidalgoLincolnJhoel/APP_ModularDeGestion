// Único punto de acceso a la API — no usar `fetch` suelto en componentes.
//
// NOTA_OFFLINE: mientras no exista el store local (IndexedDB) + cola de
// sync (ver docs/openapi.yaml → POST /negocios/{id}/sync), cualquier
// escritura hecha desde acá se pierde si no hay red. Antes de construir
// pantallas que escriben datos en el negocio, resolver esa capa offline.

const BASE_URL = import.meta.env.VITE_API_URL;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new ApiError(res.status, detail || res.statusText);
  }

  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

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

export const api = {
  listNegocios: () => request<Negocio[]>("/negocios"),
  getNegocio: (id: number) => request<Negocio>(`/negocios/${id}`),
};
