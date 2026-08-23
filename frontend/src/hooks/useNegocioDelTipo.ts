import { useParams } from "react-router-dom";
import { useNegocio } from "../api/useNegocio";
import { NEGOCIOS_CONFIG, esNegocioTipo, type NegocioTipo } from "../data/negociosConfig";

/**
 * Resuelve el tipo de negocio a partir de `:negocioTipo` en la ruta y trae
 * el negocio real correspondiente. `tipoValido` distingue una ruta con un
 * tipo inexistente (el caller decide qué hacer, normalmente redirigir) de
 * un tipo válido que simplemente no tiene negocio creado todavía.
 */
export function useNegocioDelTipo() {
  const { negocioTipo } = useParams<{ negocioTipo: string }>();
  const tipoValido = esNegocioTipo(negocioTipo);
  const tipo: NegocioTipo = tipoValido ? negocioTipo : "llanteria";
  const config = NEGOCIOS_CONFIG[tipo];

  const negocioState = useNegocio(config.rubro, {
    nombre: config.nombreFallback,
    modulos_activos: config.modulosActivosDefault,
    plan_estado: "activo",
    fecha_ultimo_pago: null,
    link_sunat: null,
    modulo_rus_activo: false,
  });

  return { tipo, tipoValido, config, ...negocioState };
}
