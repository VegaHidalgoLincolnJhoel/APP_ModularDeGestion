import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { useNegocioDelTipo } from "../hooks/useNegocioDelTipo";
import { useProductos } from "../api/useProductos";
import { formatMoney } from "../lib/format";
import { navItemsFor } from "../data/navigation";
import { BoxIcon, PlusIcon, WrenchIcon } from "../components/icons/Icons";
import styles from "./Stock.module.css";

type Vista = "marca" | "general";

export default function Stock() {
  const navigate = useNavigate();
  const { tipo, tipoValido, config, negocio, loading: cargandoNegocio } = useNegocioDelTipo();
  const { productos, loading: cargandoProductos } = useProductos(negocio?.id);
  const [vista, setVista] = useState<Vista>("marca");

  if (!tipoValido) return <Navigate to="/llanteria" replace />;
  if (cargandoNegocio) return null;

  if (!negocio) {
    return (
      <AppShell
        logo={<config.logo size={20} />}
        negocioNombre={config.nombreFallback}
        saludo="Stock"
        navItems={navItemsFor(tipo)}
        activeId="stock"
      >
        <EmptyState
          icon={<config.logo size={24} />}
          title="Todavía no hay negocio registrado"
          message="Volvé a Inicio para crear el negocio de prueba."
          action={<Button onClick={() => navigate(`/${tipo}`)}>Volver a Inicio</Button>}
        />
      </AppShell>
    );
  }

  // Solo inventario tangible: los servicios (parchado, cambio de aceite...)
  // también son filas de Producto, pero no tienen stock que reportar.
  const inventario = productos.filter(
    (p) => p.activo && p.clasificacion?.toLowerCase() !== "servicio",
  );

  return (
    <StockContenido
      tipo={tipo}
      negocioId={negocio.id}
      moduloRusActivo={negocio.modulo_rus_activo}
      inventario={inventario}
      cargando={cargandoProductos}
      vista={vista}
      onVista={setVista}
      logo={<config.logo size={20} />}
      negocioNombre={negocio.nombre}
      navItems={navItemsFor(tipo)}
    />
  );
}

interface ContenidoProps {
  tipo: string;
  negocioId: number;
  moduloRusActivo: boolean;
  inventario: ReturnType<typeof useProductos>["productos"];
  cargando: boolean;
  vista: Vista;
  onVista: (v: Vista) => void;
  logo: JSX.Element;
  negocioNombre: string;
  navItems: ReturnType<typeof navItemsFor>;
}

function StockContenido({
  tipo,
  moduloRusActivo,
  inventario,
  cargando,
  vista,
  onVista,
  logo,
  negocioNombre,
  navItems,
}: ContenidoProps) {
  const navigate = useNavigate();

  const porMarca = useMemo(() => {
    const grupos = new Map<string, typeof inventario>();
    for (const p of inventario) {
      const clave = p.marca ?? "Sin marca";
      grupos.set(clave, [...(grupos.get(clave) ?? []), p]);
    }
    return [...grupos.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [inventario]);

  const general = useMemo(() => {
    const grupos = new Map<string, { cantidad: number; valor: number }>();
    for (const p of inventario) {
      const clave = p.medida ?? "Sin medida";
      const actual = grupos.get(clave) ?? { cantidad: 0, valor: 0 };
      grupos.set(clave, {
        cantidad: actual.cantidad + p.stock_actual,
        valor: actual.valor + p.stock_actual * Number(p.precio_lista),
      });
    }
    return [...grupos.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [inventario]);

  return (
    <AppShell logo={logo} negocioNombre={negocioNombre} saludo="Stock" navItems={navItems} activeId="stock">
      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${vista === "marca" ? styles.tabActive : ""}`}
          onClick={() => onVista("marca")}
        >
          Por marca
        </button>
        <button
          type="button"
          className={`${styles.tab} ${vista === "general" ? styles.tabActive : ""}`}
          onClick={() => onVista("general")}
        >
          General
        </button>
      </div>

      {cargando ? (
        <p className={styles.muted}>Cargando…</p>
      ) : inventario.length === 0 ? (
        <EmptyState icon={<BoxIcon size={22} />} title="Todavía no hay productos" message="Se agregan al vender por primera vez, o desde acá cuando repongas." />
      ) : vista === "marca" ? (
        <div className={styles.groups}>
          {porMarca.map(([marca, items]) => (
            <section key={marca}>
              <h2 className={styles.groupTitle}>{marca}</h2>
              <div className={styles.cardGrid}>
                {items.map((p) => {
                  const bajoMinimo = p.stock_actual < p.stock_minimo;
                  return (
                    <div key={p.id} className={`${styles.card} ${bajoMinimo ? styles.cardBajo : ""}`}>
                      <div className={styles.cardMedida}>{p.medida ?? p.nombre}</div>
                      <div className={styles.cardRow}>
                        <span className={bajoMinimo ? styles.cantidadBaja : styles.cantidad}>
                          {p.stock_actual} en stock
                        </span>
                        <span className={styles.precio}>{formatMoney(p.precio_lista)}</span>
                      </div>
                      <div className={styles.cardActions}>
                        <button
                          type="button"
                          className={styles.actionButton}
                          onClick={() => navigate(`/${tipo}/stock/ajustar/${p.id}`)}
                        >
                          <WrenchIcon size={14} />
                          Ajustar
                        </button>
                        {moduloRusActivo && (
                          <button
                            type="button"
                            className={styles.actionButton}
                            onClick={() => navigate(`/${tipo}/stock/comprar/${p.id}`)}
                          >
                            <PlusIcon size={14} />
                            Comprar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className={styles.generalList}>
          {general.map(([medida, totales]) => (
            <div key={medida} className={styles.generalRow}>
              <span className={styles.generalMedida}>{medida}</span>
              <span className={styles.generalCantidad}>{totales.cantidad} unidades</span>
              <span className={styles.generalValor}>{formatMoney(totales.valor.toFixed(2))}</span>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
