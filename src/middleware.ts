import { defineMiddleware } from 'astro:middleware';

const ADMIN_SESSION_COOKIE = 'aldos_admin_session';

/**
 * Protección del lado del servidor para las rutas `/admin/*` (salvo `/admin/login`).
 *
 * - Si la petición trae la cookie `aldos_admin_session`, se valida contra
 *   `GET /api/v1/admin/auth/me` antes de entregar el HTML del panel.
 * - Si la cookie fue rechazada por el backend (`401`), se limpia y se redirige a `/admin/login`.
 * - Si el navegador está en un origen distinto al API (donde la cookie vive en el dominio del
 *   API), `AdminGuard.tsx` completa la verificación en el cliente con `credentials: 'include'`.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  if (!pathname.startsWith('/admin') || pathname === '/admin/login' || pathname === '/admin/login/') {
    return next();
  }

  const sessionToken = context.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!sessionToken) {
    return context.redirect('/admin/login');
  }

  const baseUrl = (import.meta.env.PUBLIC_API_URL ?? 'http://localhost:8787/api/v1').replace(/\/$/, '');

  try {
    const response = await fetch(`${baseUrl}/admin/auth/me`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Cookie: `${ADMIN_SESSION_COOKIE}=${sessionToken}`,
        Authorization: `Bearer ${sessionToken}`,
      },
      signal: AbortSignal.timeout(4000),
    });

    if (response.status === 401 || response.status === 403) {
      context.cookies.delete(ADMIN_SESSION_COOKIE, { path: '/' });
      return context.redirect('/admin/login');
    }
  } catch {
    // Si el Worker local aún está levantando o hay latencia transitoria,
    // AdminGuard verificará inmediatamente en el cliente.
  }

  return next();
});
