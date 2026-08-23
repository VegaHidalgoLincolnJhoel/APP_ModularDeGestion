import type { IconProps } from "./icons/Icons";
import styles from "./ActionCard.module.css";

interface ActionCardProps {
  icon: (props: IconProps) => JSX.Element;
  label: string;
  subtitle?: string;
  tone: "servicio" | "producto";
  onClick?: () => void;
}

/** Botón grande de acción rápida — el bloque de construcción de Inicio.
 * El color (`tone`) es la primera señal, antes que el texto: ámbar para
 * Servicio, azul para Producto, en toda la app. */
export function ActionCard({ icon: Icon, label, subtitle, tone, onClick }: ActionCardProps) {
  return (
    <button type="button" className={`${styles.card} ${styles[tone]}`} onClick={onClick}>
      <span className={styles.iconWrap}>
        <Icon size={26} />
      </span>
      <span className={styles.label}>{label}</span>
      {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
    </button>
  );
}
