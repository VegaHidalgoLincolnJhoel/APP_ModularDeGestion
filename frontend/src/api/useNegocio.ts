import { useCallback, useEffect, useState } from "react";
import { api, type Negocio, type NegocioCreate } from "./client";

/**
 * Resuelve el negocio real de un rubro dado (comparando por prefijo,
 * insensible a mayúsculas) contra GET /negocios — un endpoint admin-only
 * desde que existe autenticación. Por eso solo sirve para el flujo de
 * administrador (ver useNegocioDelTipo); un usuario normal ya sabe su
 * negocio por el `negocioId` que trae la sesión, sin listar nada — para
 * ese caso, `enabled: false` evita pegarle a un endpoint que le va a
 * devolver 403.
 */
export function useNegocio(
  rubro: string,
  plantilla: Omit<NegocioCreate, "rubro">,
  enabled: boolean = true,
) {
  const [negocio, setNegocio] = useState<Negocio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
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
  }, [rubro, enabled]);

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
