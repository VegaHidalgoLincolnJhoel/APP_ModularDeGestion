import { Navigate, useNavigate } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { ActionCard } from "../components/ActionCard";
import { AlertBanner } from "../components/AlertBanner";
import { EmptyState } from "../components/EmptyState";
import { Button } from "../components/Button";
import { useProductos } from "../api/useProductos";
import { navItemsFor } from "../data/navigation";
import { useNegocioDelTipo } from "../hooks/useNegocioDelTipo";
import { BoxIcon } from "../components/icons/Icons";
import styles from "./Inicio.module.css";

export default function Inicio() {
  const navigate = useNavigate();
  const { tipo, tipoValido, config, negocio, loading, crearDePrueba } = useNegocioDelTipo();
  const { productos } = useProductos(negocio?.id);

  if (!tipoValido) {
    return <Navigate to="/llanteria" replace />;
  }

  const productoBajoMinimo = productos.find(
    (p) => p.activo && p.stock_actual < p.stock_minimo,
  );

  if (loading) return null;

  if (!negocio) {
    return (
      <AppShell
        logo={<config.logo size={20} />}
        negocioNombre={config.nombreFallback}
        saludo={config.saludoFallback}
        navItems={navItemsFor(tipo)}
        activeId="inicio"
      >
        <EmptyState
          icon={<config.logo size={24} />}
          title={`Todavía no hay un negocio de "${config.rubro}" registrado`}
          message="Se crea una vez por instalación. Podés generarlo ahora con datos de ejemplo para seguir probando la app."
          action={<Button onClick={() => crearDePrueba()}>Crear negocio de prueba</Button>}
        />
      </AppShell>
    );
  }

  return (
    <AppShell
      logo={<config.logo size={20} />}
      negocioNombre={negocio.nombre}
      saludo={`${config.saludoFallback}, ${negocio.nombre}`}
      navItems={navItemsFor(tipo)}
      activeId="inicio"
    >
      {productoBajoMinimo && (
        <AlertBanner
          id={`stock-bajo-${productoBajoMinimo.id}`}
          title={`Stock bajo · ${productoBajoMinimo.nombre}`}
          message={`Quedan ${productoBajoMinimo.stock_actual} unidades — el mínimo es ${productoBajoMinimo.stock_minimo}.`}
        />
      )}

      <section>
        <h2 className={styles.sectionLabel}>
          <span className={`${styles.dot} ${styles.dotServicio}`} />
          Servicio
        </h2>
        <div className={styles.grid}>
          {config.servicios.map((accion) => (
            <ActionCard
              key={accion.id}
              icon={accion.icon}
              label={accion.label}
              tone="servicio"
              onClick={() => navigate(`/${tipo}/registrar/${accion.id}`)}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className={styles.sectionLabel}>
          <span className={`${styles.dot} ${styles.dotProducto}`} />
          Producto
        </h2>
        <div className={styles.grid}>
          {config.productos.map((accion) => (
            <ActionCard
              key={accion.id}
              icon={accion.icon}
              label={accion.label}
              tone="producto"
              onClick={() => navigate(`/${tipo}/registrar/${accion.id}`)}
            />
          ))}
        </div>
      </section>

      <button type="button" className={styles.quickLink} onClick={() => navigate(`/${tipo}/stock`)}>
        <BoxIcon size={18} />
        <span>Ver stock completo</span>
      </button>
    </AppShell>
  );
}
