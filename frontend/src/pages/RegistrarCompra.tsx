import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { useNegocioDelTipo } from "../hooks/useNegocioDelTipo";
import { useProductos } from "../api/useProductos";
import { api, ApiError } from "../api/client";
import { formatMoney, parseMoneyInput, todayKey } from "../lib/format";
import { AlertTriangleIcon, ChevronLeftIcon, PlusIcon } from "../components/icons/Icons";
import styles from "./AjustarStock.module.css";

export default function RegistrarCompra() {
  const navigate = useNavigate();
  const { productoId } = useParams<{ productoId: string }>();
  const { tipo, negocio, loading: cargandoNegocio } = useNegocioDelTipo();
  const { productos, loading: cargandoProductos, recargar } = useProductos(negocio?.id);
  const [cantidad, setCantidad] = useState("1");
  const [costoUnitario, setCostoUnitario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (cargandoNegocio || cargandoProductos) return null;

  const producto = productos.find((p) => p.id === Number(productoId));

  if (!negocio || !producto) {
    return (
      <EmptyState
        icon={<PlusIcon size={22} />}
        title="No se encontró el producto"
        message="Puede que ya no exista o haya cambiado de id."
        action={<Button onClick={() => navigate(`/${tipo}/stock`)}>Volver a Stock</Button>}
      />
    );
  }

  if (!negocio.modulo_rus_activo) {
    return (
      <EmptyState
        icon={<AlertTriangleIcon size={22} />}
        title="Módulo RUS no activo"
        message="Este negocio no tiene modulo_rus_activo — usá 'Ajustar' en la card del producto para reponer stock sin quedar en el historial de SUNAT."
        action={<Button onClick={() => navigate(`/${tipo}/stock`)}>Volver a Stock</Button>}
      />
    );
  }

  const cantidadNum = Number(cantidad) || 0;
  const costo = parseMoneyInput(costoUnitario || "0");

  async function enviar() {
    setEnviando(true);
    setError(null);
    try {
      await api.createRegistroCompra(negocio!.id, {
        producto_id: producto!.id,
        cantidad: cantidadNum,
        costo_unitario: costo,
        fecha: todayKey(),
      });
      recargar();
      navigate(`/${tipo}/stock`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo registrar la compra");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <div className={styles.header}>
        <button type="button" className={styles.back} onClick={() => navigate(`/${tipo}/stock`)} aria-label="Volver a stock">
          <ChevronLeftIcon size={18} />
        </button>
        <h1 className={styles.title}>Registrar compra</h1>
      </div>

      <div className={styles.card}>
        <div className={styles.nombre}>{producto.nombre}</div>
        <div className={styles.sub}>
          {[producto.medida, producto.marca].filter(Boolean).join(" · ") || "Sin medida ni marca"}
        </div>
        <div className={styles.stockActual}>
          Stock actual: <strong>{producto.stock_actual}</strong>
        </div>

        <label className={styles.field}>
          <div className={styles.hint}>Cantidad</div>
          <input
            type="number"
            min={1}
            className={styles.fieldInput}
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
          />
        </label>

        <label className={styles.field}>
          <div className={styles.hint}>Costo unitario</div>
          <input
            inputMode="decimal"
            className={styles.fieldInput}
            value={costoUnitario}
            onChange={(e) => setCostoUnitario(e.target.value)}
            placeholder="0.00"
          />
        </label>

        <p className={styles.hint}>
          Total: {formatMoney((cantidadNum * Number(costo)).toFixed(2))} · queda como compra del{" "}
          {todayKey()} para SUNAT.
        </p>

        {error && <p className={styles.error}>{error}</p>}

        <Button fullWidth onClick={enviar} disabled={cantidadNum <= 0 || Number(costo) <= 0 || enviando}>
          {enviando ? "Registrando…" : "Registrar compra"}
        </Button>
      </div>
    </>
  );
}
