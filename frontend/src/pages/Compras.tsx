import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { useNegocioDelTipo } from "../hooks/useNegocioDelTipo";
import { useProductos } from "../api/useProductos";
import { api, type RegistroCompra } from "../api/client";
import { formatMoney } from "../lib/format";
import { navItemsFor } from "../data/navigation";
import { AlertTriangleIcon, ChevronLeftIcon, ReceiptIcon } from "../components/icons/Icons";
import styles from "./Compras.module.css";

export default function Compras() {
  const navigate = useNavigate();
  const { tipo, tipoValido, config, negocio, loading: cargandoNegocio } = useNegocioDelTipo();
  const { productos } = useProductos(negocio?.id);
  const [compras, setCompras] = useState<RegistroCompra[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!negocio?.modulo_rus_activo) {
      setCargando(false);
      return;
    }
    let cancelado = false;
    api
      .listRegistroCompras(negocio.id)
      .then((res) => !cancelado && setCompras(res))
      .catch((err) => !cancelado && setError(err instanceof Error ? err.message : "Error inesperado"))
      .finally(() => !cancelado && setCargando(false));
    return () => {
      cancelado = true;
    };
  }, [negocio]);

  const productosPorId = useMemo(() => new Map(productos.map((p) => [p.id, p])), [productos]);

  const grupos = useMemo(() => {
    const mapa = new Map<string, { compras: RegistroCompra[]; total: number }>();
    for (const c of compras) {
      const clave = new Date(c.fecha).toLocaleDateString("es-PE", { month: "long", year: "numeric" });
      const actual = mapa.get(clave) ?? { compras: [], total: 0 };
      actual.compras.push(c);
      actual.total += c.cantidad * Number(c.costo_unitario);
      mapa.set(clave, actual);
    }
    return [...mapa.entries()];
  }, [compras]);

  if (!tipoValido) return <Navigate to="/llanteria" replace />;
  if (cargandoNegocio) return null;

  if (!negocio) {
    return (
      <AppShell
        logo={<config.logo size={20} />}
        negocioNombre={config.nombreFallback}
        saludo="Compras"
        navItems={navItemsFor(tipo)}
        activeId="sunat"
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

  if (!negocio.modulo_rus_activo) {
    return (
      <AppShell
        logo={<config.logo size={20} />}
        negocioNombre={negocio.nombre}
        saludo="Compras"
        navItems={navItemsFor(tipo)}
        activeId="sunat"
      >
        <EmptyState
          icon={<AlertTriangleIcon size={22} />}
          title="Módulo RUS no activo"
          message="El historial de compras auditadas solo aplica a negocios con modulo_rus_activo habilitado. Para reponer stock sin ese rastro, usá 'Ajustar' en Stock."
        />
      </AppShell>
    );
  }

  return (
    <AppShell
      logo={<config.logo size={20} />}
      negocioNombre={negocio.nombre}
      saludo="Compras"
      navItems={navItemsFor(tipo)}
      activeId="sunat"
    >
      <div className={styles.header}>
        <button type="button" className={styles.back} onClick={() => navigate(`/${tipo}/sunat`)} aria-label="Volver a SUNAT">
          <ChevronLeftIcon size={18} />
        </button>
        <h1 className={styles.title}>Historial de compras</h1>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {cargando ? (
        <p className={styles.muted}>Cargando…</p>
      ) : grupos.length === 0 ? (
        <EmptyState
          icon={<ReceiptIcon size={22} />}
          title="Todavía no hay compras registradas"
          message="Se agregan desde el botón 'Comprar' en cada card de Stock."
          action={<Button onClick={() => navigate(`/${tipo}/stock`)}>Ir a Stock</Button>}
        />
      ) : (
        <div className={styles.groups}>
          {grupos.map(([mes, { compras: items, total }]) => (
            <section key={mes}>
              <div className={styles.groupHeader}>
                <h2 className={styles.groupTitle}>{mes}</h2>
                <span className={styles.groupTotal}>{formatMoney(total.toFixed(2))}</span>
              </div>
              <div className={styles.list}>
                {items.map((c) => (
                  <div key={c.id} className={styles.row}>
                    <div>
                      <div className={styles.rowNombre}>{productosPorId.get(c.producto_id)?.nombre ?? "Producto"}</div>
                      <div className={styles.rowSub}>
                        {c.cantidad} × {formatMoney(c.costo_unitario)} · {c.fecha}
                      </div>
                    </div>
                    <span className={styles.rowTotal}>
                      {formatMoney((c.cantidad * Number(c.costo_unitario)).toFixed(2))}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </AppShell>
  );
}
