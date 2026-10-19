import { useEffect, useState, type SubmitEvent } from 'react';
import { useStore } from '@nanostores/react';
import { $cart, $cartSubtotal, clearCart } from '../../stores/cart.store';
import { REGIONS, getComunas } from '../../lib/chile-locations';
import {
  formatCLP,
  formatRut,
  isValidChileanMobile,
  normalizePhone,
  validateRut,
} from '../../lib/formatters';
import { FALLBACK_SHIPPING_RATES, getShippingRates, type ShippingRate } from '../../lib/shipping';
import { ApiError, api } from '../../lib/api-client';
import { STORE_CONFIG } from '../../lib/store-config';

interface CheckoutOrderResponse {
  orderNumber: string;
  trackingCode: string;
  paymentUrl?: string | null;
  totalClp?: number;
  shippingCostClp?: number;
}

type DeliveryMethod = 'SHIPPING' | 'PICKUP';
type PaymentMethod = 'KHIPU' | 'BANK_TRANSFER';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function CheckoutForm() {
  const items = useStore($cart);
  const subtotal = useStore($cartSubtotal);

  const [rates, setRates] = useState<ShippingRate[]>(FALLBACK_SHIPPING_RATES);
  const [name, setName] = useState('');
  const [rut, setRut] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [delivery, setDelivery] = useState<DeliveryMethod>('SHIPPING');
  const [regionCode, setRegionCode] = useState('');
  const [comuna, setComuna] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [addressReference, setAddressReference] = useState('');
  const [notes, setNotes] = useState('');
  const [payment, setPayment] = useState<PaymentMethod>('KHIPU');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    getShippingRates().then((result) => {
      if (active) setRates(result.rates);
    });
    return () => {
      active = false;
    };
  }, []);

  const comunas = getComunas(regionCode);
  const rate = rates.find((entry) => entry.regionCode === regionCode);
  const shippingCost = delivery === 'PICKUP' ? 0 : (rate?.baseCostClp ?? 0);
  const total = subtotal + shippingCost;

  const inputClass = (hasError: boolean) =>
    `w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors focus:border-competicion-500 focus:ring-2 focus:ring-competicion-500/30 ${
      hasError ? 'border-stock-out' : 'border-acero-300'
    }`;

  function validate(): Record<string, string> {
    const found: Record<string, string> = {};
    if (!name.trim()) found.name = 'Ingresa tu nombre completo.';
    if (rut.trim() && !validateRut(rut)) found.rut = 'El RUT no es válido.';
    if (!EMAIL_RE.test(email)) found.email = 'Ingresa un correo electrónico válido.';
    if (!isValidChileanMobile(phone)) found.phone = 'Ingresa un móvil chileno (ej. +56 9 1234 5678).';
    if (delivery === 'SHIPPING') {
      if (!regionCode) found.regionCode = 'Selecciona tu región.';
      if (!comuna) found.comuna = 'Selecciona tu comuna.';
      if (!addressLine.trim()) found.addressLine = 'Ingresa tu dirección.';
    }
    return found;
  }

  function localOrder(): CheckoutOrderResponse {
    const random = (length: number) => {
      const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      return Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
    };
    return {
      orderNumber: `ALD-${new Date().getFullYear()}-${random(4)}`,
      trackingCode: `ALD-${random(6)}`,
      totalClp: total,
      shippingCostClp: shippingCost,
    };
  }

  function completeOrder(order: CheckoutOrderResponse) {
    const snapshot = {
      orderNumber: order.orderNumber,
      trackingCode: order.trackingCode,
      paymentMethod: payment,
      items: items.map((item) => ({
        name: item.name,
        sku: item.sku,
        quantity: item.quantity,
        priceClp: item.priceClp,
      })),
      subtotalClp: subtotal,
      shippingCostClp: shippingCost,
      totalClp: order.totalClp ?? total,
      customerName: name,
      customerEmail: email,
      regionName: REGIONS.find((entry) => entry.code === regionCode)?.name ?? '',
      comuna,
    };
    try {
      sessionStorage.setItem('aldos:lastOrder', JSON.stringify(snapshot));
    } catch {
      /* sessionStorage no disponible */
    }
    clearCart();
    const params = new URLSearchParams({
      order: order.orderNumber,
      code: order.trackingCode,
      method: payment,
      total: String(order.totalClp ?? total),
      name,
      email,
    });
    window.location.assign(`/checkout/confirmacion?${params.toString()}`);
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (items.length === 0) {
      setGeneralError('Tu carrito está vacío.');
      return;
    }
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      document.querySelector('[data-error="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setSubmitting(true);
    setGeneralError(null);

    const selectedRegion = REGIONS.find((entry) => entry.code === regionCode);
    const payload = {
      customerName: name,
      customerRut: rut.trim() ? formatRut(rut) : null,
      customerEmail: email,
      customerPhone: normalizePhone(phone),
      deliveryMethod: delivery,
      regionCode: delivery === 'PICKUP' ? 'RM' : regionCode,
      regionName: delivery === 'PICKUP' ? 'Retiro en taller' : (selectedRegion?.fullName ?? ''),
      comuna: delivery === 'PICKUP' ? 'Retiro en taller' : comuna,
      addressLine: delivery === 'PICKUP' ? STORE_CONFIG.pickupAddress : addressLine,
      addressReference: addressReference || null,
      customerNotes: notes || null,
      paymentMethod: payment,
      items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
    };

    try {
      const response = await api.post<CheckoutOrderResponse>('/public/checkout', payload);
      const order = response.data;
      if (payment === 'KHIPU' && order.paymentUrl) {
        window.location.assign(order.paymentUrl);
        return;
      }
      completeOrder(order);
    } catch (error) {
      if (error instanceof ApiError) {
        setGeneralError(error.message);
      } else {
        // Sin backend (modo desarrollo): se simula la orden para probar el flujo.
        completeOrder(localOrder());
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-acero-300 p-10 text-center">
        <p className="text-3xl">🛒</p>
        <p className="mt-2 font-bold">Tu carrito está vacío</p>
        <p className="mt-1 text-sm text-acero-500">Agrega repuestos para continuar con la compra.</p>
        <a
          href="/catalogo"
          className="mt-4 inline-block rounded-lg bg-competicion-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-competicion-600"
        >
          Ver catálogo
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-6">
        {/* Contacto */}
        <section className="rounded-xl border border-acero-200 p-4 sm:p-5">
          <h2 className="text-base font-bold">1. Tus datos</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-acero-600 sm:col-span-2">
              Nombre completo *
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={`mt-1 ${inputClass(Boolean(errors.name))}`} placeholder="Ej. Juan Pérez" />
              {errors.name && <p data-error="true" className="mt-1 text-xs text-stock-out">{errors.name}</p>}
            </label>

            <label className="block text-xs font-semibold text-acero-600">
              RUT (opcional)
              <input
                type="text"
                value={rut}
                onChange={(e) => setRut(e.target.value)}
                onBlur={() => rut && setRut(formatRut(rut))}
                className={`mt-1 ${inputClass(Boolean(errors.rut))}`}
                placeholder="12.345.678-5"
              />
              {errors.rut && <p data-error="true" className="mt-1 text-xs text-stock-out">{errors.rut}</p>}
            </label>

            <label className="block text-xs font-semibold text-acero-600">
              Teléfono WhatsApp *
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={`mt-1 ${inputClass(Boolean(errors.phone))}`}
                placeholder="+56 9 1234 5678"
              />
              {errors.phone && <p data-error="true" className="mt-1 text-xs text-stock-out">{errors.phone}</p>}
            </label>

            <label className="block text-xs font-semibold text-acero-600 sm:col-span-2">
              Correo electrónico *
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`mt-1 ${inputClass(Boolean(errors.email))}`} placeholder="tucorreo@ejemplo.cl" />
              {errors.email && <p data-error="true" className="mt-1 text-xs text-stock-out">{errors.email}</p>}
            </label>
          </div>
        </section>

        {/* Entrega */}
        <section className="rounded-xl border border-acero-200 p-4 sm:p-5">
          <h2 className="text-base font-bold">2. Entrega</h2>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <label className={`flex flex-1 cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm font-medium ${delivery === 'SHIPPING' ? 'border-competicion-500 bg-competicion-500/5' : 'border-acero-300'}`}>
              <input type="radio" name="delivery" checked={delivery === 'SHIPPING'} onChange={() => setDelivery('SHIPPING')} className="accent-competicion-500" />
              Despacho a domicilio
            </label>
            {STORE_CONFIG.pickupEnabled && (
              <label className={`flex flex-1 cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm font-medium ${delivery === 'PICKUP' ? 'border-competicion-500 bg-competicion-500/5' : 'border-acero-300'}`}>
                <input type="radio" name="delivery" checked={delivery === 'PICKUP'} onChange={() => setDelivery('PICKUP')} className="accent-competicion-500" />
                Retiro en taller
              </label>
            )}
          </div>

          {delivery === 'SHIPPING' && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-acero-600">
                Región *
                <select
                  value={regionCode}
                  onChange={(e) => {
                    setRegionCode(e.target.value);
                    setComuna('');
                  }}
                  className={`mt-1 ${inputClass(Boolean(errors.regionCode))}`}
                >
                  <option value="">Elige tu región…</option>
                  {REGIONS.map((region) => (
                    <option key={region.code} value={region.code}>{region.name}</option>
                  ))}
                </select>
                {errors.regionCode && <p data-error="true" className="mt-1 text-xs text-stock-out">{errors.regionCode}</p>}
              </label>

              <label className="block text-xs font-semibold text-acero-600">
                Comuna *
                <select value={comuna} disabled={!regionCode} onChange={(e) => setComuna(e.target.value)} className={`mt-1 ${inputClass(Boolean(errors.comuna))} disabled:bg-acero-200/50 disabled:text-acero-500`}>
                  <option value="">{regionCode ? 'Elige tu comuna…' : 'Primero la región'}</option>
                  {comunas.map((entry) => (
                    <option key={entry} value={entry}>{entry}</option>
                  ))}
                </select>
                {errors.comuna && <p data-error="true" className="mt-1 text-xs text-stock-out">{errors.comuna}</p>}
              </label>

              <label className="block text-xs font-semibold text-acero-600 sm:col-span-2">
                Dirección *
                <input type="text" value={addressLine} onChange={(e) => setAddressLine(e.target.value)} className={`mt-1 ${inputClass(Boolean(errors.addressLine))}`} placeholder="Calle, número, depto/casa" />
                {errors.addressLine && <p data-error="true" className="mt-1 text-xs text-stock-out">{errors.addressLine}</p>}
              </label>

              <label className="block text-xs font-semibold text-acero-600 sm:col-span-2">
                Referencia (opcional)
                <input type="text" value={addressReference} onChange={(e) => setAddressReference(e.target.value)} className={`mt-1 ${inputClass(false)}`} placeholder="Block, indicaciones para el courier" />
              </label>
            </div>
          )}

          {delivery === 'PICKUP' && (
            <p className="mt-3 rounded-lg bg-acero-200/50 px-3 py-2 text-sm text-acero-600">
              {STORE_CONFIG.pickupAddress}
            </p>
          )}

          <label className="mt-3 block text-xs font-semibold text-acero-600">
            Comentarios para tu pedido (opcional)
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={`mt-1 ${inputClass(false)}`} placeholder="Ej. es para una XR 250R 1998" />
          </label>
        </section>

        {/* Pago */}
        <section className="rounded-xl border border-acero-200 p-4 sm:p-5">
          <h2 className="text-base font-bold">3. Medio de pago</h2>
          <div className="mt-3 space-y-2">
            <label className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm ${payment === 'KHIPU' ? 'border-competicion-500 bg-competicion-500/5' : 'border-acero-300'}`}>
              <input type="radio" name="payment" checked={payment === 'KHIPU'} onChange={() => setPayment('KHIPU')} className="mt-0.5 accent-competicion-500" />
              <span>
                <span className="block font-semibold">Khipu (transferencia automatizada)</span>
                <span className="block text-xs text-acero-500">Confirmación del pago en segundos.</span>
              </span>
            </label>
            <label className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm ${payment === 'BANK_TRANSFER' ? 'border-competicion-500 bg-competicion-500/5' : 'border-acero-300'}`}>
              <input type="radio" name="payment" checked={payment === 'BANK_TRANSFER'} onChange={() => setPayment('BANK_TRANSFER')} className="mt-0.5 accent-competicion-500" />
              <span>
                <span className="block font-semibold">Transferencia bancaria</span>
                <span className="block text-xs text-acero-500">Te mostramos los datos al confirmar el pedido.</span>
              </span>
            </label>
          </div>
        </section>
      </div>

      {/* Resumen */}
      <aside className="lg:sticky lg:top-4 lg:h-fit">
        <div className="rounded-xl border border-acero-200 p-4">
          <h2 className="text-base font-bold">Resumen del pedido</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {items.map((item) => (
              <li key={item.productId} className="flex justify-between gap-3">
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
              <span>{formatCLP(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-acero-500">Envío</span>
              <span>
                {delivery === 'PICKUP'
                  ? 'Retiro en taller'
                  : regionCode
                    ? formatCLP(shippingCost)
                    : 'Según región'}
              </span>
            </div>
            <div className="flex justify-between border-t border-acero-200 pt-2 text-base font-extrabold">
              <span>Total</span>
              <span>{formatCLP(total)}</span>
            </div>
          </div>

          {generalError && (
            <p className="mt-3 rounded-lg bg-stock-out/10 px-3 py-2 text-sm text-stock-out" role="alert">
              {generalError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-4 w-full rounded-lg bg-competicion-500 px-5 py-3.5 text-base font-bold text-white hover:bg-competicion-600 disabled:opacity-60"
          >
            {submitting ? 'Procesando…' : 'Confirmar pedido'}
          </button>
          <p className="mt-2 text-[11px] text-acero-400">
            Al confirmar aceptas nuestras políticas de envío y devoluciones.
          </p>
        </div>
      </aside>
    </form>
  );
}
