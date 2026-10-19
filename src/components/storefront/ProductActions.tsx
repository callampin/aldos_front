import { useState, type SubmitEvent } from 'react';
import { useStore } from '@nanostores/react';
import { $cart, addToCart } from '../../stores/cart.store';
import { buildWhatsAppLink, productInquiryLink } from '../../lib/whatsapp';
import { api } from '../../lib/api-client';

interface Props {
  productId: number;
  sku: string;
  name: string;
  slug: string;
  priceClp: number;
  stock: number;
  saleMode: 'DIRECT' | 'WHATSAPP_ONLY';
  oemPartNumber?: string | null;
  productUrl?: string;
}

type Feedback = { type: 'ok' | 'warn' | 'error'; text: string };

export default function ProductActions(props: Props) {
  const cart = useStore($cart);
  const [quantity, setQuantity] = useState(1);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [alertName, setAlertName] = useState('');
  const [alertContact, setAlertContact] = useState('');
  const [alertState, setAlertState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const inCart = cart.find((item) => item.productId === props.productId)?.quantity ?? 0;
  const isOutOfStock = props.stock <= 0;
  const isWhatsappOnly = props.saleMode === 'WHATSAPP_ONLY';

  const whatsappUrl = productInquiryLink({
    productName: props.name,
    sku: props.sku,
    oemPartNumber: props.oemPartNumber,
    url: props.productUrl,
  });

  const stockAlertWhatsApp = buildWhatsAppLink(
    undefined,
    `Hola, quiero que me avisen cuando llegue "${props.name}" (SKU ${props.sku}).`,
  );

  function handleAdd() {
    const result = addToCart(
      {
        productId: props.productId,
        sku: props.sku,
        name: props.name,
        slug: props.slug,
        priceClp: props.priceClp,
        stock: props.stock,
        saleMode: props.saleMode,
      },
      quantity,
    );

    if (result.ok) {
      setFeedback({ type: 'ok', text: '✓ Agregado al carrito' });
    } else if (result.reason === 'STOCK_LIMIT') {
      setFeedback({ type: 'warn', text: `Solo quedan ${props.stock} unidades: ajustamos tu carrito.` });
    } else if (result.reason === 'OUT_OF_STOCK') {
      setFeedback({ type: 'error', text: 'Este repuesto está agotado.' });
    } else {
      setFeedback({ type: 'error', text: 'Este repuesto se cotiza por WhatsApp.' });
    }
  }

  async function handleAlert(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setAlertState('sending');
    try {
      await api.post(`/public/products/${props.productId}/stock-alert`, {
        customerName: alertName,
        customerContact: alertContact,
      });
      setAlertState('sent');
    } catch {
      setAlertState('error');
    }
  }

  /* 2) Producto solo por WhatsApp (alto valor / pieza especial). */
  if (isWhatsappOnly) {
    return (
      <div className="space-y-3">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-6 py-3.5 text-base font-bold text-carbon-900 hover:brightness-95"
        >
          Cotizar / Consultar por WhatsApp
        </a>
        <p className="text-xs text-acero-500">
          Repuesto de alto valor o pieza especial: te asesoramos antes de comprar para confirmar
          compatibilidad con tu moto.
        </p>
      </div>
    );
  }

  /* 3) Producto agotado: aviso de reposición. */
  if (isOutOfStock) {
    return (
      <div className="space-y-3">
        <span className="inline-block rounded-full bg-stock-out/10 px-3 py-1 text-sm font-semibold text-stock-out">
          Agotado temporalmente
        </span>

        {alertState === 'sent' ? (
          <p className="rounded-lg bg-stock-ok/10 px-4 py-3 text-sm font-medium text-stock-ok">
            ✓ Listo. Te avisaremos apenas llegue stock de este repuesto.
          </p>
        ) : (
          <form onSubmit={handleAlert} className="space-y-2 rounded-lg border border-acero-200 p-3">
            <p className="text-sm font-semibold">Avísame cuando llegue</p>
            <input
              type="text"
              required
              value={alertName}
              onChange={(event) => setAlertName(event.target.value)}
              placeholder="Tu nombre"
              className="w-full rounded-lg border border-acero-300 px-3 py-2.5 text-sm outline-none focus:border-competicion-500"
            />
            <input
              type="text"
              required
              value={alertContact}
              onChange={(event) => setAlertContact(event.target.value)}
              placeholder="Tu WhatsApp o correo"
              className="w-full rounded-lg border border-acero-300 px-3 py-2.5 text-sm outline-none focus:border-competicion-500"
            />
            <button
              type="submit"
              disabled={alertState === 'sending'}
              className="w-full rounded-lg bg-carbon-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-carbon-800 disabled:opacity-60"
            >
              {alertState === 'sending' ? 'Enviando…' : 'Avísenme cuando llegue'}
            </button>
            {alertState === 'error' && (
              <p className="text-xs text-stock-out">
                No pudimos registrar tu aviso.{' '}
                <a href={stockAlertWhatsApp} target="_blank" rel="noopener noreferrer" className="underline">
                  Escríbenos por WhatsApp
                </a>
                .
              </p>
            )}
          </form>
        )}
      </div>
    );
  }

  /* 1) Producto con stock: compra directa + consulta. */
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-lg border border-acero-300">
          <button
            type="button"
            onClick={() => setQuantity((value) => Math.max(1, value - 1))}
            className="px-3.5 py-2.5 text-lg font-bold text-acero-600 hover:text-carbon-900"
            aria-label="Quitar una unidad"
          >
            −
          </button>
          <span className="min-w-8 text-center text-sm font-bold" aria-live="polite">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity((value) => Math.min(props.stock, value + 1))}
            className="px-3.5 py-2.5 text-lg font-bold text-acero-600 hover:text-carbon-900"
            aria-label="Agregar una unidad"
          >
            +
          </button>
        </div>
        <span className="text-xs text-acero-500">
          {props.stock} disponibles
          {inCart > 0 && <> · {inCart} en tu carrito</>}
        </span>
      </div>

      <button
        type="button"
        onClick={handleAdd}
        className="w-full rounded-lg bg-competicion-500 px-6 py-3.5 text-base font-bold text-white hover:bg-competicion-600"
      >
        Agregar al carrito
      </button>

      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full rounded-lg border border-acero-300 px-6 py-3 text-center text-sm font-semibold hover:border-carbon-900"
      >
        ¿Dudas técnicas? Consultar por WhatsApp
      </a>

      {feedback && (
        <p
          role="status"
          className={`rounded-lg px-3 py-2 text-sm font-medium ${
            feedback.type === 'ok'
              ? 'bg-stock-ok/10 text-stock-ok'
              : feedback.type === 'warn'
                ? 'bg-stock-low/10 text-stock-low'
                : 'bg-stock-out/10 text-stock-out'
          }`}
        >
          {feedback.text}
        </p>
      )}
    </div>
  );
}
