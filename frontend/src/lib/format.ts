// El backend serializa los montos como Decimal → llegan como string
// ("320.00"), no como number, para no perder precisión. Estos helpers
// convierten entre esa representación y lo que se muestra/edita en pantalla.

/** "320" | "320.5" | "320.00" → "S/ 320.00" */
export function formatMoney(value: string): string {
  const n = Number(value);
  if (Number.isNaN(n)) return "S/ 0.00";
  return `S/ ${n.toFixed(2)}`;
}

/** Normaliza lo que el usuario tipeó en un input a un decimal de 2 cifras
 * como string, listo para mandar a la API. Nunca lanza: un input inválido
 * cae a "0.00". */
export function parseMoneyInput(raw: string): string {
  const n = Number(raw.replace(",", "."));
  if (Number.isNaN(n) || n < 0) return "0.00";
  return n.toFixed(2);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** Fecha de hoy en formato YYYY-MM-DD, para filtros y para las claves de
 * "no mostrar hoy" de las alertas (ver AlertBanner). */
export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}
