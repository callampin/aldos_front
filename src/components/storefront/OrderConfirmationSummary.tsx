import { useEffect, useState } from 'react';
import { formatCLP } from '../../lib/formatters';

interface SnapshotItem {
  name: string;
  sku: string;
  quantity: number;
  priceClp: number;
}

interface Snapshot {
  orderNumber: string;
  trackingCode: string;
  paymentMethod: string;
  items: SnapshotItem[];
  subtotalClp: number;
  shippingCostClp: number;
  totalClp: number;
}

/** Muestra el detalle del último pedido guardado en `sessionStorage` al pagar. */
export default function OrderConfirmationSummary() {
  const [order, setOrder] = useState<Snapshot | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('aldos:lastOrder');
      if (raw) setOrder(JSON.parse(raw) as Snapshot);
    } catch {
      /* sessionStorage no disponible o dato inválido */
    }
  }, []);

  if (!order || order.items.length === 0) return null;

  return (
    <div className="rounded-xl border border-acero-200 bg-white p-4 text-left">
      <h2 className="text-base font-bold">Detalle del pedido</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {order.items.map((item) => (
          <li key={item.sku} className="flex justify-between gap-3">
            <span className="text-acero-600">
              {item.quantity} × {item.name}
            </span>
            <span className="shrink-0 font-semibold">{formatCLP(item.priceClp * item.quantity)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 space-y-1 border-t border-acero-200 pt-3 text-sm">
        <div className="flex justify-between">
          <span className="text-acero-500">Subtotal</span>
          <span>{formatCLP(order.subtotalClp)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-acero-500">Envío</span>
          <span>{order.shippingCostClp === 0 ? 'Retiro / sin costo' : formatCLP(order.shippingCostClp)}</span>
        </div>
        <div className="flex justify-between border-t border-acero-200 pt-2 text-base font-extrabold">
          <span>Total</span>
          <span>{formatCLP(order.totalClp)}</span>
        </div>
      </div>
    </div>
  );
}
