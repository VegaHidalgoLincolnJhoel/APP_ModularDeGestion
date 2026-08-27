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
  type Producto,
  type ProductoCandidatoDuplicado,
} from "../api/client";
import { formatMoney } from "../lib/format";
import { esCapital, getEstadoUsoBadge } from "../lib/contabilidad";
import {
  AlertTriangleIcon,
  BoxIcon,
  CloseIcon,
  EditIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
  WrenchIcon,
} from "../components/icons/Icons";
import styles from "./Stock.module.css";

type TabPrincipal = "productos" | "servicios" | "todos";
type VistaStock = "marca" | "general";

export default function Stock() {
  const navigate = useNavigate();
  const { tipo, negocio, loading: cargandoNegocio } = useNegocioDelTipo();
  const { productos, loading: cargandoProductos, recargar } = useProductos(negocio?.id);

  // Tabs y Filtros
  const [tabPrincipal, setTabPrincipal] = useState<TabPrincipal>("productos");
  const [vistaStock, setVistaStock] = useState<VistaStock>("marca");
  const [busqueda, setBusqueda] = useState("");

  // Estado del Modal de Creación
  const [modalNuevoAbierto, setModalNuevoAbierto] = useState(false);
  const [tipoItemNuevo, setTipoItemNuevo] = useState<"producto" | "servicio">("producto");
  const [guardandoNuevo, setGuardandoNuevo] = useState(false);
  const [errorNuevo, setErrorNuevo] = useState<string | null>(null);
  const [candidatosDuplicados, setCandidatosDuplicados] = useState<
    ProductoCandidatoDuplicado[] | null
  >(null);

  const [formNuevo, setFormNuevo] = useState({
    nombre: "",
    medida: "",
    marca: "",
    estado_uso: "nuevo" as "nuevo" | "usado",
    precio_lista: "",
    precio_compra: "",
    stock_actual: "1",
    stock_minimo: "2",
  });

  // Estado del Modal de Edición
  const [itemAEditar, setItemAEditar] = useState<Producto | null>(null);
  const [guardandoEditar, setGuardandoEditar] = useState(false);
  const [errorEditar, setErrorEditar] = useState<string | null>(null);
  const [formEditar, setFormEditar] = useState({
    nombre: "",
    medida: "",
    marca: "",
    estado_uso: "nuevo" as "nuevo" | "usado",
    precio_lista: "",
    precio_compra: "",
    stock_minimo: "0",
  });

  // Estado del Modal de Eliminación
  const [itemAEliminar, setItemAEliminar] = useState<Producto | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null);

  // Filtros calculados
  const productosActivos = useMemo(
    () => productos.filter((p) => p.activo),
    [productos],
  );

  const inventarioProductos = useMemo(
    () => productosActivos.filter((p) => esCapital(p.clasificacion)),
    [productosActivos],
  );

  const servicios = useMemo(
    () => productosActivos.filter((p) => !esCapital(p.clasificacion)),
    [productosActivos],
  );

  const conteoProductos = inventarioProductos.length;
  const conteoServicios = servicios.length;
  const conteoTotal = productosActivos.length;

  // Filtrado de "Todos los Ítems" con buscador en vivo
  const todosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return productosActivos;
    const q = busqueda.toLowerCase().trim();
    return productosActivos.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        (p.marca && p.marca.toLowerCase().includes(q)) ||
        (p.medida && p.medida.toLowerCase().includes(q)),
    );
  }, [productosActivos, busqueda]);

  // Agrupamiento por marca para productos
  const porMarca = useMemo(() => {
    const grupos = new Map<string, Producto[]>();
    for (const p of inventarioProductos) {
      const clave = p.marca?.trim() || "Sin marca";
      grupos.set(clave, [...(grupos.get(clave) ?? []), p]);
    }
    return [...grupos.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [inventarioProductos]);

  // Agrupamiento general (por medida/especificación) para productos
  const general = useMemo(() => {
    const grupos = new Map<string, { cantidad: number; valor: number }>();
    for (const p of inventarioProductos) {
      const clave = p.medida?.trim() || "Sin medida";
      const actual = grupos.get(clave) ?? { cantidad: 0, valor: 0 };
      grupos.set(clave, {
        cantidad: actual.cantidad + (p.stock_actual ?? 0),
        valor:
          actual.valor +
          (p.stock_actual ?? 0) * (parseFloat(p.precio_lista) || 0),
      });
    }
    return [...grupos.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [inventarioProductos]);

  // --- Manejo del Modal Nuevo ---
  const abrirModalNuevo = (tipoPorDefecto: "producto" | "servicio" = "producto") => {
    setTipoItemNuevo(tipoPorDefecto);
    setErrorNuevo(null);
    setCandidatosDuplicados(null);
    setFormNuevo({
      nombre: "",
      medida: "",
      marca: "",
      estado_uso: "nuevo",
      precio_lista: "",
      precio_compra: "",
      stock_actual: "1",
      stock_minimo: "2",
    });
    setModalNuevoAbierto(true);
  };

  const submitNuevoItem = async (e?: FormEvent, confirmarNuevo = false) => {
    if (e) e.preventDefault();
    if (!negocio || !formNuevo.nombre.trim()) return;

    setGuardandoNuevo(true);
    setErrorNuevo(null);
    if (!confirmarNuevo) {
      setCandidatosDuplicados(null);
    }

    try {
      if (tipoItemNuevo === "producto") {
        await api.createProducto(
          negocio.id,
          {
            nombre: formNuevo.nombre.trim(),
            medida: formNuevo.medida.trim() || null,
            marca: formNuevo.marca.trim() || null,
            estado_uso: formNuevo.estado_uso,
            precio_lista: formNuevo.precio_lista.trim() || "0.00",
            precio_compra: formNuevo.precio_compra.trim() || "0.00",
            clasificacion: "capital",
            stock_actual: Math.max(0, parseInt(formNuevo.stock_actual, 10) || 0),
            stock_minimo: Math.max(0, parseInt(formNuevo.stock_minimo, 10) || 0),
            activo: true,
          },
          confirmarNuevo,
        );
      } else {
        await api.createProducto(
          negocio.id,
          {
            nombre: formNuevo.nombre.trim(),
            medida: null,
            marca: null,
            estado_uso: null,
            precio_lista: formNuevo.precio_lista.trim() || "0.00",
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
      setModalNuevoAbierto(false);
      setCandidatosDuplicados(null);
    } catch (err) {
      if (err instanceof ProductoDuplicadoError) {
        setCandidatosDuplicados(err.candidatos || []);
        setErrorNuevo(
          "Ya existe un producto o servicio con un nombre muy similar en este negocio.",
        );
      } else if (err instanceof ApiError) {
        setErrorNuevo(err.message || "Error al registrar el producto o servicio.");
      } else {
        setErrorNuevo(
          err instanceof Error ? err.message : "Error inesperado al guardar.",
        );
      }
    } finally {
      setGuardandoNuevo(false);
    }
  };

  // --- Manejo del Modal Editar ---
  const abrirModalEditar = (item: Producto) => {
    setItemAEditar(item);
    setErrorEditar(null);
    setFormEditar({
      nombre: item.nombre || "",
      medida: item.medida || "",
      marca: item.marca || "",
      estado_uso: (item.estado_uso === "usado" ? "usado" : "nuevo") as "nuevo" | "usado",
      precio_lista: item.precio_lista || "",
      precio_compra: item.precio_compra || "",
      stock_minimo: String(item.stock_minimo ?? 0),
    });
  };

  const submitEditarItem = async (e: FormEvent) => {
    e.preventDefault();
    if (!negocio || !itemAEditar || !formEditar.nombre.trim()) return;

    setGuardandoEditar(true);
    setErrorEditar(null);

    const esProd = esCapital(itemAEditar.clasificacion);

    try {
      if (esProd) {
        await api.updateProducto(negocio.id, itemAEditar.id, {
          nombre: formEditar.nombre.trim(),
          medida: formEditar.medida.trim() || null,
          marca: formEditar.marca.trim() || null,
          estado_uso: formEditar.estado_uso,
          precio_lista: formEditar.precio_lista.trim() || "0.00",
          precio_compra: formEditar.precio_compra.trim() || "0.00",
          stock_minimo: Math.max(0, parseInt(formEditar.stock_minimo, 10) || 0),
        });
      } else {
        await api.updateProducto(negocio.id, itemAEditar.id, {
          nombre: formEditar.nombre.trim(),
          precio_lista: formEditar.precio_lista.trim() || "0.00",
        });
      }

      await recargar();
      setItemAEditar(null);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorEditar(err.message || "Error al actualizar el ítem.");
      } else {
        setErrorEditar(
          err instanceof Error ? err.message : "Error inesperado al guardar cambios.",
        );
      }
    } finally {
      setGuardandoEditar(false);
    }
  };

  // --- Manejo del Modal Eliminar ---
  const abrirModalEliminar = (item: Producto) => {
    setItemAEliminar(item);
    setErrorEliminar(null);
  };

  const confirmarEliminarItem = async () => {
    if (!negocio || !itemAEliminar) return;
    setEliminando(true);
    setErrorEliminar(null);

    try {
      await api.deleteProducto(negocio.id, itemAEliminar.id);
      await recargar();
      setItemAEliminar(null);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorEliminar(err.message || "No se pudo eliminar el ítem.");
      } else {
        setErrorEliminar(
          err instanceof Error ? err.message : "Error inesperado al eliminar.",
        );
      }
    } finally {
      setEliminando(false);
    }
  };

  if (cargandoNegocio || !negocio) return null;

  return (
    <div className={styles.stockContainer}>
      {/* Header Principal con Tabs y Botón Nuevo */}
      <div className={styles.stockHeader}>
        <div className={styles.mainTabs}>
          <button
            type="button"
            className={`${styles.mainTab} ${tabPrincipal === "productos" ? styles.mainTabActive : ""}`}
            onClick={() => setTabPrincipal("productos")}
          >
            <span>📦 Productos en Stock</span>
            <span className={styles.tabBadge}>{conteoProductos}</span>
          </button>
          <button
            type="button"
            className={`${styles.mainTab} ${tabPrincipal === "servicios" ? styles.mainTabActive : ""}`}
            onClick={() => setTabPrincipal("servicios")}
          >
            <span>🛠️ Servicios / Mano de Obra</span>
            <span className={styles.tabBadge}>{conteoServicios}</span>
          </button>
          <button
            type="button"
            className={`${styles.mainTab} ${tabPrincipal === "todos" ? styles.mainTabActive : ""}`}
            onClick={() => setTabPrincipal("todos")}
          >
            <span>📋 Todos los Ítems</span>
            <span className={styles.tabBadge}>{conteoTotal}</span>
          </button>
        </div>

        <button
          type="button"
          className={styles.btnNuevo}
          onClick={() =>
            abrirModalNuevo(tabPrincipal === "servicios" ? "servicio" : "producto")
          }
        >
          <PlusIcon size={16} />
          <span>+ Nuevo Producto / Servicio</span>
        </button>
      </div>

      {/* Sub-barra de Vistas o Búsqueda */}
      {tabPrincipal === "productos" && (
        <div className={styles.subTabsRow}>
          <div className={styles.subTabs}>
            <button
              type="button"
              className={`${styles.subTab} ${vistaStock === "marca" ? styles.subTabActive : ""}`}
              onClick={() => setVistaStock("marca")}
            >
              Por marca
            </button>
            <button
              type="button"
              className={`${styles.subTab} ${vistaStock === "general" ? styles.subTabActive : ""}`}
              onClick={() => setVistaStock("general")}
            >
              General
            </button>
          </div>
          <span className={styles.muted}>
            {inventarioProductos.length} {inventarioProductos.length === 1 ? "producto registrado" : "productos registrados"}
          </span>
        </div>
      )}

      {tabPrincipal === "todos" && (
        <div className={styles.searchBar}>
          <div className={styles.searchInputWrapper}>
            <SearchIcon size={18} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Buscar por nombre, marca o especificación…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              autoFocus
            />
            {busqueda && (
              <button
                type="button"
                className={styles.clearSearchBtn}
                onClick={() => setBusqueda("")}
                aria-label="Limpiar búsqueda"
              >
                <CloseIcon size={16} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Contenido Principal según Tab */}
      {cargandoProductos ? (
        <p className={styles.muted}>Cargando catálogo…</p>
      ) : tabPrincipal === "productos" ? (
        /* --- TAB 1: PRODUCTOS EN STOCK --- */
        inventarioProductos.length === 0 ? (
          <EmptyState
            icon={<BoxIcon size={24} />}
            title="Todavía no hay productos físicos"
            message="Registra tus productos para llevar el control de inventario, stock mínimo y costos."
            action={
              <Button onClick={() => abrirModalNuevo("producto")}>
                <PlusIcon size={16} />
                <span>Crear primer producto</span>
              </Button>
            }
          />
        ) : vistaStock === "marca" ? (
          <div className={styles.groups}>
            {porMarca.map(([marca, items]) => (
              <section key={marca} className={styles.groupSection}>
                <h2 className={styles.groupTitle}>
                  <span>{marca}</span>
                  <span className={styles.groupBadge}>
                    {items.length} {items.length === 1 ? "ítem" : "ítems"}
                  </span>
                </h2>
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
                          <div className={styles.cardTitleBlock}>
                            <span className={styles.cardMedida}>
                              {p.medida ? `${p.nombre} (${p.medida})` : p.nombre}
                            </span>
                            {p.marca && (
                              <span className={styles.cardSubMedida}>{p.marca}</span>
                            )}
                          </div>
                          <div className={styles.cardBadges}>
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
                        </div>

                        <div className={styles.cardInfoRow}>
                          <span
                            className={bajoMinimo ? styles.cantidadBaja : styles.cantidad}
                          >
                            {bajoMinimo && <AlertTriangleIcon size={14} />}
                            {p.stock_actual} en stock
                            {p.stock_minimo > 0 && ` (mín. ${p.stock_minimo})`}
                          </span>
                          <div className={styles.precioBlock}>
                            <span className={styles.precio}>
                              {formatMoney(p.precio_lista)}
                            </span>
                            {parseFloat(p.precio_compra) > 0 && (
                              <span className={styles.costo}>
                                Costo: {formatMoney(p.precio_compra)}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className={styles.cardActions}>
                          <button
                            type="button"
                            className={styles.actionButton}
                            onClick={() => navigate(`/${tipo}/stock/ajustar/${p.id}`)}
                            title="Ajustar cantidad de stock"
                          >
                            <WrenchIcon size={13} />
                            <span>Ajustar</span>
                          </button>
                          {negocio.modulo_rus_activo && (
                            <button
                              type="button"
                              className={styles.actionButton}
                              onClick={() => navigate(`/${tipo}/stock/comprar/${p.id}`)}
                              title="Registrar compra formal"
                            >
                              <PlusIcon size={13} />
                              <span>Comprar</span>
                            </button>
                          )}
                          <button
                            type="button"
                            className={styles.actionIconBtn}
                            onClick={() => abrirModalEditar(p)}
                            title="Editar producto"
                            aria-label={`Editar ${p.nombre}`}
                          >
                            <EditIcon size={14} />
                          </button>
                          <button
                            type="button"
                            className={`${styles.actionIconBtn} ${styles.deleteBtn}`}
                            onClick={() => abrirModalEliminar(p)}
                            title="Eliminar producto"
                            aria-label={`Eliminar ${p.nombre}`}
                          >
                            <TrashIcon size={14} />
                          </button>
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
                  {totales.cantidad} {totales.cantidad === 1 ? "unidad" : "unidades"}
                </span>
                <span className={styles.generalValor}>
                  {formatMoney(totales.valor.toFixed(2))}
                </span>
              </div>
            ))}
          </div>
        )
      ) : tabPrincipal === "servicios" ? (
        /* --- TAB 2: SERVICIOS Y MANO DE OBRA --- */
        servicios.length === 0 ? (
          <EmptyState
            icon={<WrenchIcon size={24} />}
            title="Todavía no hay servicios registrados"
            message="Agrega servicios de mano de obra como mantenimientos, diagnósticos, alineamientos o reparaciones."
            action={
              <Button onClick={() => abrirModalNuevo("servicio")}>
                <PlusIcon size={16} />
                <span>Crear primer servicio</span>
              </Button>
            }
          />
        ) : (
          <div className={styles.cardGrid}>
            {servicios.map((s) => (
              <div key={s.id} className={styles.serviceCard}>
                <div className={styles.serviceHeader}>
                  <div className={styles.serviceIconWrap}>
                    <WrenchIcon size={20} />
                  </div>
                  <div className={styles.serviceInfo}>
                    <h3 className={styles.serviceTitle}>{s.nombre}</h3>
                    <span className={styles.serviceTag}>Mano de obra / Servicio</span>
                  </div>
                </div>

                <div className={styles.servicePriceRow}>
                  <span className={styles.servicePriceLabel}>Precio de lista</span>
                  <span className={styles.servicePriceValue}>
                    {formatMoney(s.precio_lista)}
                  </span>
                </div>

                <div className={styles.cardActions}>
                  <button
                    type="button"
                    className={styles.actionButton}
                    onClick={() => abrirModalEditar(s)}
                  >
                    <EditIcon size={14} />
                    <span>Editar</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.actionIconBtn} ${styles.deleteBtn}`}
                    onClick={() => abrirModalEliminar(s)}
                    title="Eliminar servicio"
                    aria-label={`Eliminar ${s.nombre}`}
                  >
                    <TrashIcon size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* --- TAB 3: TODOS LOS ÍTEMS (CON BÚSQUEDA EN VIVO) --- */
        todosFiltrados.length === 0 ? (
          <EmptyState
            icon={<SearchIcon size={24} />}
            title="No se encontraron ítems"
            message={
              busqueda.trim()
                ? `No encontramos resultados para "${busqueda}". Prueba con otro término.`
                : "No hay productos ni servicios registrados en el catálogo."
            }
            action={
              busqueda.trim() ? (
                <Button variant="outline" onClick={() => setBusqueda("")}>
                  Limpiar búsqueda
                </Button>
              ) : (
                <Button onClick={() => abrirModalNuevo("producto")}>
                  <PlusIcon size={16} />
                  <span>Crear ítem</span>
                </Button>
              )
            }
          />
        ) : (
          <div className={styles.cardGrid}>
            {todosFiltrados.map((item) => {
              const esProd = esCapital(item.clasificacion);
              const bajoMinimo = esProd && item.stock_actual < item.stock_minimo;
              const badge = getEstadoUsoBadge(item.estado_uso);

              return (
                <div
                  key={item.id}
                  className={`${styles.card} ${bajoMinimo ? styles.cardBajo : ""}`}
                >
                  <div className={styles.cardMedidaRow}>
                    <div className={styles.cardTitleBlock}>
                      <span className={styles.cardMedida}>{item.nombre}</span>
                      {[item.marca, item.medida].filter(Boolean).length > 0 && (
                        <span className={styles.cardSubMedida}>
                          {[item.marca, item.medida].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </div>
                    <div className={styles.cardBadges}>
                      {esProd ? (
                        <span className={styles.badgeProducto}>📦 Producto</span>
                      ) : (
                        <span className={styles.badgeServicio}>🛠️ Servicio</span>
                      )}
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
                  </div>

                  <div className={styles.cardInfoRow}>
                    {esProd ? (
                      <span
                        className={bajoMinimo ? styles.cantidadBaja : styles.cantidad}
                      >
                        {bajoMinimo && <AlertTriangleIcon size={14} />}
                        {item.stock_actual} en stock
                        {item.stock_minimo > 0 && ` (mín. ${item.stock_minimo})`}
                      </span>
                    ) : (
                      <span className={styles.cantidad}>Tarifa de servicio</span>
                    )}
                    <div className={styles.precioBlock}>
                      <span className={styles.precio}>
                        {formatMoney(item.precio_lista)}
                      </span>
                      {esProd && parseFloat(item.precio_compra) > 0 && (
                        <span className={styles.costo}>
                          Costo: {formatMoney(item.precio_compra)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={styles.cardActions}>
                    {esProd && (
                      <>
                        <button
                          type="button"
                          className={styles.actionButton}
                          onClick={() => navigate(`/${tipo}/stock/ajustar/${item.id}`)}
                          title="Ajustar stock"
                        >
                          <WrenchIcon size={13} />
                          <span>Ajustar</span>
                        </button>
                        {negocio.modulo_rus_activo && (
                          <button
                            type="button"
                            className={styles.actionButton}
                            onClick={() => navigate(`/${tipo}/stock/comprar/${item.id}`)}
                            title="Comprar"
                          >
                            <PlusIcon size={13} />
                            <span>Comprar</span>
                          </button>
                        )}
                      </>
                    )}
                    <button
                      type="button"
                      className={styles.actionIconBtn}
                      onClick={() => abrirModalEditar(item)}
                      title="Editar ítem"
                      aria-label={`Editar ${item.nombre}`}
                    >
                      <EditIcon size={14} />
                    </button>
                    <button
                      type="button"
                      className={`${styles.actionIconBtn} ${styles.deleteBtn}`}
                      onClick={() => abrirModalEliminar(item)}
                      title="Eliminar ítem"
                      aria-label={`Eliminar ${item.nombre}`}
                    >
                      <TrashIcon size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ========================================================================= */}
      {/* 1. Modal de Alta de Nuevo Producto / Servicio                             */}
      {/* ========================================================================= */}
      {modalNuevoAbierto && (
        <div className={styles.modalOverlay} onClick={() => setModalNuevoAbierto(false)}>
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
                onClick={() => setModalNuevoAbierto(false)}
                aria-label="Cerrar modal"
              >
                <CloseIcon size={20} />
              </button>
            </div>

            <form onSubmit={(e) => submitNuevoItem(e, false)} className={styles.modalForm}>
              <div className={styles.typeSelector}>
                <button
                  type="button"
                  className={`${styles.typeBtn} ${tipoItemNuevo === "producto" ? styles.typeBtnActive : ""}`}
                  onClick={() => {
                    setTipoItemNuevo("producto");
                    setErrorNuevo(null);
                    setCandidatosDuplicados(null);
                  }}
                >
                  <BoxIcon size={16} />
                  <span>Producto Físico (Stock)</span>
                </button>
                <button
                  type="button"
                  className={`${styles.typeBtn} ${tipoItemNuevo === "servicio" ? styles.typeBtnActive : ""}`}
                  onClick={() => {
                    setTipoItemNuevo("servicio");
                    setErrorNuevo(null);
                    setCandidatosDuplicados(null);
                  }}
                >
                  <WrenchIcon size={16} />
                  <span>Servicio (Mano de obra)</span>
                </button>
              </div>

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
                      onClick={() => setModalNuevoAbierto(false)}
                    >
                      Cancelar y revisar
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      disabled={guardandoNuevo}
                      onClick={() => submitNuevoItem(undefined, true)}
                    >
                      {guardandoNuevo ? "Creando…" : "Confirmar: Es otro ítem"}
                    </Button>
                  </div>
                </div>
              )}

              {errorNuevo && !candidatosDuplicados && (
                <div className={styles.errorBox} role="alert">
                  <p style={{ margin: 0 }}>{errorNuevo}</p>
                </div>
              )}

              <label className={styles.field}>
                <span className={styles.label}>
                  {tipoItemNuevo === "producto" ? "Nombre del Producto *" : "Nombre del Servicio *"}
                </span>
                <input
                  required
                  type="text"
                  className={styles.input}
                  placeholder={
                    tipoItemNuevo === "producto"
                      ? "Ej. Aceite Motul 10W-40, Llanta 185/65 R15, Filtro..."
                      : "Ej. Alineamiento y Balanceo, Parchado, Lavado..."
                  }
                  value={formNuevo.nombre}
                  onChange={(e) => setFormNuevo({ ...formNuevo, nombre: e.target.value })}
                  autoFocus
                />
              </label>

              {tipoItemNuevo === "producto" && (
                <>
                  <div className={styles.formRow}>
                    <label className={styles.field}>
                      <span className={styles.label}>Medida / Especificación</span>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="Ej. 185/65 R15 o 10W-40"
                        value={formNuevo.medida}
                        onChange={(e) => setFormNuevo({ ...formNuevo, medida: e.target.value })}
                      />
                    </label>

                    <label className={styles.field}>
                      <span className={styles.label}>Marca</span>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="Ej. Michelin, Castrol, Motul"
                        value={formNuevo.marca}
                        onChange={(e) => setFormNuevo({ ...formNuevo, marca: e.target.value })}
                      />
                    </label>
                  </div>

                  <div className={styles.field}>
                    <span className={styles.label}>Condición del Producto</span>
                    <div className={styles.radioPills}>
                      <label
                        className={`${styles.radioPill} ${formNuevo.estado_uso === "nuevo" ? styles.radioPillActive : ""}`}
                      >
                        <input
                          type="radio"
                          name="nuevo_estado_uso"
                          checked={formNuevo.estado_uso === "nuevo"}
                          onChange={() => setFormNuevo({ ...formNuevo, estado_uso: "nuevo" })}
                        />
                        <span>✨ Nuevo</span>
                      </label>
                      <label
                        className={`${styles.radioPill} ${formNuevo.estado_uso === "usado" ? styles.radioPillActive : ""}`}
                      >
                        <input
                          type="radio"
                          name="nuevo_estado_uso"
                          checked={formNuevo.estado_uso === "usado"}
                          onChange={() => setFormNuevo({ ...formNuevo, estado_uso: "usado" })}
                        />
                        <span>♻️ De segunda / Seminuevo</span>
                      </label>
                    </div>
                  </div>
                </>
              )}

              <div className={styles.formRow}>
                <label className={styles.field}>
                  <span className={styles.label}>
                    {tipoItemNuevo === "producto"
                      ? "Precio de Venta (S/) *"
                      : "Precio del Servicio (S/) *"}
                  </span>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    className={styles.input}
                    placeholder="0.00"
                    value={formNuevo.precio_lista}
                    onChange={(e) =>
                      setFormNuevo({ ...formNuevo, precio_lista: e.target.value })
                    }
                  />
                </label>

                {tipoItemNuevo === "producto" && (
                  <label className={styles.field}>
                    <span className={styles.label}>Costo de Compra (S/)</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className={styles.input}
                      placeholder="0.00 (Opcional)"
                      value={formNuevo.precio_compra}
                      onChange={(e) =>
                        setFormNuevo({ ...formNuevo, precio_compra: e.target.value })
                      }
                    />
                  </label>
                )}
              </div>

              {tipoItemNuevo === "producto" && (
                <div className={styles.formRow}>
                  <label className={styles.field}>
                    <span className={styles.label}>Stock Inicial</span>
                    <input
                      type="number"
                      min="0"
                      className={styles.input}
                      value={formNuevo.stock_actual}
                      onChange={(e) =>
                        setFormNuevo({ ...formNuevo, stock_actual: e.target.value })
                      }
                    />
                  </label>

                  <label className={styles.field}>
                    <span className={styles.label}>Stock Mínimo (Alerta)</span>
                    <input
                      type="number"
                      min="0"
                      className={styles.input}
                      value={formNuevo.stock_minimo}
                      onChange={(e) =>
                        setFormNuevo({ ...formNuevo, stock_minimo: e.target.value })
                      }
                    />
                  </label>
                </div>
              )}

              <div className={styles.modalActions}>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setModalNuevoAbierto(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={guardandoNuevo || !formNuevo.nombre.trim() || !formNuevo.precio_lista}
                >
                  {guardandoNuevo
                    ? "Guardando…"
                    : tipoItemNuevo === "producto"
                      ? "Guardar Producto"
                      : "Guardar Servicio"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. Modal de Edición de Producto / Servicio                                 */}
      {/* ========================================================================= */}
      {itemAEditar && (
        <div className={styles.modalOverlay} onClick={() => setItemAEditar(null)}>
          <div
            className={styles.modalCard}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className={styles.modalHeader}>
              <div>
                <h2 className={styles.modalTitle}>
                  {esCapital(itemAEditar.clasificacion)
                    ? "Editar Producto"
                    : "Editar Servicio"}
                </h2>
                <p className={styles.modalSubtitle}>
                  Modifica los datos del ítem en {negocio.nombre}
                </p>
              </div>
              <button
                type="button"
                className={styles.closeModalBtn}
                onClick={() => setItemAEditar(null)}
                aria-label="Cerrar modal"
              >
                <CloseIcon size={20} />
              </button>
            </div>

            <form onSubmit={submitEditarItem} className={styles.modalForm}>
              {errorEditar && (
                <div className={styles.errorBox} role="alert">
                  <p style={{ margin: 0 }}>{errorEditar}</p>
                </div>
              )}

              <label className={styles.field}>
                <span className={styles.label}>
                  {esCapital(itemAEditar.clasificacion)
                    ? "Nombre del Producto *"
                    : "Nombre del Servicio *"}
                </span>
                <input
                  required
                  type="text"
                  className={styles.input}
                  value={formEditar.nombre}
                  onChange={(e) =>
                    setFormEditar({ ...formEditar, nombre: e.target.value })
                  }
                  autoFocus
                />
              </label>

              {esCapital(itemAEditar.clasificacion) && (
                <>
                  <div className={styles.formRow}>
                    <label className={styles.field}>
                      <span className={styles.label}>Medida / Especificación</span>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="Ej. 185/65 R15 o 10W-40"
                        value={formEditar.medida}
                        onChange={(e) =>
                          setFormEditar({ ...formEditar, medida: e.target.value })
                        }
                      />
                    </label>

                    <label className={styles.field}>
                      <span className={styles.label}>Marca</span>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="Ej. Michelin, Castrol..."
                        value={formEditar.marca}
                        onChange={(e) =>
                          setFormEditar({ ...formEditar, marca: e.target.value })
                        }
                      />
                    </label>
                  </div>

                  <div className={styles.field}>
                    <span className={styles.label}>Condición del Producto</span>
                    <div className={styles.radioPills}>
                      <label
                        className={`${styles.radioPill} ${formEditar.estado_uso === "nuevo" ? styles.radioPillActive : ""}`}
                      >
                        <input
                          type="radio"
                          name="edit_estado_uso"
                          checked={formEditar.estado_uso === "nuevo"}
                          onChange={() =>
                            setFormEditar({ ...formEditar, estado_uso: "nuevo" })
                          }
                        />
                        <span>✨ Nuevo</span>
                      </label>
                      <label
                        className={`${styles.radioPill} ${formEditar.estado_uso === "usado" ? styles.radioPillActive : ""}`}
                      >
                        <input
                          type="radio"
                          name="edit_estado_uso"
                          checked={formEditar.estado_uso === "usado"}
                          onChange={() =>
                            setFormEditar({ ...formEditar, estado_uso: "usado" })
                          }
                        />
                        <span>♻️ De segunda / Seminuevo</span>
                      </label>
                    </div>
                  </div>
                </>
              )}

              <div className={styles.formRow}>
                <label className={styles.field}>
                  <span className={styles.label}>
                    {esCapital(itemAEditar.clasificacion)
                      ? "Precio de Venta (S/) *"
                      : "Precio del Servicio (S/) *"}
                  </span>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    className={styles.input}
                    value={formEditar.precio_lista}
                    onChange={(e) =>
                      setFormEditar({ ...formEditar, precio_lista: e.target.value })
                    }
                  />
                </label>

                {esCapital(itemAEditar.clasificacion) && (
                  <label className={styles.field}>
                    <span className={styles.label}>Costo de Compra (S/)</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className={styles.input}
                      value={formEditar.precio_compra}
                      onChange={(e) =>
                        setFormEditar({ ...formEditar, precio_compra: e.target.value })
                      }
                    />
                  </label>
                )}
              </div>

              {esCapital(itemAEditar.clasificacion) && (
                <div className={styles.formRow}>
                  <label className={styles.field}>
                    <span className={styles.label}>Stock Mínimo (Alerta)</span>
                    <input
                      type="number"
                      min="0"
                      className={styles.input}
                      value={formEditar.stock_minimo}
                      onChange={(e) =>
                        setFormEditar({ ...formEditar, stock_minimo: e.target.value })
                      }
                    />
                  </label>
                </div>
              )}

              <div className={styles.modalActions}>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setItemAEditar(null)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={guardandoEditar || !formEditar.nombre.trim() || !formEditar.precio_lista}
                >
                  {guardandoEditar ? "Guardando…" : "Guardar Cambios"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. Modal de Confirmación de Eliminación                                    */}
      {/* ========================================================================= */}
      {itemAEliminar && (
        <div className={styles.modalOverlay} onClick={() => setItemAEliminar(null)}>
          <div
            className={`${styles.modalCard} ${styles.deleteCard}`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className={styles.deleteIconWrap}>
              <TrashIcon size={24} />
            </div>

            <h2 className={styles.modalTitle}>
              ¿Eliminar {esCapital(itemAEliminar.clasificacion) ? "producto" : "servicio"}?
            </h2>

            <div className={styles.deleteItemSummary}>
              <span className={styles.deleteItemName}>{itemAEliminar.nombre}</span>
              <span className={styles.deleteItemDetail}>
                {formatMoney(itemAEliminar.precio_lista)}
              </span>
            </div>

            <p className={styles.deleteWarningNote}>
              Si este ítem tiene movimientos, ventas o compras registradas, se desactivará de forma segura para conservar intacto tu historial contable. Si no tiene movimientos vinculados, se eliminará por completo.
            </p>

            {errorEliminar && (
              <div className={styles.errorBox} role="alert" style={{ marginBottom: "16px" }}>
                <p style={{ margin: 0 }}>{errorEliminar}</p>
              </div>
            )}

            <div className={styles.modalActions}>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setItemAEliminar(null)}
                disabled={eliminando}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={confirmarEliminarItem}
                disabled={eliminando}
              >
                {eliminando ? "Eliminando…" : "Sí, eliminar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
