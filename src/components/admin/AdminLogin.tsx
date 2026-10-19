import { useEffect, useState, type SubmitEvent } from 'react';
import { adminForgotPassword, adminLogin, adminResetPassword } from '../../lib/admin';
import { setSession } from '../../stores/auth.store';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const MIN_RESET_PASSWORD_LENGTH = 10;

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Detecta enlaces de recuperación (?recuperar=1&token=...) y limpia la URL del historial (H-12.4).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token')?.trim();
    if (token && token.length >= 20) {
      setResetToken(token);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    if (!EMAIL_RE.test(email.trim())) {
      setError('Ingresa un correo electrónico válido.');
      return;
    }
    if (!password) {
      setError('Ingresa tu contraseña.');
      return;
    }
    setLoading(true);
    try {
      const session = await adminLogin(email.trim(), password);
      setSession(session);
      window.location.assign('/admin');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No pudimos iniciar sesión.');
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot() {
    setError(null);
    setInfo(null);
    if (!EMAIL_RE.test(email.trim())) {
      setError('Escribe tu correo arriba para enviarte el enlace de recuperación.');
      return;
    }
    setLoading(true);
    try {
      const message = await adminForgotPassword(email.trim());
      setInfo(message);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'No pudimos solicitar la recuperación de contraseña.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResetSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setInfo(null);

    if (!resetToken) return;
    if (newPassword.length < MIN_RESET_PASSWORD_LENGTH) {
      setError(`La nueva contraseña debe tener al menos ${MIN_RESET_PASSWORD_LENGTH} caracteres.`);
      return;
    }
    if (!/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(newPassword) || !/\d/.test(newPassword)) {
      setError('La contraseña debe incluir al menos una letra y un número.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const message = await adminResetPassword(resetToken, newPassword);
      setResetToken(null);
      setNewPassword('');
      setConfirmPassword('');
      setInfo(message);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'El enlace venció o no es válido. Solicita uno nuevo.',
      );
    } finally {
      setLoading(false);
    }
  }

  if (resetToken) {
    return (
      <form onSubmit={handleResetSubmit} className="space-y-4">
        <p className="rounded-lg bg-acero-200/70 px-3 py-2 text-xs text-acero-600">
          Crea tu nueva contraseña (mínimo {MIN_RESET_PASSWORD_LENGTH} caracteres, con al menos una letra y un número).
        </p>

        <label className="block text-sm font-semibold text-carbon-900">
          Nueva contraseña
          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            autoComplete="new-password"
            placeholder="••••••••••"
            className="mt-1 w-full rounded-lg border border-acero-300 px-3 py-3 text-base outline-none focus:border-competicion-500 focus:ring-2 focus:ring-competicion-500/30"
          />
        </label>

        <label className="block text-sm font-semibold text-carbon-900">
          Confirmar nueva contraseña
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            placeholder="••••••••••"
            className="mt-1 w-full rounded-lg border border-acero-300 px-3 py-3 text-base outline-none focus:border-competicion-500 focus:ring-2 focus:ring-competicion-500/30"
          />
        </label>

        {error && <p className="rounded-lg bg-stock-out/10 px-3 py-2 text-sm text-stock-out">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-competicion-500 px-5 py-3.5 text-base font-bold text-white hover:bg-competicion-600 disabled:opacity-60"
        >
          {loading ? 'Guardando…' : 'Guardar nueva contraseña'}
        </button>

        <button
          type="button"
          onClick={() => {
            setResetToken(null);
            setError(null);
          }}
          className="w-full text-center text-sm font-medium text-acero-500 underline hover:text-carbon-900"
        >
          Volver al inicio de sesión
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block text-sm font-semibold text-carbon-900">
        Correo electrónico
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="username"
          placeholder="contacto@aldosmotos.cl"
          className="mt-1 w-full rounded-lg border border-acero-300 px-3 py-3 text-base outline-none focus:border-competicion-500 focus:ring-2 focus:ring-competicion-500/30"
        />
      </label>

      <label className="block text-sm font-semibold text-carbon-900">
        Contraseña
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          placeholder="••••••••"
          className="mt-1 w-full rounded-lg border border-acero-300 px-3 py-3 text-base outline-none focus:border-competicion-500 focus:ring-2 focus:ring-competicion-500/30"
        />
      </label>

      {error && <p className="rounded-lg bg-stock-out/10 px-3 py-2 text-sm text-stock-out">{error}</p>}
      {info && <p className="rounded-lg bg-stock-ok/10 px-3 py-2 text-sm text-stock-ok">{info}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-competicion-500 px-5 py-3.5 text-base font-bold text-white hover:bg-competicion-600 disabled:opacity-60"
      >
        {loading ? 'Ingresando…' : 'Ingresar'}
      </button>

      <button
        type="button"
        disabled={loading}
        onClick={handleForgot}
        className="w-full text-center text-sm font-medium text-acero-500 underline hover:text-carbon-900 disabled:opacity-60"
      >
        ¿Olvidaste tu contraseña?
      </button>
    </form>
  );
}
