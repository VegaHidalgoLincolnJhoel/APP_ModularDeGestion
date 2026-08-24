// Espejo de backend/app/core/contabilidad.py — la regla de negocio vive
// ahí (decide si un movimiento consume stock y en qué columna cae el
// monto al cerrar caja), pero el frontend necesita la misma lectura para
// filtrar catálogo y armar los reportes de Stock. Si cambia de un lado
// tiene que cambiar del otro.
export function esCapital(clasificacion: string | null): boolean {
  return clasificacion === "capital";
}

export function esProductoNuevo(estadoUso: string | null | undefined): boolean {
  if (!estadoUso) return false;
  const val = estadoUso.trim().toLowerCase();
  return val === "nuevo" || val === "nueva";
}

export function esProductoUsado(estadoUso: string | null | undefined): boolean {
  if (!estadoUso) return false;
  const val = estadoUso.trim().toLowerCase();
  return (
    val === "usado" ||
    val === "usada" ||
    val === "segunda" ||
    val === "de segunda" ||
    val === "de_segunda" ||
    val === "seminuevo" ||
    val === "seminueva" ||
    val === "reencauche" ||
    val === "reencauchada"
  );
}

export function getEstadoUsoBadge(
  estadoUso: string | null | undefined,
): { label: string; tipo: "nuevo" | "usado" } | null {
  if (!estadoUso) return null;
  if (esProductoNuevo(estadoUso)) {
    return { label: "Nuevo", tipo: "nuevo" };
  }
  if (esProductoUsado(estadoUso)) {
    const val = estadoUso.trim().toLowerCase();
    const label = val.includes("segunda") ? "De segunda" : "Usado";
    return { label, tipo: "usado" };
  }
  return { label: estadoUso, tipo: "usado" };
}
