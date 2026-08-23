import { BoxIcon, CashIcon, HomeIcon, ReceiptIcon, UserIcon } from "../components/icons/Icons";
import type { NavItem } from "../components/AppShell";
import type { NegocioTipo } from "./negociosConfig";

/** Ítems de la barra de navegación (sidebar en escritorio, barra inferior
 * en móvil) para cada tipo de negocio. Stock/Compras/Clientes todavía no
 * tienen pantalla propia — llevan a un aviso de "en construcción" en vez
 * de un link roto. */
export function navItemsFor(tipo: NegocioTipo): NavItem[] {
  const base = `/${tipo}`;
  const comunes: NavItem[] = [
    { id: "inicio", label: "Inicio", icon: HomeIcon, to: base },
    { id: "caja", label: "Caja", icon: CashIcon, to: `${base}/cierre-caja` },
  ];

  if (tipo === "lubricentro") {
    return [
      comunes[0],
      { id: "clientes", label: "Clientes", icon: UserIcon, to: `${base}/clientes` },
      comunes[1],
    ];
  }

  return [
    comunes[0],
    { id: "stock", label: "Stock", icon: BoxIcon, to: `${base}/stock` },
    comunes[1],
    { id: "sunat", label: "SUNAT", icon: ReceiptIcon, to: `${base}/sunat` },
  ];
}
