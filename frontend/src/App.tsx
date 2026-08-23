import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Inicio from "./pages/Inicio";
import MovimientoFlow from "./pages/MovimientoFlow";
import CierreCaja from "./pages/CierreCaja";
import ClientesVehiculos from "./pages/ClientesVehiculos";
import Stock from "./pages/Stock";
import AjustarStock from "./pages/AjustarStock";
import RegistrarCompra from "./pages/RegistrarCompra";
import Proximamente from "./pages/Proximamente";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/llanteria" replace />} />
        <Route path="/negocios" element={<Dashboard />} />

        <Route path="/:negocioTipo" element={<Inicio />} />
        <Route path="/:negocioTipo/registrar/:accionId" element={<MovimientoFlow />} />
        <Route path="/:negocioTipo/cierre-caja" element={<CierreCaja />} />
        <Route path="/:negocioTipo/stock" element={<Stock />} />
        <Route path="/:negocioTipo/stock/ajustar/:productoId" element={<AjustarStock />} />
        <Route path="/:negocioTipo/stock/comprar/:productoId" element={<RegistrarCompra />} />
        <Route path="/:negocioTipo/compras" element={<Proximamente activeId="compras" titulo="Compras" />} />
        <Route path="/:negocioTipo/sunat" element={<Proximamente activeId="sunat" titulo="SUNAT" />} />
        <Route path="/:negocioTipo/clientes" element={<ClientesVehiculos />} />
      </Routes>
    </BrowserRouter>
  );
}
