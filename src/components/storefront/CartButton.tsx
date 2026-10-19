import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { $cartCount } from '../../stores/cart.store';

/**
 * Botón circular de bolsa de compras (estilo App moderna).
 * Al hacer clic emite el evento `cart:open`, que abre el `CartDrawer`.
 */
export default function CartButton() {
  const count = useStore($cartCount);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  const shownCount = mounted ? count : 0;

  return (
    <button
      type="button"
      data-cart-open
      onClick={() => window.dispatchEvent(new CustomEvent('cart:open'))}
      aria-label={`Abrir bolsa de compras (${shownCount} ${shownCount === 1 ? 'artículo' : 'artículos'})`}
      className="relative inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-full border border-acero-200 bg-white px-3 text-sm font-bold text-carbon-900 shadow-2xs transition-colors hover:bg-surface-muted"
    >
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" viewBox="0 0 24 24">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
        <path d="M3 6h18" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
      <span className="hidden md:inline">Carrito</span>
      {shownCount > 0 && (
        <span
          data-cart-count
          className="grid h-5 min-w-5 place-items-center rounded-full bg-lime-500 px-1.5 text-[11px] font-extrabold text-carbon-950"
        >
          {shownCount}
        </span>
      )}
    </button>
  );
}
