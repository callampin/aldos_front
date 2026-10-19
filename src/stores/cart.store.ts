/**
 * Carrito de compras persistido en localStorage (menos de 1 KB).
 * Precios siempre en CLP entero y cantidad topada por el stock disponible (C-05).
 */

import { persistentJSON } from '@nanostores/persistent';
import { computed } from 'nanostores';

export interface CartItem {
  productId: number;
  sku: string;
  name: string;
  priceClp: number;
  stock: number;
  quantity: number;
  slug?: string;
  imageUrl?: string | null;
}

export interface AddToCartInput {
  productId: number;
  sku: string;
  name: string;
  priceClp: number;
  stock: number;
  slug?: string;
  imageUrl?: string | null;
  /** Los productos `WHATSAPP_ONLY` no entran al carrito (RF-09). */
  saleMode?: 'DIRECT' | 'WHATSAPP_ONLY';
}

export type CartMutationReason = 'OUT_OF_STOCK' | 'STOCK_LIMIT' | 'WHATSAPP_ONLY';

export interface CartMutationResult {
  ok: boolean;
  reason?: CartMutationReason;
  /** Cantidad final en el carrito para ese producto. */
  quantity: number;
}

/** Ítems del carrito. */
export const $cart = persistentJSON<CartItem[]>('aldos:cart', []);

/** Cantidad total de unidades. */
export const $cartCount = computed($cart, (items) => items.reduce((sum, item) => sum + item.quantity, 0));

/** Subtotal en CLP (sin envío). */
export const $cartSubtotal = computed($cart, (items) =>
  items.reduce((sum, item) => sum + item.priceClp * item.quantity, 0),
);

/** `true` si el carrito no tiene ítems. */
export const $cartIsEmpty = computed($cart, (items) => items.length === 0);

function clampQuantity(quantity: number, stock: number): number {
  return Math.max(0, Math.min(Math.trunc(quantity), stock));
}

/** Cantidad actual de un producto en el carrito. */
export function getQuantity(productId: number): number {
  return $cart.get().find((item) => item.productId === productId)?.quantity ?? 0;
}

/** Agrega unidades de un producto, respetando el stock disponible. */
export function addToCart(input: AddToCartInput, quantity = 1): CartMutationResult {
  if (input.saleMode === 'WHATSAPP_ONLY') {
    return { ok: false, reason: 'WHATSAPP_ONLY', quantity: getQuantity(input.productId) };
  }
  if (input.stock <= 0) {
    return { ok: false, reason: 'OUT_OF_STOCK', quantity: getQuantity(input.productId) };
  }

  const items = $cart.get();
  const existing = items.find((item) => item.productId === input.productId);
  const current = existing?.quantity ?? 0;
  const desired = current + Math.max(1, Math.trunc(quantity));
  const finalQuantity = clampQuantity(desired, input.stock);

  const next: CartItem = {
    productId: input.productId,
    sku: input.sku,
    name: input.name,
    priceClp: Math.max(0, Math.round(input.priceClp)),
    stock: input.stock,
    quantity: finalQuantity,
    slug: input.slug,
    imageUrl: input.imageUrl ?? null,
  };

  $cart.set(
    existing
      ? items.map((item) => (item.productId === input.productId ? next : item))
      : [...items, next],
  );

  return {
    ok: finalQuantity === desired,
    reason: finalQuantity === desired ? undefined : 'STOCK_LIMIT',
    quantity: finalQuantity,
  };
}

/** Fija la cantidad de un producto (0 lo elimina), topada por stock. */
export function setQuantity(productId: number, quantity: number): void {
  const items = $cart.get();
  const item = items.find((entry) => entry.productId === productId);
  if (!item) return;

  const nextQuantity = clampQuantity(quantity, item.stock);
  if (nextQuantity === 0) {
    removeFromCart(productId);
    return;
  }
  $cart.set(
    items.map((entry) => (entry.productId === productId ? { ...entry, quantity: nextQuantity } : entry)),
  );
}

/** Quita un producto del carrito. */
export function removeFromCart(productId: number): void {
  $cart.set($cart.get().filter((item) => item.productId !== productId));
}

/** Vacía el carrito. */
export function clearCart(): void {
  $cart.set([]);
}

/** Sincroniza el stock conocido de un producto y recorta la cantidad si hace falta. */
export function syncStock(productId: number, stock: number): void {
  const items = $cart.get();
  const item = items.find((entry) => entry.productId === productId);
  if (!item) return;
  if (stock <= 0) {
    removeFromCart(productId);
    return;
  }
  $cart.set(
    items.map((entry) =>
      entry.productId === productId
        ? { ...entry, stock, quantity: clampQuantity(entry.quantity, stock) }
        : entry,
    ),
  );
}
