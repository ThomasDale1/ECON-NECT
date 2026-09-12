/**
 * Verificación de acceso por rol.
 *
 * TODO carril C — S-C3. Por ahora deja pasar todo para no bloquear a nadie.
 *
 * Este archivo es del carril C. `proxy.ts` solo lo llama y no vuelve a tocarse:
 * el carril A no edita este archivo, el carril C no edita `proxy.ts`.
 */
export function verificarAcceso(_peticion: Request): boolean {
  return true
}
