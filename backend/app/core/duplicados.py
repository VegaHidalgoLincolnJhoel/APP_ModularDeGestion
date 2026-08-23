"""Regla transversal anti-duplicados de catálogo (ver CLAUDE.md raíz).

Antes de guardar un producto o servicio nuevo, se compara su nombre contra
los que ya existen en el mismo negocio, ignorando mayúsculas, espacios de
más y variaciones menores de escritura — así "Llanta 175/70 R13" y
"llanta  175/70 r13" no terminan siendo dos filas distintas por descuido.
"""

import re
from difflib import SequenceMatcher

# Umbral de similitud (0 a 1) a partir del cual dos nombres se consideran
# "parecidos" para efectos de la alerta. Ajustado a ojo: suficientemente
# alto para no molestar con falsos positivos entre productos distintos.
UMBRAL_SIMILITUD = 0.82


def normalizar_nombre(nombre: str) -> str:
    return re.sub(r"\s+", " ", nombre.strip().lower())


def son_parecidos(nombre_a: str, nombre_b: str) -> bool:
    a, b = normalizar_nombre(nombre_a), normalizar_nombre(nombre_b)
    if a == b:
        return True
    return SequenceMatcher(None, a, b).ratio() >= UMBRAL_SIMILITUD
