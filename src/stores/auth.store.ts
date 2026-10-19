/**
 * Sesión del panel de administración.
 *
 * ⚠️ DEMO: la sesión se guarda en `localStorage`, lo que NO es seguro.
 * Debe reemplazarse por la sesión real del backend (cookie HttpOnly + JWT).
 * Ver `NOTAS.md`.
 */

import { persistentJSON } from '@nanostores/persistent';

export interface AdminSession {
  email: string;
  name: string;
  token: string;
}

export const $session = persistentJSON<AdminSession>('aldos:admin', null);

export function setSession(session: AdminSession): void {
  $session.set(session);
}

export function clearSession(): void {
  $session.set(null);
}

export function isAuthenticated(): boolean {
  return $session.get() !== null;
}
