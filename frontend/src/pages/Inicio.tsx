import { useNavigate } from "react-router-dom";
import { ActionCard } from "../components/ActionCard";
import { AlertBanner } from "../components/AlertBanner";
import { Button } from "../components/Button";
import { useProductos } from "../api/useProductos";
import { useClientesVehiculos, estaVencido } from "../api/useClientesVehiculos";
import { useNegocioDelTipo } from "../hooks/useNegocioDelTipo";
import { esCapital } from "../lib/contabilidad";
import { formatMoney } from "../lib/format";
import { BoxIcon, PlusIcon } from "../components/icons/Icons";
import styles from "./Inicio.module.css";

export default function Inicio() {
  const navigate = useNavigate();
  const { tipo, config, negocio, loading } = useNegocioDelTipo();
  const { productos } = useProductos(negocio?.id);
  const moduloClientesActivo = Boolean(negocio?.modulos_activos.clientes_vehiculos);
  const { clientes } = useClientesVehiculos(negocio?.id, moduloClientesActivo);

  if (loading || !negocio) return null;

  const productoBajoMinimo = productos.find(
    (p) => p.activo && p.stock_actual < p.stock_minimo,
  );
  const vencidos = clientes.filter(estaVencido);

  const serviciosRegistrados = productos.filter(
    (p) => p.activo && !esCapital(p.clasificacion),
  );
  const productosEnStock = productos.filter(
    (p) => p.activo && esCapital(p.clasificacion),
  );

  return (
    <>
      {vencidos.length > 0 && (
        <AlertBanner
          id="mantenimientos-vencidos"
          title={`${vencidos.length} mantenimiento${vencidos.length > 1 ? "s" : ""} vencido${vencidos.length > 1 ? "s" : ""}`}
          message="Clientes que ya deberían haber vuelto para su próximo servicio."
          action={
            <Button variant="accent" onClick={() => navigate(`/${tipo}/clientes`)}>
              Ver clientes
            </Button>
          }
        />
      )}

      {productoBajoMinimo && (
        <AlertBanner
          id={`stock-bajo-${productoBajoMinimo.id}`}
          title={`Stock bajo · ${productoBajoMinimo.nombre}`}
          message={`Quedan ${productoBajoMinimo.stock_actual} unidades — el mínimo es ${productoBajoMinimo.stock_minimo}.`}
          action={
            <Button
              variant="accent"
              onClick={() =>
                navigate(`/${tipo}/stock/ajustar/${productoBajoMinimo.id}`)
              }
            >
              Reponer stock
            </Button>
          }
        />
      )}

      {/* 1. Acciones Rápidas - Servicios */}
      <section>
        <h2 className={styles.sectionLabel}>
          <span className={`${styles.dot} ${styles.dotServicio}`} />
          Acciones Rápidas de Servicio
        </h2>
        <div className={styles.grid}>
          {config.servicios.map((accion) => (
            <ActionCard
              key={accion.id}
              icon={accion.icon}
              label={accion.label}
              tone="servicio"
              onClick={() => navigate(`/${tipo}/registrar/${accion.id}`)}
            />
          ))}
        </div>
      </section>

      {/* 2. Acciones Rápidas - Productos / Ventas */}
      <section style={{ marginTop: "20px" }}>
        <h2 className={styles.sectionLabel}>
          <span className={`${styles.dot} ${styles.dotProducto}`} />
          Acciones Rápidas de Venta
        </h2>
        <div className={styles.grid}>
          {config.productos.map((accion) => (
            <ActionCard
              key={accion.id}
              icon={accion.icon}
              label={accion.label}
              tone="producto"
              onClick={() => navigate(`/${tipo}/registrar/${accion.id}`)}
            />
          ))}
        </div>
      </section>

      {/* 3. Catálogo Dinámico Registrado */}
      {(serviciosRegistrados.length > 0 || productosEnStock.length > 0) && (
        <section className={styles.catalogSection}>
          <div className={styles.catalogHeader}>
            <h2 className={styles.sectionLabel} style={{ margin: 0 }}>
              <span className={`${styles.dot} ${styles.dotCatalogo}`} />
              Catálogo Registrado ({productos.filter((p) => p.activo).length} ítems)
            </h2>
          </div>

          <div className={styles.catalogGrid}>
            {serviciosRegistrados.slice(0, 4).map((serv) => (
              <div
                key={serv.id}
                className={styles.catalogCard}
                onClick={() => navigate(`/${tipo}/stock`)}
                title="Ver detalles en Stock"
              >
                <span className={styles.catalogCardName}>{serv.nombre}</span>
                <span className={styles.catalogCardSub}>Mano de obra</span>
                <div className={styles.catalogCardFooter}>
                  <span className={styles.catalogCardPrice}>
                    {formatMoney(serv.precio_lista)}
                  </span>
                  <span className={styles.catalogBadgeStock}>Servicio</span>
                </div>
              </div>
            ))}

            {productosEnStock.slice(0, 4).map((prod) => {
              const bajo = prod.stock_actual < prod.stock_minimo;
              return (
                <div
                  key={prod.id}
                  className={styles.catalogCard}
                  onClick={() => navigate(`/${tipo}/stock`)}
                  title="Ver en Stock"
                >
                  <span className={styles.catalogCardName}>{prod.nombre}</span>
                  <span className={styles.catalogCardSub}>
                    {[prod.marca, prod.medida].filter(Boolean).join(" · ") ||
                      "Producto físico"}
                  </span>
                  <div className={styles.catalogCardFooter}>
                    <span className={styles.catalogCardPrice}>
                      {formatMoney(prod.precio_lista)}
                    </span>
                    <span
                      className={
                        bajo ? styles.catalogBadgeLow : styles.catalogBadgeStock
                      }
                    >
                      {prod.stock_actual} en stock
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Botones de acción inferior */}
      <div className={styles.bottomActions}>
        <button
          type="button"
          className={styles.addCatalogBtn}
          onClick={() => navigate(`/${tipo}/stock`)}
        >
          <PlusIcon size={16} />
          <span>+ Nuevo Producto / Servicio</span>
        </button>

        <button
          type="button"
          className={styles.quickLink}
          onClick={() => navigate(`/${tipo}/stock`)}
        >
          <BoxIcon size={18} />
          <span>Ver stock completo ({productosEnStock.length})</span>
        </button>
      </div>
    </>
  );
}
