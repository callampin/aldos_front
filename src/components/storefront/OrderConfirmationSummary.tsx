import { useEffect, useState } from 'react';
import { formatCLP } from '../../lib/formatters';
import { STORE_CONFIG } from '../../lib/store-config';

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
  paymentMessage?: string | null;
  bankTransfer?: Record<string, string | null> | null;
  items: SnapshotItem[];
  subtotalClp: number;
  shippingCostClp: number;
  totalClp: number;
}

interface Props {
  method?: 'KHIPU' | 'BANK_TRANSFER';
}

/**
 * Muestra los datos de pago devueltos por el backend (`bankTransfer` o `paymentMessage`)
 * y el detalle de ítems del pedido recién confirmado.
 */
export default function OrderConfirmationSummary({ method = 'KHIPU' }: Props) {
  const [order, setOrder] = useState<Snapshot | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('aldos:lastOrder');
      if (raw) setOrder(JSON.parse(raw) as Snapshot);
    } catch {
      /* sessionStorage no disponible o dato inválido */
    }
  }, []);

  const bank = order?.bankTransfer;
  const resolvedBank = {
    bankName: bank?.['banco'] ?? bank?.['bankName'] ?? STORE_CONFIG.bank.bankName,
    accountType: bank?.['tipo_cuenta'] ?? bank?.['accountType'] ?? STORE_CONFIG.bank.accountType,
    accountNumber: bank?.['numero'] ?? bank?.['accountNumber'] ?? STORE_CONFIG.bank.accountNumber,
    holderName: bank?.['titular'] ?? bank?.['holderName'] ?? STORE_CONFIG.bank.holderName,
    holderRut: bank?.['rut'] ?? bank?.['holderRut'] ?? STORE_CONFIG.bank.holderRut,
    holderEmail: bank?.['email'] ?? bank?.['holderEmail'] ?? STORE_CONFIG.bank.holderEmail,
  };

  return (
    <div className="space-y-6">
      {method === 'BANK_TRANSFER' ? (
        <section className="rounded-xl border border-acero-200 bg-white p-5 text-left">
          <h2 className="text-base font-bold">Datos para la transferencia</h2>
          <p className="mt-1 text-sm text-acero-500">
            Transfiere el total y envíanos el comprobante por WhatsApp indicando tu N° de pedido.
          </p>
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-acero-500">Banco</dt>
              <dd className="font-semibold">{resolvedBank.bankName}</dd>
            </div>
            <div>
              <dt className="text-acero-500">Tipo de cuenta</dt>
              <dd className="font-semibold">{resolvedBank.accountType}</dd>
            </div>
            <div>
              <dt className="text-acero-500">N° de cuenta</dt>
              <dd className="font-semibold">{resolvedBank.accountNumber}</dd>
            </div>
            <div>
              <dt className="text-acero-500">Titular</dt>
              <dd className="font-semibold">{resolvedBank.holderName}</dd>
            </div>
            <div>
              <dt className="text-acero-500">RUT</dt>
              <dd className="font-semibold">{resolvedBank.holderRut}</dd>
            </div>
            <div>
              <dt className="text-acero-500">Correo para comprobantes</dt>
              <dd className="font-semibold">{resolvedBank.holderEmail}</dd>
            </div>
          </dl>
        </section>
      ) : (
        <section className="rounded-xl border border-acero-200 bg-white p-5 text-left">
          <h2 className="text-base font-bold">Pago con Khipu</h2>
          <p className="mt-1 text-sm text-acero-500">
            {order?.paymentMessage ??
              'Si fuiste redirigido a Khipu, completa el pago allí. La confirmación es automática. Si necesitas ayuda, escríbenos por WhatsApp.'}
          </p>
        </section>
      )}

      {order && order.items.length > 0 && (
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
      )}
    </div>
  );
}
