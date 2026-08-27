import { useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { useNegocioDelTipo } from "../hooks/useNegocioDelTipo";
import { useProductos } from "../api/useProductos";
import {
  api,
  ApiError,
  ProductoDuplicadoError,
  type ProductoCandidatoDuplicado,
} from "../api/client";
import { formatMoney } from "../lib/format";
import { esCapital, getEstadoUsoBadge } from "../lib/contabilidad";
import {
  AlertTriangleIcon,
  BoxIcon,
  CloseIcon,
  PlusIcon,
  WrenchIcon,
} from "../components/icons/Icons";
import styles from "./Stock.module.css";

type Vista = "marca" | "general";

export default function Stock() {
  const { tipo, negocio, loading: cargandoNegocio } = useNegocioDelTipo();
  const { productos, loading: cargandoProductos, recargar } = useProductos(negocio?.id);
  const [vista, setVista] = useState<Vista>("marca");

  // Estado del Modal de Creación
  const [modalAbierto, setModalAbierto] = useState(false);
  const [tipoItem, setTipoItem] = useState<"producto" | "servicio">("producto");
  const [guardando, setGuardando] = useState(false);
  const [errorCreacion, setErrorCreacion] = useState<string | null>(null);
  const [candidatosDuplicados, setCandidatosDuplicados] = useState<
    ProductoCandidatoDuplicado[] | null
  >(null);

  const [form, setForm] = useState({
    nombre: "",
    medida: "",
    marca: "",
    estado_uso: "nuevo" as "nuevo" | "usado",
    precio_lista: "",
    precio_compra: "",
    stock_actual: "1",
    stock_minimo: "2",
  });

  const abrirModalNuevo = () => {
    setErrorCreacion(null);
    setCandidatosDuplicados(null);
    setForm({
      nombre: "",
      medida: "",
      marca: "",
      estado_uso: "nuevo",
      precio_lista: "",
      precio_compra: "",
      stock_actual: "1",
      stock_minimo: "2",
    });
    setModalAbierto(true);
  };

  const submitNuevoItem = async (e?: FormEvent, confirmarNuevo = false) => {
    if (e) e.preventDefault();
    if (!negocio || !form.nombre.trim()) return;

    setGuardando(true);
    setErrorCreacion(null);
    if (!confirmarNuevo) {
      setCandidatosDuplicados(null);
    }

    try {
      if (tipoItem === "producto") {
        await api.createProducto(
          negocio.id,
          {
            nombre: form.nombre.trim(),
            medida: form.medida.trim() || null,
            marca: form.marca.trim() || null,
            estado_uso: form.estado_uso,
            precio_lista: form.precio_lista.trim() || "0.00",
            precio_compra: form.precio_compra.trim() || "0.00",
            clasificacion: "capital",
            stock_actual: Math.max(0, parseInt(form.stock_actual, 10) || 0),
            stock_minimo: Math.max(0, parseInt(form.stock_minimo, 10) || 0),
            activo: true,
          },
          confirmarNuevo,
        );
      } else {
        await api.createProducto(
          negocio.id,
          {
            nombre: form.nombre.trim(),
            medida: null,
            marca: null,
            estado_uso: null,
            precio_lista: form.precio_lista.trim() || "0.00",
            precio_compra: "0.00",
            clasificacion: null,
            stock_actual: 0,
            stock_minimo: 0,
            activo: true,
          },
          confirmarNuevo,
        );
      }

      await recargar();
      setModalAbierto(false);
      setCandidatosDuplicados(null);
    } catch (err) {
      if (err instanceof ProductoDuplicadoError) {
        setCandidatosDuplicados(err.candidatos || []);
        setErrorCreacion(
          "Ya existe un producto o servicio con un nombre muy similar en este negocio.",
        );
      } else if (err instanceof ApiError) {
        setErrorCreacion(err.message || "Error al registrar el producto o servicio.");
      } else {
        setErrorCreacion(
          err instanceof Error ? err.message : "Error inesperado al guardar.",
        );
      }
    } finally {
      setGuardando(false);
    }
  };

  if (cargandoNegocio || !negocio) return null;

  // Solo inventario tangible ("capital", ver lib/contabilidad.ts): los
  // servicios también son filas de Producto, pero no tienen stock real
  // que reportar acá.
  const inventario = productos.filter((p) => p.activo && esCapital(p.clasificacion));

  return (
    <>
      <StockContenido
        tipo={tipo}
        moduloRusActivo={negocio.modulo_rus_activo}
        inventario={inventario}
        cargando={cargandoProductos}
        vista={vista}
        onVista={setVista}
        onAbrirNuevo={abrirModalNuevo}
      />

      {/* Modal de Alta de Nuevo Producto / Servicio */}
      {modalAbierto && (
        <div className={styles.modalOverlay} onClick={() => setModalAbierto(false)}>
          <div
            className={styles.modalCard}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className={styles.modalHeader}>
              <div>
                <h2 className={styles.modalTitle}>Nuevo Producto o Servicio</h2>
                <p className={styles.modalSubtitle}>
                  Registra un ítem en el catálogo de {negocio.nombre}
                </p>
              </div>
              <button
                type="button"
                className={styles.closeModalBtn}
                onClick={() => setModalAbierto(false)}
                aria-label="Cerrar modal"
              >
                <CloseIcon size={20} />
              </button>
            </div>

            <form onSubmit={(e) => submitNuevoItem(e, false)} className={styles.modalForm}>
              {/* Selector de Tipo: Producto Físico vs Servicio */}
              <div className={styles.typeSelector}>
                <button
                  type="button"
                  className={`${styles.typeBtn} ${tipoItem === "producto" ? styles.typeBtnActive : ""}`}
                  onClick={() => {
                    setTipoItem("producto");
                    setErrorCreacion(null);
                    setCandidatosDuplicados(null);
                  }}
                >
                  <BoxIcon size={16} />
                  <span>Producto Físico (Stock)</span>
                </button>
                <button
                  type="button"
                  className={`${styles.typeBtn} ${tipoItem === "servicio" ? styles.typeBtnActive : ""}`}
                  onClick={() => {
                    setTipoItem("servicio");
                    setErrorCreacion(null);
                    setCandidatosDuplicados(null);
                  }}
                >
                  <WrenchIcon size={16} />
                  <span>Servicio (Mano de obra)</span>
                </button>
              </div>

              {/* Banner de Aviso de Duplicado (409) */}
              {candidatosDuplicados && candidatosDuplicados.length > 0 && (
                <div className={styles.duplicateBanner} role="alert">
                  <div className={styles.duplicateHeader}>
                    <AlertTriangleIcon size={18} />
                    <span>Posible ítem duplicado detectado</span>
                  </div>
                  <p style={{ margin: 0, fontSize: "13px", color: "#e2e8f0" }}>
                    Encontramos productos existentes parecidos:
                  </p>
                  <div className={styles.candidatosList}>
                    {candidatosDuplicados.map((c) => (
                      <div key={c.id} className={styles.candidatoItem}>
                        <strong>• {c.nombre}</strong>
                        <span>
                          {[c.marca, c.medida].filter(Boolean).join(" · ") || "Sin detalles"}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className={styles.duplicateActions}>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setModalAbierto(false)}
                    >
                      Cancelar y revisar
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      disabled={guardando}
                      onClick={() => submitNuevoItem(undefined, true)}
                    >
                      {guardando ? "Creando…" : "Confirmar: Es otro ítem"}
                    </Button>
                  </div>
                </div>
              )}

              {errorCreacion && !candidatosDuplicados && (
                <div className={styles.errorBox} role="alert">
                  <p style={{ margin: 0 }}>{errorCreacion}</p>
                </div>
              )}

              {/* Nombre */}
              <label className={styles.field}>
                <span className={styles.label}>
                  {tipoItem === "producto" ? "Nombre del Producto *" : "Nombre del Servicio *"}
                </span>
                <input
                  required
                  type="text"
                  className={styles.input}
                  placeholder={
                    tipoItem === "producto"
                      ? 'Ej. Aceite Motul 10W-40, Llanta 185/65 R15, Filtro...'
                      : "Ej. Alineamiento y Balanceo, Parchado, Lavado..."
                  }
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  autoFocus
                />
              </label>

              {tipoItem === "producto" && (
                <>
                  <div className={styles.formRow}>
                    <label className={styles.field}>
                      <span className={styles.label}>Medida / Especificación</span>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="Ej. 185/65 R15 o 10W-40"
                        value={form.medida}
                        onChange={(e) => setForm({ ...form, medida: e.target.value })}
                      />
                    </label>

                    <label className={styles.field}>
                      <span className={styles.label}>Marca</span>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="Ej. Michelin, Castrol, Motul"
                        value={form.marca}
                        onChange={(e) => setForm({ ...form, marca: e.target.value })}
                      />
                    </label>
                  </div>

                  <div className={styles.field}>
                    <span className={styles.label}>Condición del Producto</span>
                    <div className={styles.radioPills}>
                      <label
                        className={`${styles.radioPill} ${form.estado_uso === "nuevo" ? styles.radioPillActive : ""}`}
                      >
                        <input
                          type="radio"
                          name="estado_uso"
                          checked={form.estado_uso === "nuevo"}
                          onChange={() => setForm({ ...form, estado_uso: "nuevo" })}
                        />
                        <span>✨ Nuevo</span>
                      </label>
                      <label
                        className={`${styles.radioPill} ${form.estado_uso === "usado" ? styles.radioPillActive : ""}`}
                      >
                        <input
                          type="radio"
                          name="estado_uso"
                          checked={form.estado_uso === "usado"}
                          onChange={() => setForm({ ...form, estado_uso: "usado" })}
                        />
                        <span>♻️ De segunda / Seminuevo</span>
                      </label>
                    </div>
                  </div>
                </>
              )}

              {/* Precios */}
              <div className={styles.formRow}>
                <label className={styles.field}>
                  <span className={styles.label}>
                    {tipoItem === "producto" ? "Precio de Venta (S/) *" : "Precio del Servicio (S/) *"}
                  </span>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    className={styles.input}
                    placeholder="0.00"
                    value={form.precio_lista}
                    onChange={(e) => setForm({ ...form, precio_lista: e.target.value })}
                  />
                </label>

                {tipoItem === "producto" && (
                  <label className={styles.field}>
                    <span className={styles.label}>Costo de Compra (S/)</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className={styles.input}
                      placeholder="0.00 (Opcional)"
                      value={form.precio_compra}
                      onChange={(e) => setForm({ ...form, precio_compra: e.target.value })}
                    />
                  </label>
                )}
              </div>

              {/* Stock inicial y alertas (solo producto) */}
              {tipoItem === "producto" && (
                <div className={styles.formRow}>
                  <label className={styles.field}>
                    <span className={styles.label}>Stock Inicial</span>
                    <input
                      type="number"
                      min="0"
                      className={styles.input}
                      value={form.stock_actual}
                      onChange={(e) => setForm({ ...form, stock_actual: e.target.value })}
                    />
                  </label>

                  <label className={styles.field}>
                    <span className={styles.label}>Stock Mínimo (Alerta)</span>
                    <input
                      type="number"
                      min="0"
                      className={styles.input}
                      value={form.stock_minimo}
                      onChange={(e) => setForm({ ...form, stock_minimo: e.target.value })}
                    />
                  </label>
                </div>
              )}

              <div className={styles.modalActions}>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setModalAbierto(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={guardando || !form.nombre.trim() || !form.precio_lista}
                >
                  {guardando
                    ? "Guardando…"
                    : tipoItem === "producto"
                      ? "Guardar Producto"
                      : "Guardar Servicio"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

interface ContenidoProps {
  tipo: string;
  moduloRusActivo: boolean;
  inventario: ReturnType<typeof useProductos>["productos"];
  cargando: boolean;
  vista: Vista;
  onVista: (v: Vista) => void;
  onAbrirNuevo: () => void;
}

function StockContenido({
  tipo,
  moduloRusActivo,
  inventario,
  cargando,
  vista,
  onVista,
  onAbrirNuevo,
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
    <>
      <div className={styles.stockHeader}>
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

        <button
          type="button"
          className={styles.btnNuevo}
          onClick={onAbrirNuevo}
        >
          <PlusIcon size={16} />
          <span>+ Nuevo Producto / Servicio</span>
        </button>
      </div>

      {cargando ? (
        <p className={styles.muted}>Cargando…</p>
      ) : inventario.length === 0 ? (
        <EmptyState
          icon={<BoxIcon size={22} />}
          title="Todavía no hay productos"
          message="Usa el botón '+ Nuevo Producto / Servicio' para dar de alta tus productos."
          action={
            <Button onClick={onAbrirNuevo}>
              <PlusIcon size={16} />
              <span>Crear primer producto</span>
            </Button>
          }
        />
      ) : vista === "marca" ? (
        <div className={styles.groups}>
          {porMarca.map(([marca, items]) => (
            <section key={marca}>
              <h2 className={styles.groupTitle}>{marca}</h2>
              <div className={styles.cardGrid}>
                {items.map((p) => {
                  const bajoMinimo = p.stock_actual < p.stock_minimo;
                  const badge = getEstadoUsoBadge(p.estado_uso);
                  return (
                    <div
                      key={p.id}
                      className={`${styles.card} ${bajoMinimo ? styles.cardBajo : ""}`}
                    >
                      <div className={styles.cardMedidaRow}>
                        <span className={styles.cardMedida}>{p.medida ?? p.nombre}</span>
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
                      <div className={styles.cardRow}>
                        <span
                          className={bajoMinimo ? styles.cantidadBaja : styles.cantidad}
                        >
                          {p.stock_actual} en stock
                        </span>
                        <span className={styles.precio}>
                          {formatMoney(p.precio_lista)}
                        </span>
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
              <span className={styles.generalCantidad}>
                {totales.cantidad} unidades
              </span>
              <span className={styles.generalValor}>
                {formatMoney(totales.valor.toFixed(2))}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
