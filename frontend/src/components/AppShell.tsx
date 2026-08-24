import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { LogoutIcon, UserIcon } from "./icons/Icons";
import type { IconProps } from "./icons/Icons";
import { useAuth } from "../hooks/useAuth";
import styles from "./AppShell.module.css";

export interface NavItem {
  id: string;
  label: string;
  icon: (props: IconProps) => JSX.Element;
  to: string;
  badge?: boolean;
}

interface AppShellProps {
  logo: ReactNode;
  negocioNombre: string;
  saludo: string;
  navItems: NavItem[];
  activeId: string;
  children: ReactNode;
}

/**
 * Chrome de navegación responsivo: la misma lista de `navItems` se
 * renderiza como sidebar en escritorio y como barra inferior en móvil.
 * El contenido (`children`) se monta una sola vez — lo que cambia entre
 * anchos de pantalla es solo esta cáscara, vía CSS, no una versión mobile
 * y otra desktop del árbol entero.
 */
export function AppShell({ logo, negocioNombre, saludo, navItems, activeId, children }: AppShellProps) {
  const { session, logout } = useAuth();

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarBrand}>
          <div className={styles.sidebarLogo}>{logo}</div>
          <span className={styles.brandName}>{negocioNombre}</span>
        </div>
        <nav className={styles.sidebarNav}>
          {navItems.map((item) => (
            <Link
              key={item.id}
              to={item.to}
              className={`${styles.sidebarLink} ${item.id === activeId ? styles.sidebarLinkActive : ""}`}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
              {item.badge && <span className={styles.dot} />}
            </Link>
          ))}
        </nav>
        <div className={styles.sidebarSpacer} />
        <button type="button" className={styles.sidebarUser} onClick={logout}>
          <UserIcon size={16} />
          <span>{session?.nombre ?? "Cuenta"}</span>
          <LogoutIcon size={14} className={styles.logoutHint} />
        </button>
      </aside>

      <div className={styles.main}>
        <header className={styles.mobileHeader}>
          <div className={styles.brand}>
            <div className={styles.logo}>{logo}</div>
            <div>
              <div className={styles.brandName}>{negocioNombre}</div>
              <div className={styles.saludo}>{saludo}</div>
            </div>
          </div>
          <button type="button" className={styles.iconButton} onClick={logout} aria-label="Cerrar sesión">
            <LogoutIcon size={18} />
          </button>
        </header>

        <header className={styles.desktopTopbar}>
          <h1 className={styles.desktopTitle}>{saludo}</h1>
          <button type="button" className={styles.iconButton} onClick={logout} aria-label="Cerrar sesión">
            <LogoutIcon size={18} />
          </button>
        </header>

        <div className={styles.content}>{children}</div>

        <nav className={styles.bottomNav}>
          {navItems.map((item) => (
            <Link
              key={item.id}
              to={item.to}
              className={`${styles.bottomNavItem} ${item.id === activeId ? styles.bottomNavItemActive : ""}`}
            >
              <item.icon size={21} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
