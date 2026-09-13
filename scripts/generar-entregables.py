# -*- coding: utf-8 -*-
"""Genera los PDFs de entrega del brief (Entropy Hack 2026). Sin datos de sandbox."""
from __future__ import annotations
import re
from collections import Counter
from pathlib import Path
import pymupdf

ROOT = Path(r"C:\Users\JoseSantiagoMerinoHe\Desktop\ECONNECT-entregables")
OUT = ROOT / "docs" / "entregables"
FONT = r"C:\Windows\Fonts\arial.ttf"
FONTB = r"C:\Windows\Fonts\arialbd.ttf"

NAVY = (0.08, 0.31, 0.51)
INK = (0.12, 0.14, 0.16)
MUTED = (0.40, 0.44, 0.48)
LINE = (0.82, 0.85, 0.88)
CARD = (0.97, 0.98, 0.99)
GREEN = (0.02, 0.52, 0.38)
AMBER = (0.78, 0.42, 0.02)
VIOLET = (0.42, 0.22, 0.78)
WHITE = (1, 1, 1)

AGENTES = [
    "Licitaciones",
    "Gerencia de Proyecto",
    "Gerencia de Logística y Equipo",
    "Operadores de Equipos",
    "Gerencia de Mantenimiento",
    "Control de Costos",
]
AG_SHORT = ["Licit.", "Proyecto", "Logística", "Operadores", "Mantenim.", "Costos"]


def _fila(modulo, prisma, startrack, rel, critico, confianza):
    return {
        "modulo": modulo or "",
        "prisma": prisma,
        "startrack": startrack,
        "rel": rel,
        "critico": critico,
        "confianza": confianza or "",
    }


def parse_matriz(text: str):
    marca = (
        "  {\n    modulo: 'Maquinaria',\n"
        "    campoPrisma: '%s (nombre exacto de columna no confirmado)',\n"
        "    campoStartrack: '%s (módulo Vehículos)',\n"
        "    tipoRelacion: 'exacta',\n    confianza: 'media',\n    critico: false,\n  },"
    )
    text = re.sub(
        r"\s*\.\.\.\(\['Marca', 'Modelo', 'Año'\] as const\)\.map<FilaMapeoBase>\(\(atributo\) => \(\{.*?\}\)\),",
        "\n" + "\n".join(marca % (a.lower(), a) for a in ("Marca", "Modelo", "Año")) + "\n",
        text,
        count=1,
        flags=re.S,
    )
    mant = (
        "  {\n    modulo: 'Mantenimiento',\n    campoPrisma: null,\n"
        "    campoStartrack: '%s (módulo Mantenimiento)',\n"
        "    tipoRelacion: 'solo en Startrack',\n    confianza: 'media',\n    critico: false,\n  },"
    )
    text = re.sub(
        r"\s*\.\.\.\(\['Proveedor', 'Mecánico', 'Motivo de reparación', 'Odómetro', 'Horómetro'\] as const\)\.map<FilaMapeoBase>\(\s*\(campo\) => \(\{.*?\}\),\s*\),",
        "\n"
        + "\n".join(
            mant % c
            for c in ("Proveedor", "Mecánico", "Motivo de reparación", "Odómetro", "Horómetro")
        )
        + "\n",
        text,
        count=1,
        flags=re.S,
    )
    filas = []
    for b in re.split(r"\n  \{\n", text):
        if "tipoRelacion:" not in b or "modulo:" not in b:
            continue

        def g(k, src=b):
            m = re.search(rf"{k}:\s*(null|'((?:\\'|[^'])*)')", src)
            if not m:
                return None
            if m.group(0).endswith("null"):
                return None
            return m.group(2).replace("\\'", "'")

        rel = g("tipoRelacion")
        if not rel:
            continue
        filas.append(
            _fila(
                g("modulo"),
                g("campoPrisma"),
                g("campoStartrack"),
                rel,
                "critico: true" in b,
                g("confianza"),
            )
        )
    return filas


def parse_raci(text: str):
    pasos = []
    for ch in re.split(r"\n  \{\n    paso:", text)[1:]:
        m = re.match(r"\s*'((?:\\'|[^'])*)'", ch)
        if not m:
            continue
        paso = m.group(1)
        asig = {}
        for ag in AGENTES:
            mm = re.search(rf"(?:'{re.escape(ag)}'|{re.escape(ag)}):\s*('([RACI])'|null)", ch)
            asig[ag] = mm.group(2) if mm and mm.group(2) else None
        pasos.append((paso, asig))
    return pasos


def parse_terminos(text: str):
    out = []
    for m in re.finditer(
        r"termino:\s*'((?:\\'|[^'])*)',\s*definicion:\s*'((?:\\'|[^'])*)'",
        text,
        re.S,
    ):
        out.append((m.group(1), m.group(2).replace("\\'", "'")))
    return out


class Doc:
    def __init__(self, landscape=False):
        self.doc = pymupdf.open()
        self.landscape = landscape

    def page(self):
        w, h = (842, 595) if self.landscape else (595, 842)
        p = self.doc.new_page(width=w, height=h)
        p.insert_font(fontname="A", fontfile=FONT)
        p.insert_font(fontname="AB", fontfile=FONTB)
        return p, w, h

    def save(self, name):
        path = OUT / name
        self.doc.save(path)
        self.doc.close()
        print(path, path.stat().st_size)
        return path


def header(p, w, title, sub):
    p.draw_rect(pymupdf.Rect(0, 0, w, 48), color=NAVY, fill=NAVY)
    p.insert_text((24, 20), "ECONNECT", fontname="AB", fontsize=13, color=WHITE)
    p.insert_textbox(pymupdf.Rect(24, 24, w - 220, 46), title, fontname="A", fontsize=9, color=(0.85, 0.90, 0.95))
    p.insert_textbox(pymupdf.Rect(w - 210, 14, w - 20, 42), sub, fontname="A", fontsize=8, color=(0.75, 0.82, 0.88), align=2)


def footer(p, w, h, page_n, total, note):
    p.insert_textbox(
        pymupdf.Rect(24, h - 22, w - 24, h - 8),
        f"{note}  ·  p. {page_n}/{total}",
        fontname="A",
        fontsize=7,
        color=MUTED,
    )


def box_text(p, rect, s, size=9, bold=False, color=INK, align=0):
    return p.insert_textbox(rect, s, fontname="AB" if bold else "A", fontsize=size, color=color, align=align)


def make_mapeo(filas, terminos):
    d = Doc(landscape=True)
    p, w, h = d.page()
    header(p, w, "Entregable 1 y 2 — Inventario de términos y matriz de mapeo", "Entropy Hack 2026 · PDF")
    c = Counter(f["rel"] for f in filas)
    cruzan = c["exacta"] + c["con transformación"] + c["requiere parseo"]
    solo_p, solo_s = c["solo en Prisma"], c["solo en Startrack"]
    tiles = [
        (str(len(filas)), "Filas en la matriz", "alcance del MVP, no el diccionario entero"),
        (str(cruzan), "Se cruzan", "exacta + transformación + parseo"),
        (str(c["mismo nombre, distinto significado"]), "Mismo nombre, otro objeto", "la palabra coincide; el objeto no"),
        (str(solo_p + solo_s), "Solo una plataforma", f"{solo_p} Prisma + {solo_s} Startrack"),
        (str(c["sin equivalencia directa"]), "Sin equivalencia", "documentar el hueco suma"),
    ]
    tw = (w - 48 - 16) / 5
    for i, (n, t, s) in enumerate(tiles):
        x = 24 + i * (tw + 4)
        p.draw_rect(pymupdf.Rect(x, 58, x + tw, 118), color=LINE, fill=CARD)
        box_text(p, pymupdf.Rect(x + 8, 62, x + tw - 6, 86), n, 18, True, NAVY)
        box_text(p, pymupdf.Rect(x + 8, 86, x + tw - 6, 100), t, 8, True, NAVY)
        box_text(p, pymupdf.Rect(x + 8, 100, x + tw - 6, 116), s, 7, False, MUTED)
    box_text(
        p,
        pymupdf.Rect(24, 128, w - 24, 148),
        "Prisma y Startrack hablan de la misma maquinaria con palabras distintas. ECONNECT no las fusiona.",
        9,
    )
    box_text(
        p,
        pymupdf.Rect(24, 150, w - 24, 166),
        "Términos que ECONNECT introduce (no existen en ninguna plataforma):",
        9,
        True,
        NAVY,
    )
    y = 170
    for term, defin in terminos:
        box_text(p, pymupdf.Rect(24, y, 150, y + 28), f"• {term}", 8, True, INK)
        box_text(p, pymupdf.Rect(154, y, w - 24, y + 28), defin, 8, False, MUTED)
        y += 30
    footer(p, w, h, 1, 2, "Fuente: apps/web/lib/mapeo/matriz.ts · sin registros de sandbox")

    p, w, h = d.page()
    header(p, w, "Matriz de mapeo — cada fila, sin inventar equivalencias", "Entropy Hack 2026 · PDF")
    cols = [88, 200, 210, 190, 56]
    xs = [24]
    for cw in cols[:-1]:
        xs.append(xs[-1] + cw)
    heads = ["Módulo", "Prisma", "Startrack", "Relación", "Crítico"]
    y = 58
    for x, hd, cw in zip(xs, heads, cols):
        p.draw_rect(pymupdf.Rect(x, y, x + cw, y + 16), color=NAVY, fill=NAVY)
        box_text(p, pymupdf.Rect(x + 3, y + 2, x + cw - 2, y + 15), hd, 7, True, WHITE)
    y = 76
    row_h = 11.6
    for i, f in enumerate(filas):
        bg = CARD if i % 2 == 0 else WHITE
        p.draw_rect(pymupdf.Rect(24, y, w - 24, y + row_h), color=bg, fill=bg)
        vals = [
            f["modulo"],
            f["prisma"] or "—",
            f["startrack"] or "—",
            f["rel"],
            "sí" if f["critico"] else "no",
        ]
        for x, v, cw in zip(xs, vals, cols):
            box_text(p, pymupdf.Rect(x + 2, y + 1, x + cw - 2, y + row_h - 1), v, 6.5, False, INK)
        y += row_h
    box_text(
        p,
        pymupdf.Rect(24, h - 34, w - 24, h - 22),
        f"{len(filas)} filas en runtime (incluye Marca/Modelo/Año y 5 campos de mantenimiento Startrack). Si no hay pareja, se declara.",
        8,
        False,
        MUTED,
    )
    footer(p, w, h, 2, 2, "Fuente: apps/web/lib/mapeo/matriz.ts · sin registros de sandbox")
    d.save("01-matriz-mapeo.pdf")


def make_raci(pasos):
    d = Doc(landscape=True)
    p, w, h = d.page()
    header(p, w, "Entregable 3 — Matriz de responsabilidades (RACI)", "Entropy Hack 2026 · PDF")
    box_text(
        p,
        pymupdf.Rect(24, 56, w - 24, 74),
        "Quién pide: Proyecto.  Quién mueve: Logística.  Quién repara: Mantenimiento.",
        10,
        True,
        NAVY,
    )
    box_text(
        p,
        pymupdf.Rect(24, 74, w - 24, 92),
        "R responsable · A aprueba · C consulta · I informa.  Todas las filas están en estado PROPUESTA (sin cita de mentor).",
        8,
        False,
        AMBER,
    )
    left = 230
    colw = (w - 24 - left) / 6
    for i, a in enumerate(AG_SHORT):
        box_text(p, pymupdf.Rect(left + i * colw, 96, left + (i + 1) * colw, 112), a, 8, True, MUTED, 1)
    fill = {"R": NAVY, "A": INK, "C": (0.72, 0.80, 0.88), "I": WHITE}
    stroke = {"R": NAVY, "A": INK, "C": (0.45, 0.55, 0.65), "I": NAVY}
    tcol = {"R": WHITE, "A": WHITE, "C": INK, "I": NAVY}
    y = 118
    for i, (paso, asig) in enumerate(pasos):
        if i % 2 == 0:
            p.draw_rect(pymupdf.Rect(24, y - 2, w - 24, y + 28), color=(0.96, 0.97, 0.98), fill=(0.96, 0.97, 0.98))
        box_text(p, pymupdf.Rect(28, y + 6, left - 8, y + 24), paso, 9, True, INK)
        for ci, ag in enumerate(AGENTES):
            letra = asig.get(ag)
            cx = left + ci * colw + colw / 2
            cy = y + 13
            if not letra:
                box_text(p, pymupdf.Rect(cx - 10, y + 6, cx + 10, y + 22), "—", 8, False, MUTED, 1)
            else:
                p.draw_circle((cx, cy), 9, color=stroke[letra], fill=fill[letra], width=1)
                p.insert_text((cx - 3.4, cy + 3.2), letra, fontname="AB", fontsize=8, color=tcol[letra])
        y += 32
    box_text(
        p,
        pymupdf.Rect(24, h - 36, w - 24, h - 22),
        "Cubre las tres gerencias del brief (Proyecto, Logística, Mantenimiento) más Licitaciones, Operadores y Costos.",
        8,
        False,
        MUTED,
    )
    footer(p, w, h, 1, 1, "Fuente: apps/web/lib/gobernanza/raci.ts · todas propuesta")
    d.save("02-matriz-raci.pdf")


def make_arq():
    d = Doc(landscape=True)
    p, w, h = d.page()
    header(p, w, "Entregable 5 — Diagrama de arquitectura y líneas punteadas del TO-BE", "Entropy Hack 2026 · PDF")
    boxes = [
        (28, 62, 200, 210, "Prisma", "Manda en solicitudes, asignación y recurso (DISPONIBLE / OCUPADA / OBSOLETA). No se copia."),
        (321, 54, 200, 226, "ECONNECT", "Lee, unifica, interpreta y mide. No reemplaza.\n\nconectores, luego canónico, luego 8 reglas, luego UI.\nO.D.I.N. es solo lectura."),
        (614, 62, 200, 210, "Startrack", "Manda en GPS, tareas, geocercas y conductor.\nstatus 0–9 = estado del conductor, no del recurso."),
    ]
    for x, y, bw, bh, title, body in boxes:
        p.draw_rect(pymupdf.Rect(x, y, x + bw, y + bh), color=NAVY, fill=CARD, width=1.2)
        box_text(p, pymupdf.Rect(x + 12, y + 10, x + bw - 12, y + 32), title, 13, True, NAVY)
        box_text(p, pymupdf.Rect(x + 12, y + 38, x + bw - 12, y + bh - 10), body, 9, False, INK)
    p.draw_line((228, 162), (321, 162), color=NAVY, width=1.2)
    p.draw_line((521, 162), (614, 162), color=NAVY, width=1.2)
    box_text(p, pymupdf.Rect(228, 146, 321, 160), "lectura viva", 7, False, MUTED, 1)
    box_text(p, pymupdf.Rect(521, 146, 614, 160), "lectura viva", 7, False, MUTED, 1)

    box_text(
        p,
        pymupdf.Rect(28, 292, w - 28, 310),
        "Líneas punteadas del TO-BE de ECON — honestidad de alcance",
        11,
        True,
        NAVY,
    )
    lines = [
        ("1", "Solicitud aprobada viaja como tarea (P1)", "Propuesta", "El botón existe; no escribe en producción sin confirmación.", VIOLET),
        ("2", "Estados de equipo sincronizados", "Hecho / propuesta", "El veredicto interpreta. La escritura P2 no se ejecuta sola.", AMBER),
        ("3", "Crear registro de mantenimiento (P3)", "Propuesta", "Fuera del núcleo de las 24 h.", VIOLET),
        ("4", "Consulta unificada de ubicación y estado", "Hecho", "Ficha /equipo/[id] y bandeja. El jurado elige un equipo.", GREEN),
        ("5", "Actualiza disponible Startrack a Prisma (P2)", "Propuesta", "ECONNECT no disputa la autoridad de Prisma.", VIOLET),
        ("6", "Indicadores que retroalimentan la planificación", "Hecho", "Panel /indicadores. Tiempo muerto: fórmula sí, cifra no (sin horas).", GREEN),
    ]
    y = 314
    for n, name, est, note, col in lines:
        p.draw_rect(pymupdf.Rect(28, y, 50, y + 36), color=col, fill=col)
        box_text(p, pymupdf.Rect(28, y + 8, 50, y + 30), n, 12, True, WHITE, 1)
        box_text(p, pymupdf.Rect(58, y + 2, w - 28, y + 18), name, 9, True, INK)
        box_text(p, pymupdf.Rect(58, y + 18, w - 28, y + 34), f"{est}. {note}", 8, False, MUTED)
        y += 40
    footer(p, w, h, 1, 1, "ECONNECT es la bisagra. Cada plataforma sigue mandando en su dominio.")
    d.save("03-arquitectura.pdf")


def make_decisiones():
    d = Doc(landscape=False)
    p, w, h = d.page()
    header(p, w, "Entregable 6 — Decisiones técnicas (máx. 2 páginas)", "Entropy Hack 2026 · PDF")
    bloques = [
        (
            "1. Se descartó unir por nombre",
            "Los nombres de proyecto y geocerca coinciden en casi todos los casos observados, excepto uno donde los componentes aparecen en distinto orden. Un solo contraejemplo prueba que unir por nombre es frágil. ECONNECT une por código de activo contra la descripción del vehículo.",
        ),
        (
            "2. La disponibilidad no es un campo",
            "En Prisma hay tres máquinas de estado y ninguna dice «en mantenimiento»: hay que cruzar estado del equipo, falla activa y bandera de paro. Ni siquiera dentro de una plataforma la disponibilidad es una consulta directa.",
        ),
        (
            "3. remote_id es la respuesta en producción",
            "El campo ya existe en vehículos, geocercas y tareas de Startrack. Mientras la unión dependa de que dos personas escriban la misma cadena, la integración es frágil por diseño. Se puede empezar a llenarlo el lunes.",
        ),
        (
            "4. Existe SIN_EVIDENCIA",
            "Distingue «los datos indican un riesgo» de «los datos no alcanzan para concluir». Un sistema que confiesa lo que no sabe es más confiable que uno que siempre responde. No se pinta de rojo.",
        ),
    ]
    y = 62
    for t, b in bloques:
        box_text(p, pymupdf.Rect(28, y, w - 28, y + 18), t, 11, True, NAVY)
        box_text(p, pymupdf.Rect(28, y + 20, w - 28, y + 88), b, 10, False, INK)
        y += 100
    footer(p, w, h, 1, 2, "Redactado desde 01 Parte E. Sin ML en el motor. Sin sync automático.")

    p, w, h = d.page()
    header(p, w, "Entregable 6 — Decisiones técnicas (página 2)", "Entropy Hack 2026 · PDF")
    bloques2 = [
        (
            "5. Un 200 no es sesión válida",
            "Un endpoint de Startrack devuelve HTTP 200 con {success:false} cuando la sesión expiró; otros devuelven 401. Una integración que confíe solo en el código de estado leerá una sesión vencida como «no hay datos». Lo encontramos nosotros. No está en los documentos que nos entregaron.",
        ),
        (
            "6. El status de Startrack no es el recurso",
            "El campo status 0–9 del vehículo describe el estado del conductor (Normal, Almorzando, Reunión, Vacaciones). Personas asignadas en Startrack es el conductor de la maquinaria. Prisma sigue con DISPONIBLE / OCUPADA / OBSOLETA y un operador si el equipo lo trae. No se cruzan.",
        ),
        (
            "Fuera de alcance, explícito",
            "Sin ML en el motor de reconciliación. Sin sincronización automática (el humano confirma). Sin KPIs que el sandbox no soporta: no se inventan horas ni quetzales. Sin persistir datos de ECON. O.D.I.N. es Qwen local de solo lectura: explica, no escribe.",
        ),
        (
            "Qué no se mapeó, a propósito",
            "Falla de Prisma, horómetro/horas reales, operador de Prisma contra conductor de Startrack (assigned_personnel vacío; 0 coincidencias de código). Documentar el hueco suma. Inventar el cruce resta.",
        ),
    ]
    y = 62
    for t, b in bloques2:
        box_text(p, pymupdf.Rect(28, y, w - 28, y + 18), t, 11, True, NAVY)
        box_text(p, pymupdf.Rect(28, y + 20, w - 28, y + 88), b, 10, False, INK)
        y += 100
    footer(p, w, h, 2, 2, "Redactado desde 01 Parte E. Sin ML en el motor. Sin sync automático.")
    d.save("04-decisiones-tecnicas.pdf")


def make_pitch():
    d = Doc(landscape=True)
    slides = [
        (
            "1 · El problema, en lenguaje de ECON",
            [
                "Las personas se convierten en el puente entre Prisma y Startrack.",
                "Se digita dos veces, en momentos distintos, sin forma de validar que coincidan.",
                "No hay ciclo completo: de la solicitud al cierre.",
                "Lo que no se puede medir no se puede mejorar.",
            ],
            "Equipo 05 · Goat Goating Goats",
        ),
        (
            "2 · Su diagrama TO-BE",
            [
                "Este diagrama es de ustedes, no nuestro.",
                "Las líneas sólidas ya funcionan: cada plataforma en su dominio.",
                "Las líneas punteadas son las que hoy caminan a pie.",
                "ECONNECT es exactamente esas líneas punteadas.",
            ],
            None,
        ),
        (
            "3 · Qué es ECONNECT",
            [
                "Unificar: un equipo, una ficha, origen a un clic.",
                "Interpretar: un veredicto con la regla que lo produjo.",
                "Medir: indicadores que ninguna plataforma ve sola.",
                "Propagar: el humano confirma; entonces se escribe.",
                "No es un reemplazo. Es la bisagra.",
            ],
            None,
        ),
        (
            "4 · Demo en vivo",
            [
                "El jurado elige un equipo del sandbox, no anunciado.",
                "Abrimos /equipo/[id]: estado Prisma, conductor Startrack, ubicación, linaje.",
                "Bandeja: la regla, el faltante, el siguiente paso.",
                "Esta diapositiva no se presenta: se navega.",
            ],
            None,
        ),
        (
            "5 · Una discrepancia viva",
            [
                "Prisma puede decir OCUPADA y Startrack, tarea Completada.",
                "Los dos pueden ser correctos: describen objetos distintos.",
                "La regla lo nombra. No fusiona los catálogos.",
                "SIN_EVIDENCIA no es rojo: es «no alcanza para concluir».",
            ],
            None,
        ),
        (
            "6 · El campo que no mapeamos",
            [
                "Prisma estado = recurso. Startrack status 0–9 = conductor.",
                "Misma palabra. Otro objeto. Sin equivalencia directa.",
                "Operador de Prisma y conductor de Startrack no se cruzan: no hay llave.",
                "Documentar el hueco suma. Inventar el cruce resta.",
            ],
            None,
        ),
        (
            "7 · Arquitectura y líneas punteadas",
            [
                "Hecho: consulta unificada (4) e indicadores (6).",
                "Hecho a medias: veredicto (2) sin escritura automática.",
                "Propuesta: P1 solicitud a tarea, P2/P3 write-back.",
                "O.D.I.N. explica. No escribe.",
            ],
            None,
        ),
        (
            "8 · Tiempo muerto — la fórmula, no la cifra",
            [
                "(horas mínimas contratadas − horas reales) × tarifa.",
                "Prisma trae tarifa y mínimo (poblados en 1 de 15).",
                "Startrack no expone horas reales en este sandbox.",
                "La cifra es No disponible. No se inventa un quetzal.",
            ],
            None,
        ),
        (
            "9 · Recomendación: remote_id",
            [
                "El campo ya existe en vehículos, geocercas y tareas.",
                "Hoy la unión es por texto. Eso es frágil por diseño.",
                "Llenarlo el lunes pasa de heurística a enlace determinístico.",
                "Es la única escritura que pedimos para producción.",
            ],
            None,
        ),
        (
            "10 · Qué sabíamos / qué aprendimos",
            [
                "Antes: creímos que status era salud del vehículo.",
                "Aprendimos: es el estado del conductor. Personas asignadas = quién conduce.",
                "Aprendimos: un HTTP 200 puede ser sesión vencida.",
                "Aprendimos: unir por nombre se cae con un solo contraejemplo.",
                "Aprendimos: decir «no está» vale más que rellenar.",
            ],
            "Bloque de reflexión — 7.5 puntos de la rúbrica.",
        ),
    ]
    total = len(slides)
    for i, (title, bullets, note) in enumerate(slides, 1):
        p, w, h = d.page()
        header(p, w, title, "Presentación · máx. 10")
        y = 80
        for b in bullets:
            p.draw_circle((40, y + 8), 3.5, color=NAVY, fill=NAVY)
            box_text(p, pymupdf.Rect(54, y, w - 40, y + 36), b, 14, False, INK)
            y += 42
        if note:
            box_text(p, pymupdf.Rect(36, h - 70, w - 36, h - 40), note, 10, False, MUTED)
        footer(p, w, h, i, total, "ECONNECT · Grupo ECON · el demo se navega; estas slides no")
    d.save("05-presentacion.pdf")


def write_readme():
    (OUT / "README-ENTREGA.md").write_text(
        """# Entregables ECONNECT — Entropy Hack 2026

Fuente: `origin/thomas` (incluye `main`). Las matrices se parsean de
`apps/web/lib/mapeo/matriz.ts` y `apps/web/lib/gobernanza/raci.ts`.
No hay registros de sandbox ni PII.

## Cómo revisar el prototipo (RNF-04)

1. Repo: `C:\\Users\\JoseSantiagoMerinoHe\\Desktop\\ECONNECT` o este worktree.
2. Web en `http://localhost:3010`. O.D.I.N. en `8001` (README raíz aún cita 3000/8000).
3. Login de revisión: Dirección, clave `nect-direccion`. Los roles todavía no cierran pantallas.
4. Recorrido mínimo para el jurado:
   - `/flota` — bandeja
   - `/equipo/[id]` — ficha (el jurado elige el id)
   - `/command-center`
   - `/indicadores` — huecos declarados (tiempo muerto / serie 30 días = SIN_EVIDENCIA)
   - `/mapeo` — matriz viva + CSV + RACI
5. Regenerar estos PDF: `python scripts/generar-entregables.py`

## Brief §9

| # | Archivo | Qué cubre |
|---|---|---|
| 1–2 | `01-matriz-mapeo.pdf` | Inventario de términos + matriz (41 filas runtime) |
| 3 | `02-matriz-raci.pdf` | 10 pasos × 6 agentes. Todas `propuesta` |
| 4 | Prototipo en vivo | No es PDF |
| 5 | `03-arquitectura.pdf` | Prisma / ECONNECT / Startrack y las 6 líneas punteadas |
| 6 | `04-decisiones-tecnicas.pdf` | 2 páginas |
| 7 | `05-presentacion.pdf` | 10 slides. La 10 es reflexión (7.5 pts) |

`*.pdf` está en `.gitignore`. Estos archivos se versionan con `git add -f`.
""",
        encoding="utf-8",
    )


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    matriz_ts = (ROOT / "apps/web/lib/mapeo/matriz.ts").read_text(encoding="utf-8")
    raci_ts = (ROOT / "apps/web/lib/gobernanza/raci.ts").read_text(encoding="utf-8")
    filas = parse_matriz(matriz_ts)
    pasos = parse_raci(raci_ts)
    terminos = parse_terminos(matriz_ts)
    print("filas", len(filas), Counter(f["rel"] for f in filas))
    print("pasos", len(pasos), [p[0] for p in pasos])
    print("terminos", [t[0] for t in terminos])
    if len(filas) != 41:
        raise SystemExit(f"expected 41 matrix rows, got {len(filas)}")
    if len(pasos) != 10:
        raise SystemExit(f"expected 10 RACI steps, got {len(pasos)}")
    make_mapeo(filas, terminos)
    make_raci(pasos)
    make_arq()
    make_decisiones()
    make_pitch()
    write_readme()
    print("done")


if __name__ == "__main__":
    main()
