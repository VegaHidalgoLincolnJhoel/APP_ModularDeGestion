import type { Producto } from "../api/client";

export type SubcategoriaServicio =
  | "parchados"
  | "balanceo"
  | "enllante"
  | "inflado"
  | "otros";

export type SubcategoriaProducto =
  | "parches_insumos"
  | "llantas"
  | "aceites"
  | "aditivos"
  | "accesorios"
  | "otros";

export interface InfoCategoriaVisual {
  id: string;
  label: string;
  emoji: string;
  descripcion: string;
}

export const CATEGORIAS_SERVICIOS_INFO: Record<SubcategoriaServicio, InfoCategoriaVisual> = {
  parchados: {
    id: "parchados",
    label: "Parchados y Vulcanizado",
    emoji: "🛠️",
    descripcion: "Parchado frío, vulcanizado caliente, cámaras y mechas",
  },
  balanceo: {
    id: "balanceo",
    label: "Balanceo y Alineación",
    emoji: "⚖️",
    descripcion: "Balanceo de llanta por rueda, plomos y alineamiento",
  },
  enllante: {
    id: "enllante",
    label: "Enllante y Montaje",
    emoji: "🔧",
    descripcion: "Montaje, desllante, bajada/subida y rotación de ruedas",
  },
  inflado: {
    id: "inflado",
    label: "Inflado y Presión",
    emoji: "💨",
    descripcion: "Calibración de aire y nitrógeno para neumáticos",
  },
  otros: {
    id: "otros",
    label: "Otros Servicios",
    emoji: "⚙️",
    descripcion: "Mano de obra y servicios generales",
  },
};

export const CATEGORIAS_PRODUCTOS_INFO: Record<SubcategoriaProducto, InfoCategoriaVisual> = {
  parches_insumos: {
    id: "parches_insumos",
    label: "Parches e Insumos",
    emoji: "📦",
    descripcion: "Cajas de parches, cámaras, cemento, válvulas y mechas",
  },
  llantas: {
    id: "llantas",
    label: "Llantas / Neumáticos",
    emoji: "🛞",
    descripcion: "Neumáticos nuevos y de segunda por aro y medida",
  },
  aceites: {
    id: "aceites",
    label: "Aceites y Lubricantes",
    emoji: "🛢️",
    descripcion: "Aceites de motor, transmisión y refrigerantes",
  },
  aditivos: {
    id: "aditivos",
    label: "Aditivos y Químicos",
    emoji: "🧴",
    descripcion: "Líquidos de freno, sprays, siliconas y aditivos",
  },
  accesorios: {
    id: "accesorios",
    label: "Accesorios y Repuestos",
    emoji: "🔩",
    descripcion: "Filtros, tuercas, pernos, plumillas y repuestos",
  },
  otros: {
    id: "otros",
    label: "Otros Productos",
    emoji: "📦",
    descripcion: "Artículos e insumos de inventario general",
  },
};

/**
 * Clasifica un servicio de forma precisa según su nombre y especificación.
 */
export function clasificarServicio(p: Producto): SubcategoriaServicio {
  const nom = (p.nombre || "").toLowerCase();
  const med = (p.medida || "").toLowerCase();
  const combo = `${nom} ${med}`;

  if (
    combo.includes("balanceo") ||
    combo.includes("alinea") ||
    combo.includes("plomo")
  ) {
    return "balanceo";
  }

  if (
    combo.includes("enllante") ||
    combo.includes("desenllante") ||
    combo.includes("desllante") ||
    combo.includes("rotacion") ||
    combo.includes("rotación") ||
    combo.includes("bajada y subida") ||
    combo.includes("montaje")
  ) {
    return "enllante";
  }

  if (
    combo.includes("inflado") ||
    combo.includes("calibrac") ||
    combo.includes("nitrogeno") ||
    combo.includes("nitrógeno") ||
    combo.includes("presion") ||
    combo.includes("presión")
  ) {
    return "inflado";
  }

  if (
    combo.includes("parche") ||
    combo.includes("parchado") ||
    combo.includes("vulcaniz") ||
    combo.includes("camara") ||
    combo.includes("cámara") ||
    combo.includes("tarugo") ||
    combo.includes("mecha") ||
    combo.includes("frio") ||
    combo.includes("frío") ||
    combo.includes("caliente") ||
    combo.includes("rac ") ||
    combo.includes("rac-") ||
    combo.includes("vd-")
  ) {
    return "parchados";
  }

  return "otros";
}

/**
 * Clasifica un producto físico (capital/inventario) según su categoría real.
 */
export function clasificarProductoFisico(p: Producto): SubcategoriaProducto {
  const nom = (p.nombre || "").toLowerCase();
  const med = (p.medida || "").toUpperCase();
  const combo = `${nom} ${med}`.toLowerCase();

  if (
    med.includes("R1") ||
    med.includes("R2") ||
    combo.includes("llanta") ||
    combo.includes("neumat")
  ) {
    return "llantas";
  }

  if (
    combo.includes("aceite") ||
    combo.includes("lubric") ||
    med.includes("W-") ||
    med.includes("SAE")
  ) {
    return "aceites";
  }

  if (
    combo.includes("parche") ||
    combo.includes("camara") ||
    combo.includes("cámara") ||
    combo.includes("valvula") ||
    combo.includes("válvula") ||
    combo.includes("piton") ||
    combo.includes("pitón") ||
    combo.includes("cemento") ||
    combo.includes("tarugo") ||
    combo.includes("mecha") ||
    combo.includes("vipal") ||
    combo.includes("tiptop") ||
    combo.includes("rac ") ||
    combo.includes("vd-")
  ) {
    return "parches_insumos";
  }

  if (
    combo.includes("refrigerante") ||
    combo.includes("coolant") ||
    combo.includes("freno") ||
    combo.includes("aditivo") ||
    combo.includes("silicona") ||
    combo.includes("spray") ||
    combo.includes("wd-40") ||
    combo.includes("desengrasante") ||
    combo.includes("bateria") ||
    combo.includes("batería")
  ) {
    return "aditivos";
  }

  if (
    combo.includes("filtro") ||
    combo.includes("plumilla") ||
    combo.includes("tuerca") ||
    combo.includes("perno") ||
    combo.includes("tapa") ||
    combo.includes("repuesto") ||
    combo.includes("accesorio")
  ) {
    return "accesorios";
  }

  return "otros";
}

/**
 * Calcula un puntaje de ordenamiento estricto "de menos a más" para parches:
 * 00 (chico) -> 01 (mediano) -> 02 (grande) -> 03 -> 04 -> RAC 10 -> RAC 12 -> ...
 */
export function obtenerRangoOrdenParche(p: Producto): number {
  const nom = (p.nombre || "").toLowerCase();
  const med = (p.medida || "").toLowerCase();
  const texto = `${nom} ${med}`;

  // 1. Códigos estándar de 2 dígitos (00, 01, 02, 03, 04, 05, etc.) o palabras chico/mediano/grande
  if (
    /(?:^|[\s\-_/])00(?:$|[\s\-_/])/.test(texto) ||
    (texto.includes("chico") && !/(?:^|[\s\-_/])0[1-9]/.test(texto))
  ) {
    return 10;
  }
  if (
    /(?:^|[\s\-_/])01(?:$|[\s\-_/])/.test(texto) ||
    (texto.includes("mediano") && !/(?:^|[\s\-_/])0[2-9]/.test(texto))
  ) {
    return 20;
  }
  if (
    /(?:^|[\s\-_/])02(?:$|[\s\-_/])/.test(texto) ||
    (texto.includes("grande") && !/(?:^|[\s\-_/])0[3-9]/.test(texto))
  ) {
    return 30;
  }
  if (/(?:^|[\s\-_/])03(?:$|[\s\-_/])/.test(texto)) return 40;
  if (/(?:^|[\s\-_/])04(?:$|[\s\-_/])/.test(texto)) return 50;
  if (/(?:^|[\s\-_/])05(?:$|[\s\-_/])/.test(texto)) return 60;
  if (/(?:^|[\s\-_/])06(?:$|[\s\-_/])/.test(texto)) return 70;

  // 2. Parches Radiales (RAC 10, RAC 12, RAC 14, RAC 20, etc.)
  const matchRac = texto.match(/\brac\s*(\d+)/i) || texto.match(/\bradial\s*(\d+)/i);
  if (matchRac) {
    const num = parseInt(matchRac[1], 10);
    return 1000 + num;
  }

  // 3. Parches diagonales VD (VD-1, VD-2, VD-3, etc.)
  const matchVd = texto.match(/\bvd-?\s*(\d+)/i);
  if (matchVd) {
    const num = parseInt(matchVd[1], 10);
    return 2000 + num;
  }

  // 4. Mechas o tarugos
  if (texto.includes("mecha") || texto.includes("tarugo")) {
    return 3000;
  }

  // 5. Cámaras por aro (Aro 13, 14, 15, 16, etc.)
  const matchAro = texto.match(/aro\s*(\d+)/i) || texto.match(/r(\d{2})/i);
  if (texto.includes("camara") || texto.includes("cámara")) {
    const aro = matchAro ? parseInt(matchAro[1], 10) : 0;
    return 4000 + aro;
  }

  // 6. Válvulas y pitones
  if (
    texto.includes("valvula") ||
    texto.includes("válvula") ||
    texto.includes("piton") ||
    texto.includes("pitón")
  ) {
    const matchTr = texto.match(/tr\s*(\d+)/i);
    return 5000 + (matchTr ? parseInt(matchTr[1], 10) : 0);
  }

  // 7. Cemento vulcanizante y pegamentos
  if (texto.includes("cemento")) {
    return 6000;
  }

  // 8. Cualquier número final que indique tamaño progresivo
  const matchFin = texto.match(/(\d+)\s*$/);
  if (matchFin) {
    return 7000 + parseInt(matchFin[1], 10);
  }

  return 8000;
}

/**
 * Ordena una lista de productos dentro de su categoría específica:
 * - Parches: orden estricto de menor a mayor (00 -> 01 -> 02 -> RAC 10 -> RAC 12 -> VD-1 -> Tarugos).
 * - Balanceo: ordenado por precio ascendente y nombre.
 * - Llantas: ordenado por aro (13 < 14 < 15...), luego medida y marca.
 * - Demás categorías: ordenados por precio ascendente y nombre.
 */
export function ordenarProductosDeCategoria(
  items: Producto[],
  categoriaId: string,
): Producto[] {
  return [...items].sort((a, b) => {
    if (categoriaId === "parchados" || categoriaId === "parches_insumos") {
      const rangoA = obtenerRangoOrdenParche(a);
      const rangoB = obtenerRangoOrdenParche(b);
      if (rangoA !== rangoB) {
        return rangoA - rangoB;
      }
      return a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" });
    }

    if (categoriaId === "llantas") {
      // Ordenar por número de aro (ej: R13 < R14 < R15)
      const aroA = parseInt(a.medida?.match(/R(\d+)/i)?.[1] ?? "0", 10);
      const aroB = parseInt(b.medida?.match(/R(\d+)/i)?.[1] ?? "0", 10);
      if (aroA !== aroB) return aroA - aroB;
      const medA = a.medida ?? "";
      const medB = b.medida ?? "";
      if (medA !== medB) return medA.localeCompare(medB, "es", { numeric: true });
      return (a.marca ?? "").localeCompare(b.marca ?? "", "es", { sensitivity: "base" });
    }

    // Para balanceo, enllante, aceites y otros: ordenar por precio de lista ascendente (menor a mayor precio)
    const precioA = Number(a.precio_lista) || 0;
    const precioB = Number(b.precio_lista) || 0;
    if (precioA !== precioB) {
      return precioA - precioB;
    }

    return a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" });
  });
}
