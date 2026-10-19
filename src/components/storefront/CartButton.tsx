import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { $cartCount } from '../../stores/cart.store';

/**
 * Botón del carrito con contador en vivo. Al hacer clic emite el evento
 * `cart:open`, que el `CartDrawer` escuchará en la Etapa 3.
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
      aria-label={`Abrir carrito de compras (${shownCount} ${shownCount === 1 ? 'artículo' : 'artículos'})`}
      className="relative inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg bg-competicion-500 px-3.5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-competicion-600"
    >
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M3 3h2l2.4 12.3a2 2 0 0 0 2 1.7h8.7a2 2 0 0 0 2-1.6L22 8H6" />
        <circle cx="10" cy="20" r="1.5" />
        <circle cx="18" cy="20" r="1.5" />
      </svg>
      <span className="hidden sm:inline">Carrito</span>
      <span
        data-cart-count
        className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-carbon-900 px-1 text-[11px] font-bold text-white"
      >
        {shownCount}
      </span>
    </button>
  );
}
