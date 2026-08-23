import { useEffect, useState } from "react";
import { api, ApiError, type Negocio } from "../api/client";

export default function Dashboard() {
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listNegocios()
      .then(setNegocios)
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : "Error inesperado");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Cargando…</p>;
  if (error) return <p role="alert">Error al cargar negocios: {error}</p>;

  return (
    <main>
      <h1>Negocios</h1>
      {negocios.length === 0 ? (
        <p>No hay negocios registrados todavía.</p>
      ) : (
        <ul>
          {negocios.map((negocio) => (
            <li key={negocio.id}>
              {negocio.nombre} — {negocio.rubro}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
