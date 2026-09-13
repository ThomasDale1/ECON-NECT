# Modelos Pydantic que replican, campo por campo y con el mismo nombre de
# campo (alias camelCase), el contrato `EntradaSolver` / `SalidaSolver` de
# `apps/web/lib/optimizador/tipos.ts` (S-A7, Paso 1 — es el contrato
# congelado que este servicio no puede reinterpretar).
#
# Nunca loguear ni imprimir estos modelos ni sus valores: llegan sin nombres,
# sin coordenadas y sin texto libre (solo ids y enteros, Paso 4d.10), pero
# AGENTS.md §1.2/§12.1 pide igualmente no persistir ni exponer el cuerpo de
# la petición en ningún log.

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

IdSoftConstraint = Literal["distancia", "tarifa", "continuidadOperador", "holgura"]
ObjetivoNivel = Literal["cobertura", "distancia", "tarifa", "continuidadOperador", "holgura"]


class _ModeloBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class SolicitudEntrada(_ModeloBase):
    id: str
    inicio_dia: int = Field(alias="inicioDia")
    fin_dia: int = Field(alias="finDia")


class ParEntrada(_ModeloBase):
    solicitud_id: str = Field(alias="solicitudId")
    maquina_id: str = Field(alias="maquinaId")
    distancia_m: int = Field(alias="distanciaM")
    tarifa_centavos: int = Field(alias="tarifaCentavos")
    holgura_dias: int = Field(alias="holguraDias")


class OperadoresPorSolicitudEntrada(_ModeloBase):
    solicitud_id: str = Field(alias="solicitudId")
    operador_ids: list[str] = Field(alias="operadorIds")


class ContinuidadEntrada(_ModeloBase):
    maquina_id: str = Field(alias="maquinaId")
    operador_id: str = Field(alias="operadorId")


class EntradaSolver(_ModeloBase):
    solicitudes: list[SolicitudEntrada]
    pares: list[ParEntrada]
    operadores_por_solicitud: list[OperadoresPorSolicitudEntrada] = Field(alias="operadoresPorSolicitud")
    continuidad: list[ContinuidadEntrada]
    pila: list[IdSoftConstraint]
    tiempo_limite_por_nivel_s: float = Field(alias="tiempoLimitePorNivelS")

    @model_validator(mode="after")
    def _validar_referencias(self) -> "EntradaSolver":
        """Un id que aparezca en `pares` o `continuidad` y no exista en la
        entrada es una entrada malformada (Paso 2): 422, no una asignación
        forzada ni un descarte silencioso."""
        ids_solicitud = {s.id for s in self.solicitudes}
        for p in self.pares:
            if p.solicitud_id not in ids_solicitud:
                raise ValueError(f"pares: solicitudId '{p.solicitud_id}' no existe en solicitudes")
        for o in self.operadores_por_solicitud:
            if o.solicitud_id not in ids_solicitud:
                raise ValueError(
                    f"operadoresPorSolicitud: solicitudId '{o.solicitud_id}' no existe en solicitudes"
                )

        ids_maquina = {p.maquina_id for p in self.pares}
        ids_operador = {oid for o in self.operadores_por_solicitud for oid in o.operador_ids}
        for c in self.continuidad:
            if c.maquina_id not in ids_maquina:
                raise ValueError(f"continuidad: maquinaId '{c.maquina_id}' no existe en pares")
            if c.operador_id not in ids_operador:
                raise ValueError(
                    f"continuidad: operadorId '{c.operador_id}' no existe en operadoresPorSolicitud"
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
