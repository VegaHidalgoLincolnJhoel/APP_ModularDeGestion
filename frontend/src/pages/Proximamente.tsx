import { Navigate, useNavigate } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { useNegocioDelTipo } from "../hooks/useNegocioDelTipo";
import { navItemsFor } from "../data/navigation";
import { SettingsIcon } from "../components/icons/Icons";

export default function Proximamente({ activeId, titulo }: { activeId: string; titulo: string }) {
  const navigate = useNavigate();
  const { tipo, tipoValido, config, negocio } = useNegocioDelTipo();

  if (!tipoValido) return <Navigate to="/llanteria" replace />;

  return (
    <AppShell
      logo={<config.logo size={20} />}
      negocioNombre={negocio?.nombre ?? config.nombreFallback}
      saludo={titulo}
      navItems={navItemsFor(tipo)}
      activeId={activeId}
    >
      <EmptyState
        icon={<SettingsIcon size={22} />}
        title={`${titulo} está en construcción`}
        message="Esta sección todavía no tiene pantalla propia."
        action={<Button onClick={() => navigate(`/${tipo}`)}>Volver a Inicio</Button>}
      />
    </AppShell>
  );
}
