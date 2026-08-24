import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Button } from "../components/Button";
import { useAuth } from "../hooks/useAuth";
import { resolverDestino } from "../hooks/useDestinoSesion";
import { ApiError } from "../api/client";
import { TireIcon } from "../components/icons/Icons";
import styles from "./Login.module.css";

export default function Login() {
  const { session, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Ya logueado (ej. volvió a /login con la sesión todavía viva) — no
  // tiene sentido mostrar el formulario de nuevo.
  if (session) {
    return <Navigate to="/" replace />;
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const nuevaSesion = await login(username, password);
      const destino = await resolverDestino(nuevaSesion);
      const origen = (location.state as { from?: Location } | null)?.from;
      navigate(origen?.pathname ?? destino, { replace: true });
    } catch (err) {
      // client.ts ya deja en .message el detail humano que manda el
      // backend (ej. "Usuario deshabilitado" vs. credenciales inválidas)
      // — mostrarlo tal cual en vez de un texto genérico que lo taparía.
      setError(err instanceof ApiError ? err.message : "No se pudo iniciar sesión.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className={styles.page}>
      <form className={styles.card} onSubmit={enviar}>
        <div className={styles.logo}>
          <TireIcon size={22} />
        </div>
        <h1 className={styles.title}>Iniciar sesión</h1>

        <label className={styles.field}>
          <span className={styles.label}>Usuario</span>
          <input
            className={styles.input}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Contraseña</span>
          <input
            type="password"
            className={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>

        {error && <p className={styles.error}>{error}</p>}

        <Button type="submit" fullWidth disabled={enviando || !username || !password}>
          {enviando ? "Entrando…" : "Entrar"}
        </Button>
      </form>
    </div>
  );
}
