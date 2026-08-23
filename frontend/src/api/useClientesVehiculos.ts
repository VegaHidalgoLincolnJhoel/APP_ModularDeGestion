import { useCallback, useEffect, useState } from "react";
import { api, type ClienteVehiculo } from "./client";

/** Solo pega contra /clientes-vehiculos si `moduloActivo` — el endpoint
 * responde 403 si el negocio no tiene modulos_activos.clientes_vehiculos,
 * y no tiene sentido ni pedirlo. */
export function useClientesVehiculos(negocioId: number | undefined, moduloActivo: boolean) {
  const [clientes, setClientes] = useState<ClienteVehiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (negocioId === undefined || !moduloActivo) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setClientes(await api.listClientesVehiculos(negocioId, true));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }, [negocioId, moduloActivo]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { clientes, loading, error, recargar: cargar };
}

/** fecha_proximo_mantenimiento vencida o de hoy — "vencido" incluye hoy a
 * propósito, ya no queda margen para avisar antes. */
export function estaVencido(cliente: ClienteVehiculo): boolean {
  if (!cliente.fecha_proximo_mantenimiento) return false;
  return cliente.fecha_proximo_mantenimiento <= new Date().toISOString().slice(0, 10);
}

/** Link real a WhatsApp (wa.me), no un envío automático — eso requiere
 * Twilio del lado del backend, que todavía no existe (ver
 * NotificacionWsp en docs/schema_negocios.mermaid, sin endpoint). Esto
 * abre una conversación con el número tal cual está guardado. */
export function linkWhatsApp(telefono: string, mensaje: string): string {
  const numero = telefono.replace(/[^\d]/g, "");
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}
