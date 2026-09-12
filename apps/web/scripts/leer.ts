/**
 * Lector de línea de comandos contra las dos plataformas.
 *
 *   npm run leer
 *
 * Stub. Lo llena S-A1: acá se prueban los conectores sin levantar la app, y se
 * verifica a mano que la sesión de Startrack se detecta por el cuerpo de la
 * respuesta y no por el código de estado.
 *
 * Nunca imprime registros completos del sandbox a un archivo versionado
 * (AGENTS.md §1.2). Lo que se guarda es el hecho estructural, no el dato.
 */
async function main() {
  console.log('scripts/leer.ts — stub. Los conectores llegan en S-A1.')
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
