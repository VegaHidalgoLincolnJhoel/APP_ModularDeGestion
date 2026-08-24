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
import { esCapital, esProductoNuevo, esProductoUsado, getEstadoUsoBadge } from "../lib/contabilidad";
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
  const [filtroEstadoUso, setFiltroEstadoUso] = useState<"todas" | "nuevo" | "usado">("todas");
  const [medidaElegida, setMedidaElegida] = useState<string | null>(null);
  const [productoElegido, setProductoElegido] = useState<Producto | null>(null);
  const [precioFinal, setPrecioFinal] = useState("");
  const [montoCapital, setMontoCapital] = useState("");
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
          monto_capital: esCapital(productoElegido.clasificacion)
            ? Number(parseMoneyInput(montoCapital))
            : null,
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

  const hayProductosConEstado = candidatos.some((p) => Boolean(p.estado_uso)) || accion.agruparPorMedida;

  const candidatosFiltrados = candidatos.filter((p) => {
    if (filtroEstadoUso === "nuevo") return esProductoNuevo(p.estado_uso);
    if (filtroEstadoUso === "usado") return esProductoUsado(p.estado_uso);
    return true;
  });

  const medidas = [...new Set(candidatosFiltrados.map((p) => p.medida).filter((m): m is string => Boolean(m)))];
  const enPasoMedida = accion.agruparPorMedida && !medidaElegida;
  const opciones = medidaElegida ? candidatosFiltrados.filter((p) => p.medida === medidaElegida) : candidatosFiltrados;

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
          ) : (
            <>
              {hayProductosConEstado && (
                <div className={styles.filterPills} role="group" aria-label="Filtrar por condición">
                  <button
                    type="button"
                    className={`${styles.filterPill} ${filtroEstadoUso === "todas" ? styles.filterPillActive : ""}`}
                    onClick={() => setFiltroEstadoUso("todas")}
                  >
                    Todas
                  </button>
                  <button
                    type="button"
                    className={`${styles.filterPill} ${filtroEstadoUso === "nuevo" ? styles.filterPillActive : ""}`}
                    onClick={() => setFiltroEstadoUso("nuevo")}
                  >
                    Nuevas
                  </button>
                  <button
                    type="button"
                    className={`${styles.filterPill} ${filtroEstadoUso === "usado" ? styles.filterPillActive : ""}`}
                    onClick={() => setFiltroEstadoUso("usado")}
                  >
                    Usadas / Segunda
                  </button>
                </div>
              )}

              {enPasoMedida ? (
                <>
                  <p className={styles.stepHint}>Elegí la medida</p>
                  {medidas.length === 0 ? (
                    <p className={styles.muted}>No hay medidas disponibles con ese filtro.</p>
                  ) : (
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
                  )}
                </>
              ) : (
                <>
                  <p className={styles.stepHint}>
                    {accion.agruparPorMedida ? `Marcas en stock — ${medidaElegida}` : "Elegí una opción"}
                  </p>
                  {opciones.length === 0 ? (
                    <p className={styles.muted}>No hay opciones disponibles con ese filtro.</p>
                  ) : (
                    <div className={styles.optionList}>
                      {opciones.map((p) => {
                        const badge = getEstadoUsoBadge(p.estado_uso);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            className={styles.optionRow}
                            onClick={() => {
                              setProductoElegido(p);
                              setPrecioFinal(p.precio_lista);
                              setMontoCapital(p.precio_compra ?? "0");
                              setPaso("precio");
                            }}
                          >
                            <div className={styles.optionInfo}>
                              <div className={styles.optionHeader}>
                                <span className={styles.optionName}>{p.nombre}</span>
                                {badge && (
                                  <span
                                    className={
                                      badge.tipo === "nuevo"
                                        ? styles.badgeNuevo
                                        : styles.badgeUsado
                                    }
                                  >
                                    {badge.label}
                                  </span>
                                )}
                              </div>
                              {p.marca && <div className={styles.optionSub}>{p.marca}</div>}
                            </div>
                            <span className={styles.optionPrice}>{formatMoney(p.precio_lista)}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {accion.agruparPorMedida && (
                    <button type="button" className={styles.linkBack} onClick={() => setMedidaElegida(null)}>
                      ← Cambiar medida
                    </button>
                  )}
                </>
              )}
            </>
          )}
        </section>
      )}

      {paso === "precio" && productoElegido && (() => {
        const esProdCapital = esCapital(productoElegido.clasificacion);
        const badge = getEstadoUsoBadge(productoElegido.estado_uso);
        const numPrecio = Number(parseMoneyInput(precioFinal)) || 0;
        const numCapital = Number(parseMoneyInput(montoCapital)) || 0;
        const gananciaNeta = numPrecio - numCapital;

        return (
          <section className={styles.section}>
            <div className={styles.summaryChip}>
              <div>
                <div className={styles.optionHeader}>
                  <div className={styles.summaryName}>{productoElegido.nombre}</div>
                  {badge && (
                    <span
                      className={
                        badge.tipo === "nuevo" ? styles.badgeNuevo : styles.badgeUsado
                      }
                    >
                      {badge.label}
                    </span>
                  )}
                </div>
                {productoElegido.marca && <div className={styles.optionSub}>{productoElegido.marca}</div>}
              </div>
            </div>

            <div className={styles.priceCard}>
              <div className={styles.priceRow}>
                <span className={styles.muted}>Precio de lista</span>
                <span className={styles.strike}>{formatMoney(productoElegido.precio_lista)}</span>
              </div>

              <label className={styles.fieldLabel} htmlFor="precio-final">
                {esProdCapital ? "Precio a cobrar" : "Precio final"}
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

              {esProdCapital && (
                <>
                  <label className={styles.fieldLabel} htmlFor="monto-capital">
                    Capital a reponer
                  </label>
                  <div className={styles.priceInput}>
                    <span>S/</span>
                    <input
                      id="monto-capital"
                      inputMode="decimal"
                      value={montoCapital}
                      onChange={(e) => setMontoCapital(e.target.value)}
                    />
                  </div>
                  <p className={styles.fieldHint}>
                    Costo base del producto para reponer inventario (precargado con precio de compra).
                  </p>

                  <div className={`${styles.gananciaBox} ${gananciaNeta < 0 ? styles.gananciaNegativa : ""}`}>
                    <div className={styles.gananciaHeader}>
                      <span className={styles.gananciaLabel}>Ganancia neta estimada</span>
                      <span className={styles.gananciaValor}>
                        {gananciaNeta >= 0 ? "+" : ""}{formatMoney(gananciaNeta.toFixed(2))}
                      </span>
                    </div>
                    <div className={styles.gananciaFormula}>
                      <span>Cobro {formatMoney(numPrecio.toFixed(2))}</span>
                      <span>−</span>
                      <span>Capital {formatMoney(numCapital.toFixed(2))}</span>
                      <span>=</span>
                      <span>{formatMoney(gananciaNeta.toFixed(2))}</span>
                    </div>
                  </div>
                </>
              )}

              {!esProdCapital && (
                <p className={styles.fieldHint}>Se guardan ambos precios: el de lista y el que cobraste.</p>
              )}
            </div>

            <Button
              fullWidth
              onClick={() => {
                setPrecioFinal(parseMoneyInput(precioFinal));
                setMontoCapital(parseMoneyInput(montoCapital));
                setPaso("confirmar");
              }}
            >
              Continuar
            </Button>
          </section>
        );
      })()}

      {paso === "confirmar" && productoElegido && (() => {
        const esProdCapital = esCapital(productoElegido.clasificacion);
        const badge = getEstadoUsoBadge(productoElegido.estado_uso);
        const numPrecio = Number(parseMoneyInput(precioFinal)) || 0;
        const numCapital = Number(parseMoneyInput(montoCapital)) || 0;
        const gananciaNeta = numPrecio - numCapital;

        return (
          <section className={styles.section}>
            <div className={styles.summaryChip}>
              <div>
                <div className={styles.optionHeader}>
                  <div className={styles.summaryName}>{productoElegido.nombre}</div>
                  {badge && (
                    <span
                      className={
                        badge.tipo === "nuevo" ? styles.badgeNuevo : styles.badgeUsado
                      }
                    >
                      {badge.label}
                    </span>
                  )}
                </div>
                {productoElegido.marca && <div className={styles.optionSub}>{productoElegido.marca}</div>}
              </div>
              <span className={styles.optionPrice}>{formatMoney(parseMoneyInput(precioFinal))}</span>
            </div>

            {esProdCapital && (
              <div className={styles.desgloseCard}>
                <div className={styles.desgloseRow}>
                  <span className={styles.muted}>Capital a reponer:</span>
                  <span className={styles.desgloseVal}>{formatMoney(numCapital.toFixed(2))}</span>
                </div>
                <div className={styles.desgloseRow}>
                  <span className={styles.muted}>Ganancia neta:</span>
                  <span
                    className={`${styles.desgloseVal} ${gananciaNeta >= 0 ? styles.gananciaPositivaText : styles.gananciaNegativaText}`}
                  >
                    {gananciaNeta >= 0 ? "+" : ""}{formatMoney(gananciaNeta.toFixed(2))}
                  </span>
                </div>
              </div>
            )}

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
        );
      })()}
    </AppShell>
  );
}
