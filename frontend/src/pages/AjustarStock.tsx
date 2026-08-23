import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { useNegocioDelTipo } from "../hooks/useNegocioDelTipo";
import { useProductos } from "../api/useProductos";
import { api, ApiError } from "../api/client";
import { navItemsFor } from "../data/navigation";
import { ChevronLeftIcon, WrenchIcon } from "../components/icons/Icons";
import styles from "./AjustarStock.module.css";

export default function AjustarStock() {
  const navigate = useNavigate();
  const { productoId } = useParams<{ productoId: string }>();
  const { tipo, tipoValido, config, negocio, loading: cargandoNegocio } = useNegocioDelTipo();
  const { productos, loading: cargandoProductos, recargar } = useProductos(negocio?.id);
  const [delta, setDelta] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!tipoValido) return <Navigate to="/llanteria" replace />;
  if (cargandoNegocio || cargandoProductos) return null;

  const producto = productos.find((p) => p.id === Number(productoId));

  if (!negocio || !producto) {
    return (
      <AppShell
        logo={<config.logo size={20} />}
        negocioNombre={config.nombreFallback}
        saludo="Ajustar stock"
        navItems={navItemsFor(tipo)}
        activeId="stock"
      >
        <EmptyState
          icon={<WrenchIcon size={22} />}
          title="No se encontró el producto"
          message="Puede que ya no exista o haya cambiado de id."
          action={<Button onClick={() => navigate(`/${tipo}/stock`)}>Volver a Stock</Button>}
        />
      </AppShell>
    );
  }

  const resultado = producto.stock_actual + delta;

  async function aplicar() {
    if (delta === 0) return;
    setEnviando(true);
    setError(null);
    try {
      await api.ajustarStock(negocio!.id, producto!.id, delta);
      recargar();
      navigate(`/${tipo}/stock`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo aplicar el ajuste");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <AppShell
      logo={<config.logo size={20} />}
      negocioNombre={negocio.nombre}
      saludo="Ajustar stock"
      navItems={navItemsFor(tipo)}
      activeId="stock"
    >
      <div className={styles.header}>
        <button type="button" className={styles.back} onClick={() => navigate(`/${tipo}/stock`)} aria-label="Volver a stock">
          <ChevronLeftIcon size={18} />
        </button>
        <h1 className={styles.title}>Ajustar stock</h1>
      </div>

      <div className={styles.card}>
        <div className={styles.nombre}>{producto.nombre}</div>
        <div className={styles.sub}>
          {[producto.medida, producto.marca].filter(Boolean).join(" · ") || "Sin medida ni marca"}
        </div>

        <div className={styles.stockActual}>
          Stock actual: <strong>{producto.stock_actual}</strong>
        </div>

        <div className={styles.stepper}>
          <button type="button" className={styles.stepperButton} onClick={() => setDelta((d) => d - 1)}>
            −
          </button>
          <input
            type="number"
            className={styles.stepperInput}
            value={delta}
            onChange={(e) => setDelta(Number(e.target.value) || 0)}
          />
          <button type="button" className={styles.stepperButton} onClick={() => setDelta((d) => d + 1)}>
            +
          </button>
        </div>

        <p className={styles.hint}>
          {delta === 0
            ? "Positivo repone, negativo corrige un error de conteo."
            : `Después del ajuste: ${resultado} unidades.`}
        </p>

        {error && <p className={styles.error}>{error}</p>}

        <Button fullWidth onClick={aplicar} disabled={delta === 0 || enviando}>
          {enviando ? "Aplicando…" : "Aplicar ajuste"}
        </Button>
      </div>
    </AppShell>
  );
}
