# Modelos Pydantic que replican, campo por campo y con el mismo nombre de
# campo (alias camelCase), el contrato `EntradaSolver` / `SalidaSolver` de
# `apps/web/lib/optimizador/tipos.ts` (S-A7 Paso 1, reescrito en S-A10 Paso 1
# — es el contrato congelado que este servicio no puede reinterpretar).
#
# Nunca loguear ni imprimir estos modelos ni sus valores: llegan sin nombres,
# sin coordenadas y sin texto libre (solo ids y enteros), pero AGENTS.md
# §1.2/§12.1 pide igualmente no persistir ni exponer el cuerpo de la petición
# en ningún log.

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

IdPrioridad = Literal["cobertura", "distancia", "tarifa", "ratingOperador", "horasOperador", "ordenLlegada"]
ObjetivoNivel = IdPrioridad

# Distancia, tarifa, rating y horas, puestos antes que la cobertura,
# preferirían cubrir menos solicitudes: la cobertura siempre va antes que
# ellos. Solo el orden de llegada puede ir antes que la cobertura.
OBJETIVOS_POR_ASIGNACION = {"distancia", "tarifa", "ratingOperador", "horasOperador"}


class _ModeloBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class SolicitudEntrada(_ModeloBase):
    id: str
    inicio_dia: int = Field(alias="inicioDia")
    fin_dia: int = Field(alias="finDia")
    # 0 = la primera en llegar (created_at); marcas iguales comparten rango.
    rango_llegada: int = Field(alias="rangoLlegada", ge=0)


class ParEntrada(_ModeloBase):
    solicitud_id: str = Field(alias="solicitudId")
    maquina_id: str = Field(alias="maquinaId")
    distancia_m: int = Field(alias="distanciaM")
    tarifa_centavos: int = Field(alias="tarifaCentavos")


class OperadoresPorSolicitudEntrada(_ModeloBase):
    solicitud_id: str = Field(alias="solicitudId")
    operador_ids: list[str] = Field(alias="operadorIds")


class OperadorEntrada(_ModeloBase):
    """Enteros con el peor caso ya aplicado del lado de Node:
    `rating_decimas` = round(safety_score × 10); `minutos_motor` = minutos con
    motor encendido en la ventana de 30 días."""

    operador_id: str = Field(alias="operadorId")
    rating_decimas: int = Field(alias="ratingDecimas")
    minutos_motor: int = Field(alias="minutosMotor")


class EntradaSolver(_ModeloBase):
    solicitudes: list[SolicitudEntrada]
    pares: list[ParEntrada]
    operadores_por_solicitud: list[OperadoresPorSolicitudEntrada] = Field(alias="operadoresPorSolicitud")
    operadores: list[OperadorEntrada]
    pila: list[IdPrioridad]
    tiempo_limite_por_nivel_s: float = Field(alias="tiempoLimitePorNivelS")

    @model_validator(mode="after")
    def _validar_referencias(self) -> "EntradaSolver":
        """Un id que aparezca en `pares` u `operadoresPorSolicitud` y no exista
        en la entrada, o una pila mal ordenada, es una entrada malformada: 422,
        no una asignación forzada ni un descarte silencioso."""
        if len(set(self.pila)) != len(self.pila):
            raise ValueError("pila: ids repetidos")
        if "cobertura" not in self.pila:
            raise ValueError("pila: falta cobertura")
        indice_cobertura = self.pila.index("cobertura")
        for indice, objetivo in enumerate(self.pila):
            if objetivo in OBJETIVOS_POR_ASIGNACION and indice < indice_cobertura:
                raise ValueError(f"pila: {objetivo} no puede ir antes que cobertura")

        ids_solicitud = {s.id for s in self.solicitudes}
        for p in self.pares:
            if p.solicitud_id not in ids_solicitud:
                raise ValueError(f"pares: solicitudId '{p.solicitud_id}' no existe en solicitudes")
        for o in self.operadores_por_solicitud:
            if o.solicitud_id not in ids_solicitud:
                raise ValueError(
                    f"operadoresPorSolicitud: solicitudId '{o.solicitud_id}' no existe en solicitudes"
                )

        ids_operador = {o.operador_id for o in self.operadores}
        for o in self.operadores_por_solicitud:
            for operador_id in o.operador_ids:
                if operador_id not in ids_operador:
                    raise ValueError(
                        f"operadoresPorSolicitud: operadorId '{operador_id}' no existe en operadores"
                    )
        return self


class AsignacionSalida(_ModeloBase):
    solicitud_id: str = Field(alias="solicitudId")
    maquina_id: str = Field(alias="maquinaId")
    operador_id: str = Field(alias="operadorId")


class NivelSalida(_ModeloBase):
    objetivo: ObjetivoNivel
    valor: float
    probado_optimo: bool = Field(alias="probadoOptimo")


class SalidaSolver(_ModeloBase):
    estado: Literal["ok", "sin_asignaciones"]
    asignaciones: list[AsignacionSalida]
    niveles: list[NivelSalida]
