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
import {
  CATEGORIAS_DEFAULT,
  MARCAS_LLANTAS_DEFAULT,
  MEDIDAS_LLANTAS_POR_ARO,
  ACEITES_VISCOSIDADES_DEFAULT,
  ACEITES_MARCAS_DEFAULT,
  ACEITES_PRESENTACIONES_DEFAULT,
  PARCHES_PLANTILLAS_DEFAULT,
  ADITIVOS_PLANTILLAS_DEFAULT,
  ACCESORIOS_PLANTILLAS_DEFAULT,
  SERVICIOS_PLANTILLAS_DEFAULT,
  getCustomCatalog,
  addCustomMarca,
  removeCustomMarca,
  addCustomMedida,
  removeCustomMedida,
  type CategoriaPreset,
} from "../data/catalogoPresets";
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

  // Estado del Modal de Creación Asistida
  const [modalNuevoAbierto, setModalNuevoAbierto] = useState(false);
  const [categoriaActivaId, setCategoriaActivaId] = useState<string>("llantas");
  const [mostrarGridCategorias, setMostrarGridCategorias] = useState(true);
  const [tipoItemNuevo, setTipoItemNuevo] = useState<"producto" | "servicio">("producto");
  const [aroActivo, setAroActivo] = useState<string>("Todos");
  const [viscosidadAceite, setViscosidadAceite] = useState<string>("10W-40");
  const [presentacionAceite, setPresentacionAceite] = useState<string>("1/4 Galón");
  const [marcaAceite, setMarcaAceite] = useState<string>("Motul");

  // Sub-formularios inline para agregar nuevas opciones sobre la marcha (+ Otra)
  const [inlineMarcaAbierto, setInlineMarcaAbierto] = useState(false);
  const [nuevaMarcaTexto, setNuevaMarcaTexto] = useState("");
  const [inlineMedidaAbierto, setInlineMedidaAbierto] = useState(false);
  const [nuevaMedidaTexto, setNuevaMedidaTexto] = useState("");
  const [aroParaNuevaMedida, setAroParaNuevaMedida] = useState("Aro 15");

  // Versión local de catálogo personalizado para forzar re-render
  const [catalogVersion, setCatalogVersion] = useState(0);

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
  const [restockDelta, setRestockDelta] = useState(0);
  const [formEditar, setFormEditar] = useState({
    nombre: "",
    medida: "",
    marca: "",
    estado_uso: "nuevo" as "nuevo" | "usado",
    precio_lista: "",
    precio_compra: "",
    stock_actual: "0",
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

  // Catálogo personalizado del negocio
  const customCatalog = useMemo(() => {
    if (!negocio) {
      return {
        marcasPersonalizadas: [],
        medidasPersonalizadas: [],
        categoriasPersonalizadas: [],
        plantillasPersonalizadas: [],
      };
    }
    void catalogVersion;
    return getCustomCatalog(negocio.id);
  }, [negocio, catalogVersion]);

  // Lista consolidada de categorías disponibles
  const todasCategorias = useMemo(() => {
    return [...CATEGORIAS_DEFAULT, ...customCatalog.categoriasPersonalizadas];
  }, [customCatalog]);

  const categoriaActual = useMemo(() => {
    return (
      todasCategorias.find((c) => c.id === categoriaActivaId) || todasCategorias[0]
    );
  }, [todasCategorias, categoriaActivaId]);

  // Lista consolidada de marcas de llantas
  const todasMarcasLlantas = useMemo(() => {
    const existentesEnStock = inventarioProductos
      .map((p) => p.marca?.trim())
      .filter((m): m is string => Boolean(m));
    const set = new Set([
      ...MARCAS_LLANTAS_DEFAULT,
      ...customCatalog.marcasPersonalizadas,
      ...existentesEnStock,
    ]);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [customCatalog, inventarioProductos]);

  // Lista consolidada de medidas de llantas agrupadas por Aro
  const todasMedidasPorAro = useMemo(() => {
    const arosMap = new Map<string, Set<string>>();
    for (const a of MEDIDAS_LLANTAS_POR_ARO) {
      arosMap.set(a.aro, new Set(a.medidas));
    }

    for (const item of customCatalog.medidasPersonalizadas) {
      const aroKey = item.aro || "Aro 15";
      if (!arosMap.has(aroKey)) {
        arosMap.set(aroKey, new Set());
      }
      arosMap.get(aroKey)!.add(item.medida);
    }

    for (const p of inventarioProductos) {
      if (p.medida?.trim()) {
        const med = p.medida.trim().toUpperCase();
        let asignado = false;
        for (const aroKey of arosMap.keys()) {
          const numAro = aroKey.replace("Aro ", "");
          if (med.includes(`R${numAro}`) || med.includes(`r${numAro}`)) {
            arosMap.get(aroKey)!.add(p.medida.trim());
            asignado = true;
            break;
          }
        }
        if (!asignado) {
          if (!arosMap.has("Otras Medidas")) arosMap.set("Otras Medidas", new Set());
          arosMap.get("Otras Medidas")!.add(p.medida.trim());
        }
      }
    }

    return Array.from(arosMap.entries()).map(([aro, medidasSet]) => ({
      aro,
      medidas: Array.from(medidasSet),
    }));
  }, [customCatalog, inventarioProductos]);

  // Medidas activas filtradas según la pestaña de Aro seleccionada
  const medidasFiltradas = useMemo(() => {
    if (aroActivo === "Todos") {
      const todas = new Set<string>();
      for (const item of todasMedidasPorAro) {
        for (const m of item.medidas) todas.add(m);
      }
      return Array.from(todas);
    }
    const match = todasMedidasPorAro.find((a) => a.aro === aroActivo);
    return match ? match.medidas : [];
  }, [todasMedidasPorAro, aroActivo]);

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

  // Cálculos de Margen y Ganancia en Vivo
  const gananciaNuevo = useMemo(() => {
    const p = parseFloat(formNuevo.precio_lista || "0");
    const c = parseFloat(formNuevo.precio_compra || "0");
    const g = p - c;
    const m = p > 0 ? ((g / p) * 100).toFixed(1) : "0";
    return { ganancia: g, margen: m, tieneCosto: c > 0 && p > 0 };
  }, [formNuevo.precio_lista, formNuevo.precio_compra]);

  const gananciaEditar = useMemo(() => {
    const p = parseFloat(formEditar.precio_lista || "0");
    const c = parseFloat(formEditar.precio_compra || "0");
    const g = p - c;
    const m = p > 0 ? ((g / p) * 100).toFixed(1) : "0";
    return { ganancia: g, margen: m, tieneCosto: c > 0 && p > 0 };
  }, [formEditar.precio_lista, formEditar.precio_compra]);

  // --- Manejo de la Cascada y Selección ---
  const seleccionarCategoria = (cat: CategoriaPreset) => {
    setCategoriaActivaId(cat.id);
    setMostrarGridCategorias(false);
    setTipoItemNuevo(cat.tipo);
    setErrorNuevo(null);
    setCandidatosDuplicados(null);
    setInlineMarcaAbierto(false);
    setInlineMedidaAbierto(false);

    if (cat.id === "llantas") {
      const marcaDef = "Michelin";
      const medidaDef = "185/65 R15";
      setFormNuevo((prev) => ({
        ...prev,
        marca: marcaDef,
        medida: medidaDef,
        nombre: `Llanta ${medidaDef} ${marcaDef}`,
        estado_uso: "nuevo",
        stock_actual: "2",
        stock_minimo: "2",
      }));
    } else if (cat.id === "aceites") {
      setFormNuevo((prev) => ({
        ...prev,
        marca: marcaAceite,
        medida: viscosidadAceite,
        nombre: `Aceite ${marcaAceite} ${viscosidadAceite} (${presentacionAceite})`,
        stock_actual: "4",
        stock_minimo: "2",
      }));
    } else if (cat.id === "servicios") {
      setFormNuevo((prev) => ({
        ...prev,
        nombre: "Parchado de auto (frío)",
        marca: "",
        medida: "",
        precio_compra: "0.00",
        stock_actual: "0",
        stock_minimo: "0",
      }));
    } else if (cat.id === "parches") {
      setFormNuevo((prev) => ({
        ...prev,
        nombre: "Parche Frío Redondo",
        marca: "",
        medida: "",
        stock_actual: "10",
        stock_minimo: "5",
      }));
    } else if (cat.id === "aditivos") {
      setFormNuevo((prev) => ({
        ...prev,
        nombre: "Refrigerante / Coolant (Galón)",
        marca: "",
        medida: "",
        stock_actual: "3",
        stock_minimo: "2",
      }));
    } else if (cat.id === "accesorios") {
      setFormNuevo((prev) => ({
        ...prev,
        nombre: "Filtro de Aceite",
        marca: "",
        medida: "",
        stock_actual: "2",
        stock_minimo: "2",
      }));
    } else {
      setFormNuevo((prev) => ({
        ...prev,
        nombre: "",
        marca: "",
        medida: "",
      }));
    }
  };

  const seleccionarMarcaLlanta = (m: string) => {
    setFormNuevo((prev) => {
      const medida = prev.medida || "";
      const cond = prev.estado_uso === "usado" ? " (Usada)" : "";
      return {
        ...prev,
        marca: m,
        nombre: medida ? `Llanta ${medida} ${m}${cond}` : `Llanta ${m}${cond}`,
      };
    });
  };

  const seleccionarMedidaLlanta = (med: string) => {
    setFormNuevo((prev) => {
      const marca = prev.marca || "";
      const cond = prev.estado_uso === "usado" ? " (Usada)" : "";
      return {
        ...prev,
        medida: med,
        nombre: marca ? `Llanta ${med} ${marca}${cond}` : `Llanta ${med}${cond}`,
      };
    });
  };

  const seleccionarCondicionLlanta = (estado: "nuevo" | "usado") => {
    setFormNuevo((prev) => {
      const medida = prev.medida || "";
      const marca = prev.marca || "";
      const cond = estado === "usado" ? " (Usada)" : "";
      const base =
        medida && marca ? `Llanta ${medida} ${marca}` : prev.nombre.replace(" (Usada)", "");
      return {
        ...prev,
        estado_uso: estado,
        nombre: `${base}${cond}`,
      };
    });
  };

  const seleccionarViscosidadAceite = (visc: string) => {
    setViscosidadAceite(visc);
    setFormNuevo((prev) => ({
      ...prev,
      medida: visc,
      nombre: `Aceite ${prev.marca || marcaAceite} ${visc} (${presentacionAceite})`,
    }));
  };

  const seleccionarMarcaAceite = (m: string) => {
    setMarcaAceite(m);
    setFormNuevo((prev) => ({
      ...prev,
      marca: m,
      nombre: `Aceite ${m} ${viscosidadAceite} (${presentacionAceite})`,
    }));
  };

  const seleccionarPresentacionAceite = (pres: string) => {
    setPresentacionAceite(pres);
    setFormNuevo((prev) => ({
      ...prev,
      nombre: `Aceite ${prev.marca || marcaAceite} ${viscosidadAceite} (${pres})`,
    }));
  };

  const guardarNuevaMarca = () => {
    if (!negocio || !nuevaMarcaTexto.trim()) return;
    const m = nuevaMarcaTexto.trim();
    addCustomMarca(negocio.id, m);
    setCatalogVersion((v) => v + 1);
    seleccionarMarcaLlanta(m);
    setNuevaMarcaTexto("");
    setInlineMarcaAbierto(false);
  };

  const guardarNuevaMedida = () => {
    if (!negocio || !nuevaMedidaTexto.trim()) return;
    const med = nuevaMedidaTexto.trim().toUpperCase();
    addCustomMedida(negocio.id, aroParaNuevaMedida, med);
    setCatalogVersion((v) => v + 1);
    seleccionarMedidaLlanta(med);
    setNuevaMedidaTexto("");
    setInlineMedidaAbierto(false);
  };

  const eliminarMarcaPersonalizada = (e: React.MouseEvent, m: string) => {
    e.stopPropagation();
    if (!negocio) return;
    removeCustomMarca(negocio.id, m);
    setCatalogVersion((v) => v + 1);
  };

  const eliminarMedidaPersonalizada = (e: React.MouseEvent, med: string) => {
    e.stopPropagation();
    if (!negocio) return;
    removeCustomMedida(negocio.id, med);
    setCatalogVersion((v) => v + 1);
  };

  // --- Manejo del Modal Nuevo ---
  const abrirModalNuevo = (tipoPorDefecto: "producto" | "servicio" = "producto") => {
    setErrorNuevo(null);
    setCandidatosDuplicados(null);
    setInlineMarcaAbierto(false);
    setInlineMedidaAbierto(false);
    setMostrarGridCategorias(true);

    if (tipoPorDefecto === "servicio") {
      setCategoriaActivaId("servicios");
      setTipoItemNuevo("servicio");
      setFormNuevo({
        nombre: "Parchado de auto (frío)",
        medida: "",
        marca: "",
        estado_uso: "nuevo",
        precio_lista: "",
        precio_compra: "0.00",
        stock_actual: "0",
        stock_minimo: "0",
      });
    } else {
      setCategoriaActivaId("llantas");
      setTipoItemNuevo("producto");
      setFormNuevo({
        nombre: "Llanta 185/65 R15 Michelin",
        medida: "185/65 R15",
        marca: "Michelin",
        estado_uso: "nuevo",
        precio_lista: "",
        precio_compra: "",
        stock_actual: "2",
        stock_minimo: "2",
      });
    }
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

  // --- Manejo del Modal Editar con Reposición Rápida ---
  const abrirModalEditar = (item: Producto) => {
    setItemAEditar(item);
    setErrorEditar(null);
    setRestockDelta(0);
    setFormEditar({
      nombre: item.nombre || "",
      medida: item.medida || "",
      marca: item.marca || "",
      estado_uso: (item.estado_uso === "usado" ? "usado" : "nuevo") as "nuevo" | "usado",
      precio_lista: item.precio_lista || "",
      precio_compra: item.precio_compra || "",
      stock_actual: String(item.stock_actual ?? 0),
      stock_minimo: String(item.stock_minimo ?? 0),
    });
  };

  const aplicarRestockRapido = (delta: number) => {
    if (!itemAEditar) return;
    const nuevoDelta = restockDelta + delta;
    setRestockDelta(nuevoDelta);
    const stockBase = itemAEditar.stock_actual ?? 0;
    setFormEditar((prev) => ({
      ...prev,
      stock_actual: String(Math.max(0, stockBase + nuevoDelta)),
    }));
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
          stock_actual: Math.max(0, parseInt(formEditar.stock_actual, 10) || 0),
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
        setErrorEliminar(err.message || "Error al eliminar el ítem.");
      } else {
        setErrorEliminar(
          err instanceof Error ? err.message : "Error inesperado al eliminar.",
        );
      }
    } finally {
      setEliminando(false);
    }
  };

  if (cargandoNegocio || cargandoProductos) {
    return (
      <div className={styles.centerBox}>
        <p className={styles.mutedText}>Cargando catálogo e inventario…</p>
      </div>
    );
  }

  if (!negocio) {
    return (
      <EmptyState
        icon={<BoxIcon size={24} />}
        title="Negocio no encontrado"
        message="No se pudo cargar la información del negocio para gestionar el stock."
      />
    );
  }

  return (
    <div className={styles.stockContainer}>
      {/* Encabezado principal */}
      <header className={styles.stockHeader}>
        <nav className={styles.mainTabs} aria-label="Secciones de Stock">
          <button
            type="button"
            className={`${styles.mainTab} ${tabPrincipal === "productos" ? styles.mainTabActive : ""}`}
            onClick={() => setTabPrincipal("productos")}
          >
            <BoxIcon size={16} />
            <span>Productos en Stock</span>
            <span className={styles.tabBadge}>{conteoProductos}</span>
          </button>
          <button
            type="button"
            className={`${styles.mainTab} ${tabPrincipal === "servicios" ? styles.mainTabActive : ""}`}
            onClick={() => setTabPrincipal("servicios")}
          >
            <WrenchIcon size={16} />
            <span>Servicios y Mano de Obra</span>
            <span className={styles.tabBadge}>{conteoServicios}</span>
          </button>
          <button
            type="button"
            className={`${styles.mainTab} ${tabPrincipal === "todos" ? styles.mainTabActive : ""}`}
            onClick={() => setTabPrincipal("todos")}
          >
            <span>Todos los Ítems</span>
            <span className={styles.tabBadge}>{conteoTotal}</span>
          </button>
        </nav>

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
      </header>

      {/* Barra de Búsqueda y Sub-vistas */}
      <div className={styles.subTabsRow}>
        {tabPrincipal === "productos" ? (
          <div className={styles.subTabs} role="group" aria-label="Modo de visualización">
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
              Agrupado por medida
            </button>
          </div>
        ) : (
          <div />
        )}

        <div className={styles.searchBar}>
          <div className={styles.searchInputWrapper}>
            <SearchIcon size={16} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Buscar por nombre, marca o medida…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            {busqueda && (
              <button
                type="button"
                className={styles.clearSearchBtn}
                onClick={() => setBusqueda("")}
                aria-label="Limpiar búsqueda"
              >
                <CloseIcon size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Contenido Principal según el Tab Seleccionado */}
      {tabPrincipal === "productos" ? (
        inventarioProductos.length === 0 ? (
          <EmptyState
            icon={<BoxIcon size={24} />}
            title="Todavía no hay productos físicos registrados"
            message="Agrega tus neumáticos, aceites, cámaras o repuestos para llevar el control de inventario."
            action={
              <Button onClick={() => abrirModalNuevo("producto")}>
                <PlusIcon size={16} />
                <span>Crear primer producto</span>
              </Button>
            }
          />
        ) : vistaStock === "marca" ? (
          <div className={styles.brandList}>
            {porMarca.map(([marca, prods]) => (
              <section key={marca} className={styles.brandGroup}>
                <div className={styles.brandGroupHeader}>
                  <h2 className={styles.brandName}>{marca}</h2>
                  <span className={styles.brandCount}>
                    {prods.length} {prods.length === 1 ? "ítem" : "ítems"}
                  </span>
                </div>
                <div className={styles.cardGrid}>
                  {prods.map((p) => {
                    const badge = getEstadoUsoBadge(p.estado_uso);
                    const bajoMinimo = p.stock_minimo > 0 && p.stock_actual <= p.stock_minimo;
                    return (
                      <div key={p.id} className={styles.productCard}>
                        <div className={styles.cardTop}>
                          <div className={styles.titleArea}>
                            <h3 className={styles.productName}>{p.nombre}</h3>
                            {p.medida && (
                              <span className={styles.medidaTag}>Medida: {p.medida}</span>
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
        servicios.length === 0 ? (
          <EmptyState
            icon={<WrenchIcon size={24} />}
            title="Todavía no hay servicios registrados"
            message="Agrega servicios de mano de obra como mantenimientos, diagnósticos, alineamientos o parchados."
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
        /* Tab 3: Todos los ítems */
        todosFiltrados.length === 0 ? (
          <EmptyState
            icon={<SearchIcon size={24} />}
            title="No se encontraron ítems"
            message={
              busqueda
                ? `No hay productos ni servicios que coincidan con "${busqueda}".`
                : "No hay registros disponibles en el catálogo."
            }
          />
        ) : (
          <div className={styles.cardGrid}>
            {todosFiltrados.map((item) => {
              const esProd = esCapital(item.clasificacion);
              const badge = esProd ? getEstadoUsoBadge(item.estado_uso) : null;
              return (
                <div key={item.id} className={styles.productCard}>
                  <div className={styles.cardTop}>
                    <div className={styles.titleArea}>
                      <h3 className={styles.productName}>{item.nombre}</h3>
                      <div className={styles.detailsRow}>
                        {esProd ? (
                          <>
                            {item.marca && <span className={styles.tag}>{item.marca}</span>}
                            {item.medida && (
                              <span className={styles.medidaTag}>{item.medida}</span>
                            )}
                          </>
                        ) : (
                          <span className={styles.serviceTag}>Servicio</span>
                        )}
                      </div>
                    </div>
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

                  <div className={styles.cardInfoRow}>
                    {esProd ? (
                      <span className={styles.cantidad}>{item.stock_actual} en stock</span>
                    ) : (
                      <span className={styles.serviceTag}>Sin control de stock</span>
                    )}
                    <span className={styles.precio}>{formatMoney(item.precio_lista)}</span>
                  </div>

                  <div className={styles.cardActions}>
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
      {/* 1. Modal Asistente de Alta de Nuevo Producto / Servicio                   */}
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
                  Asistente inteligente de catálogo para {negocio.nombre}
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
              {/* Selector Visual de Categoría Base */}
              {mostrarGridCategorias ? (
                <div>
                  <p className={styles.categorySelectorTitle}>
                    1. Selecciona la categoría del ítem:
                  </p>
                  <div className={styles.categoryGrid}>
                    {todasCategorias.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        className={`${styles.categoryCard} ${categoriaActivaId === cat.id ? styles.categoryCardActive : ""}`}
                        onClick={() => seleccionarCategoria(cat)}
                      >
                        <span className={styles.categoryCardIcon}>{cat.icono}</span>
                        <span className={styles.categoryCardName}>{cat.nombre}</span>
                        <span className={styles.categoryCardDesc}>{cat.descripcion}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className={styles.categoryBannerSelected}>
                  <div className={styles.categoryBannerInfo}>
                    <span>{categoriaActual.icono}</span>
                    <span>
                      Categoría: <strong>{categoriaActual.nombre}</strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    className={styles.categoryBannerChangeBtn}
                    onClick={() => setMostrarGridCategorias(true)}
                  >
                    ← Cambiar categoría
                  </button>
                </div>
              )}

              {/* Manejo de Posible Duplicado */}
              {candidatosDuplicados && candidatosDuplicados.length > 0 && (
                <div className={styles.duplicateBanner} role="alert">
                  <div className={styles.duplicateHeader}>
                    <AlertTriangleIcon size={18} />
                    <span>Posible ítem duplicado detectado</span>
                  </div>
                  <p style={{ margin: 0, fontSize: "13px", color: "#e2e8f0" }}>
                    Encontramos productos parecidos en tu inventario:
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

              {/* ============================================================= */}
              {/* CASCADA 1: LLANTAS                                            */}
              {/* ============================================================= */}
              {categoriaActivaId === "llantas" && (
                <div>
                  {/* Selector de Marcas */}
                  <div className={styles.chipsSection}>
                    <div className={styles.chipsSectionHeader}>
                      <span className={styles.chipsLabel}>Marca comercial:</span>
                      {!inlineMarcaAbierto && (
                        <button
                          type="button"
                          className={styles.categoryBannerChangeBtn}
                          onClick={() => setInlineMarcaAbierto(true)}
                        >
                          + Otra marca
                        </button>
                      )}
                    </div>

                    {inlineMarcaAbierto && (
                      <div className={styles.inlineAddBox}>
                        <input
                          type="text"
                          className={styles.inlineAddInput}
                          placeholder="Escribe la nueva marca (ej. Otani, Triangle...)"
                          value={nuevaMarcaTexto}
                          onChange={(e) => setNuevaMarcaTexto(e.target.value)}
                          autoFocus
                        />
                        <button
                          type="button"
                          className={styles.inlineAddBtn}
                          onClick={guardarNuevaMarca}
                        >
                          Guardar y usar
                        </button>
                        <button
                          type="button"
                          className={styles.inlineCancelBtn}
                          onClick={() => setInlineMarcaAbierto(false)}
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    <div className={styles.chipsRow}>
                      {todasMarcasLlantas.map((m) => {
                        const esCustom = customCatalog.marcasPersonalizadas.includes(m);
                        const activa = formNuevo.marca.toLowerCase() === m.toLowerCase();
                        return (
                          <button
                            key={m}
                            type="button"
                            className={`${styles.chip} ${activa ? styles.chipActive : ""}`}
                            onClick={() => seleccionarMarcaLlanta(m)}
                          >
                            <span>{m}</span>
                            {esCustom && (
                              <span
                                className={styles.chipDeleteBtn}
                                onClick={(e) => eliminarMarcaPersonalizada(e, m)}
                                title="Eliminar de mi lista"
                              >
                                ✕
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Selector de Medidas por Aro */}
                  <div className={styles.chipsSection}>
                    <div className={styles.chipsSectionHeader}>
                      <span className={styles.chipsLabel}>Medida comercial de llanta:</span>
                      {!inlineMedidaAbierto && (
                        <button
                          type="button"
                          className={styles.categoryBannerChangeBtn}
                          onClick={() => setInlineMedidaAbierto(true)}
                        >
                          + Otra medida
                        </button>
                      )}
                    </div>

                    {inlineMedidaAbierto && (
                      <div className={styles.inlineAddBox}>
                        <select
                          style={{
                            background: "#1e293b",
                            color: "white",
                            border: "none",
                            padding: "4px",
                            borderRadius: "4px",
                            fontSize: "12px",
                          }}
                          value={aroParaNuevaMedida}
                          onChange={(e) => setAroParaNuevaMedida(e.target.value)}
                        >
                          <option value="Aro 13">Aro 13</option>
                          <option value="Aro 14">Aro 14</option>
                          <option value="Aro 15">Aro 15</option>
                          <option value="Aro 16">Aro 16</option>
                          <option value="Aro 17">Aro 17</option>
                          <option value="Aro 18+">Aro 18+</option>
                        </select>
                        <input
                          type="text"
                          className={styles.inlineAddInput}
                          placeholder="Ej. 235/75 R15"
                          value={nuevaMedidaTexto}
                          onChange={(e) => setNuevaMedidaTexto(e.target.value)}
                          autoFocus
                        />
                        <button
                          type="button"
                          className={styles.inlineAddBtn}
                          onClick={guardarNuevaMedida}
                        >
                          Guardar y usar
                        </button>
                        <button
                          type="button"
                          className={styles.inlineCancelBtn}
                          onClick={() => setInlineMedidaAbierto(false)}
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    {/* Filtro de Aros */}
                    <div className={styles.aroTabsRow}>
                      <button
                        type="button"
                        className={`${styles.aroTab} ${aroActivo === "Todos" ? styles.aroTabActive : ""}`}
                        onClick={() => setAroActivo("Todos")}
                      >
                        Todos
                      </button>
                      {todasMedidasPorAro.map((a) => (
                        <button
                          key={a.aro}
                          type="button"
                          className={`${styles.aroTab} ${aroActivo === a.aro ? styles.aroTabActive : ""}`}
                          onClick={() => setAroActivo(a.aro)}
                        >
                          {a.aro}
                        </button>
                      ))}
                    </div>

                    {/* Pills de Medidas */}
                    <div className={styles.chipsRow}>
                      {medidasFiltradas.map((med) => {
                        const esCustom = customCatalog.medidasPersonalizadas.some(
                          (item) => item.medida.toUpperCase() === med.toUpperCase(),
                        );
                        const activa = formNuevo.medida.toUpperCase() === med.toUpperCase();
                        return (
                          <button
                            key={med}
                            type="button"
                            className={`${styles.chip} ${activa ? styles.chipActive : ""}`}
                            onClick={() => seleccionarMedidaLlanta(med)}
                          >
                            <span>{med}</span>
                            {esCustom && (
                              <span
                                className={styles.chipDeleteBtn}
                                onClick={(e) => eliminarMedidaPersonalizada(e, med)}
                                title="Eliminar de mi lista"
                              >
                                ✕
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Condición: Nuevo o Usado */}
                  <div className={styles.field}>
                    <span className={styles.label}>Condición del Neumático</span>
                    <div className={styles.radioPills}>
                      <label
                        className={`${styles.radioPill} ${formNuevo.estado_uso === "nuevo" ? styles.radioPillActive : ""}`}
                      >
                        <input
                          type="radio"
                          name="llanta_condicion"
                          checked={formNuevo.estado_uso === "nuevo"}
                          onChange={() => seleccionarCondicionLlanta("nuevo")}
                        />
                        <span>✨ Nuevo</span>
                      </label>
                      <label
                        className={`${styles.radioPill} ${formNuevo.estado_uso === "usado" ? styles.radioPillActive : ""}`}
                      >
                        <input
                          type="radio"
                          name="llanta_condicion"
                          checked={formNuevo.estado_uso === "usado"}
                          onChange={() => seleccionarCondicionLlanta("usado")}
                        />
                        <span>♻️ De segunda / Seminuevo</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================= */}
              {/* CASCADA 2: ACEITES Y LUBRICANTES                              */}
              {/* ============================================================= */}
              {categoriaActivaId === "aceites" && (
                <div>
                  {/* Viscosidad */}
                  <div className={styles.chipsSection}>
                    <span className={styles.chipsLabel}>Viscosidad / Grado:</span>
                    <div className={styles.chipsRow}>
                      {ACEITES_VISCOSIDADES_DEFAULT.map((v) => (
                        <button
                          key={v}
                          type="button"
                          className={`${styles.chip} ${viscosidadAceite === v ? styles.chipActive : ""}`}
                          onClick={() => seleccionarViscosidadAceite(v)}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Marca de Aceite */}
                  <div className={styles.chipsSection}>
                    <span className={styles.chipsLabel}>Marca:</span>
                    <div className={styles.chipsRow}>
                      {ACEITES_MARCAS_DEFAULT.map((m) => (
                        <button
                          key={m}
                          type="button"
                          className={`${styles.chip} ${marcaAceite === m ? styles.chipActive : ""}`}
                          onClick={() => seleccionarMarcaAceite(m)}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Presentación */}
                  <div className={styles.chipsSection}>
                    <span className={styles.chipsLabel}>Presentación:</span>
                    <div className={styles.chipsRow}>
                      {ACEITES_PRESENTACIONES_DEFAULT.map((pres) => (
                        <button
                          key={pres}
                          type="button"
                          className={`${styles.chip} ${presentacionAceite === pres ? styles.chipActive : ""}`}
                          onClick={() => seleccionarPresentacionAceite(pres)}
                        >
                          {pres}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================= */}
              {/* CASCADA 3: PARCHES Y VULCANIZACIÓN                            */}
              {/* ============================================================= */}
              {categoriaActivaId === "parches" && (
                <div className={styles.chipsSection}>
                  <span className={styles.chipsLabel}>Plantillas frecuentes de vulcanización:</span>
                  <div className={styles.chipsRow}>
                    {PARCHES_PLANTILLAS_DEFAULT.map((plantilla) => (
                      <button
                        key={plantilla}
                        type="button"
                        className={`${styles.chip} ${formNuevo.nombre === plantilla ? styles.chipActive : ""}`}
                        onClick={() =>
                          setFormNuevo((prev) => ({ ...prev, nombre: plantilla }))
                        }
                      >
                        {plantilla}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ============================================================= */}
              {/* CASCADA 4: ADITIVOS Y FLUIDOS                                 */}
              {/* ============================================================= */}
              {categoriaActivaId === "aditivos" && (
                <div className={styles.chipsSection}>
                  <span className={styles.chipsLabel}>Aditivos y fluidos comunes:</span>
                  <div className={styles.chipsRow}>
                    {ADITIVOS_PLANTILLAS_DEFAULT.map((plantilla) => (
                      <button
                        key={plantilla}
                        type="button"
                        className={`${styles.chip} ${formNuevo.nombre === plantilla ? styles.chipActive : ""}`}
                        onClick={() =>
                          setFormNuevo((prev) => ({ ...prev, nombre: plantilla }))
                        }
                      >
                        {plantilla}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ============================================================= */}
              {/* CASCADA 5: ACCESORIOS Y REPUESTOS                             */}
              {/* ============================================================= */}
              {categoriaActivaId === "accesorios" && (
                <div className={styles.chipsSection}>
                  <span className={styles.chipsLabel}>Accesorios frecuentes:</span>
                  <div className={styles.chipsRow}>
                    {ACCESORIOS_PLANTILLAS_DEFAULT.map((plantilla) => (
                      <button
                        key={plantilla}
                        type="button"
                        className={`${styles.chip} ${formNuevo.nombre === plantilla ? styles.chipActive : ""}`}
                        onClick={() =>
                          setFormNuevo((prev) => ({ ...prev, nombre: plantilla }))
                        }
                      >
                        {plantilla}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ============================================================= */}
              {/* CASCADA 6: SERVICIOS Y MANO DE OBRA                           */}
              {/* ============================================================= */}
              {categoriaActivaId === "servicios" && (
                <div className={styles.chipsSection}>
                  <span className={styles.chipsLabel}>Servicios de taller frecuentes:</span>
                  <div className={styles.chipsRow}>
                    {SERVICIOS_PLANTILLAS_DEFAULT.map((plantilla) => (
                      <button
                        key={plantilla}
                        type="button"
                        className={`${styles.chip} ${formNuevo.nombre === plantilla ? styles.chipActive : ""}`}
                        onClick={() =>
                          setFormNuevo((prev) => ({ ...prev, nombre: plantilla }))
                        }
                      >
                        {plantilla}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Campo de Nombre Auto-generado (Editable) */}
              <label className={styles.field}>
                <span className={styles.label}>
                  {tipoItemNuevo === "producto"
                    ? "Nombre final del Producto *"
                    : "Nombre del Servicio *"}
                </span>
                <input
                  required
                  type="text"
                  className={styles.input}
                  placeholder="Se genera automáticamente con tus elecciones"
                  value={formNuevo.nombre}
                  onChange={(e) => setFormNuevo({ ...formNuevo, nombre: e.target.value })}
                />
              </label>

              {/* Precios y Costos */}
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

              {/* Margen de Ganancia en Vivo */}
              {gananciaNuevo.tieneCosto && (
                <div className={styles.profitMarginBox}>
                  <span>💰 Ganancia por unidad: {formatMoney(gananciaNuevo.ganancia.toFixed(2))}</span>
                  <span>Margen: {gananciaNuevo.margen}%</span>
                </div>
              )}

              {/* Stock Inicial y Mínimo */}
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
      {/* 2. Modal de Edición con Reposición Rápida en 1 Clic                       */}
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
                    ? "Editar Producto y Reponer Stock"
                    : "Editar Servicio"}
                </h2>
                <p className={styles.modalSubtitle}>
                  Actualiza precio o ingresa stock de {itemAEditar.nombre}
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

              {/* Reposición Rápida de Stock en 1 Clic (Solo productos físicos) */}
              {esCapital(itemAEditar.clasificacion) && (
                <div className={styles.quickRestockContainer}>
                  <div className={styles.quickRestockHeader}>
                    <strong style={{ color: "#f8fafc" }}>
                      📦 Reposición Rápida de Mercadería
                    </strong>
                    <span style={{ color: "#94a3b8" }}>
                      Stock actual: <strong>{itemAEditar.stock_actual}</strong>
                    </span>
                  </div>

                  <div className={styles.quickStockPills}>
                    <button
                      type="button"
                      className={styles.quickStockPill}
                      onClick={() => aplicarRestockRapido(1)}
                    >
                      +1 unidad
                    </button>
                    <button
                      type="button"
                      className={styles.quickStockPill}
                      onClick={() => aplicarRestockRapido(2)}
                    >
                      +2 unidades
                    </button>
                    <button
                      type="button"
                      className={styles.quickStockPill}
                      onClick={() => aplicarRestockRapido(4)}
                    >
                      +4 unidades (Juego)
                    </button>
                    <button
                      type="button"
                      className={styles.quickStockPill}
                      onClick={() => aplicarRestockRapido(10)}
                    >
                      +10 unidades
                    </button>
                  </div>

                  {restockDelta > 0 && (
                    <p className={styles.stockResultNote}>
                      ✨ Stock aumentará de {itemAEditar.stock_actual} a{" "}
                      {parseInt(formEditar.stock_actual, 10)} (+{restockDelta} unidades agregadas)
                    </p>
                  )}
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

              {/* Margen en Vivo */}
              {gananciaEditar.tieneCosto && (
                <div className={styles.profitMarginBox}>
                  <span>💰 Ganancia por unidad: {formatMoney(gananciaEditar.ganancia.toFixed(2))}</span>
                  <span>Margen: {gananciaEditar.margen}%</span>
                </div>
              )}

              {esCapital(itemAEditar.clasificacion) && (
                <div className={styles.formRow}>
                  <label className={styles.field}>
                    <span className={styles.label}>Stock Actual Resultante</span>
                    <input
                      type="number"
                      min="0"
                      className={styles.input}
                      value={formEditar.stock_actual}
                      onChange={(e) =>
                        setFormEditar({ ...formEditar, stock_actual: e.target.value })
                      }
                    />
                  </label>

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
