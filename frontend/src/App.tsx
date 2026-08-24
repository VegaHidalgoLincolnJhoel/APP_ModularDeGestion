import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { useDestinoSesion } from "./hooks/useDestinoSesion";
import { RequireAuth } from "./components/RequireAuth";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Inicio from "./pages/Inicio";
import MovimientoFlow from "./pages/MovimientoFlow";
import CierreCaja from "./pages/CierreCaja";
import ClientesVehiculos from "./pages/ClientesVehiculos";
import Stock from "./pages/Stock";
import AjustarStock from "./pages/AjustarStock";
import RegistrarCompra from "./pages/RegistrarCompra";
import Sunat from "./pages/Sunat";
import Compras from "./pages/Compras";

/** "/" no es una pantalla propia — solo decide a dónde mandar a quien ya
 * está logueado (admin al panel, un negocio a su propio Inicio). Vive
 * detrás de RequireAuth, así que acá `session` nunca es null. */
function RaizRedirect() {
  const { session } = useAuth();
  const { destino, loading } = useDestinoSesion(session);
  if (loading || !destino) return null;
  return <Navigate to={destino} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<RequireAuth><Outlet /></RequireAuth>}>
            <Route path="/" element={<RaizRedirect />} />
            <Route path="/negocios" element={<Dashboard />} />

            <Route path="/:negocioTipo" element={<Inicio />} />
            <Route path="/:negocioTipo/registrar/:accionId" element={<MovimientoFlow />} />
            <Route path="/:negocioTipo/cierre-caja" element={<CierreCaja />} />
            <Route path="/:negocioTipo/stock" element={<Stock />} />
            <Route path="/:negocioTipo/stock/ajustar/:productoId" element={<AjustarStock />} />
            <Route path="/:negocioTipo/stock/comprar/:productoId" element={<RegistrarCompra />} />
            <Route path="/:negocioTipo/sunat" element={<Sunat />} />
            <Route path="/:negocioTipo/compras" element={<Compras />} />
            <Route path="/:negocioTipo/clientes" element={<ClientesVehiculos />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
