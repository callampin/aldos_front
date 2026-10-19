import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { adminGetMe, adminLogout } from '../../lib/admin';
import { $session, clearSession, setSession } from '../../stores/auth.store';

/**
 * Protección activa de sesión del panel de Estrella.
 * Verifica la sesión real contra `GET /api/v1/admin/auth/me` (cookie HttpOnly)
 * y permite cerrar sesión limpiando la cookie en el servidor.
 */
export default function AdminGuard() {
  const session = useStore($session);
  const [checking, setChecking] = useState(true);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    let active = true;
    adminGetMe()
      .then((verified) => {
        if (!active) return;
        if (!verified) {
          clearSession();
          window.location.replace('/admin/login');
          return;
        }
        setSession(verified);
        setChecking(false);
      })
      .catch(() => {
        if (!active) return;
        clearSession();
        window.location.replace('/admin/login');
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleLogout() {
    setClosing(true);
    try {
      await adminLogout();
    } finally {
      clearSession();
      window.location.replace('/admin/login');
    }
  }

  if (checking && !session) {
    return (
      <div className="border-t border-white/10 p-4">
        <p className="text-xs text-acero-400">Verificando sesión…</p>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="space-y-2 border-t border-white/10 p-4">
      <p className="truncate text-xs text-acero-400" title={session.email}>
        Sesión: <span className="font-semibold text-acero-200">{session.name || session.email}</span>
      </p>
      <button
        type="button"
        disabled={closing}
        onClick={handleLogout}
        className="w-full rounded-lg px-3 py-2 text-left text-sm text-acero-200 hover:bg-white/10 hover:text-white disabled:opacity-60"
      >
        {closing ? 'Cerrando sesión…' : 'Cerrar sesión'}
      </button>
    </div>
  );
}
