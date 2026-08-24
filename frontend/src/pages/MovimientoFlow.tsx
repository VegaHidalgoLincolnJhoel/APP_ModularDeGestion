import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { useNegocioDelTipo } from "../hooks/useNegocioDelTipo";
import { useProductos } from "../api/useProductos";
import { useUsuarioPrincipal } from "../api/useUsuarioPrincipal";
import { api, ApiError, StockBajoMinimoError, type Producto } from "../api/client";
import { formatMoney, parseMoneyInput } from "../lib/format";
import { esCapital } from "../lib/contabilidad";
import { buscarAccion } from "../data/negociosConfig";
import { navItemsFor } from "../data/navigation";
import {
  AlertTriangleIcon,
  CardIcon,
  CashIcon,
  CheckIcon,
  ChevronLeftIcon,
} from "../components/icons/Icons";
import styles from "./MovimientoFlow.module.css";

type Paso = "elegir" | "precio" | "confirmar";
const PASOS: { id: Paso; label: string }[] = [
  { id: "elegir", label: "Elegir" },
  { id: "precio", label: "Precio" },
  { id: "confirmar", label: "Pago" },
];

export default function MovimientoFlow() {
  const navigate = useNavigate();
  const { accionId } = useParams<{ accionId: string }>();
  const { tipo, tipoValido, config, negocio, loading: cargandoNegocio } = useNegocioDelTipo();
  const { productos, loading: cargandoProductos, recargar } = useProductos(negocio?.id);
  const { usuarioId, error: errorUsuario } = useUsuarioPrincipal(negocio?.id);

  const [paso, setPaso] = useState<Paso>("elegir");
  const [medidaElegida, setMedidaElegida] = useState<string | null>(null);
  const [productoElegido, setProductoElegido] = useState<Producto | null>(null);
  const [precioFinal, setPrecioFinal] = useState("");
  const [metodoPago, setMetodoPago] = useState<"efectivo" | "digital">("efectivo");
  const [pidiendoConfirmacion, setPidiendoConfirmacion] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  const accion = accionId ? buscarAccion(tipo, accionId) : undefined;

  if (!tipoValido || !accion) {
    return <Navigate to={tipoValido ? `/${tipo}` : "/llanteria"} replace />;
  }

  if (cargandoNegocio) return null;

  if (!negocio) {
    return (
      <AppShell
        logo={<config.logo size={20} />}
        negocioNombre={config.nombreFallback}
        saludo={accion.label}
        navItems={navItemsFor(tipo)}
        activeId="inicio"
      >
        <EmptyState
          icon={<config.logo size={24} />}
          title="Todavía no hay negocio registrado"
          message="Volvé a Inicio para crear el negocio de prueba antes de registrar movimientos."
          action={<Button onClick={() => navigate(`/${tipo}`)}>Volver a Inicio</Button>}
        />
      </AppShell>
    );
  }

  async function enviar(confirmarBajoMinimo = false) {
    if (!negocio || !productoElegido) return;
    if (usuarioId === null) {
      setError(errorUsuario ?? "Todavía no se pudo resolver el usuario del negocio.");
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      await api.createMovimiento(
        negocio.id,
        {
          // Sigue sin haber login por empleado (CLAUDE.md, "Fuera de
          // alcance por ahora") — usuarioId es el único usuario que
          // siembra el backend al crear el negocio, no uno elegido.
          usuario_id: usuarioId,
          producto_id: productoElegido.id,
          cliente_vehiculo_id: null,
          tipo: accion!.categoria === "producto" ? "venta" : "servicio",
          descripcion: accion!.label,
          precio_lista: productoElegido.precio_lista,
          precio_final: parseMoneyInput(precioFinal),
          metodo_pago: metodoPago,
          fecha: new Date().toISOString(),
        },
        { confirmarBajoMinimo },
      );
      setExito(true);
      recargar();
    } catch (err) {
      if (err instanceof StockBajoMinimoError && !confirmarBajoMinimo) {
        setPidiendoConfirmacion(true);
      } else if (err instanceof ApiError) {
        setError(err.message || "No se pudo registrar el movimiento");
      } else {
        setError("No se pudo registrar el movimiento");
      }
    } finally {
      setEnviando(false);
    }
  }

  if (exito) {
    return (
      <AppShell
        logo={<config.logo size={20} />}
        negocioNombre={negocio.nombre}
        saludo={accion.label}
        navItems={navItemsFor(tipo)}
        activeId="inicio"
      >
        <EmptyState
          icon={<CheckIcon size={24} />}
          title="Listo, quedó registrado"
          message={`${accion.label} · ${productoElegido?.nombre ?? ""}`}
          action={<Button onClick={() => navigate(`/${tipo}`)}>Volver a Inicio</Button>}
        />
      </AppShell>
    );
  }

  // El backend solo distingue "capital" (inventario físico) de todo lo
  // demás (ver lib/contabilidad.ts) — nunca compara contra "producto" ni
  // "servicio" literal, esos son categoría de PANTALLA.
  const candidatos = productos.filter(
    (p) => p.activo && esCapital(p.clasificacion) === (accion.categoria === "producto"),
  );
  const medidas = [...new Set(candidatos.map((p) => p.medida).filter((m): m is string => Boolean(m)))];
  const enPasoMedida = accion.agruparPorMedida && !medidaElegida;
  const opciones = medidaElegida ? candidatos.filter((p) => p.medida === medidaElegida) : candidatos;

  return (
    <AppShell
      logo={<config.logo size={20} />}
      negocioNombre={negocio.nombre}
      saludo={accion.label}
      navItems={navItemsFor(tipo)}
      activeId="inicio"
    >
      <div className={styles.header}>
        <button
          type="button"
          className={styles.back}
          onClick={() => navigate(`/${tipo}`)}
          aria-label="Volver a inicio"
        >
          <ChevronLeftIcon size={18} />
        </button>
        <h1 className={styles.title}>{accion.label}</h1>
      </div>

      <ol className={styles.stepper}>
        {PASOS.map((p, i) => {
          const actual = PASOS.findIndex((x) => x.id === paso);
          const estado = i < actual ? "hecho" : i === actual ? "activo" : "pendiente";
          return (
            <li key={p.id} className={styles.step}>
              <span className={`${styles.stepCircle} ${styles[estado]}`}>
                {estado === "hecho" ? <CheckIcon size={14} /> : i + 1}
              </span>
              <span className={styles.stepLabel}>{p.label}</span>
              {i < PASOS.length - 1 && <span className={`${styles.stepLine} ${styles[estado]}`} />}
            </li>
          );
        })}
      </ol>

      {paso === "elegir" && (
        <section className={styles.section}>
          {cargandoProductos ? (
            <p className={styles.muted}>Cargando…</p>
          ) : candidatos.length === 0 ? (
            <EmptyState
              icon={<AlertTriangleIcon size={22} />}
              title={`No hay ${accion.categoria === "producto" ? "productos" : "servicios"} de este tipo`}
              message="Agregalos primero desde Stock para poder registrar esta acción."
              action={<Button onClick={() => navigate(`/${tipo}/stock`)}>Ir a Stock</Button>}
            />
          ) : enPasoMedida ? (
            <>
              <p className={styles.stepHint}>Elegí la medida</p>
              <div className={styles.optionList}>
                {medidas.map((medida) => (
                  <button
                    key={medida}
                    type="button"
                    className={styles.optionRow}
                    onClick={() => setMedidaElegida(medida)}
                  >
                    <span>{medida}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className={styles.stepHint}>
                {accion.agruparPorMedida ? `Marcas en stock — ${medidaElegida}` : "Elegí una opción"}
              </p>
              <div className={styles.optionList}>
                {opciones.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={styles.optionRow}
                    onClick={() => {
                      setProductoElegido(p);
                      setPrecioFinal(p.precio_lista);
                      setPaso("precio");
                    }}
                  >
                    <div>
                      <div className={styles.optionName}>{p.nombre}</div>
                      {p.marca && <div className={styles.optionSub}>{p.marca}</div>}
                    </div>
                    <span className={styles.optionPrice}>{formatMoney(p.precio_lista)}</span>
                  </button>
                ))}
              </div>
              {accion.agruparPorMedida && (
                <button type="button" className={styles.linkBack} onClick={() => setMedidaElegida(null)}>
                  ← Cambiar medida
                </button>
              )}
            </>
          )}
        </section>
      )}

      {paso === "precio" && productoElegido && (
        <section className={styles.section}>
          <div className={styles.summaryChip}>
            <div className={styles.summaryName}>{productoElegido.nombre}</div>
            {productoElegido.marca && <div className={styles.optionSub}>{productoElegido.marca}</div>}
          </div>

          <div className={styles.priceCard}>
            <div className={styles.priceRow}>
              <span className={styles.muted}>Precio de lista</span>
              <span className={styles.strike}>{formatMoney(productoElegido.precio_lista)}</span>
            </div>
            <label className={styles.fieldLabel} htmlFor="precio-final">
              Precio final
            </label>
            <div className={styles.priceInput}>
              <span>S/</span>
              <input
                id="precio-final"
                inputMode="decimal"
                value={precioFinal}
                onChange={(e) => setPrecioFinal(e.target.value)}
              />
            </div>
            <p className={styles.fieldHint}>Se guardan ambos precios: el de lista y el que cobraste.</p>
          </div>

          <Button
            fullWidth
            onClick={() => {
              setPrecioFinal(parseMoneyInput(precioFinal));
              setPaso("confirmar");
            }}
          >
            Continuar
          </Button>
        </section>
      )}

      {paso === "confirmar" && productoElegido && (
        <section className={styles.section}>
          <div className={styles.summaryChip}>
            <div className={styles.summaryName}>{productoElegido.nombre}</div>
            <span className={styles.optionPrice}>{formatMoney(parseMoneyInput(precioFinal))}</span>
          </div>

          <div>
            <p className={styles.fieldLabel}>Método de pago</p>
            <div className={styles.paymentGrid}>
              <button
                type="button"
                className={`${styles.paymentOption} ${metodoPago === "efectivo" ? styles.paymentOptionActive : ""}`}
                onClick={() => setMetodoPago("efectivo")}
              >
                <CashIcon size={22} />
                <span>Efectivo</span>
              </button>
              <button
                type="button"
                className={`${styles.paymentOption} ${metodoPago === "digital" ? styles.paymentOptionActive : ""}`}
                onClick={() => setMetodoPago("digital")}
              >
                <CardIcon size={22} />
                <span>Digital</span>
              </button>
            </div>
          </div>

          {pidiendoConfirmacion && (
            <div className={styles.warnBox}>
              <AlertTriangleIcon size={18} />
              <div>
                <p className={styles.warnTitle}>Esto deja el stock bajo el mínimo</p>
                <p className={styles.fieldHint}>¿Confirmás la venta igual?</p>
                <div className={styles.warnActions}>
                  <Button variant="accent" onClick={() => enviar(true)} disabled={enviando || usuarioId === null}>
                    Sí, confirmar
                  </Button>
                  <Button variant="ghost" onClick={() => setPidiendoConfirmacion(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {error && <p className={styles.error}>{error}</p>}

          {!pidiendoConfirmacion && (
            <Button fullWidth onClick={() => enviar(false)} disabled={enviando || usuarioId === null}>
              {enviando ? "Registrando…" : `Confirmar ${accion.categoria === "producto" ? "venta" : "servicio"}`}
            </Button>
          )}
          <Button variant="ghost" onClick={() => navigate(`/${tipo}`)}>
            Cancelar
          </Button>
        </section>
      )}
    </AppShell>
  );
}
