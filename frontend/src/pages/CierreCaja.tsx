import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { useNegocioDelTipo } from "../hooks/useNegocioDelTipo";
import { useProductos } from "../api/useProductos";
import { api, type CierreCaja as CierreCajaType, type Movimiento } from "../api/client";
import { formatMoney, todayKey } from "../lib/format";
import { navItemsFor } from "../data/navigation";
import styles from "./CierreCaja.module.css";

export default function CierreCaja() {
  const navigate = useNavigate();
  const { tipo, tipoValido, config, negocio, loading: cargandoNegocio } = useNegocioDelTipo();
  const { productos } = useProductos(negocio?.id);

  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [cierreDeHoy, setCierreDeHoy] = useState<CierreCajaType | null | undefined>(undefined);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [cerrando, setCerrando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!negocio) return;
    let cancelado = false;
    setCargandoDatos(true);
    Promise.all([api.listMovimientos(negocio.id), api.listCierresCaja(negocio.id)])
      .then(([movs, cierres]) => {
        if (cancelado) return;
        setMovimientos(movs);
        setCierreDeHoy(cierres.find((c) => c.fecha_inicio === todayKey() && c.fecha_fin === todayKey()) ?? null);
      })
      .catch((err) => !cancelado && setError(err instanceof Error ? err.message : "Error inesperado"))
      .finally(() => !cancelado && setCargandoDatos(false));
    return () => {
      cancelado = true;
    };
  }, [negocio]);

  if (!tipoValido) return <Navigate to="/llanteria" replace />;
  if (cargandoNegocio) return null;

  if (!negocio) {
    return (
      <AppShell
        logo={<config.logo size={20} />}
        negocioNombre={config.nombreFallback}
        saludo="Cierre de caja"
        navItems={navItemsFor(tipo)}
        activeId="caja"
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

  return (
    <CierreCajaContenido
      negocioId={negocio.id}
      negocioNombre={negocio.nombre}
      productos={productos}
      movimientos={movimientos}
      cierreDeHoy={cierreDeHoy}
      cargando={cargandoDatos}
      cerrando={cerrando}
      error={error}
      onCerrar={async () => {
        setCerrando(true);
        setError(null);
        try {
          const cierre = await api.createCierreCaja(negocio.id, {
            periodo: "diario",
            fecha_inicio: todayKey(),
            fecha_fin: todayKey(),
          });
          setCierreDeHoy(cierre);
        } catch (err) {
          setError(err instanceof Error ? err.message : "No se pudo cerrar la caja");
        } finally {
          setCerrando(false);
        }
      }}
      logo={<config.logo size={20} />}
      navItems={navItemsFor(tipo)}
    />
  );
}

interface ContenidoProps {
  negocioId: number;
  negocioNombre: string;
  productos: ReturnType<typeof useProductos>["productos"];
  movimientos: Movimiento[];
  cierreDeHoy: CierreCajaType | null | undefined;
  cargando: boolean;
  cerrando: boolean;
  error: string | null;
  onCerrar: () => void;
  logo: JSX.Element;
  navItems: ReturnType<typeof navItemsFor>;
}

function CierreCajaContenido({
  negocioNombre,
  productos,
  movimientos,
  cierreDeHoy,
  cargando,
  cerrando,
  error,
  onCerrar,
  logo,
  navItems,
}: ContenidoProps) {
  const productosPorId = useMemo(() => new Map(productos.map((p) => [p.id, p])), [productos]);
  const movimientosDeHoy = useMemo(
    () => movimientos.filter((m) => m.fecha.slice(0, 10) === todayKey()),
    [movimientos],
  );

  const totales = useMemo(() => {
    let bruto = 0;
    let capital = 0;
    let ganancia = 0;
    let efectivo = 0;
    let digital = 0;
    for (const m of movimientosDeHoy) {
      const monto = Number(m.precio_final);
      bruto += monto;
      const esCapital = productosPorId.get(m.producto_id)?.clasificacion?.toLowerCase() === "producto";
      if (esCapital) capital += monto;
      else ganancia += monto;
      if (m.metodo_pago === "digital") digital += monto;
      else efectivo += monto;
    }
    return { bruto, capital, ganancia, efectivo, digital };
  }, [movimientosDeHoy, productosPorId]);

  const cerrada = Boolean(cierreDeHoy);
  const totalBruto = cerrada ? Number(cierreDeHoy!.total_bruto) : totales.bruto;
  const totalCapital = cerrada ? Number(cierreDeHoy!.total_capital) : totales.capital;
  const totalGanancia = cerrada ? Number(cierreDeHoy!.total_ganancia) : totales.ganancia;
  const totalEfectivo = cerrada ? Number(cierreDeHoy!.total_efectivo) : totales.efectivo;
  const totalDigital = cerrada ? Number(cierreDeHoy!.total_digital) : totales.digital;
  const pctCapital = totalBruto ? (totalCapital / totalBruto) * 100 : 0;
  const pctEfectivo = totalBruto ? (totalEfectivo / totalBruto) * 100 : 0;

  return (
    <AppShell logo={logo} negocioNombre={negocioNombre} saludo="Cierre de caja" navItems={navItems} activeId="caja">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Cierre de caja</h1>
          <p className={styles.subtitle}>
            Hoy {cerrada && <span className={styles.badge}>cerrada</span>}
          </p>
        </div>
      </div>

      <div className={styles.totalCard}>
        <div>
          <div className={styles.totalLabel}>Total bruto {cerrada ? "del cierre" : "(en vivo)"}</div>
          <div className={styles.totalValue}>{formatMoney(totalBruto.toFixed(2))}</div>
        </div>
        {!cerrada && (
          <Button variant="accent" onClick={onCerrar} disabled={cerrando || cargando || movimientosDeHoy.length === 0}>
            {cerrando ? "Cerrando…" : "Cerrar caja del día"}
          </Button>
        )}
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.breakdownGrid}>
        <BreakdownCard
          title="Capital vs. Ganancia"
          pct={pctCapital}
          colorA="var(--producto)"
          colorB="var(--success)"
          items={[
            { label: "Capital", color: "var(--producto)", value: totalCapital },
            { label: "Ganancia", color: "var(--success)", value: totalGanancia },
          ]}
        />
        <BreakdownCard
          title="Efectivo vs. Digital"
          pct={pctEfectivo}
          colorA="var(--servicio)"
          colorB="var(--ink)"
          items={[
            { label: "Efectivo", color: "var(--servicio)", value: totalEfectivo },
            { label: "Digital", color: "var(--ink)", value: totalDigital },
          ]}
        />
      </div>

      <div className={styles.tableCard}>
        <div className={styles.tableTitle}>Movimientos de hoy</div>
        {cargando ? (
          <p className={styles.muted}>Cargando…</p>
        ) : movimientosDeHoy.length === 0 ? (
          <p className={styles.muted}>Todavía no hay movimientos registrados hoy.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Hora</th>
                <th>Tipo</th>
                <th>Descripción</th>
                <th>Método</th>
                <th className={styles.right}>Monto</th>
              </tr>
            </thead>
            <tbody>
              {movimientosDeHoy.map((m) => (
                <tr key={m.id}>
                  <td>{new Date(m.fecha).toLocaleTimeString("es-PE", { hour: "numeric", minute: "2-digit" })}</td>
                  <td>
                    <span className={`${styles.tag} ${m.tipo === "servicio" ? styles.tagServicio : styles.tagProducto}`}>
                      {m.tipo === "servicio" ? "Servicio" : "Producto"}
                    </span>
                  </td>
                  <td>{m.descripcion ?? productosPorId.get(m.producto_id)?.nombre ?? "—"}</td>
                  <td className={styles.muted}>{m.metodo_pago === "digital" ? "Digital" : "Efectivo"}</td>
                  <td className={styles.right}>{formatMoney(m.precio_final)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppShell>
  );
}

function BreakdownCard({
  title,
  pct,
  colorA,
  colorB,
  items,
}: {
  title: string;
  pct: number;
  colorA: string;
  colorB: string;
  items: { label: string; color: string; value: number }[];
}) {
  return (
    <div className={styles.breakdownCard}>
      <div className={styles.tableTitle}>{title}</div>
      <div className={styles.bar}>
        <div style={{ width: `${pct}%`, background: colorA }} />
        <div style={{ width: `${100 - pct}%`, background: colorB }} />
      </div>
      {items.map((item) => (
        <div key={item.label} className={styles.legendRow}>
          <span className={styles.legendLabel}>
            <span className={styles.legendDot} style={{ background: item.color }} />
            {item.label}
          </span>
          <span className={styles.legendValue}>{formatMoney(item.value.toFixed(2))}</span>
        </div>
      ))}
    </div>
  );
}
