import { useEffect, useState } from 'react';
import { getAdminOrderDetail, type AdminOrder, type DispatchLabelData } from '../../lib/admin';
import { STORE_CONFIG } from '../../lib/store-config';

interface Props {
  order: AdminOrder;
  mode: 'label' | 'dispatch';
  submitting?: boolean;
  onClose: () => void;
  onDispatch: (courierName: string, courierTrackingNumber: string) => void;
}

export default function OrderDispatchModal({
  order,
  mode,
  submitting = false,
  onClose,
  onDispatch,
}: Props) {
  const [courier, setCourier] = useState(order.courierName ?? '');
  const [tracking, setTracking] = useState(order.courierTrackingNumber ?? '');
  const [label, setLabel] = useState<DispatchLabelData | null>(null);

  useEffect(() => {
    let active = true;
    getAdminOrderDetail(order.id)
      .then((detail) => {
        if (active && detail?.dispatchLabel) setLabel(detail.dispatchLabel);
      })
      .catch(() => {
        /* Si falla la consulta de detalle, usa los datos ya presentes en `order`. */
      });
    return () => {
      active = false;
    };
  }, [order.id]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const totalUnits = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const storeName = label?.from.storeName ?? STORE_CONFIG.storeName;
  const storeContact = label?.from.whatsapp || STORE_CONFIG.storeEmail;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-carbon-950/60 p-4 print:bg-white print:p-0">
      <div className="my-4 w-full max-w-xl rounded-xl bg-white shadow-2xl print:my-0 print:max-w-none print:rounded-none print:shadow-none">
        <header className="flex items-center justify-between border-b border-acero-200 px-4 py-3 print:hidden">
          <h2 className="font-bold">
            {mode === 'label' ? 'Etiqueta de envío' : 'Despachar pedido'} · {order.orderNumber}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-acero-500 hover:bg-acero-200/60 hover:text-carbon-900"
            aria-label="Cerrar"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        <div className="p-4">
          {/* Etiqueta imprimible */}
          <div className="print-area rounded-xl border-2 border-carbon-900 p-4">
            <div className="flex items-baseline justify-between border-b border-carbon-900 pb-2">
              <p className="text-xs font-bold uppercase tracking-wide">Remitente</p>
              <p className="font-mono text-sm font-bold">{order.orderNumber}</p>
            </div>
            <p className="mt-2 text-sm font-bold">{storeName}</p>
            <p className="text-xs text-acero-600">{storeContact} · Chile</p>

            <div className="mt-4 border-b border-carbon-900 pb-2">
              <p className="text-xs font-bold uppercase tracking-wide">Destinatario</p>
            </div>
            <p className="mt-2 text-base font-bold">{order.customerName}</p>
            {order.customerRut && <p className="text-xs text-acero-600">RUT: {order.customerRut}</p>}
            <p className="text-sm">{order.addressLine}</p>
            {order.addressReference && <p className="text-xs text-acero-600">Ref: {order.addressReference}</p>}
            <p className="text-sm">
              {order.comuna}, {order.regionName}
            </p>
            <p className="text-sm">Tel: {order.customerPhone}</p>

            <div className="mt-4 flex items-end justify-between border-t border-carbon-900 pt-2">
              <div>
                <p className="text-xs text-acero-600">Contenido</p>
                <p className="text-sm font-semibold">{totalUnits} unidad(es)</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-acero-600">Seguimiento</p>
                <p className="font-mono text-lg font-bold">{order.trackingCode}</p>
              </div>
            </div>
          </div>

          {mode === 'label' ? (
            <div className="mt-4 flex gap-2 print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 rounded-lg bg-carbon-900 px-5 py-3 text-sm font-bold text-white hover:bg-carbon-800"
              >
                Imprimir etiqueta
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-acero-300 px-5 py-3 text-sm font-semibold hover:border-carbon-900"
              >
                Cerrar
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-3 print:hidden">
              <label className="block text-sm font-semibold text-carbon-900">
                Courier *
                <input
                  type="text"
                  value={courier}
                  onChange={(event) => setCourier(event.target.value)}
                  placeholder="Ej. Chilexpress, Starken, Blue Express…"
                  className="mt-1 w-full rounded-lg border border-acero-300 px-3 py-2.5 text-sm outline-none focus:border-competicion-500"
                />
              </label>
              <label className="block text-sm font-semibold text-carbon-900">
                N° de seguimiento del courier (opcional)
                <input
                  type="text"
                  value={tracking}
                  onChange={(event) => setTracking(event.target.value)}
                  placeholder="Ej. CX-99887766"
                  className="mt-1 w-full rounded-lg border border-acero-300 px-3 py-2.5 text-sm outline-none focus:border-competicion-500"
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={!courier.trim() || submitting}
                  onClick={() => onDispatch(courier.trim(), tracking.trim())}
                  className="flex-1 rounded-lg bg-competicion-500 px-5 py-3 text-sm font-bold text-white hover:bg-competicion-600 disabled:opacity-50"
                >
                  {submitting ? 'Guardando…' : 'Marcar como despachado'}
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-lg border border-acero-300 px-4 py-3 text-sm font-semibold hover:border-carbon-900"
                >
                  Imprimir
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
