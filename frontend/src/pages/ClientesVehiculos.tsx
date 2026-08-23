import { Navigate, useNavigate } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { useNegocioDelTipo } from "../hooks/useNegocioDelTipo";
import { useClientesVehiculos, estaVencido, linkWhatsApp } from "../api/useClientesVehiculos";
import { navItemsFor } from "../data/navigation";
import { AlertTriangleIcon, ChatIcon, UserIcon } from "../components/icons/Icons";
import styles from "./ClientesVehiculos.module.css";

export default function ClientesVehiculos() {
  const navigate = useNavigate();
  const { tipo, tipoValido, config, negocio, loading: cargandoNegocio } = useNegocioDelTipo();
  const moduloActivo = Boolean(negocio?.modulos_activos.clientes_vehiculos);
  const { clientes, loading: cargandoClientes } = useClientesVehiculos(negocio?.id, moduloActivo);

  if (!tipoValido) return <Navigate to="/llanteria" replace />;
  if (cargandoNegocio) return null;

  const ordenados = [...clientes].sort((a, b) => Number(estaVencido(b)) - Number(estaVencido(a)));

  return (
    <AppShell
      logo={<config.logo size={20} />}
      negocioNombre={negocio?.nombre ?? config.nombreFallback}
      saludo="Clientes"
      navItems={navItemsFor(tipo)}
      activeId="clientes"
    >
      {!negocio ? (
        <EmptyState
          icon={<config.logo size={24} />}
          title="Todavía no hay negocio registrado"
          message="Volvé a Inicio para crear el negocio de prueba."
          action={<Button onClick={() => navigate(`/${tipo}`)}>Volver a Inicio</Button>}
        />
      ) : !moduloActivo ? (
        <EmptyState
          icon={<AlertTriangleIcon size={22} />}
          title="Módulo de clientes no activo"
          message="Este negocio no tiene modulos_activos.clientes_vehiculos habilitado."
        />
      ) : cargandoClientes ? (
        <p className={styles.muted}>Cargando…</p>
      ) : ordenados.length === 0 ? (
        <EmptyState
          icon={<UserIcon size={22} />}
          title="Todavía no hay clientes con seguimiento"
          message="Se agregan al final de una atención, cuando el cliente quiere que le avisen del próximo mantenimiento."
        />
      ) : (
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
      )}
    </AppShell>
  );
}
