import { useCallback, useEffect, useState } from "react";
import { api, type Negocio, type NegocioCreate } from "./client";

/**
 * Resuelve el negocio real de un rubro dado (comparando por prefijo,
 * insensible a mayúsculas) contra GET /negocios.
 *
 * Hoy no hay login ni selección de negocio — cada sesión de la app está
 * pensada para un solo negocio, así que esto asume que existe como mucho
 * uno por rubro. Cuando exista autenticación esto se reemplaza por "el
 * negocio del usuario logueado", no por esta búsqueda.
 */
export function useNegocio(rubro: string, plantilla: Omit<NegocioCreate, "rubro">) {
  const [negocio, setNegocio] = useState<Negocio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const negocios = await api.listNegocios();
      const encontrado = negocios.find(
        (n) => n.rubro.toLowerCase() === rubro.toLowerCase(),
      );
      setNegocio(encontrado ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }, [rubro]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const crearDePrueba = useCallback(async () => {
    const creado = await api.createNegocio({ ...plantilla, rubro });
    setNegocio(creado);
    return creado;
  }, [plantilla, rubro]);

  return { negocio, loading, error, recargar: cargar, crearDePrueba };
}
