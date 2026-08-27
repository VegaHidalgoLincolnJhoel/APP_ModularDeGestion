import { useEffect, useState } from "react";
import { api } from "../api/client";
import { tipoDesdeRubro } from "../data/negociosConfig";
import type { Session } from "./useAuth";

/** Admin va al panel de negocios; un usuario normal va directo a la
 * pantalla de su propio negocio (resuelto por rubro — solo tiene uno, no
 * hay nada que elegir). Usado tanto después de loguearse como en "/". */
export async function resolverDestino(session: Session): Promise<string> {
  if (session.rol === "admin" || session.negocioId === null) return "/negocios";
  try {
    const negocio = await api.getNegocio(session.negocioId);
    const tipo = tipoDesdeRubro(negocio.rubro);
    return `/${tipo}`;
  } catch {
    return "/llanteria";
  }
}

export function useDestinoSesion(session: Session | null) {
  const [destino, setDestino] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) {
      setLoading(false);
      return;
    }
    let cancelado = false;
    setLoading(true);
    resolverDestino(session)
      .then((d) => !cancelado && setDestino(d))
      .finally(() => !cancelado && setLoading(false));
    return () => {
      cancelado = true;
    };
  }, [session]);

  return { destino, loading };
}
