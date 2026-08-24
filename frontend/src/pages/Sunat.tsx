import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { useNegocioDelTipo } from "../hooks/useNegocioDelTipo";
import { api, type Movimiento, type RegistroCompra } from "../api/client";
import { esDelMesActual, formatMoney, nombreMesActual } from "../lib/format";
import { navItemsFor } from "../data/navigation";
import { AlertTriangleIcon, ReceiptIcon } from "../components/icons/Icons";
import styles from "./Sunat.module.css";

export default function Sunat() {
  const navigate = useNavigate();
  const { tipo, tipoValido, config, negocio, loading: cargandoNegocio } = useNegocioDelTipo();

  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [compras, setCompras] = useState<RegistroCompra[]>([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [link, setLink] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    setLink(negocio?.link_sunat ?? "");
  }, [negocio?.link_sunat]);

  useEffect(() => {
    if (!negocio?.modulo_rus_activo) {
      setCargandoDatos(false);
      return;
    }
    let cancelado = false;
    setCargandoDatos(true);
    Promise.all([api.listMovimientos(negocio.id), api.listRegistroCompras(negocio.id)])
      .then(([movs, comprasRes]) => {
        if (cancelado) return;
        setMovimientos(movs);
        setCompras(comprasRes);
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
        saludo="SUNAT"
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
        saludo="SUNAT"
        navItems={navItemsFor(tipo)}
        activeId="sunat"
      >
        <EmptyState
          icon={<AlertTriangleIcon size={22} />}
          title="Módulo RUS no activo"
          message="Esta pestaña solo aplica a negocios con modulo_rus_activo habilitado."
        />
      </AppShell>
    );
  }

  const totalVendidoMes = movimientos
    .filter((m) => esDelMesActual(m.fecha))
    .reduce((acc, m) => acc + Number(m.precio_final), 0);
  const totalCompradoMes = compras
    .filter((c) => esDelMesActual(c.fecha))
    .reduce((acc, c) => acc + c.cantidad * Number(c.costo_unitario), 0);

  const diaHoy = new Date().getDate();
  const cercaDelVencimiento = diaHoy >= 15 && diaHoy <= 20;

  async function guardarLink() {
    setGuardando(true);
    setError(null);
    setGuardado(false);
    try {
      await api.updateNegocio(negocio!.id, { link_sunat: link || null });
      setGuardado(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el link");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <AppShell
      logo={<config.logo size={20} />}
      negocioNombre={negocio.nombre}
      saludo="SUNAT"
      navItems={navItemsFor(tipo)}
      activeId="sunat"
    >
      <h1 className={styles.title}>Declaración RUS mensual</h1>

      {cercaDelVencimiento && (
        <div className={styles.reminder}>
          <AlertTriangleIcon size={18} />
          <span>
            La declaración vence el día 20 — hoy es {diaHoy}, quedan {Math.max(0, 20 - diaHoy)} día
            {20 - diaHoy === 1 ? "" : "s"}.
          </span>
        </div>
      )}

      {cargandoDatos ? (
        <p className={styles.muted}>Cargando…</p>
      ) : (
        <div className={styles.totalsGrid}>
          <div className={styles.totalCard}>
            <div className={styles.totalLabel}>Total vendido — {nombreMesActual()}</div>
            <div className={styles.totalValue}>{formatMoney(totalVendidoMes.toFixed(2))}</div>
          </div>
          <div className={styles.totalCard}>
            <div className={styles.totalLabel}>Total comprado — {nombreMesActual()}</div>
            <div className={styles.totalValue}>{formatMoney(totalCompradoMes.toFixed(2))}</div>
          </div>
        </div>
      )}

      <button type="button" className={styles.historial} onClick={() => navigate(`/${tipo}/compras`)}>
        <ReceiptIcon size={16} />
        Ver historial de compras
      </button>

      <div className={styles.linkCard}>
        <div className={styles.linkTitle}>
          <ReceiptIcon size={18} />
          Link de pago de SUNAT
        </div>
        <input
          className={styles.linkInput}
          value={link}
          onChange={(e) => {
            setLink(e.target.value);
            setGuardado(false);
          }}
          placeholder="https://..."
        />
        {error && <p className={styles.error}>{error}</p>}
        {guardado && !error && <p className={styles.success}>Guardado.</p>}
        <Button onClick={guardarLink} disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar link"}
        </Button>
      </div>
    </AppShell>
  );
}
