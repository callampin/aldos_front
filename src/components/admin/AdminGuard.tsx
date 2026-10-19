import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { $session, clearSession } from '../../stores/auth.store';

/**
 * Protección de rutas del panel (lado del cliente, DEMO).
 * ⚠️ Debe reemplazarse por protección del servidor (middleware + cookie HttpOnly).
 * Ver `NOTAS.md`.
 */
export default function AdminGuard() {
  const session = useStore($session);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (mounted && !session) {
      window.location.replace('/admin/login');
    }
  }, [mounted, session]);

  if (!mounted || !session) return null;

  return (
    <div className="space-y-2 border-t border-white/10 p-4">
      <p className="truncate text-xs text-acero-400">Sesión: {session.email}</p>
      <button
        type="button"
        onClick={() => {
          clearSession();
          window.location.assign('/admin/login');
        }}
        className="w-full rounded-lg px-3 py-2 text-left text-sm text-acero-200 hover:bg-white/10 hover:text-white"
      >
        Cerrar sesión
      </button>
    </div>
  );
}
