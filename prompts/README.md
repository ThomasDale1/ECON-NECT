# prompts/ — Prompts de implementación

Esta carpeta es la salida de la **sesión 1 (Planeación)** y la entrada de la
**sesión 2 (Implementación)**. Ver [AGENTS.md §3](../AGENTS.md).

> **Decisión vigente para IA:** antes de crear o ejecutar cualquier prompt de
> S-A6/S-A7/S-A8, leer
> [03-ARQUITECTURA-IA-ODIN.md](../docs/03-ARQUITECTURA-IA-ODIN.md).
> Los prompts históricos no autorizan Claude/OpenAI, un segundo servicio Python
> ni escrituras de O.D.I.N. Las indicaciones finales del MVP Web quedaron
> consolidadas en [S-A6-odin-web.md](S-A6-odin-web.md).

## Cómo se usa

1. **Sesión 1 (Planeación)** discute, pregunta lo que no esté decidido, y escribe
   un archivo acá. No escribe código de producto.
2. **Sesión 2 (Implementación)** abre un chat **limpio**, pega:

   > Sos la sesión de implementación. Leé `AGENTS.md`, luego
   > `prompts/<archivo>.md`, y ejecutá exactamente lo que dice.

   Construye lo que el prompt dice, en el orden que dice. **No renegocia
   alcance.** Si algo está ambiguo, pregunta o se detiene.
3. Al terminar reporta: archivos tocados · checklist de prueba manual ·
   **resultado real** de `typecheck`/`lint`/`test` · qué no se pudo verificar ·
   desviaciones del prompt.

**Por qué sesiones separadas:** una sesión que planea y ejecuta a la vez se
autoriza sola y deja de preguntar. La separación es lo que mantiene honesto el
alcance.

## Prompts de la primera tanda

| Archivo | Carril | Sprint | Cuándo | Bloquea a |
|---|---|---|---|---|
| [S-A0-andamio.md](S-A0-andamio.md) | 🟦 A | S-A0 | 17:00 · **primero, solo** | **Todo el carril B** |
| [S-A1-conectores.md](S-A1-conectores.md) | 🟦 A | S-A1 | 17:00–20:00 | — |
| [S-A6-odin-web.md](S-A6-odin-web.md) | 🟦 A | S-A6 | después del núcleo | — |
| [S-B1-pantallas-nucleo.md](S-B1-pantallas-nucleo.md) | 🟪 B | S-B1 | 17:45–22:00 | — |
| [S-C1-matriz-mapeo.md](S-C1-matriz-mapeo.md) | 🟩 C | S-C1/C2 | **desde ya** | — |
| [S-D1-entregables.md](S-D1-entregables.md) | 🟨 D | S-D1 | **desde ya** | — |

⚠ **S-A0 corre solo y primero.** Cuatro personas haciendo `create-next-app` sobre
el mismo repo vacío es un conflicto irrecuperable. C y D no necesitan el repo:
arrancan de inmediato.

**Paso 0 de S-A0 son las skills.** Se instalan en `.claude/skills/` del proyecto y
se versionan, así que los demás carriles las reciben al clonar; nadie las
reinstala por su cuenta. Los nombres exactos que queden instalados se anotan en
[AGENTS.md §5](../AGENTS.md).

**Git:** el agente no commitea, no pushea y no mergea por su cuenta en ninguna
sesión. Lo pide el usuario, o no pasa.

## Fase extendida — optimizador (tras S-C2)

Planeados el 12 de septiembre de 2026 contra la cobertura real del sandbox. Solo
datos en vivo: sin lowboy ni horario laboral (no existen en el sandbox). El
clima salió en S-A10. Ver [AGENTS.md §12.1](../AGENTS.md).

| Archivo | Carril | Sprint | Cuándo | Bloquea a |
|---|---|---|---|---|
| [S-A7-optimizador.md](S-A7-optimizador.md) | 🟦 A | S-A7 | tras S-C2 · **Paso 1 (contrato) primero** · P1 (S-A4) le gana si compiten | B y C, hasta que exista `lib/optimizador/tipos.ts` |
| [S-B4-calendario.md](S-B4-calendario.md) | 🟪 B | S-B4 | en cuanto exista el contrato | — |
| [S-C4-kpis-optimizador.md](S-C4-kpis-optimizador.md) | 🟩 C | S-C4 | en cuanto exista el contrato | A conecta los KPIs al final |
| [S-A10-replaneacion.md](S-A10-replaneacion.md) | 🟦→🟩→🟪 A, C, B | S-A10 | 13 sep., **una sola sesión**, sobre S-A7/S-B4/S-C4 ya construidos · P1 le gana si compiten | — |

⚠ **S-A10 reemplaza en parte a S-A7, S-B4 y S-C4:** clima, holgura, continuidad
de operador, comparación contra la asignación manual y KPI de lluvia salieron.
Donde contradigan, manda S-A10.

⚠ **Sin datos de ejemplo en ninguno de los tres.** B construye contra los tipos y
verifica contra la ruta real; las pruebas corren en vivo con `npm run test:vivo`.

## Reglas que aplican a todos

- Nadie edita un directorio que no es de su carril ([AGENTS.md §4.2](../AGENTS.md)).
- Ningún dato del sandbox entra al repositorio ([AGENTS.md §1.2](../AGENTS.md)).
- Ninguna equivalencia se inventa ([AGENTS.md §1.1](../AGENTS.md)).
- Merge a `main` solo en las ventanas: 17:45 · 20:45 · 00:30 · 03:30 · 06:30 · 08:30.
