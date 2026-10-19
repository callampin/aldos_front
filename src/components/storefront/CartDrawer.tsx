import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { $cart, $cartSubtotal, removeFromCart, setQuantity } from '../../stores/cart.store';
import { formatCLP } from '../../lib/formatters';

/**
 * Carrito lateral deslizable con estética Soft UI.
 * Se abre con el evento `cart:open` que emite el `CartButton` del header.
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
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Bolsa de compras">
      <button
        type="button"
        aria-label="Cerrar carrito"
        className="absolute inset-0 h-full w-full cursor-default bg-carbon-950/50 backdrop-blur-xs"
        onClick={() => setOpen(false)}
      />

      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col rounded-l-3xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-acero-200 px-5 py-4">
          <h2 className="text-lg font-extrabold text-carbon-950">
            Tu bolsa{' '}
            <span className="ml-1 rounded-full bg-lime-500 px-2.5 py-0.5 text-xs font-extrabold text-carbon-950">
              {items.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="grid h-9 w-9 place-items-center rounded-full bg-surface-muted text-carbon-800 hover:bg-surface-hover"
            aria-label="Cerrar"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-surface-muted text-3xl">
              🛍️
            </span>
            <p className="font-extrabold text-carbon-950">Tu bolsa está vacía</p>
            <p className="text-sm text-acero-500">Agrega repuestos y vuelve aquí para finalizar tu pedido.</p>
            <a
              href="/catalogo"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-full bg-lime-500 px-6 py-3 text-sm font-extrabold text-carbon-950 hover:bg-lime-400"
            >
              Explorar catálogo
            </a>
          </div>
        ) : (
          <ul className="flex-1 space-y-3 overflow-y-auto p-4">
            {items.map((item) => (
              <li key={item.productId} className="flex gap-3.5 rounded-3xl bg-surface-muted p-3.5">
                <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-2xl" aria-hidden="true">🏍️</span>
                  )}
                </div>

                <div className="flex flex-1 flex-col">
                  <p className="line-clamp-2 text-sm font-bold text-carbon-950">{item.name}</p>
                  <p className="text-[11px] text-acero-400">SKU: {item.sku}</p>
                  <p className="mt-1 text-sm font-extrabold text-carbon-950">
                    {formatCLP(item.priceClp * item.quantity)}
                  </p>

                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center rounded-full bg-white p-0.5 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setQuantity(item.productId, item.quantity - 1)}
                        className="grid h-8 w-8 place-items-center rounded-full font-bold text-carbon-800 hover:bg-surface-muted"
                        aria-label="Quitar una unidad"
                      >
                        −
                      </button>
                      <span className="min-w-7 text-center text-xs font-extrabold">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity(item.productId, item.quantity + 1)}
                        disabled={item.quantity >= item.stock}
                        className="grid h-8 w-8 place-items-center rounded-full font-bold text-carbon-800 hover:bg-surface-muted disabled:opacity-40"
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
                      Máximo en stock ({item.stock}).
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {items.length > 0 && (
          <footer className="border-t border-acero-200 p-5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-acero-500">Subtotal</span>
              <span className="text-xl font-extrabold text-carbon-950">{formatCLP(subtotal)}</span>
            </div>
            <p className="mt-0.5 text-[11px] text-acero-400">El envío por región se calcula en el siguiente paso.</p>
            <a
              href="/checkout"
              onClick={() => setOpen(false)}
              className="mt-4 block w-full rounded-full bg-lime-500 px-6 py-3.5 text-center text-sm font-extrabold text-carbon-950 shadow-xs hover:bg-lime-400"
            >
              Continuar al pago
            </a>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-2 w-full rounded-full py-2 text-center text-xs font-semibold text-acero-500 hover:text-carbon-900"
            >
              Seguir explorando
            </button>
          </footer>
        )}
      </aside>
    </div>
  );
}
