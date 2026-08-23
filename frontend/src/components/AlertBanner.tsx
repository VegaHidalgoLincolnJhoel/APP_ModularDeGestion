import { useState, type ReactNode } from "react";
import { AlertTriangleIcon, CloseIcon } from "./icons/Icons";
import { todayKey } from "../lib/format";
import styles from "./AlertBanner.module.css";

const STORAGE_PREFIX = "gestion:alerta-descartada:";

function estaDescartadaHoy(id: string): boolean {
  try {
    return localStorage.getItem(STORAGE_PREFIX + id) === todayKey();
  } catch {
    // localStorage puede fallar (modo privado, cuota); si falla, la
    // alerta simplemente no se recuerda descartada — no es crítico.
    return false;
  }
}

function descartarHoy(id: string) {
  try {
    localStorage.setItem(STORAGE_PREFIX + id, todayKey());
  } catch {
    // ver arriba
  }
}

interface AlertBannerProps {
  id: string;
  title: string;
  message: string;
  action?: ReactNode;
}

/**
 * Alerta persistente en inicio (stock bajo, mantenimientos vencidos, etc.)
 * con el checkbox "no mostrar hoy" que pide el spec: se guarda en
 * localStorage con la fecha de hoy y se resetea sola al día siguiente.
 * Cuando la condición real se resuelve (stock repuesto, cliente
 * contactado), quien la use deja de renderizarla — este componente no
 * sabe de eso, solo de "hoy sí / hoy no".
 */
export function AlertBanner({ id, title, message, action }: AlertBannerProps) {
  const [descartada, setDescartada] = useState(() => estaDescartadaHoy(id));

  if (descartada) return null;

  return (
    <div className={styles.banner}>
      <div className={styles.row}>
        <span className={styles.icon}>
          <AlertTriangleIcon size={18} />
        </span>
        <div className={styles.text}>
          <div className={styles.title}>{title}</div>
          <div className={styles.message}>{message}</div>
          <button
            type="button"
            className={styles.dismissLink}
            onClick={() => {
              descartarHoy(id);
              setDescartada(true);
            }}
          >
            No mostrar hoy
          </button>
        </div>
        <button type="button" className={styles.close} onClick={() => setDescartada(true)} aria-label="Cerrar aviso">
          <CloseIcon size={16} />
        </button>
      </div>
      {action}
    </div>
  );
}
