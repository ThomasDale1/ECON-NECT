import { asegurarEntornoCargado } from '../lib/conectores/entorno'
asegurarEntornoCargado()
import { leerFlota } from '../lib/lectura/flota'
const sb = process.env.STARTRACK_BASE_URL!.replace(/\/$/, '')
const pb = process.env.PRISMA_BASE_URL!.replace(/\/$/, '')
async function loginS() {
  const r = await fetch(`${sb}/login.php`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client: process.env.STARTRACK_CLIENT!, username: process.env.STARTRACK_USER!, password: process.env.STARTRACK_PASSWORD! }), redirect: 'manual' })
  const m = new Map<string, string>(); for (const c of r.headers.getSetCookie()) { const p = c.split(';')[0]; m.set(p.split('=')[0], p) }
  return [...m.values()].join('; ')
}
async function loginP() {
  const r = await fetch(`${pb}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: process.env.PRISMA_EMAIL, password: process.env.PRISMA_PASSWORD }) })
  return (r.headers.get('set-cookie') ?? '').split(';')[0]
}
async function main() {
  const cs = await loginS(); const cp = await loginP()
  // 1. catálogo de estados de tarea (solo nombres)
  for (const ep of ['api/job/status', 'api/job/statuses', 'api/jobs/status']) {
    const r = await fetch(`${sb}/${ep}`, { headers: { Cookie: cs } }); const t = await r.text()
    let j: any = null; try { j = JSON.parse(t) } catch {}
    const lista = Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : null
    console.log(`GET ${ep} → ${r.status}`, lista ? `lista ${lista.length}; campos ${Object.keys(lista[0] ?? {}).join(',')}; valores ${lista.map((s: any) => `${s.id}=${s.name ?? s.status_name ?? '?'}`).join(' | ')}` : `(no lista) keys ${j ? Object.keys(j).join(',') : t.slice(0, 60).replace(/\s+/g, ' ')}`)
  }
  // 2. estados observados en tareas (pares status/status_name) + tipo
  const jr = await (await fetch(`${sb}/api/job?page_num=0&page_size=200&sort_by=start_date&sort_dir=asc`, { headers: { Cookie: cs } })).json()
  const pares = new Map<string, number>(); for (const t of jr.data) { const k = `${t.status}/${t.status_name}/wf=${t.status_workflow_role}`; pares.set(k, (pares.get(k) ?? 0) + 1) }
  console.log('pares status/status_name observados:', [...pares.entries()].map(([k, v]) => `${k}:${v}`).join(' | '))
  // 3. ¿existe GET/OPTIONS api/job/{id}?
  const id0 = jr.data[0]?.id
  for (const m of ['OPTIONS', 'GET']) {
    const r = await fetch(`${sb}/api/job/${id0}`, { method: m, headers: { Cookie: cs } })
    let keys = ''; if (m === 'GET') { try { const j = await r.json(); keys = `keys ${Object.keys(j).join(',')} · data campos ${Object.keys(j.data ?? {}).length}` } catch {} }
    console.log(`${m} api/job/{id} → ${r.status} allow=${r.headers.get('allow')} ${keys}`)
  }
  const ro = await fetch(`${sb}/api/job`, { method: 'OPTIONS', headers: { Cookie: cs } }); console.log('OPTIONS api/job →', ro.status, 'allow=', ro.headers.get('allow'))
  // 4. Prisma: estado del equipo
  const flota = await leerFlota({ incluirPosicionEnVivo: false })
  const eq0 = flota.datos.equipos.datos[0]
  for (const ep of [`/api/maquinaria/equipos/${eq0.id}/estado`, `/api/maquinaria/equipos/${eq0.id}`]) {
    const r = await fetch(`${pb}${ep}`, { method: 'OPTIONS', headers: { Cookie: cp } }); console.log(`OPTIONS ${ep.replace(String(eq0.id), '{id}')} → ${r.status} allow=${r.headers.get('allow')}`)
  }
  // 5. casos R2 y equipo propio
  const r2 = flota.equipos.filter((e) => e.reglas.some((x) => x.regla === 'R2'))
  console.log('equipos con R2:', r2.map((e) => `${e.codigoActivo.valor} (tarea=${e.tarea?.valor}, estado=${e.equipo?.valor})`).join(' | '))
  const re02 = flota.equipos.find((e) => e.codigoActivo.valor === 'RE-02')
  console.log('RE-02: veredicto', re02?.veredicto, '· reglas', re02?.reglas.map((x) => x.regla).join(','), '· estado', re02?.equipo?.valor, '· tarea', re02?.tarea?.valor, '· vehiculo', re02?.vehiculo?.valor)
}
main().catch((e) => { console.error(e.message); process.exit(1) })
