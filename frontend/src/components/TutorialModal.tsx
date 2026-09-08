import { useState, useEffect, useMemo, type ReactNode } from "react";
import { CloseIcon, SparklesIcon, CheckIcon } from "./icons/Icons";
import type { Negocio } from "../api/client";
import styles from "./TutorialModal.module.css";

interface TutorialModalProps {
  negocioNombre?: string;
  negocioTipo?: string;
  negocio?: Negocio | null;
  onClose: () => void;
}

interface StepDefinition {
  id: string;
  icon: string;
  title: string;
  description: string;
  renderInteractive: () => ReactNode;
}

export function TutorialModal({
  negocioNombre = "tu negocio",
  negocioTipo = "taller",
  negocio = null,
  onClose,
}: TutorialModalProps) {
  const [pasoActual, setPasoActual] = useState(0);

  // Estados interactivos para las demostraciones dentro del tutorial
  const [accionSeleccionada, setAccionSeleccionada] = useState<string | null>(null);
  const [demoCantidad, setDemoCantidad] = useState(3);
  const [mostrarMsgWhatsApp, setMostrarMsgWhatsApp] = useState(false);
  const [demoVentaAnulada, setDemoVentaAnulada] = useState(false);

  // Estados interactivos para el nuevo Asistente de Catálogo Inteligente
  const [demoCategoria, setDemoCategoria] = useState("llantas");
  const [demoMarca, setDemoMarca] = useState("Michelin");
  const [demoMedida, setDemoMedida] = useState("185/65 R15");
  const [demoStockAgregado, setDemoStockAgregado] = useState(0);

  const esLlanteria = negocioTipo.includes("llant");
  const servicioEjemplo = esLlanteria ? "Parchado de Llanta" : "Cambio de Aceite";
  const precioEjemplo = esLlanteria ? 15 : 45;

  // Extraer configuración de módulos del negocio
  const modulos = useMemo(() => {
    if (!negocio) {
      return {
        stock: true,
        clientes: false,
        whatsapp: true,
        sunat: false,
      };
    }
    const m = (negocio.modulos_activos || {}) as Record<string, boolean>;
    return {
      stock: m.stock !== false,
      clientes: Boolean(m.clientes_vehiculos),
      whatsapp: m.whatsapp !== false,
      sunat: Boolean(negocio.modulo_rus_activo),
    };
  }, [negocio]);

  // Lista dinámica de pasos según los módulos activos del negocio
  const steps: StepDefinition[] = useMemo(() => {
    const lista: StepDefinition[] = [];

    // 1. Siempre: Pantalla Principal y Acciones Rápidas
    lista.push({
      id: "inicio",
      icon: "⚡",
      title: "Pantalla Principal y Acciones Rápidas",
      description: `Al entrar a ${negocioNombre}, tienes en la pantalla de Inicio las acciones más frecuentes listas para tocar y cobrar con un solo toque.`,
      renderInteractive: () => (
        <div className={styles.interactiveBox}>
          <div className={styles.interactiveHint}>
            <span>👉 Prueba interactiva: Toca una opción para cobrar</span>
          </div>
          <div className={styles.mockActionsList}>
            <button
              type="button"
              className={`${styles.mockActionCard} ${accionSeleccionada === "parche" ? styles.mockActionCardActive : ""}`}
              onClick={() => setAccionSeleccionada("parche")}
            >
              <span className={styles.mockActionName}>🔧 {servicioEjemplo}</span>
              <span className={styles.mockActionPrice}>S/ {precioEjemplo}.00</span>
            </button>
            <button
              type="button"
              className={`${styles.mockActionCard} ${accionSeleccionada === "llanta" ? styles.mockActionCardActive : ""}`}
              onClick={() => setAccionSeleccionada("llanta")}
            >
              <span className={styles.mockActionName}>
                🚗 {esLlanteria ? "Venta de Llanta" : "Filtro de Aceite"}
              </span>
              <span className={styles.mockActionPrice}>
                S/ {esLlanteria ? "180.00" : "35.00"}
              </span>
            </button>
          </div>
          {accionSeleccionada && (
            <p style={{ fontSize: "12px", color: "#16a34a", fontWeight: 600, margin: "4px 0 0 0" }}>
              ✅ ¡Exacto! Un solo toque y ya estás en la pantalla para cobrar esa atención.
            </p>
          )}
        </div>
      ),
    });

    // 2. Siempre: Cantidades Múltiples y Ganancia Neta
    lista.push({
      id: "cantidades",
      icon: "🔢",
      title: "Ventas Múltiples y Cálculo de Ganancia",
      description:
        "¿El cliente necesita 2, 3 o 4 parches o productos? Usa los botones [1, 2, 3, 4] o [−] y [+]. El sistema multiplica el precio y separa el capital a reponer de tu ganancia neta.",
      renderInteractive: () => (
        <div className={styles.interactiveBox}>
          <div className={styles.interactiveHint}>
            <span>👉 Prueba interactiva: Ajusta la cantidad con los botones</span>
          </div>
          <div className={styles.demoStepperCard}>
            <div className={styles.demoStepperControls}>
              <button
                type="button"
                className={styles.demoStepperBtn}
                onClick={() => setDemoCantidad((c) => Math.max(1, c - 1))}
                disabled={demoCantidad <= 1}
              >
                −
              </button>
              <span className={styles.demoStepperValue}>{demoCantidad}</span>
              <button
                type="button"
                className={styles.demoStepperBtn}
                onClick={() => setDemoCantidad((c) => Math.min(10, c + 1))}
              >
                +
              </button>
              <span style={{ fontSize: "12px", color: "var(--ink-soft)" }}>
                {demoCantidad === 1 ? "unidad" : "unidades"}
              </span>
            </div>
            <div className={styles.demoTotalBox}>
              <span className={styles.demoTotalLabel}>Total a cobrar:</span>
              <span className={styles.demoTotalVal}>
                S/ {(precioEjemplo * demoCantidad).toFixed(2)}
              </span>
            </div>
          </div>
          <p style={{ fontSize: "12px", color: "var(--ink-soft)", margin: "4px 0 0 0" }}>
            💡 En productos físicos se descuenta automáticamente el stock y se protege el capital de reposición.
          </p>
        </div>
      ),
    });

    // 3. Si el módulo de Stock está activo: Nuevo Catálogo Guiado y Reposición Rápida
    if (modulos.stock) {
      lista.push({
        id: "stock_catalogo",
        icon: "📦",
        title: "Catálogo Inteligente y Reposición en 1 Clic",
        description:
          "¡Olvídate de escribir nombres largos a mano! Al crear un producto seleccionas su categoría (Llantas, Parches, Aceites, Aditivos, Servicios) y eliges su marca y medida con un toque. Para reponer mercadería, solo tocas [+1], [+2] o [+4].",
        renderInteractive: () => {
          const nombreGenerado =
            demoCategoria === "llantas"
              ? `Llanta ${demoMedida} ${demoMarca}`
              : demoCategoria === "aceites"
                ? `Aceite ${demoMarca} 10W-40`
                : "Parche Frío Redondo";

          return (
            <div className={styles.interactiveBox}>
              <div className={styles.interactiveHint}>
                <span>👉 Prueba interactiva: Elige opciones y mira cómo se crea el nombre</span>
              </div>
              <div className={styles.demoPillList}>
                <button
                  type="button"
                  className={`${styles.demoPill} ${demoCategoria === "llantas" ? styles.demoPillActive : ""}`}
                  onClick={() => {
                    setDemoCategoria("llantas");
                    setDemoMarca("Michelin");
                  }}
                >
                  🚗 Llantas
                </button>
                <button
                  type="button"
                  className={`${styles.demoPill} ${demoCategoria === "aceites" ? styles.demoPillActive : ""}`}
                  onClick={() => {
                    setDemoCategoria("aceites");
                    setDemoMarca("Motul");
                  }}
                >
                  🛢️ Aceites
                </button>
                <button
                  type="button"
                  className={`${styles.demoPill} ${demoCategoria === "parches" ? styles.demoPillActive : ""}`}
                  onClick={() => {
                    setDemoCategoria("parches");
                  }}
                >
                  🔧 Parches
                </button>
              </div>

              {demoCategoria === "llantas" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div className={styles.demoPillList}>
                    {["Michelin", "Goodyear", "Bridgestone"].map((m) => (
                      <button
                        key={m}
                        type="button"
                        className={`${styles.demoPill} ${demoMarca === m ? styles.demoPillActive : ""}`}
                        onClick={() => setDemoMarca(m)}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                  <div className={styles.demoPillList}>
                    {["185/65 R14", "185/65 R15", "195/65 R15", "205/55 R16"].map((med) => (
                      <button
                        key={med}
                        type="button"
                        className={`${styles.demoPill} ${demoMedida === med ? styles.demoPillActive : ""}`}
                        onClick={() => setDemoMedida(med)}
                      >
                        {med}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className={styles.demoResultCard}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ fontSize: "13px", color: "#0f172a" }}>
                    ✨ Producto generado: {nombreGenerado}
                  </strong>
                  <span style={{ fontSize: "11.5px", color: "#16a34a", fontWeight: 700 }}>
                    Stock: {2 + demoStockAgregado}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>Reponer rápido:</span>
                  <button
                    type="button"
                    className={styles.demoPill}
                    onClick={() => setDemoStockAgregado((s) => s + 2)}
                  >
                    +2
                  </button>
                  <button
                    type="button"
                    className={styles.demoPill}
                    onClick={() => setDemoStockAgregado((s) => s + 4)}
                  >
                    +4
                  </button>
                  {demoStockAgregado > 0 && (
                    <span style={{ fontSize: "11px", color: "#2563eb", fontWeight: 600 }}>
                      (+{demoStockAgregado} agregados)
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        },
      });
    }

    // 4. Siempre: Cierre de Caja y Anulación Segura
    lista.push({
      id: "caja",
      icon: "💰",
      title: "Cierre de Caja y Anular Ventas de Prueba",
      description:
        "En Cierre de Caja tienes el balance en vivo de Efectivo vs Digital (Yape/Plin). Si realizas una venta de prueba o hubo una equivocación, la anulas en 1 clic: se restaura el stock y no deja registro en la caja.",
      renderInteractive: () => (
        <div className={styles.interactiveBox}>
          <div className={styles.interactiveHint}>
            <span>👉 Prueba interactiva: Anula la venta de ejemplo</span>
          </div>
          {!demoVentaAnulada ? (
            <div className={styles.demoAnularRow}>
              <div>
                <strong style={{ fontSize: "13px" }}>3x {servicioEjemplo}</strong>
                <div style={{ fontSize: "11px", color: "var(--ink-soft)" }}>
                  Hoy 10:45 AM • Efectivo: S/ 45.00
                </div>
              </div>
              <button
                type="button"
                className={styles.demoAnularBtn}
                onClick={() => setDemoVentaAnulada(true)}
              >
                🗑️ Anular
              </button>
            </div>
          ) : (
            <div className={styles.demoAnularSuccess}>
              ✅ ¡Venta anulada! La caja volvió a S/ 0.00 y se repuso el stock al inventario.
              <button
                type="button"
                style={{
                  marginLeft: "8px",
                  background: "none",
                  border: "none",
                  color: "#2563eb",
                  textDecoration: "underline",
                  cursor: "pointer",
                  fontSize: "11px",
                }}
                onClick={() => setDemoVentaAnulada(false)}
              >
                Restaurar demo
              </button>
            </div>
          )}
        </div>
      ),
    });

    // 5. Si Notificaciones / WhatsApp está activo
    if (modulos.whatsapp) {
      lista.push({
        id: "whatsapp",
        icon: "🧾",
        title: "Tickets y Comprobante por WhatsApp",
        description:
          "Entrega comprobantes formales al instante. Al finalizar una venta puedes imprimir el recibo térmico o enviarlo en 1 solo clic directamente al WhatsApp de tu cliente.",
        renderInteractive: () => (
          <div className={styles.interactiveBox}>
            <div className={styles.interactiveHint}>
              <span>👉 Prueba interactiva: Abre la vista previa de WhatsApp</span>
            </div>
            <button
              type="button"
              className={styles.mockWhatsAppBtn}
              onClick={() => setMostrarMsgWhatsApp(!mostrarMsgWhatsApp)}
            >
              <span>💬 {mostrarMsgWhatsApp ? "Ocultar vista previa" : "Ver mensaje de WhatsApp"}</span>
            </button>
            {mostrarMsgWhatsApp && (
              <div className={styles.mockWhatsAppPreview}>
                {`*🧾 COMPROBANTE DE ATENCIÓN*\n🏢 *${negocioNombre}*\n🔖 Ticket N°: #00124\n----------------------------------------\n✅ *3x ${servicioEjemplo}*\n• Cantidad: 3\n• Precio unit.: S/ ${precioEjemplo}.00\n💰 Total Pagado: *S/ ${(precioEjemplo * 3).toFixed(2)}*\n💳 Método: Efectivo\n----------------------------------------\n¡Muchas gracias por su preferencia! 🙏✨`}
              </div>
            )}
          </div>
        ),
      });
    }

    // 6. Si Clientes y Vehículos está activo
    if (modulos.clientes) {
      lista.push({
        id: "clientes",
        icon: "🚘",
        title: "Clientes y Vehículos por Placa",
        description:
          "Lleva el historial completo de cada cliente. Registra la placa del auto, marca, modelo y teléfono para recordar qué aceite usa y cuándo le toca su próximo mantenimiento.",
        renderInteractive: () => (
          <div className={styles.interactiveBox}>
            <div className={styles.interactiveHint}>
              <span>👉 Ficha de Vehículo Inteligente</span>
            </div>
            <div className={styles.demoResultCard}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "14px", fontWeight: 800, color: "#1e293b", background: "#fef08a", padding: "2px 8px", borderRadius: "6px", border: "1px solid #eab308" }}>
                  🚗 ABC-123
                </span>
                <span style={{ fontSize: "12px", color: "#64748b" }}>Toyota Yaris 2021</span>
              </div>
              <div style={{ fontSize: "12px", color: "#334155", marginTop: "4px" }}>
                <strong>Cliente:</strong> Carlos Mendoza • <strong>Tel:</strong> 987 654 321
              </div>
              <div style={{ fontSize: "11.5px", color: "#0d9488", fontWeight: 600 }}>
                🛢️ Aceite habitual: Motul 10W-40 (Próx. cambio en 5,000 km)
              </div>
            </div>
          </div>
        ),
      });
    }

    // 7. Si SUNAT (RUS) está activo
    if (modulos.sunat) {
      lista.push({
        id: "sunat",
        icon: "🏛️",
        title: "Control de Compras SUNAT (Nuevo RUS)",
        description:
          "Registra formalmente las facturas y boletas de compra de mercadería para verificar tu cupo mensual tributario de compras y mantener tu negocio siempre al día.",
        renderInteractive: () => (
          <div className={styles.interactiveBox}>
            <div className={styles.interactiveHint}>
              <span>👉 Monitoreo de Límite Mensual RUS</span>
            </div>
            <div className={styles.demoResultCard}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px" }}>
                <span>Compras acumuladas del mes:</span>
                <strong>S/ 3,450.00</strong>
              </div>
              <div className={styles.demoSunatProgress}>
                <div className={styles.demoSunatFill} style={{ width: "69%" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#64748b" }}>
                <span>Tope Cat. 1: S/ 5,000</span>
                <span style={{ color: "#16a34a", fontWeight: 700 }}>✅ Dentro del límite</span>
              </div>
            </div>
          </div>
        ),
      });
    }

    // 8. Siempre: Modo Offline y Ayuda Permanente
    lista.push({
      id: "offline",
      icon: "📶",
      title: "Funciona Sin Conexión y Botón de Ayuda",
      description:
        "¡Tu negocio nunca se detiene! Si se corta el internet en el taller, la aplicación sigue cobrando y registrando ventas de forma offline y se sincroniza sola cuando vuelva la conexión.",
      renderInteractive: () => (
        <div className={styles.interactiveBox}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "28px" }}>💡</span>
            <div>
              <strong style={{ fontSize: "13px", color: "#0f172a" }}>
                ¿Quieres repasar este tutorial más adelante?
              </strong>
              <p style={{ fontSize: "12px", color: "var(--ink-soft)", margin: "2px 0 0 0" }}>
                En la barra superior siempre encontrarás el botón <strong>"Guía rápida"</strong> para volver a abrir este asistente en cualquier momento.
              </p>
            </div>
          </div>
        </div>
      ),
    });

    return lista;
  }, [
    negocioNombre,
    negocioTipo,
    esLlanteria,
    servicioEjemplo,
    precioEjemplo,
    modulos,
    accionSeleccionada,
    demoCantidad,
    demoCategoria,
    demoMarca,
    demoMedida,
    demoStockAgregado,
    demoVentaAnulada,
    mostrarMsgWhatsApp,
  ]);

  const totalPasos = steps.length;
  const pasoSeguro = Math.min(pasoActual, totalPasos - 1);
  const pasoInfo = steps[pasoSeguro];
  const progresoPct = ((pasoSeguro + 1) / totalPasos) * 100;

  // Manejar tecla Escape y flechas para navegar
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setPasoActual((p) => Math.min(totalPasos - 1, p + 1));
      if (e.key === "ArrowLeft") setPasoActual((p) => Math.max(0, p - 1));
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, totalPasos]);

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Tutorial dinámico del sistema"
    >
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        {/* Encabezado con contador y cerrar */}
        <div className={styles.header}>
          <div className={styles.stepBadge}>
            <SparklesIcon size={14} />
            <span>
              Paso {pasoSeguro + 1} de {totalPasos}
            </span>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Cerrar tutorial"
            title="Cerrar"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        {/* Barra de Progreso Superior */}
        <div
          className={styles.progressBarTrack}
          role="progressbar"
          aria-valuenow={progresoPct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className={styles.progressBarFill} style={{ width: `${progresoPct}%` }} />
        </div>

        {/* Contenido Dinámico del Paso */}
        <div>
          <div className={styles.stepIconWrap}>{pasoInfo.icon}</div>
          <h2 className={styles.title}>
            {pasoSeguro + 1}. {pasoInfo.title}
          </h2>
          <p className={styles.description}>{pasoInfo.description}</p>
          {pasoInfo.renderInteractive()}
        </div>

        {/* Pie de navegación con dots y botones */}
        <div className={styles.footer}>
          {/* Indicador de Dots */}
          <div className={styles.dots}>
            {steps.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`${styles.dot} ${i === pasoSeguro ? styles.dotActive : ""}`}
                onClick={() => setPasoActual(i)}
                aria-label={`Ir al paso ${i + 1}`}
              />
            ))}
          </div>

          <div className={styles.navBtns}>
            {pasoSeguro > 0 && (
              <button
                type="button"
                className={styles.btnBack}
                onClick={() => setPasoActual((p) => p - 1)}
              >
                ← Anterior
              </button>
            )}

            {pasoSeguro < totalPasos - 1 ? (
              <button
                type="button"
                className={styles.btnNext}
                onClick={() => setPasoActual((p) => p + 1)}
              >
                Siguiente →
              </button>
            ) : (
              <button
                type="button"
                className={`${styles.btnNext} ${styles.btnFinish}`}
                onClick={onClose}
              >
                <CheckIcon size={16} />
                <span>¡Empezar a usar la app!</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
