# prompts/ — Prompts de implementación

Esta carpeta es la salida de la **sesión 1 (Planeación)** y la entrada de la
**sesión 2 (Implementación)**. Ver [AGENTS.md §3](../AGENTS.md).

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

## Reglas que aplican a todos

- Nadie edita un directorio que no es de su carril ([AGENTS.md §4.2](../AGENTS.md)).
- Ningún dato del sandbox entra al repositorio ([AGENTS.md §1.2](../AGENTS.md)).
- Ninguna equivalencia se inventa ([AGENTS.md §1.1](../AGENTS.md)).
- Merge a `main` solo en las ventanas: 17:45 · 20:45 · 00:30 · 03:30 · 06:30 · 08:30.
