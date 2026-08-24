import { useEffect, useState } from "react";
import { api, ApiError, type Negocio } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/Button";
import styles from "./Dashboard.module.css";

// Landing de administrador: hoy solo lista los negocios (GET /negocios es
// admin-only desde que existe login). El panel real para dar de alta
// negocios nuevos es para mañana — esto es apenas lo mínimo para no dejar
// a un admin logueado sin ningún lado a dónde ir.
export default function Dashboard() {
  const { session, logout } = useAuth();
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

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Negocios</h1>
          <p className={styles.subtitle}>{session?.nombre}</p>
        </div>
        <Button variant="ghost" onClick={logout}>
          Cerrar sesión
        </Button>
      </div>

      {loading ? (
        <p className={styles.muted}>Cargando…</p>
      ) : error ? (
        <p role="alert" className={styles.error}>
          Error al cargar negocios: {error}
        </p>
      ) : negocios.length === 0 ? (
        <p className={styles.muted}>No hay negocios registrados todavía.</p>
      ) : (
        <ul className={styles.list}>
          {negocios.map((negocio) => (
            <li key={negocio.id} className={styles.item}>
              <span className={styles.itemNombre}>{negocio.nombre}</span>
              <span className={styles.itemRubro}>{negocio.rubro}</span>
            </li>
          ))}
        </ul>
      )}

      <p className={styles.muted}>
        Panel de administración (dar de alta negocios nuevos) — pendiente.
      </p>
    </main>
  );
}
