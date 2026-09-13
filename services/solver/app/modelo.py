# El modelo CP-SAT (S-A7 Paso 2). Puro respecto a HTTP: recibe `EntradaSolver`
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

    # Continuidad: z[t,m,o] linealizado, solo para los pares (m,o) declarados.
    z: dict[tuple[str, str, str], cp_model.IntVar] = {}
    for c in entrada.continuidad:
        for s_id in ids_solicitud:
            clave_x = (s_id, c.maquina_id)
            clave_y = (s_id, c.operador_id)
            if clave_x in x and clave_y in y:
                zv = model.NewBoolVar(f"z_{s_id}_{c.maquina_id}_{c.operador_id}")
                model.Add(zv <= x[clave_x])
                model.Add(zv <= y[clave_y])
                model.Add(zv >= x[clave_x] + y[clave_y] - 1)
                z[(s_id, c.maquina_id, c.operador_id)] = zv

    def expr_cobertura():
        return sum(a.values()) if a else 0

    def expr_distancia():
        return sum(p.distancia_m * x[(p.solicitud_id, p.maquina_id)] for p in entrada.pares)

    def expr_tarifa():
        return sum(p.tarifa_centavos * x[(p.solicitud_id, p.maquina_id)] for p in entrada.pares)

    def expr_holgura():
        return sum(p.holgura_dias * x[(p.solicitud_id, p.maquina_id)] for p in entrada.pares)

    def expr_continuidad():
        return sum(z.values()) if z else 0

    EXPRESION_POR_OBJETIVO = {
        "cobertura": expr_cobertura,
        "distancia": expr_distancia,
        "tarifa": expr_tarifa,
        "holgura": expr_holgura,
        "continuidadOperador": expr_continuidad,
    }
    SENTIDO_POR_OBJETIVO = {
        "cobertura": "max",
        "distancia": "min",
        "tarifa": "min",
        "holgura": "max",
        "continuidadOperador": "max",
    }

    niveles_a_optimizar: list[ObjetivoNivel] = ["cobertura", *entrada.pila]

    niveles_resultado: list[NivelSalida] = []
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = entrada.tiempo_limite_por_nivel_s
    solver.parameters.random_seed = SEMILLA_FIJA

    for objetivo in niveles_a_optimizar:
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
