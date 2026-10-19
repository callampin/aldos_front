import { useEffect, useState, type SubmitEvent } from 'react';
import {
  STATUS_LABEL,
  getOrderTracking,
  trackingSteps,
  type OrderTracking,
} from '../../lib/tracking';
import { formatCLP, formatDateCL } from '../../lib/formatters';

interface Props {
  initialCode?: string;
}

export default function OrderTracker({ initialCode = '' }: Props) {
  const [code, setCode] = useState(initialCode);
  const [order, setOrder] = useState<OrderTracking | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'found' | 'notfound'>('idle');

  async function search(raw: string) {
    const value = raw.trim().toUpperCase();
    if (!value) return;
    setState('loading');
    setOrder(null);
    try {
      const data = await getOrderTracking(value);
      if (data) {
        setOrder(data);
        setState('found');
        return;
      }
      setState('notfound');
    } catch {
      setState('notfound');
    }
  }

  useEffect(() => {
    if (initialCode) void search(initialCode);
  }, [initialCode]);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    void search(code);
  }

  const steps = order ? trackingSteps(order) : [];

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="tracking-code">Código de seguimiento</label>
        <input
          id="tracking-code"
          type="text"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="Ej. ALD-8F3K9P"
          className="w-full rounded-lg border border-acero-300 px-4 py-3 text-base uppercase outline-none focus:border-competicion-500 focus:ring-2 focus:ring-competicion-500/30"
        />
        <button
          type="submit"
          disabled={state === 'loading'}
          className="shrink-0 rounded-lg bg-competicion-500 px-6 py-3 text-sm font-bold text-white hover:bg-competicion-600 disabled:opacity-60"
        >
          {state === 'loading' ? 'Buscando…' : 'Buscar pedido'}
        </button>
      </form>

      {state === 'notfound' && (
        <p className="mt-6 rounded-lg bg-stock-out/10 px-4 py-3 text-sm text-stock-out">
          No encontramos un pedido con ese código. Revísalo o escríbenos por WhatsApp.
        </p>
      )}

      {state === 'found' && order && (
        <div className="mt-6 rounded-xl border border-acero-200 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs text-acero-500">Pedido</p>
              <p className="font-mono text-lg font-bold">{order.orderNumber}</p>
            </div>
            <span className="rounded-full bg-carbon-900 px-3 py-1 text-xs font-bold text-white">
              {STATUS_LABEL[order.status]}
            </span>
          </div>

          {order.status === 'CANCELLED' ? (
            <p className="mt-4 rounded-lg bg-stock-out/10 px-4 py-3 text-sm text-stock-out">
              Este pedido fue cancelado. Si tienes dudas, escríbenos por WhatsApp.
            </p>
          ) : (
            <ol className="mt-5 space-y-4">
              {steps.map((step) => (
                <li key={step.key} className="flex gap-3">
                  <span
                    className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${
                      step.done ? 'bg-stock-ok text-white' : 'bg-acero-200 text-acero-500'
                    }`}
                    aria-hidden="true"
                  >
                    {step.done ? '✓' : '•'}
                  </span>
                  <div>
                    <p className={`text-sm font-semibold ${step.done ? 'text-carbon-900' : 'text-acero-500'}`}>
                      {step.label}
                    </p>
                    {step.detail && (
                      <p className="text-xs text-acero-500">
                        N° de seguimiento courier:{' '}
                        <span className="font-mono font-semibold text-carbon-900">{step.detail}</span>
                      </p>
                    )}
                    {step.done && step.at && (
                      <p className="text-xs text-acero-400">{formatDateCL(step.at)}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}

          <div className="mt-5 grid gap-2 border-t border-acero-200 pt-4 text-sm sm:grid-cols-2">
            {order.customerName && (
              <p className="text-acero-500">
                Cliente: <span className="font-medium text-carbon-900">{order.customerName}</span>
              </p>
            )}
            {(order.comuna || order.regionName) && (
              <p className="text-acero-500">
                Destino:{' '}
                <span className="font-medium text-carbon-900">
                  {[order.comuna, order.regionName].filter(Boolean).join(', ')}
                </span>
              </p>
            )}
            {typeof order.totalClp === 'number' && (
              <p className="text-acero-500">
                Total: <span className="font-medium text-carbon-900">{formatCLP(order.totalClp)}</span>
              </p>
            )}
          </div>

          {order.items && order.items.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-acero-600">
              {order.items.map((item) => (
                <li key={item.sku}>
                  {item.quantity} × {item.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
