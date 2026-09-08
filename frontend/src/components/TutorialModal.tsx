import { useState, useEffect } from "react";
import { CloseIcon, SparklesIcon, CheckIcon } from "./icons/Icons";
import styles from "./TutorialModal.module.css";

interface TutorialModalProps {
  negocioNombre?: string;
  negocioTipo?: string;
  onClose: () => void;
}

export function TutorialModal({ negocioNombre = "tu negocio", negocioTipo = "taller", onClose }: TutorialModalProps) {
  const [pasoActual, setPasoActual] = useState(0);

  // Estados interactivos para las demostraciones dentro del tutorial
  const [accionSeleccionada, setAccionSeleccionada] = useState<string | null>(null);
  const [demoCantidad, setDemoCantidad] = useState(3);
  const [mostrarMsgWhatsApp, setMostrarMsgWhatsApp] = useState(false);
  const [demoVentaAnulada, setDemoVentaAnulada] = useState(false);

  const totalPasos = 6;
  const progresoPct = ((pasoActual + 1) / totalPasos) * 100;

  // Manejar tecla Escape para cerrar
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setPasoActual((p) => Math.min(totalPasos - 1, p + 1));
      if (e.key === "ArrowLeft") setPasoActual((p) => Math.max(0, p - 1));
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const esLlanteria = negocioTipo.includes("llant");
  const servicioEjemplo = esLlanteria ? "Parchado de Llanta" : "Cambio de Aceite";
  const precioEjemplo = esLlanteria ? 15 : 45;

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-label="Tutorial del sistema">
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        {/* Encabezado con contador y cerrar */}
        <div className={styles.header}>
          <div className={styles.stepBadge}>
            <SparklesIcon size={14} />
            <span>Paso {pasoActual + 1} de {totalPasos}</span>
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
        <div className={styles.progressBarTrack} role="progressbar" aria-valuenow={progresoPct} aria-valuemin={0} aria-valuemax={100}>
          <div className={styles.progressBarFill} style={{ width: `${progresoPct}%` }} />
        </div>

        {/* PASO 1: Inicio y Acciones Rápidas */}
        {pasoActual === 0 && (
          <div>
            <div className={styles.stepIconWrap}>⚡</div>
            <h2 className={styles.title}>1. Pantalla Principal y Acciones Rápidas</h2>
            <p className={styles.description}>
              Al entrar a <strong>{negocioNombre}</strong>, tienes en la pantalla de Inicio las acciones más comunes del taller listas para tocar y cobrar.
            </p>

            <div className={styles.interactiveBox}>
              <div className={styles.interactiveHint}>
                <span>👉 Prueba interactiva: Toca una opción</span>
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
                  <span className={styles.mockActionName}>🚗 {esLlanteria ? "Venta de Llanta" : "Filtro de Aceite"}</span>
                  <span className={styles.mockActionPrice}>S/ {esLlanteria ? "180.00" : "35.00"}</span>
                </button>
              </div>
              {accionSeleccionada && (
                <p style={{ fontSize: "12px", color: "#16a34a", fontWeight: 600, margin: "4px 0 0 0" }}>
                  ✅ ¡Exacto! Un solo toque y ya estás en la pantalla para cobrar esa atención.
                </p>
              )}
            </div>
          </div>
        )}

        {/* PASO 2: Cantidades y Precios */}
        {pasoActual === 1 && (
          <div>
            <div className={styles.stepIconWrap}>🔢</div>
            <h2 className={styles.title}>2. Ventas Múltiples y Precios Flexibles</h2>
            <p className={styles.description}>
              ¿El cliente necesita 2, 3 o 4 unidades? Usa los botones <strong>[−]</strong> y <strong>[+]</strong>. El total se calcula automáticamente, pero siempre puedes modificar el monto si acordaste una rebaja especial.
            </p>

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
                  <span className={styles.demoTotalVal}>S/ {(precioEjemplo * demoCantidad).toFixed(2)}</span>
                </div>
              </div>
              <p style={{ fontSize: "12px", color: "var(--ink-soft)", margin: "4px 0 0 0" }}>
                💡 En productos físicos, el sistema también calcula el capital a reponer para que tu ganancia sea 100% real.
              </p>
            </div>
          </div>
        )}

        {/* PASO 3: Tickets y WhatsApp */}
        {pasoActual === 2 && (
          <div>
            <div className={styles.stepIconWrap}>🧾</div>
            <h2 className={styles.title}>3. Tickets y Comprobante por WhatsApp</h2>
            <p className={styles.description}>
              Al finalizar cada venta, el sistema genera un comprobante formal con fecha, número de ticket y detalle. Puedes imprimirlo o mandarlo directamente al celular del cliente por WhatsApp.
            </p>

            <div className={styles.interactiveBox}>
              <div className={styles.interactiveHint}>
                <span>👉 Prueba interactiva: Toca el botón verde</span>
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
          </div>
        )}

        {/* PASO 4: Stock e Inventario */}
        {pasoActual === 3 && (
          <div>
            <div className={styles.stepIconWrap}>📦</div>
            <h2 className={styles.title}>4. Control de Stock y Servicios</h2>
            <p className={styles.description}>
              En la pestaña <strong>Stock</strong> puedes ver tus existencias, crear productos nuevos y editar tarifas. Cuando un producto se está agotando, verás una alerta para reponer a tiempo.
            </p>

            <div className={styles.interactiveBox}>
              <div className={styles.interactiveHint}>
                <span>👉 Vista previa de Stock Inteligente</span>
              </div>
              <div className={styles.demoStockRow}>
                <div className={styles.demoStockInfo}>
                  <strong style={{ fontSize: "13px" }}>{esLlanteria ? "Llanta 185/65 R15 - Michelin" : "Aceite Motul 10W-40"}</strong>
                  <span style={{ fontSize: "11.5px", color: "var(--ink-soft)" }}>Precio: S/ 180.00 • Costo: S/ 120.00</span>
                </div>
                <span className={styles.demoStockBadgeLow}>⚠️ Quedan 2 (Bajo mínimo)</span>
              </div>
              <p style={{ fontSize: "12px", color: "var(--ink-soft)", margin: "4px 0 0 0" }}>
                ✨ Desde aquí también puedes agregar mano de obra y servicios de taller para tener tu catálogo completo.
              </p>
            </div>
          </div>
        )}

        {/* PASO 5: Cierre de Caja y Anulaciones */}
        {pasoActual === 4 && (
          <div>
            <div className={styles.stepIconWrap}>💰</div>
            <h2 className={styles.title}>5. Cierre de Caja y Anular Pruebas</h2>
            <p className={styles.description}>
              En <strong>Cierre de caja</strong> tienes el resumen en vivo de cuánto entró en <strong>Efectivo</strong> vs <strong>Digital (Yape/Plin)</strong>. Si haces una venta de prueba o te equivocas, la anulas en 1 clic.
            </p>

            <div className={styles.interactiveBox}>
              <div className={styles.interactiveHint}>
                <span>👉 Prueba interactiva: Anula la venta de ejemplo</span>
              </div>
              {!demoVentaAnulada ? (
                <div className={styles.demoAnularRow}>
                  <div>
                    <strong style={{ fontSize: "13px" }}>3x {servicioEjemplo}</strong>
                    <div style={{ fontSize: "11px", color: "var(--ink-soft)" }}>Hoy 10:45 AM • Efectivo: S/ 45.00</div>
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
                  ✅ ¡Venta eliminada! La caja volvió a S/ 0.00 y se repuso el stock intacto.
                  <button
                    type="button"
                    style={{ marginLeft: "8px", background: "none", border: "none", color: "#2563eb", textDecoration: "underline", cursor: "pointer", fontSize: "11px" }}
                    onClick={() => setDemoVentaAnulada(false)}
                  >
                    Restaurar demo
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PASO 6: Modo Offline y Botón Permanente */}
        {pasoActual === 5 && (
          <div>
            <div className={styles.stepIconWrap}>📶</div>
            <h2 className={styles.title}>6. Trabaja Sin Internet y Botón de Ayuda</h2>
            <p className={styles.description}>
              ¡Nunca te detengas! Si se va la señal de internet en el taller, la aplicación sigue cobrando con normalidad y se sincroniza sola en cuanto regrese la conexión.
            </p>

            <div className={styles.interactiveBox}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "24px" }}>💡</span>
                <div>
                  <strong style={{ fontSize: "13px" }}>¿Quieres repasar este tutorial más adelante?</strong>
                  <p style={{ fontSize: "12px", color: "var(--ink-soft)", margin: "2px 0 0 0" }}>
                    En la barra superior siempre encontrarás el botón <strong>"Guía rápida"</strong> para volver a abrirlo en cualquier momento.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pie de navegación con dots y botones */}
        <div className={styles.footer}>
          {/* Indicador de Dots */}
          <div className={styles.dots}>
            {Array.from({ length: totalPasos }).map((_, i) => (
              <button
                key={i}
                type="button"
                className={`${styles.dot} ${i === pasoActual ? styles.dotActive : ""}`}
                onClick={() => setPasoActual(i)}
                aria-label={`Ir al paso ${i + 1}`}
              />
            ))}
          </div>

          <div className={styles.navBtns}>
            {pasoActual > 0 && (
              <button
                type="button"
                className={styles.btnBack}
                onClick={() => setPasoActual((p) => p - 1)}
              >
                ← Anterior
              </button>
            )}

            {pasoActual < totalPasos - 1 ? (
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
