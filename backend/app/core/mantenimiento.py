"""Cálculo de próximo mantenimiento para el módulo de clientes/vehículos.

Por decisión de producto, el intervalo se cuenta solo por tiempo, nunca por
kilometraje: el próximo mantenimiento es la fecha del último servicio más
el intervalo en meses configurado para ese vehículo.
"""

import calendar
from datetime import date


def calcular_proximo_mantenimiento(
    fecha_ultimo_servicio: date | None, intervalo_meses: int | None
) -> date | None:
    """Suma `intervalo_meses` a `fecha_ultimo_servicio` sin desbordar el mes.

    Si falta cualquiera de los dos datos, no hay nada que calcular todavía
    (el vehículo puede registrarse sin agendar seguimiento).
    """
    if fecha_ultimo_servicio is None or intervalo_meses is None:
        return None

    mes_total = fecha_ultimo_servicio.month - 1 + intervalo_meses
    anio = fecha_ultimo_servicio.year + mes_total // 12
    mes = mes_total % 12 + 1
    # Si el día no existe en el mes destino (ej. 31 de enero + 1 mes),
    # cae en el último día de ese mes en vez de reventar.
    ultimo_dia_del_mes = calendar.monthrange(anio, mes)[1]
    dia = min(fecha_ultimo_servicio.day, ultimo_dia_del_mes)
    return date(anio, mes, dia)
