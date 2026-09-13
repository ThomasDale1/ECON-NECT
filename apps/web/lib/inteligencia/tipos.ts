import { z } from 'zod'

const evidenciaSchema = z
  .object({
    platform: z.enum(['prisma', 'startrack', 'econ-nect']),
    endpoint: z.string(),
    field: z.string(),
    as_of: z.iso.datetime(),
  })
  .strict()

const estadoFuenteSchema = z
  .object({
    source: z.enum(['prisma', 'startrack']),
    object_type: z.enum(['recurso', 'tarea', 'falla']),
    value: z.string(),
    evidence: evidenciaSchema,
  })
  .strict()

const reglaSchema = z
  .object({
    rule: z.string(),
    name: z.string(),
    verdict: z.enum(['COHERENTE', 'ATENCION', 'EN_RIESGO', 'SIN_EVIDENCIA']),
    confidence: z.number().min(0).max(100),
    reasons: z.array(z.string()),
    suggested_action: z.string(),
    responsible_role: z.string(),
    missing_fields: z.array(z.string()),
  })
  .strict()

export const contextoOdinSchema = z
  .object({
    snapshot: z
      .object({
        asset_id: z.string(),
        asset_code: z.string().nullable(),
        asset_name: z.string().nullable(),
        identity_resolved: z.boolean(),
        verdict: z.enum(['COHERENTE', 'ATENCION', 'EN_RIESGO', 'SIN_EVIDENCIA']),
        confidence: z.number().min(0).max(100),
        source_states: z.array(estadoFuenteSchema),
        rules: z.array(reglaSchema),
        as_of: z.iso.datetime(),
      })
      .strict(),
    maintenance_signals: z.null(),
  })
  .strict()

export const solicitudOdinSchema = z
  .object({
    message: z.string().trim().min(1).max(2_000),
    assetId: z.string().trim().min(1).max(200),
  })
  .strict()

export const respuestaOdinSchema = z
  .object({
    status: z.enum(['OK', 'OUT_OF_SCOPE', 'ODIN_UNAVAILABLE']),
    intent: z.enum([
      'QUERY_ASSET_STATUS',
      'EXPLAIN_INCONSISTENCY',
      'EXPLAIN_MAINTENANCE_RISK',
      'OUT_OF_SCOPE',
    ]),
    answer: z.string(),
    tool_used: z.string().nullable(),
    evidence: z.array(evidenciaSchema),
    sources: z.array(z.string()),
    missing_data: z.array(z.string()),
    confidence: z.number().min(0).max(100).nullable(),
    suggested_action: z.string().nullable(),
    response_mode: z.enum(['local_qwen', 'deterministic_fallback', 'policy_rejection']),
    tool_result: z.record(z.string(), z.unknown()).nullable(),
  })
  .strict()

export type ContextoOdin = z.infer<typeof contextoOdinSchema>
export type RespuestaOdin = z.infer<typeof respuestaOdinSchema>

