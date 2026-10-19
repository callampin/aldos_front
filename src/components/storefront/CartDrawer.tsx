import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { $cart, $cartSubtotal, removeFromCart, setQuantity } from '../../stores/cart.store';
import { formatCLP } from '../../lib/formatters';

/**
 * Carrito lateral deslizable. Se abre con el evento `cart:open` que emite el
 * `CartButton` del header.
 */
export default function CartDrawer() {
  const items = useStore($cart);
  const subtotal = useStore($cartSubtotal);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setOpen(true);
    window.addEventListener('cart:open', handleOpen);
    return () => window.removeEventListener('cart:open', handleOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Carrito de compras">
      <button
        type="button"
        aria-label="Cerrar carrito"
        className="absolute inset-0 h-full w-full cursor-default bg-carbon-950/50"
        onClick={() => setOpen(false)}
      />

      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-acero-200 px-4 py-3">
          <h2 className="text-lg font-extrabold">
            Tu carrito{' '}
            <span className="text-sm font-medium text-acero-500">
              ({items.reduce((sum, item) => sum + item.quantity, 0)})
            </span>
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg p-2 text-acero-500 hover:bg-acero-200/60 hover:text-carbon-900"
            aria-label="Cerrar"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-4xl">🛒</p>
            <p className="font-bold">Tu carrito está vacío</p>
            <p className="text-sm text-acero-500">Agrega repuestos y vuelve aquí para finalizar.</p>
            <a
              href="/catalogo"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-lg bg-competicion-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-competicion-600"
            >
              Ver catálogo
            </a>
          </div>
        ) : (
          <ul className="flex-1 divide-y divide-acero-200 overflow-y-auto">
            {items.map((item) => (
              <li key={item.productId} className="flex gap-3 p-4">
                <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-acero-200/50">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-2xl" aria-hidden="true">🏍️</span>
                  )}
                </div>

                <div className="flex flex-1 flex-col">
                  <p className="line-clamp-2 text-sm font-semibold">{item.name}</p>
                  <p className="text-[11px] text-acero-400">SKU: {item.sku}</p>
                  <p className="mt-1 text-sm font-bold">{formatCLP(item.priceClp * item.quantity)}</p>

                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center rounded-lg border border-acero-300">
                      <button
                        type="button"
                        onClick={() => setQuantity(item.productId, item.quantity - 1)}
                        className="grid h-11 w-11 place-items-center font-bold text-acero-600 hover:text-carbon-900"
                        aria-label="Quitar una unidad"
                      >
                        −
                      </button>
                      <span className="min-w-7 text-center text-sm font-bold">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity(item.productId, item.quantity + 1)}
                        disabled={item.quantity >= item.stock}
                        className="grid h-11 w-11 place-items-center font-bold text-acero-600 hover:text-carbon-900 disabled:opacity-40"
                        aria-label="Agregar una unidad"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.productId)}
                      className="text-xs font-semibold text-acero-500 underline hover:text-stock-out"
                    >
                      Quitar
                    </button>
                  </div>
                  {item.quantity >= item.stock && (
                    <p className="mt-1 text-[11px] font-medium text-stock-low">
                      Alcanzaste el máximo disponible ({item.stock}).
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {items.length > 0 && (
          <footer className="border-t border-acero-200 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-acero-500">Subtotal</span>
              <span className="text-lg font-extrabold">{formatCLP(subtotal)}</span>
            </div>
            <p className="mt-0.5 text-[11px] text-acero-400">El envío se calcula en el checkout.</p>
            <a
              href="/checkout"
              onClick={() => setOpen(false)}
              className="mt-3 block w-full rounded-lg bg-competicion-500 px-5 py-3 text-center text-sm font-bold text-white hover:bg-competicion-600"
            >
              Ir al checkout
            </a>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-2 w-full rounded-lg border border-acero-300 px-5 py-2.5 text-sm font-semibold hover:border-carbon-900"
            >
              Seguir comprando
            </button>
          </footer>
        )}
      </aside>
    </div>
  );
}
