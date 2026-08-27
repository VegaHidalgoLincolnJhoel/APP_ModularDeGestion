import { useNegocioDelTipo } from "../hooks/useNegocioDelTipo";
import { useClientesVehiculos, estaVencido, linkWhatsApp } from "../api/useClientesVehiculos";
import { EmptyState } from "../components/EmptyState";
import { AlertTriangleIcon, ChatIcon, UserIcon } from "../components/icons/Icons";
import styles from "./ClientesVehiculos.module.css";

export default function ClientesVehiculos() {
  const { negocio, loading: cargandoNegocio } = useNegocioDelTipo();
  const moduloActivo = Boolean(negocio?.modulos_activos.clientes_vehiculos);
  const { clientes, loading: cargandoClientes } = useClientesVehiculos(negocio?.id, moduloActivo);

  if (cargandoNegocio || !negocio) return null;

  const ordenados = [...clientes].sort((a, b) => Number(estaVencido(b)) - Number(estaVencido(a)));

  if (!moduloActivo) {
    return (
      <EmptyState
        icon={<AlertTriangleIcon size={22} />}
        title="Módulo de clientes no activo"
        message="Este negocio no tiene modulos_activos.clientes_vehiculos habilitado."
      />
    );
  }

  if (cargandoClientes) {
    return <p className={styles.muted}>Cargando…</p>;
  }

  if (ordenados.length === 0) {
    return (
      <EmptyState
        icon={<UserIcon size={22} />}
        title="Todavía no hay clientes con seguimiento"
        message="Se agregan al final de una atención, cuando el cliente quiere que le avisen del próximo mantenimiento."
      />
    );
  }

  return (
    <div className={styles.list}>
      {ordenados.map((cliente) => {
        const vencido = estaVencido(cliente);
        return (
          <div key={cliente.id} className={`${styles.card} ${vencido ? styles.cardVencido : ""}`}>
            <div className={styles.info}>
              <div className={styles.nombre}>{cliente.nombre_cliente}</div>
              <div className={styles.detalle}>
                {[cliente.placa, cliente.marca_vehiculo, cliente.modelo_vehiculo]
                  .filter(Boolean)
                  .join(" · ") || "Sin datos de vehículo"}
              </div>
              <div className={vencido ? styles.fechaVencida : styles.fecha}>
                {cliente.fecha_proximo_mantenimiento
                  ? `Próximo mantenimiento: ${cliente.fecha_proximo_mantenimiento}`
                  : "Sin fecha de próximo mantenimiento"}
              </div>
            </div>
            {cliente.telefono ? (
              <a
                className={styles.whatsapp}
                href={linkWhatsApp(
                  cliente.telefono,
                  `Hola ${cliente.nombre_cliente}, te escribimos de ${negocio.nombre} por el mantenimiento de tu vehículo.`,
                )}
                target="_blank"
                rel="noreferrer"
              >
                <ChatIcon size={16} />
                WhatsApp
              </a>
            ) : (
              <span className={styles.sinTelefono}>
                <AlertTriangleIcon size={14} />
                Sin teléfono
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
