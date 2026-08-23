// Esto es configuración de PANTALLA (íconos, etiquetas, a qué clasificación
// de producto corresponde cada acción rápida) — no datos de negocio. Los
// productos, precios y stock reales siempre vienen de la API; acá solo se
// decide cómo se ve y cómo se agrupa cada rubro. Agregar un tercer negocio
// (otro rubro) es sumar una entrada más a este objeto, no tocar ninguna
// pantalla.

import type { IconProps } from "../components/icons/Icons";
import {
  FilterIcon,
  GaugeIcon,
  NutIcon,
  OilDropIcon,
  SprayIcon,
  TireIcon,
  TubeIcon,
  WrenchIcon,
} from "../components/icons/Icons";

export interface AccionRapida {
  id: string;
  label: string;
  icon: (props: IconProps) => JSX.Element;
  clasificacion: "servicio" | "producto";
  /** Solo "venta de llanta" agrupa por medida antes de mostrar marcas —
   * ver MovimientoFlow. */
  agruparPorMedida?: boolean;
}

export interface NegocioTipoConfig {
  /** Debe calzar exacto (case-insensitive) con Negocio.rubro en la API —
   * ver useNegocio. */
  rubro: string;
  nombreFallback: string;
  saludoFallback: string;
  logo: (props: IconProps) => JSX.Element;
  servicios: AccionRapida[];
  productos: AccionRapida[];
  /** Con qué módulos opcionales arranca el negocio de prueba — ver
   * useNegocio. En producción esto lo decide quien instala la app, no el
   * frontend; acá es solo el valor por defecto de la semilla de prueba. */
  modulosActivosDefault: Record<string, boolean>;
  moduloRusActivoDefault: boolean;
}

export const NEGOCIOS_CONFIG = {
  llanteria: {
    rubro: "llantería",
    nombreFallback: "Llantería",
    saludoFallback: "Hola",
    logo: TireIcon,
    servicios: [
      { id: "parchado", label: "Parchado", icon: WrenchIcon, clasificacion: "servicio" },
      { id: "inflado", label: "Inflado", icon: GaugeIcon, clasificacion: "servicio" },
    ],
    productos: [
      {
        id: "venta-llanta",
        label: "Venta de llanta",
        icon: TireIcon,
        clasificacion: "producto",
        agruparPorMedida: true,
      },
      { id: "accesorio", label: "Accesorio", icon: NutIcon, clasificacion: "producto" },
    ],
    modulosActivosDefault: {},
    // El papá (dueño de la llantería) es justo el caso RUS del spec —
    // negocio chico, régimen simplificado.
    moduloRusActivoDefault: true,
  },
  lubricentro: {
    rubro: "lubricentro",
    nombreFallback: "Lubricentro",
    saludoFallback: "Hola",
    logo: OilDropIcon,
    servicios: [
      { id: "cambio-aceite", label: "Cambio de aceite", icon: OilDropIcon, clasificacion: "servicio" },
      { id: "lavado-motor", label: "Lavado de motor", icon: SprayIcon, clasificacion: "servicio" },
    ],
    productos: [
      { id: "filtro-aire", label: "Filtro de aire", icon: FilterIcon, clasificacion: "producto" },
      { id: "silicona", label: "Silicona", icon: TubeIcon, clasificacion: "producto" },
    ],
    modulosActivosDefault: { clientes_vehiculos: true },
    moduloRusActivoDefault: false,
  },
} as const satisfies Record<string, NegocioTipoConfig>;

export type NegocioTipo = keyof typeof NEGOCIOS_CONFIG;

export function esNegocioTipo(valor: string | undefined): valor is NegocioTipo {
  return valor !== undefined && valor in NEGOCIOS_CONFIG;
}

export function buscarAccion(tipo: NegocioTipo, accionId: string): AccionRapida | undefined {
  const config = NEGOCIOS_CONFIG[tipo];
  return [...config.servicios, ...config.productos].find((a) => a.id === accionId);
}
