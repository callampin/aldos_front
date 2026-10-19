/**
 * Sesión del panel de administración en memoria del navegador.
 *
 * La credencial real viaja únicamente en la cookie `HttpOnly` (`aldos_admin_session`)
 * emitida por el backend (`/api/v1/admin/auth/login`) y verificada con `/api/v1/admin/auth/me`.
 * No se guarda ningún token en `localStorage`.
 */

import { atom } from 'nanostores';

export interface AdminSession {
  id?: number;
  email: string;
  name: string;
  expiresAt?: number;
}

export const $session = atom<AdminSession | null>(null);

export function setSession(session: AdminSession): void {
  $session.set(session);
}

export function clearSession(): void {
  $session.set(null);
}

export function isAuthenticated(): boolean {
  return $session.get() !== null;
}
