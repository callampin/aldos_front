import { useEffect, useMemo, useState } from 'react';
import {
  getAdminOrders,
  patchOrderStatus,
  type AdminOrder,
  type AdminOrderStatus,
} from '../../lib/admin';
import { formatCLP, formatDateCL } from '../../lib/formatters';
import { dispatchNoticeLink } from '../../lib/whatsapp';
import OrderDispatchModal from './OrderDispatchModal';

type TabKey = 'PAID' | 'PENDING' | 'SHIPPED' | 'DELIVERED';

const TABS: Array<{ key: TabKey; label: string; emoji: string }> = [
  { key: 'PAID', label: 'Listos para despachar hoy', emoji: '🟢' },
  { key: 'PENDING', label: 'Por confirmar pago', emoji: '🟡' },
  { key: 'SHIPPED', label: 'En camino', emoji: '🚚' },
  { key: 'DELIVERED', label: 'Entregados / Historial', emoji: '✅' },
];

const STATUS_BADGE: Record<AdminOrderStatus, { text: string; className: string }> = {
  PENDING: { text: 'Por confirmar pago', className: 'bg-stock-low/15 text-stock-low' },
  PAID: { text: 'Pagado — despachar', className: 'bg-stock-ok/15 text-stock-ok' },
  SHIPPED: { text: 'Despachado', className: 'bg-competicion-500/15 text-competicion-600' },
  DELIVERED: { text: 'Entregado', className: 'bg-carbon-900/10 text-carbon-900' },
  CANCELLED: { text: 'Cancelado', className: 'bg-stock-out/15 text-stock-out' },
};

export default function OrdersDashboard() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<'api' | 'mock'>('mock');
  const [tab, setTab] = useState<TabKey>('PAID');
  const [labelOrder, setLabelOrder] = useState<AdminOrder | null>(null);
  const [dispatchOrder, setDispatchOrder] = useState<AdminOrder | null>(null);

  useEffect(() => {
    getAdminOrders().then((result) => {
      setOrders(result.orders);
      setSource(result.source);
      setLoading(false);
    });
  }, []);

  const grouped = useMemo(
    () => ({
      PAID: orders.filter((order) => order.status === 'PAID'),
      PENDING: orders.filter((order) => order.status === 'PENDING'),
      SHIPPED: orders.filter((order) => order.status === 'SHIPPED'),
      DELIVERED: orders.filter((order) => order.status === 'DELIVERED' || order.status === 'CANCELLED'),
    }),
    [orders],
  );

  function updateOrder(id: number, changes: Partial<AdminOrder>) {
    setOrders((previous) => previous.map((order) => (order.id === id ? { ...order, ...changes } : order)));
  }

  function markPaid(order: AdminOrder) {
    updateOrder(order.id, { status: 'PAID', paymentStatus: 'PAID', paidAt: new Date().toISOString() });
    void patchOrderStatus(order.id, 'PAID');
  }

  function markDelivered(order: AdminOrder) {
    updateOrder(order.id, { status: 'DELIVERED', deliveredAt: new Date().toISOString() });
    void patchOrderStatus(order.id, 'DELIVERED');
  }

  function cancelOrder(order: AdminOrder) {
    updateOrder(order.id, { status: 'CANCELLED' });
    void patchOrderStatus(order.id, 'CANCELLED');
  }

  function confirmDispatch(order: AdminOrder, courierName: string, courierTrackingNumber: string) {
    updateOrder(order.id, {
      status: 'SHIPPED',
      courierName,
      courierTrackingNumber,
      shippedAt: new Date().toISOString(),
    });
    void patchOrderStatus(order.id, 'SHIPPED', { courierName, courierTrackingNumber });
    setDispatchOrder(null);
  }

  const activeOrders = grouped[tab];

  return (
    <div>
      {source === 'mock' && (
        <p className="mb-4 rounded-lg bg-stock-low/10 px-3 py-2 text-xs font-medium text-stock-low">
          MODO DEMO: pedidos de ejemplo (el backend aún no está conectado).
        </p>
      )}

      {/* Pestañas con contadores */}
      <div role="tablist" className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((entry) => {
          const active = tab === entry.key;
          return (
            <button
              key={entry.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(entry.key)}
              className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${
                active
                  ? 'border-competicion-500 bg-competicion-500/10 text-carbon-900'
                  : 'border-acero-300 text-acero-600 hover:border-carbon-900'
              }`}
            >
              <span aria-hidden="true">{entry.emoji}</span>
              {entry.label}
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-carbon-900 px-1 text-[11px] font-bold text-white">
                {grouped[entry.key].length}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-acero-500">Cargando pedidos…</p>
      ) : activeOrders.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-acero-300 p-10 text-center">
          <p className="text-3xl">📭</p>
          <p className="mt-2 font-bold">No hay pedidos en esta pestaña</p>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {activeOrders.map((order) => {
            const badge = STATUS_BADGE[order.status];
            return (
              <li key={order.id} className="rounded-xl border border-acero-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-sm font-bold">{order.orderNumber}</p>
                    <p className="text-xs text-acero-500">
                      {formatDateCL(order.createdAt)} · {order.paymentMethod === 'KHIPU' ? 'Khipu' : 'Transferencia'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-extrabold">{formatCLP(order.totalClp)}</p>
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${badge.className}`}>
                      {badge.text}
                    </span>
                  </div>
                </div>

                <div className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
                  <p className="font-semibold">{order.customerName}</p>
                  <p className="text-acero-500 sm:text-right">{order.customerPhone}</p>
                  <p className="text-acero-600">
                    {order.addressLine}, {order.comuna}, {order.regionName}
                  </p>
                  {order.courierName && (
                    <p className="text-acero-600 sm:text-right">
                      {order.courierName} · <span className="font-mono">{order.courierTrackingNumber}</span>
                    </p>
                  )}
                </div>

                <ul className="mt-2 border-t border-acero-200 pt-2 text-xs text-acero-600">
                  {order.items.map((item) => (
                    <li key={item.sku}>
                      {item.quantity} × {item.name}
                    </li>
                  ))}
                </ul>

                <div className="mt-3 flex flex-wrap gap-2">
                  {order.status === 'PENDING' && (
                    <button
                      type="button"
                      onClick={() => markPaid(order)}
                      className="rounded-lg bg-stock-ok px-4 py-2 text-sm font-bold text-white hover:brightness-95"
                    >
                      Marcar pago recibido
                    </button>
                  )}

                  {order.status === 'PAID' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setDispatchOrder(order)}
                        className="rounded-lg bg-competicion-500 px-4 py-2 text-sm font-bold text-white hover:bg-competicion-600"
                      >
                        Marcar como despachado
                      </button>
                      <button
                        type="button"
                        onClick={() => setLabelOrder(order)}
                        className="rounded-lg border border-acero-300 px-4 py-2 text-sm font-semibold hover:border-carbon-900"
                      >
                        Imprimir etiqueta
                      </button>
                    </>
                  )}

                  {order.status === 'SHIPPED' && (
                    <>
                      <a
                        href={dispatchNoticeLink({
                          customerName: order.customerName,
                          orderNumber: order.orderNumber,
                          courier: order.courierName ?? 'el courier',
                          trackingNumber: order.courierTrackingNumber ?? '',
                          phone: order.customerPhone,
                        })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-[#25D366] px-4 py-2 text-sm font-bold text-carbon-900 hover:brightness-95"
                      >
                        Avisar al cliente por WhatsApp
                      </a>
                      <button
                        type="button"
                        onClick={() => markDelivered(order)}
                        className="rounded-lg border border-acero-300 px-4 py-2 text-sm font-semibold hover:border-carbon-900"
                      >
                        Marcar entregado
                      </button>
                    </>
                  )}

                  {(order.status === 'PENDING' || order.status === 'PAID') && (
                    <button
                      type="button"
                      onClick={() => cancelOrder(order)}
                      className="rounded-lg px-4 py-2 text-sm font-semibold text-acero-500 underline hover:text-stock-out"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {labelOrder && (
        <OrderDispatchModal
          order={labelOrder}
          mode="label"
          onClose={() => setLabelOrder(null)}
          onDispatch={() => setLabelOrder(null)}
        />
      )}
      {dispatchOrder && (
        <OrderDispatchModal
          order={dispatchOrder}
          mode="dispatch"
          onClose={() => setDispatchOrder(null)}
          onDispatch={(courierName, courierTrackingNumber) =>
            confirmDispatch(dispatchOrder, courierName, courierTrackingNumber)
          }
        />
      )}
    </div>
  );
}
