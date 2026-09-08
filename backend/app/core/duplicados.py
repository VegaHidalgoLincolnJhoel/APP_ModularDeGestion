"""Regla transversal anti-duplicados de catálogo (ver CLAUDE.md raíz).

Antes de guardar un producto o servicio nuevo, se compara su nombre contra
los que ya existen en el mismo negocio, ignorando mayúsculas, espacios de
más y variaciones menores de escritura — así "Llanta 175/70 R13" y
"llanta  175/70 r13" no terminan siendo dos filas distintas por descuido.
"""

import re
from difflib import SequenceMatcher

# Umbral de similitud (0 a 1) a partir del cual dos nombres se consideran
# "parecidos" para efectos de la alerta.
UMBRAL_SIMILITUD = 0.82

TAMANOS_CONTRASTANTES = {"chico", "mediano", "grande", "pequeno", "pequeño", "mini", "extra"}


def normalizar_nombre(nombre: str) -> str:
    return re.sub(r"\s+", " ", nombre.strip().lower())


def son_parecidos(
    nombre_a: str,
    nombre_b: str,
    medida_a: str | None = None,
    medida_b: str | None = None,
    marca_a: str | None = None,
    marca_b: str | None = None,
) -> bool:
    # 1. Si ambas medidas están definidas y son diferentes, NO son duplicados
    if medida_a and medida_b:
        if normalizar_nombre(medida_a) != normalizar_nombre(medida_b):
            return False

    # 2. Si ambas marcas están definidas y son diferentes, NO son duplicados
    if marca_a and marca_b:
        if normalizar_nombre(marca_a) != normalizar_nombre(marca_b):
            return False

    a, b = normalizar_nombre(nombre_a), normalizar_nombre(nombre_b)
    if a == b:
        return True

    # 3. Diferencia en código o número final (ej. "00" vs "01", "rac10" vs "rac12")
    m_a = re.search(r"(?:[\s\-_/]+|^)([a-z0-9]+)\s*$", a)
    m_b = re.search(r"(?:[\s\-_/]+|^)([a-z0-9]+)\s*$", b)
    if m_a and m_b:
        code_a, code_b = m_a.group(1), m_b.group(1)
        if code_a != code_b and (code_a.isalnum() and code_b.isalnum()):
            if any(c.isdigit() for c in code_a) or any(c.isdigit() for c in code_b):
                return False

    # 4. Diferencia en términos de tamaño explícitos (ej. "chico" vs "mediano")
    palabras_a = set(re.findall(r"\b[a-záéíóúñ]+\b", a)) & TAMANOS_CONTRASTANTES
    palabras_b = set(re.findall(r"\b[a-záéíóúñ]+\b", b)) & TAMANOS_CONTRASTANTES
    if palabras_a and palabras_b and palabras_a != palabras_b:
        return False

    return SequenceMatcher(None, a, b).ratio() >= UMBRAL_SIMILITUD
