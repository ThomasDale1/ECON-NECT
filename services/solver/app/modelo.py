# El modelo CP-SAT (S-A7 Paso 2, pila de S-A10 Paso 6). Puro respecto a HTTP: recibe `EntradaSolver`
# ya validada, devuelve `SalidaSolver`. Nunca loguea ni persiste su entrada.
#
# Las hard constraints que dependen de datos (clase, operabilidad, ventana
# real, operador activo) NO se evalúan acá: llegan ya prefiltradas en `pares`
# y `operadoresPorSolicitud` desde TypeScript (lib/optimizador/adaptador.ts).
# Este módulo solo impide choques entre propuestas (misma máquina/operador en
# solicitudes que se enciman) y optimiza la pila lexicográfica. El
# verificador del lado de Node (lib/optimizador/verificar.ts) vuelve a
# comprobar todo antes de que la respuesta salga.

from __future__ import annotations

from collections import defaultdict

from ortools.sat.python import cp_model

from .esquema import EntradaSolver, NivelSalida, ObjetivoNivel, SalidaSolver

# Semilla fija (Paso 2): la misma entrada siempre reproduce la misma
# asignación entre corridas, condición para que las pruebas en vivo del
# Paso 7 puedan comparar dos corridas con distinta pila.
SEMILLA_FIJA = 20260912


class NivelInfactibleError(Exception):
    """Un nivel lexicográfico no encontró solución. Para el nivel 0
    (cobertura) no debería pasar nunca — `a[t] = 0` para todo `t` siempre es
    factible — así que si ocurre es un error del solver o de la entrada, y se
    responde 500 con el mensaje (Paso 2), nunca una asignación forzada."""

    def __init__(self, objetivo: str, status_nombre: str):
        self.objetivo = objetivo
        self.status_nombre = status_nombre
        super().__init__(f"nivel '{objetivo}' no resuelto por el solver (status {status_nombre})")


def _se_encima(a_dias: tuple[int, int], b_dias: tuple[int, int]) -> bool:
    (inicio_a, fin_a) = a_dias
    (inicio_b, fin_b) = b_dias
    return inicio_a <= fin_b and inicio_b <= fin_a


def optimizar(entrada: EntradaSolver) -> SalidaSolver:
    model = cp_model.CpModel()

    dias_por_solicitud: dict[str, tuple[int, int]] = {
        s.id: (s.inicio_dia, s.fin_dia) for s in entrada.solicitudes
    }
    ids_solicitud = list(dias_por_solicitud.keys())

    pares_por_solicitud: dict[str, list] = defaultdict(list)
    for p in entrada.pares:
        pares_por_solicitud[p.solicitud_id].append(p)

    operadores_por_solicitud: dict[str, list[str]] = {
        o.solicitud_id: o.operador_ids for o in entrada.operadores_por_solicitud
    }

    a: dict[str, cp_model.IntVar] = {}
    x: dict[tuple[str, str], cp_model.IntVar] = {}
    y: dict[tuple[str, str], cp_model.IntVar] = {}

    for s_id in ids_solicitud:
        a[s_id] = model.NewBoolVar(f"a_{s_id}")

        pares = pares_por_solicitud.get(s_id, [])
        for p in pares:
            x[(s_id, p.maquina_id)] = model.NewBoolVar(f"x_{s_id}_{p.maquina_id}")
        model.Add(sum(x[(s_id, p.maquina_id)] for p in pares) == a[s_id])

        operador_ids = operadores_por_solicitud.get(s_id, [])
        for o_id in operador_ids:
            y[(s_id, o_id)] = model.NewBoolVar(f"y_{s_id}_{o_id}")
        model.Add(sum(y[(s_id, o_id)] for o_id in operador_ids) == a[s_id])

    # Sin choques entre propuestas: una misma máquina/operador no puede ir a
    # dos solicitudes cuyos intervalos [inicioDia, finDia] se encimen.
    maquinas: set[str] = {p.maquina_id for p in entrada.pares}
    for maquina_id in maquinas:
        solicitudes_de_maquina = [s_id for s_id in ids_solicitud if (s_id, maquina_id) in x]
        for i in range(len(solicitudes_de_maquina)):
            for j in range(i + 1, len(solicitudes_de_maquina)):
                s1, s2 = solicitudes_de_maquina[i], solicitudes_de_maquina[j]
                if _se_encima(dias_por_solicitud[s1], dias_por_solicitud[s2]):
                    model.Add(x[(s1, maquina_id)] + x[(s2, maquina_id)] <= 1)

    operadores: set[str] = {oid for ids in operadores_por_solicitud.values() for oid in ids}
    for operador_id in operadores:
        solicitudes_de_operador = [s_id for s_id in ids_solicitud if (s_id, operador_id) in y]
        for i in range(len(solicitudes_de_operador)):
            for j in range(i + 1, len(solicitudes_de_operador)):
                s1, s2 = solicitudes_de_operador[i], solicitudes_de_operador[j]
                if _se_encima(dias_por_solicitud[s1], dias_por_solicitud[s2]):
                    model.Add(y[(s1, operador_id)] + y[(s2, operador_id)] <= 1)

    def expr_cobertura():
        return sum(a.values()) if a else 0

    def expr_distancia():
        return sum(p.distancia_m * x[(p.solicitud_id, p.maquina_id)] for p in entrada.pares)

    def expr_tarifa():
        return sum(p.tarifa_centavos * x[(p.solicitud_id, p.maquina_id)] for p in entrada.pares)

    rating_por_operador: dict[str, int] = {o.operador_id: o.rating_decimas for o in entrada.operadores}
    minutos_por_operador: dict[str, int] = {o.operador_id: o.minutos_motor for o in entrada.operadores}

    def expr_rating():
        # Operador con mejor rating: Σ rating_decimas[o] · y[t,o] → maximizar.
        return sum(rating_por_operador[o_id] * var for (_, o_id), var in y.items()) if y else 0

    def expr_horas():
        # Operador con menos horas trabajadas: Σ minutos_motor[o] · y[t,o] → minimizar.
        return sum(minutos_por_operador[o_id] * var for (_, o_id), var in y.items()) if y else 0

    EXPRESION_POR_OBJETIVO = {
        "cobertura": expr_cobertura,
        "distancia": expr_distancia,
        "tarifa": expr_tarifa,
        "ratingOperador": expr_rating,
        "horasOperador": expr_horas,
    }
    SENTIDO_POR_OBJETIVO = {
        "cobertura": "max",
        "distancia": "min",
        "tarifa": "min",
        "ratingOperador": "max",
        "horasOperador": "min",
    }

    # La cobertura va dentro de la pila (13 sep. 2026): el esquema ya validó
    # que esté y que vaya antes que distancia, tarifa, rating y horas.
    niveles_a_optimizar: list[ObjetivoNivel] = list(entrada.pila)

    niveles_resultado: list[NivelSalida] = []
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = entrada.tiempo_limite_por_nivel_s
    solver.parameters.random_seed = SEMILLA_FIJA

    # Orden de llegada (primero en pedir, primero en ser atendido):
    # lexicográfico por rango de llegada. Para cada rango, del primero al
    # último, se maximiza cuántas solicitudes de ese rango quedan cubiertas y se
    # fija ese óptimo antes de pasar al siguiente: una solicitud anterior nunca
    # pierde su máquina para cubrir otras posteriores. Por pasos y no con pesos
    # 2^rango, para no desbordar los coeficientes con muchas solicitudes.
    ids_por_rango: dict[int, list[str]] = defaultdict(list)
    for s in entrada.solicitudes:
        ids_por_rango[s.rango_llegada].append(s.id)

    def optimizar_orden_llegada() -> NivelSalida:
        rangos = sorted(ids_por_rango.keys())
        if not rangos:
            return NivelSalida(objetivo="ordenLlegada", valor=0, probado_optimo=True)
        probado = True
        solver.parameters.max_time_in_seconds = max(entrada.tiempo_limite_por_nivel_s / len(rangos), 0.2)
        try:
            for rango in rangos:
                expr_rango = sum(a[s_id] for s_id in ids_por_rango[rango])
                model.Maximize(expr_rango)
                status_rango = solver.Solve(model)
                if status_rango not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
                    raise NivelInfactibleError("ordenLlegada", solver.StatusName(status_rango))
                valor_rango = round(solver.ObjectiveValue())
                if status_rango == cp_model.OPTIMAL:
                    model.Add(expr_rango == valor_rango)
                else:
                    probado = False
                    model.Add(expr_rango >= valor_rango)
        finally:
            solver.parameters.max_time_in_seconds = entrada.tiempo_limite_por_nivel_s
        cubiertas = sum(solver.Value(v) for v in a.values())
        return NivelSalida(objetivo="ordenLlegada", valor=cubiertas, probado_optimo=probado)

    for objetivo in niveles_a_optimizar:
        if objetivo == "ordenLlegada":
            niveles_resultado.append(optimizar_orden_llegada())
            continue
        expr = EXPRESION_POR_OBJETIVO[objetivo]()
        sentido = SENTIDO_POR_OBJETIVO[objetivo]
        if sentido == "max":
            model.Maximize(expr)
        else:
            model.Minimize(expr)

        status = solver.Solve(model)

        if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            raise NivelInfactibleError(objetivo, solver.StatusName(status))

        valor = round(solver.ObjectiveValue())
        probado_optimo = status == cp_model.OPTIMAL
        niveles_resultado.append(NivelSalida(objetivo=objetivo, valor=valor, probado_optimo=probado_optimo))

        # Tolerancia 0 (Paso 2, decisión de planeación): el óptimo (o la mejor
        # cota alcanzada, si se agotó el tiempo) se fija con exactitud antes
        # de pasar al siguiente nivel — nunca se relaja.
        if probado_optimo:
            model.Add(expr == valor)
        elif sentido == "max":
            model.Add(expr >= valor)
        else:
            model.Add(expr <= valor)

    asignaciones = []
    for s_id in ids_solicitud:
        if solver.Value(a[s_id]) != 1:
            continue
        maquina_id = next(
            p.maquina_id for p in pares_por_solicitud[s_id] if solver.Value(x[(s_id, p.maquina_id)]) == 1
        )
        operador_id = next(
            o_id
            for o_id in operadores_por_solicitud.get(s_id, [])
            if solver.Value(y[(s_id, o_id)]) == 1
        )
        asignaciones.append({"solicitudId": s_id, "maquinaId": maquina_id, "operadorId": operador_id})

    estado = "ok" if len(asignaciones) > 0 else "sin_asignaciones"

    return SalidaSolver(estado=estado, asignaciones=asignaciones, niveles=niveles_resultado)
