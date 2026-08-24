// Espejo de backend/app/core/contabilidad.py — la regla de negocio vive
// ahí (decide si un movimiento consume stock y en qué columna cae el
// monto al cerrar caja), pero el frontend necesita la misma lectura para
// filtrar catálogo y armar los reportes de Stock. Si cambia de un lado
// tiene que cambiar del otro.
export function esCapital(clasificacion: string | null): boolean {
  return clasificacion === "capital";
}
