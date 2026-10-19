import { useState, type SubmitEvent } from 'react';
import { adminForgotPassword, adminLogin } from '../../lib/admin';
import { setSession } from '../../stores/auth.store';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    if (!EMAIL_RE.test(email)) {
      setError('Ingresa un correo válido.');
      return;
    }
    if (password.length < 4) {
      setError('La contraseña debe tener al menos 4 caracteres.');
      return;
    }
    setLoading(true);
    try {
      const session = await adminLogin(email, password);
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
    if (!EMAIL_RE.test(email)) {
      setError('Escribe tu correo arriba para recuperar la contraseña.');
      return;
    }
    await adminForgotPassword(email);
    setInfo('Si el correo está registrado, te enviamos instrucciones para recuperar tu contraseña.');
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
          placeholder="contacto@dominio.cl"
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
        onClick={handleForgot}
        className="w-full text-center text-sm font-medium text-acero-500 underline hover:text-carbon-900"
      >
        ¿Olvidaste tu contraseña?
      </button>
    </form>
  );
}
