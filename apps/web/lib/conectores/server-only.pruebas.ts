// Stub para Vitest. El paquete real `server-only` lanza un error a propósito
// cuando se importa fuera del bundler de servidor de Next.js — eso es lo que
// impide que un componente de cliente jale una credencial. Vitest no pasa por
// ese bundler, así que aquí se sustituye por un módulo vacío solo para las
// pruebas (ver el alias en vitest.config.ts). El código de producción sigue
// importando el paquete real; esto nunca se usa fuera de `vitest run`.
export {}
