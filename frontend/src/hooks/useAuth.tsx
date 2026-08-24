import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { api, onUnauthorized, setToken } from "../api/client";

const SESSION_KEY = "gestion:session";

export interface Session {
  rol: string;
  negocioId: number | null;
  nombre: string;
}

interface AuthContextValue {
  session: Session | null;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<Session>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function leerSesionGuardada(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function guardarSesion(session: Session | null): void {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // ver setToken en client.ts — mismo motivo, no es crítico.
  }
}

/**
 * Sesión de la app. El token en sí vive en client.ts (getToken/setToken,
 * junto al fetch que lo usa); acá se guarda además `{rol, negocioId,
 * nombre}` — lo que devuelve el login — para no tener que decodificar el
 * JWT en el cliente solo para saber quién es el usuario.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => leerSesionGuardada());
  const navigate = useNavigate();

  useEffect(() => {
    return onUnauthorized(() => {
      guardarSesion(null);
      setSession(null);
      navigate("/login", { replace: true });
    });
  }, [navigate]);

  const login = useCallback(async (username: string, password: string): Promise<Session> => {
    const res = await api.login(username, password);
    setToken(res.access_token);
    const nuevaSesion: Session = { rol: res.rol, negocioId: res.negocio_id, nombre: res.nombre };
    guardarSesion(nuevaSesion);
    setSession(nuevaSesion);
    return nuevaSesion;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    guardarSesion(null);
    setSession(null);
    navigate("/login", { replace: true });
  }, [navigate]);

  const value: AuthContextValue = {
    session,
    isAdmin: session?.rol === "admin",
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
