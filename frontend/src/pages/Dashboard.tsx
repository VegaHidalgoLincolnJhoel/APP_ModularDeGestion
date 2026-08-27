import { useEffect, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import {
  api,
  ApiError,
  type Negocio,
  type Usuario,
} from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/Button";
import {
  BoxIcon,
  ChatIcon,
  CloseIcon,
  LogoutIcon,
  NutIcon,
  OilDropIcon,
  PlusIcon,
  ReceiptIcon,
  SearchIcon,
  SettingsIcon,
  TireIcon,
  UserIcon,
  WrenchIcon,
} from "../components/icons/Icons";
import styles from "./Dashboard.module.css";

function getRubroIcon(rubro: string) {
  const r = (rubro || "").toLowerCase();
  if (r.includes("llant") || r.includes("neumat")) return <TireIcon size={22} />;
  if (r.includes("lubri") || r.includes("aceit")) return <OilDropIcon size={22} />;
  if (r.includes("repuesto") || r.includes("bodega") || r.includes("stock"))
    return <BoxIcon size={22} />;
  if (r.includes("ferreter")) return <NutIcon size={22} />;
  return <WrenchIcon size={22} />;
}

export default function Dashboard() {
  const { session, logout } = useAuth();

  if (session && session.rol !== "admin") {
    return <Navigate to="/" replace />;
  }

  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtro de búsqueda
  const [busqueda, setBusqueda] = useState("");
  const [updatingNegocioId, setUpdatingNegocioId] = useState<number | null>(null);

  // Modal 1: Dar de alta nuevo negocio
  const [modalNuevoAbierto, setModalNuevoAbierto] = useState(false);
  const [creandoNegocio, setCreandoNegocio] = useState(false);
  const [errorNuevoNegocio, setErrorNuevoNegocio] = useState<string | null>(null);

  // Formulario nuevo negocio
  const [rubroSeleccionado, setRubroSeleccionado] = useState<string>("llantería");
  const [customRubroTexto, setCustomRubroTexto] = useState<string>("");
  const [nuevoForm, setNuevoForm] = useState({
    nombre: "",
    rubro: "llantería",
    stock: true,
    clientes_vehiculos: false,
    sunat: true,
    whatsapp: false,
    usuario_nombre: "",
    usuario_username: "",
    usuario_password: "",
  });

  // Modal 2: Gestión de usuarios
  const [negocioUsuariosModal, setNegocioUsuariosModal] = useState<Negocio | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [errorUsuarios, setErrorUsuarios] = useState<string | null>(null);
  const [togglingUserId, setTogglingUserId] = useState<number | null>(null);

  // Sub-estados en modal de usuarios (Reset pass & Crear user)
  const [usuarioPassReset, setUsuarioPassReset] = useState<{
    usuarioId: number;
    nombre: string;
    nuevaPassword: string;
  } | null>(null);
  const [guardandoPassReset, setGuardandoPassReset] = useState(false);
  const [mostrarFormCrearUser, setMostrarFormCrearUser] = useState(false);
  const [creandoUsuario, setCreandoUsuario] = useState(false);
  const [nuevoUserForm, setNuevoUserForm] = useState({
    nombre: "",
    username: "",
    password: "",
    rol: "dueño",
  });

  // Cargar lista de negocios
  const cargarNegocios = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listNegocios();
      setNegocios(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al obtener negocios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarNegocios();
  }, []);

  // Cargar usuarios de un negocio específico
  const abrirGestionUsuarios = async (negocio: Negocio) => {
    setNegocioUsuariosModal(negocio);
    setLoadingUsuarios(true);
    setErrorUsuarios(null);
    setUsuarioPassReset(null);
    setMostrarFormCrearUser(false);
    try {
      const list = await api.listUsuarios(negocio.id);
      setUsuarios(list);
    } catch (err) {
      setErrorUsuarios(
        err instanceof ApiError ? err.message : "No se pudieron obtener los usuarios",
      );
    } finally {
      setLoadingUsuarios(false);
    }
  };

  // Activar / Desactivar módulos de un negocio
  const toggleModulo = async (
    negocio: Negocio,
    moduloKey: "stock" | "clientes_vehiculos" | "sunat" | "whatsapp",
  ) => {
    setUpdatingNegocioId(negocio.id);
    try {
      let updated: Negocio;
      if (moduloKey === "sunat") {
        const nuevoRus = !negocio.modulo_rus_activo;
        updated = await api.updateNegocio(negocio.id, { modulo_rus_activo: nuevoRus });
      } else {
        const actualModulos = (negocio.modulos_activos || {}) as Record<string, boolean>;
        const nuevoModulos = {
          ...actualModulos,
          [moduloKey]: !actualModulos[moduloKey],
        };
        updated = await api.updateNegocio(negocio.id, { modulos_activos: nuevoModulos });
      }
      setNegocios((prev) => prev.map((n) => (n.id === negocio.id ? updated : n)));
      if (negocioUsuariosModal?.id === negocio.id) {
        setNegocioUsuariosModal(updated);
      }
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Error al actualizar módulo del negocio.");
    } finally {
      setUpdatingNegocioId(null);
    }
  };

  // Revocar o reactivar acceso de usuario (activo = true/false)
  const toggleEstadoUsuario = async (usuario: Usuario) => {
    if (!negocioUsuariosModal) return;
    setTogglingUserId(usuario.id);
    try {
      const nuevoEstado = !(usuario.activo ?? true);
      const updated = await api.updateUsuario(negocioUsuariosModal.id, usuario.id, {
        activo: nuevoEstado,
      });
      setUsuarios((prev) => prev.map((u) => (u.id === usuario.id ? updated : u)));
    } catch (err) {
      alert(
        err instanceof ApiError
          ? err.message
          : "Error al modificar el estado del usuario.",
      );
    } finally {
      setTogglingUserId(null);
    }
  };

  // Guardar nueva contraseña
  const submitResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!negocioUsuariosModal || !usuarioPassReset || !usuarioPassReset.nuevaPassword) return;
    setGuardandoPassReset(true);
    try {
      await api.updateUsuario(negocioUsuariosModal.id, usuarioPassReset.usuarioId, {
        password: usuarioPassReset.nuevaPassword,
      });
      alert(`Contraseña actualizada con éxito para el usuario ${usuarioPassReset.nombre}`);
      setUsuarioPassReset(null);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Error al resetear la contraseña.");
    } finally {
      setGuardandoPassReset(false);
    }
  };

  // Registrar un usuario adicional para el negocio
  const submitCrearUsuarioAdicional = async (e: FormEvent) => {
    e.preventDefault();
    if (
      !negocioUsuariosModal ||
      !nuevoUserForm.nombre ||
      !nuevoUserForm.username ||
      !nuevoUserForm.password
    )
      return;
    setCreandoUsuario(true);
    try {
      const u = await api.createUsuario(negocioUsuariosModal.id, {
        nombre: nuevoUserForm.nombre,
        username: nuevoUserForm.username,
        password: nuevoUserForm.password,
        rol: nuevoUserForm.rol || "dueño",
      });
      setUsuarios((prev) => [...prev, u]);
      setNuevoUserForm({ nombre: "", username: "", password: "", rol: "dueño" });
      setMostrarFormCrearUser(false);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Error al crear el nuevo usuario.");
    } finally {
      setCreandoUsuario(false);
    }
  };

  // Handler inteligente para cambio de rubro con sugerencia de módulos
  const handleRubroChange = (nuevoRubroKey: string) => {
    setRubroSeleccionado(nuevoRubroKey);
    let defaults = {
      stock: true,
      clientes_vehiculos: false,
      sunat: false,
      whatsapp: false,
    };
    if (nuevoRubroKey === "llantería") {
      defaults = { stock: true, clientes_vehiculos: false, sunat: true, whatsapp: false };
    } else if (nuevoRubroKey === "lubricentro") {
      defaults = { stock: true, clientes_vehiculos: true, sunat: false, whatsapp: true };
    } else if (nuevoRubroKey === "taller_mixto" || nuevoRubroKey === "taller_mecanico") {
      defaults = { stock: true, clientes_vehiculos: true, sunat: true, whatsapp: true };
    } else if (nuevoRubroKey === "carwash") {
      defaults = { stock: false, clientes_vehiculos: true, sunat: false, whatsapp: true };
    } else if (
      nuevoRubroKey === "repuestos" ||
      nuevoRubroKey === "ferreteria" ||
      nuevoRubroKey === "bodega"
    ) {
      defaults = { stock: true, clientes_vehiculos: false, sunat: true, whatsapp: false };
    }

    const rubroFinal =
      nuevoRubroKey === "personalizado" ? customRubroTexto || "otro" : nuevoRubroKey;

    setNuevoForm((prev) => ({
      ...prev,
      rubro: rubroFinal,
      ...defaults,
    }));
  };

  // Dar de alta negocio con su usuario inicial
  const submitNuevoNegocio = async (e: FormEvent) => {
    e.preventDefault();
    if (!nuevoForm.nombre || !nuevoForm.usuario_username || !nuevoForm.usuario_password)
      return;

    const rubroFinal =
      rubroSeleccionado === "personalizado"
        ? customRubroTexto.trim() || "otro"
        : rubroSeleccionado;

    setCreandoNegocio(true);
    setErrorNuevoNegocio(null);
    try {
      const creado = await api.createNegocio({
        nombre: nuevoForm.nombre,
        rubro: rubroFinal,
        plan_estado: "activo",
        modulo_rus_activo: nuevoForm.sunat,
        modulos_activos: {
          stock: nuevoForm.stock,
          clientes_vehiculos: nuevoForm.clientes_vehiculos,
          whatsapp: nuevoForm.whatsapp,
        },
        usuario_inicial: {
          nombre: nuevoForm.usuario_nombre || `Administrador ${nuevoForm.nombre}`,
          username: nuevoForm.usuario_username,
          password: nuevoForm.usuario_password,
          rol: "dueño",
        },
      });
      setNegocios((prev) => [creado, ...prev]);
      setModalNuevoAbierto(false);
      setRubroSeleccionado("llantería");
      setCustomRubroTexto("");
      setNuevoForm({
        nombre: "",
        rubro: "llantería",
        stock: true,
        clientes_vehiculos: false,
        sunat: true,
        whatsapp: false,
        usuario_nombre: "",
        usuario_username: "",
        usuario_password: "",
      });
    } catch (err) {
      setErrorNuevoNegocio(
        err instanceof ApiError ? err.message : "Error al dar de alta el negocio.",
      );
    } finally {
      setCreandoNegocio(false);
    }
  };

  // Filtrado de negocios
  const negociosFiltrados = negocios.filter((n) => {
    const query = busqueda.toLowerCase().trim();
    if (!query) return true;
    return n.nombre.toLowerCase().includes(query) || n.rubro.toLowerCase().includes(query);
  });

  // Estadísticas rápidas
  const totalNegocios = negocios.length;
  const negociosSunat = negocios.filter((n) => n.modulo_rus_activo).length;
  const negociosClientes = negocios.filter(
    (n) => (n.modulos_activos as Record<string, boolean> | undefined)?.clientes_vehiculos,
  ).length;

  return (
    <div className={styles.wrapper}>
      <main className={styles.page}>
        {/* Fondos luminosos para Glassmorphism */}
        <div className={styles.bgGlowTop} />
        <div className={styles.bgGlowBottom} />

      <header className={styles.topHeader}>
        <div className={styles.brandGroup}>
          <div className={styles.logoBadge}>
            <SettingsIcon size={22} />
          </div>
          <div>
            <h1 className={styles.title}>Panel de Administración</h1>
            <p className={styles.subtitle}>
              Conectado como <strong className={styles.adminName}>{session?.nombre}</strong> (SuperAdmin)
            </p>
          </div>
        </div>

        <div className={styles.headerActions}>
          <Button onClick={() => setModalNuevoAbierto(true)}>
            <PlusIcon size={18} />
            <span>Nuevo Negocio</span>
          </Button>
          <Button variant="ghost" onClick={logout} className={styles.logoutBtn}>
            <LogoutIcon size={18} />
            <span>Cerrar sesión</span>
          </Button>
        </div>
      </header>

      {/* Tarjetas de Métricas Rápidas */}
      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIconContainer}>
            <NutIcon size={22} />
          </div>
          <div>
            <span className={styles.statValue}>{totalNegocios}</span>
            <span className={styles.statLabel}>Negocios Registrados</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconContainerTeal}>
            <ReceiptIcon size={22} />
          </div>
          <div>
            <span className={styles.statValue}>{negociosSunat}</span>
            <span className={styles.statLabel}>Módulo SUNAT / RUS</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconContainerCyan}>
            <WrenchIcon size={22} />
          </div>
          <div>
            <span className={styles.statValue}>{negociosClientes}</span>
            <span className={styles.statLabel}>Clientes / Vehículos</span>
          </div>
        </div>
      </section>

      {/* Barra de Filtro y Búsqueda */}
      <section className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <SearchIcon size={18} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Buscar negocio por nombre o rubro…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          {busqueda && (
            <button
              type="button"
              className={styles.clearSearchBtn}
              onClick={() => setBusqueda("")}
            >
              <CloseIcon size={16} />
            </button>
          )}
        </div>

        <span className={styles.counterText}>
          Mostrando {negociosFiltrados.length} de {totalNegocios} negocios
        </span>
      </section>

      {/* Listado de Negocios en formato Cards Glassmorphic */}
      {loading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} />
          <p>Cargando lista de negocios…</p>
        </div>
      ) : error ? (
        <div className={styles.errorBanner} role="alert">
          <p>Error al cargar la información: {error}</p>
          <Button size="sm" onClick={cargarNegocios}>
            Reintentar
          </Button>
        </div>
      ) : negociosFiltrados.length === 0 ? (
        <div className={styles.emptyContainer}>
          <NutIcon size={44} />
          <h3>No se encontraron negocios</h3>
          <p>
            {busqueda
              ? "No hay resultados que coincidan con la búsqueda."
              : "Registra un nuevo negocio para comenzar."}
          </p>
          {!busqueda && (
            <Button onClick={() => setModalNuevoAbierto(true)}>
              <PlusIcon size={18} />
              <span>Registrar Negocio</span>
            </Button>
          )}
        </div>
      ) : (
        <div className={styles.negociosGrid}>
          {negociosFiltrados.map((negocio) => {
            const modulos = (negocio.modulos_activos || {}) as Record<string, boolean>;
            const stockActivo = modulos.stock ?? true;
            const clientesActivo = modulos.clientes_vehiculos ?? false;
            const sunatActivo = negocio.modulo_rus_activo ?? false;
            const whatsappActivo = modulos.whatsapp ?? false;
            const isUpdating = updatingNegocioId === negocio.id;

            return (
              <div key={negocio.id} className={styles.negocioCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitleGroup}>
                    <div className={styles.rubroIcon}>
                      {getRubroIcon(negocio.rubro)}
                    </div>
                    <div>
                      <h2 className={styles.negocioNombre}>{negocio.nombre}</h2>
                      <span className={styles.rubroBadge}>{negocio.rubro}</span>
                    </div>
                  </div>
                  <span
                    className={
                      negocio.plan_estado === "activo"
                        ? styles.statusActive
                        : styles.statusInactive
                    }
                  >
                    ● {negocio.plan_estado || "Activo"}
                  </span>
                </div>

                <div className={styles.divider} />

                {/* Interruptores / Switches de Módulos */}
                <div className={styles.modulosSection}>
                  <span className={styles.modulosTitle}>Módulos Habilitados</span>
                  <div className={styles.switchesGrid}>
                    {/* Modulo Stock */}
                    <div className={styles.switchItem}>
                      <div className={styles.switchInfo}>
                        <BoxIcon size={16} />
                        <span>Inventario / Stock</span>
                      </div>
                      <label className={styles.switchLabel}>
                        <input
                          type="checkbox"
                          checked={stockActivo}
                          disabled={isUpdating}
                          onChange={() => toggleModulo(negocio, "stock")}
                        />
                        <span className={styles.slider} />
                      </label>
                    </div>

                    {/* Modulo Clientes - Vehiculos */}
                    <div className={styles.switchItem}>
                      <div className={styles.switchInfo}>
                        <WrenchIcon size={16} />
                        <span>Cliente - Vehículo</span>
                      </div>
                      <label className={styles.switchLabel}>
                        <input
                          type="checkbox"
                          checked={clientesActivo}
                          disabled={isUpdating}
                          onChange={() => toggleModulo(negocio, "clientes_vehiculos")}
                        />
                        <span className={styles.slider} />
                      </label>
                    </div>

                    {/* Modulo SUNAT */}
                    <div className={styles.switchItem}>
                      <div className={styles.switchInfo}>
                        <ReceiptIcon size={16} />
                        <span>Facturación SUNAT (RUS)</span>
                      </div>
                      <label className={styles.switchLabel}>
                        <input
                          type="checkbox"
                          checked={sunatActivo}
                          disabled={isUpdating}
                          onChange={() => toggleModulo(negocio, "sunat")}
                        />
                        <span className={styles.slider} />
                      </label>
                    </div>

                    {/* Modulo WhatsApp */}
                    <div className={styles.switchItem}>
                      <div className={styles.switchInfo}>
                        <ChatIcon size={16} />
                        <span>Notificaciones WhatsApp</span>
                      </div>
                      <label className={styles.switchLabel}>
                        <input
                          type="checkbox"
                          checked={whatsappActivo}
                          disabled={isUpdating}
                          onChange={() => toggleModulo(negocio, "whatsapp")}
                        />
                        <span className={styles.slider} />
                      </label>
                    </div>
                  </div>
                </div>

                <div className={styles.cardFooter}>
                  <Button
                    variant="outline"
                    size="sm"
                    fullWidth
                    onClick={() => abrirGestionUsuarios(negocio)}
                  >
                    <UserIcon size={16} />
                    <span>Gestionar Usuarios</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: ALTA DE NUEVO NEGOCIO */}
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
                <h2 className={styles.modalTitle}>Dar de Alta Nuevo Negocio</h2>
                <p className={styles.modalSubtitle}>
                  Configura la empresa y las credenciales del usuario inicial
                </p>
              </div>
              <button
                type="button"
                className={styles.closeModalBtn}
                onClick={() => setModalNuevoAbierto(false)}
              >
                <CloseIcon size={20} />
              </button>
            </div>

            <form onSubmit={submitNuevoNegocio} className={styles.modalForm}>
              {errorNuevoNegocio && (
                <div className={styles.errorBox} role="alert">
                  <p>{errorNuevoNegocio}</p>
                </div>
              )}

              <div className={styles.formSection}>
                <h3 className={styles.sectionTitle}>1. Información del Negocio</h3>
                <div className={styles.formRow}>
                  <label className={styles.field}>
                    <span className={styles.label}>Nombre Comercial *</span>
                    <input
                      required
                      type="text"
                      className={styles.input}
                      placeholder="Ej. Llantería San Martín"
                      value={nuevoForm.nombre}
                      onChange={(e) =>
                        setNuevoForm({ ...nuevoForm, nombre: e.target.value })
                      }
                    />
                  </label>

                  <label className={styles.field}>
                    <span className={styles.label}>Rubro *</span>
                    <select
                      className={styles.input}
                      value={rubroSeleccionado}
                      onChange={(e) => handleRubroChange(e.target.value)}
                    >
                      <option value="llantería">Llantería / Neumáticos</option>
                      <option value="lubricentro">Lubricentro / Aceites</option>
                      <option value="taller_mixto">Taller Mixto (Llantería + Lubricentro)</option>
                      <option value="taller_mecanico">Taller Mecánico / Automotriz</option>
                      <option value="carwash">Lavado de Autos / Car Wash</option>
                      <option value="repuestos">Venta de Repuestos / Autopartes</option>
                      <option value="ferreteria">Ferretería / Herramientas</option>
                      <option value="bodega">Bodega / Minimarket</option>
                      <option value="servicios">Servicios Generales</option>
                      <option value="personalizado">✏️ Otro rubro (Escribir personalizado...)</option>
                    </select>
                  </label>
                </div>

                {rubroSeleccionado === "personalizado" && (
                  <div className={styles.formRow} style={{ marginTop: "12px" }}>
                    <label className={styles.field}>
                      <span className={styles.label}>Nombre del Rubro Personalizado *</span>
                      <input
                        required
                        type="text"
                        className={styles.input}
                        placeholder="Ej. Taller de Motos, Carpintería, etc."
                        value={customRubroTexto}
                        onChange={(e) => {
                          setCustomRubroTexto(e.target.value);
                          setNuevoForm((prev) => ({ ...prev, rubro: e.target.value }));
                        }}
                      />
                    </label>
                  </div>
                )}

                <div className={styles.field}>
                  <span className={styles.label}>Módulos Iniciales Activos</span>
                  <div className={styles.checkboxGroup}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={nuevoForm.stock}
                        onChange={(e) =>
                          setNuevoForm({ ...nuevoForm, stock: e.target.checked })
                        }
                      />
                      <span>Inventario / Stock</span>
                    </label>

                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={nuevoForm.clientes_vehiculos}
                        onChange={(e) =>
                          setNuevoForm({
                            ...nuevoForm,
                            clientes_vehiculos: e.target.checked,
                          })
                        }
                      />
                      <span>Cliente - Vehículo</span>
                    </label>

                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={nuevoForm.sunat}
                        onChange={(e) =>
                          setNuevoForm({ ...nuevoForm, sunat: e.target.checked })
                        }
                      />
                      <span>SUNAT (RUS)</span>
                    </label>

                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={nuevoForm.whatsapp}
                        onChange={(e) =>
                          setNuevoForm({ ...nuevoForm, whatsapp: e.target.checked })
                        }
                      />
                      <span>WhatsApp Bot</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className={styles.formSection}>
                <h3 className={styles.sectionTitle}>2. Credenciales Usuario Inicial</h3>
                <div className={styles.formRow}>
                  <label className={styles.field}>
                    <span className={styles.label}>Nombre Responsable</span>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="Ej. Pedro Pérez"
                      value={nuevoForm.usuario_nombre}
                      onChange={(e) =>
                        setNuevoForm({ ...nuevoForm, usuario_nombre: e.target.value })
                      }
                    />
                  </label>

                  <label className={styles.field}>
                    <span className={styles.label}>Usuario (Login) *</span>
                    <input
                      required
                      type="text"
                      className={styles.input}
                      placeholder="Ej. llanteria_sanmartin"
                      value={nuevoForm.usuario_username}
                      onChange={(e) =>
                        setNuevoForm({ ...nuevoForm, usuario_username: e.target.value })
                      }
                    />
                  </label>
                </div>

                <label className={styles.field}>
                  <span className={styles.label}>Contraseña Inicial *</span>
                  <input
                    required
                    type="password"
                    className={styles.input}
                    placeholder="••••••••"
                    value={nuevoForm.usuario_password}
                    onChange={(e) =>
                      setNuevoForm({ ...nuevoForm, usuario_password: e.target.value })
                    }
                  />
                </label>
              </div>

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
                  disabled={
                    creandoNegocio ||
                    !nuevoForm.nombre ||
                    !nuevoForm.usuario_username ||
                    !nuevoForm.usuario_password
                  }
                >
                  {creandoNegocio ? "Creando Negocio…" : "Crear Negocio"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: GESTIÓN DE USUARIOS DEL NEGOCIO */}
      {negocioUsuariosModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => setNegocioUsuariosModal(null)}
        >
          <div
            className={styles.modalCardWide}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className={styles.modalHeader}>
              <div>
                <h2 className={styles.modalTitle}>
                  Usuarios: {negocioUsuariosModal.nombre}
                </h2>
                <p className={styles.modalSubtitle}>
                  Administración de accesos, reseteo de claves y nuevos perfiles
                </p>
              </div>
              <button
                type="button"
                className={styles.closeModalBtn}
                onClick={() => setNegocioUsuariosModal(null)}
              >
                <CloseIcon size={20} />
              </button>
            </div>

            <div className={styles.userModalBody}>
              <div className={styles.userListHeader}>
                <h3>Usuarios Registrados</h3>
                {!mostrarFormCrearUser && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setMostrarFormCrearUser(true)}
                  >
                    <PlusIcon size={16} />
                    <span>Agregar Usuario</span>
                  </Button>
                )}
              </div>

              {/* Formulario para agregar usuario adicional */}
              {mostrarFormCrearUser && (
                <form
                  onSubmit={submitCrearUsuarioAdicional}
                  className={styles.formAddUser}
                >
                  <h4 className={styles.subFormTitle}>Crear Usuario Adicional</h4>
                  <div className={styles.formRow}>
                    <label className={styles.field}>
                      <span className={styles.label}>Nombre</span>
                      <input
                        required
                        type="text"
                        className={styles.input}
                        placeholder="Ej. Juan Vendedor"
                        value={nuevoUserForm.nombre}
                        onChange={(e) =>
                          setNuevoUserForm({ ...nuevoUserForm, nombre: e.target.value })
                        }
                      />
                    </label>

                    <label className={styles.field}>
                      <span className={styles.label}>Usuario Login</span>
                      <input
                        required
                        type="text"
                        className={styles.input}
                        placeholder="Ej. juan_ventas"
                        value={nuevoUserForm.username}
                        onChange={(e) =>
                          setNuevoUserForm({ ...nuevoUserForm, username: e.target.value })
                        }
                      />
                    </label>
                  </div>

                  <div className={styles.formRow}>
                    <label className={styles.field}>
                      <span className={styles.label}>Contraseña</span>
                      <input
                        required
                        type="password"
                        className={styles.input}
                        placeholder="••••••••"
                        value={nuevoUserForm.password}
                        onChange={(e) =>
                          setNuevoUserForm({
                            ...nuevoUserForm,
                            password: e.target.value,
                          })
                        }
                      />
                    </label>

                    <label className={styles.field}>
                      <span className={styles.label}>Rol</span>
                      <select
                        className={styles.input}
                        value={nuevoUserForm.rol}
                        onChange={(e) =>
                          setNuevoUserForm({ ...nuevoUserForm, rol: e.target.value })
                        }
                      >
                        <option value="dueño">Dueño</option>
                        <option value="vendedor">Vendedor</option>
                        <option value="empleado">Empleado</option>
                      </select>
                    </label>
                  </div>

                  <div className={styles.subFormActions}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setMostrarFormCrearUser(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" size="sm" disabled={creandoUsuario}>
                      {creandoUsuario ? "Guardando…" : "Crear Usuario"}
                    </Button>
                  </div>
                </form>
              )}

              {/* Reset Password Form si hay usuario seleccionado */}
              {usuarioPassReset && (
                <form
                  onSubmit={submitResetPassword}
                  className={styles.formResetPassword}
                >
                  <h4 className={styles.subFormTitle}>
                    Resetear Contraseña para: {usuarioPassReset.nombre}
                  </h4>
                  <div className={styles.resetRow}>
                    <input
                      required
                      type="password"
                      className={styles.input}
                      placeholder="Nueva contraseña"
                      value={usuarioPassReset.nuevaPassword}
                      onChange={(e) =>
                        setUsuarioPassReset({
                          ...usuarioPassReset,
                          nuevaPassword: e.target.value,
                        })
                      }
                    />
                    <Button type="submit" size="sm" disabled={guardandoPassReset}>
                      {guardandoPassReset ? "Guardando…" : "Actualizar Clave"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setUsuarioPassReset(null)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              )}

              {loadingUsuarios ? (
                <div className={styles.loadingContainer}>
                  <div className={styles.spinner} />
                  <p>Cargando usuarios…</p>
                </div>
              ) : errorUsuarios ? (
                <div className={styles.errorBox} role="alert">
                  <p>{errorUsuarios}</p>
                </div>
              ) : usuarios.length === 0 ? (
                <p className={styles.mutedText}>No hay usuarios para este negocio.</p>
              ) : (
                <div className={styles.usersTableWrapper}>
                  <table className={styles.usersTable}>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Nombre</th>
                        <th>Usuario</th>
                        <th>Rol</th>
                        <th>Estado</th>
                        <th style={{ textAlign: "right" }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usuarios.map((u) => {
                        const estaActivo = u.activo ?? true;
                        const isToggling = togglingUserId === u.id;

                        return (
                          <tr key={u.id}>
                            <td>#{u.id}</td>
                            <td className={styles.userNombre}>{u.nombre}</td>
                            <td>{u.username || "-"}</td>
                            <td>
                              <span className={styles.rolBadge}>{u.rol}</span>
                            </td>
                            <td>
                              <span
                                className={
                                  estaActivo
                                    ? styles.badgeActivo
                                    : styles.badgeDesactivado
                                }
                              >
                                {estaActivo ? "Activo" : "Acceso Revocado"}
                              </span>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <div className={styles.userActionsGroup}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setUsuarioPassReset({
                                      usuarioId: u.id,
                                      nombre: u.nombre,
                                      nuevaPassword: "",
                                    })
                                  }
                                >
                                  Reset Clave
                                </Button>

                                <Button
                                  variant={estaActivo ? "outline" : "primary"}
                                  size="sm"
                                  disabled={isToggling}
                                  onClick={() => toggleEstadoUsuario(u)}
                                >
                                  {estaActivo ? "Revocar Acceso" : "Reactivar Acceso"}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </main>
    </div>
  );
}
