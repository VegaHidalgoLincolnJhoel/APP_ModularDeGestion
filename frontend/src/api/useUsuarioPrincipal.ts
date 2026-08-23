import { useEffect, useState } from "react";
import { api } from "./client";

/**
 * Todavía no hay login por empleado (ver CLAUDE.md, "Fuera de alcance por
 * ahora") — cada negocio arranca con un único usuario, sembrado por el
 * backend al crear el negocio (POST /negocios). Esto resuelve su id real
 * en vez de asumirlo.
 */
export function useUsuarioPrincipal(negocioId: number | undefined) {
  const [usuarioId, setUsuarioId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (negocioId === undefined) return;
    let cancelado = false;
    setLoading(true);
    api
      .listUsuarios(negocioId)
      .then((usuarios) => {
        if (cancelado) return;
        setUsuarioId(usuarios[0]?.id ?? null);
        if (usuarios.length === 0) {
          setError("El negocio no tiene ningún usuario todavía.");
        }
      })
      .catch((err) => !cancelado && setError(err instanceof Error ? err.message : "Error inesperado"))
      .finally(() => !cancelado && setLoading(false));
    return () => {
      cancelado = true;
    };
  }, [negocioId]);

  return { usuarioId, loading, error };
}
