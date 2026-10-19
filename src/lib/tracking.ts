/**
 * Seguimiento público de pedidos por código (RF-14).
 * Intenta `GET /public/orders/track/:code`; el seguimiento no requiere cuenta.
 */

import { ApiError, api } from './api-client';

export type OrderStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface TrackingItem {
  sku: string;
  name: string;
  quantity: number;
}

export interface OrderTracking {
  orderNumber: string;
  status: OrderStatus;
  customerName?: string;
  regionName?: string;
  comuna?: string;
  courierName?: string | null;
  courierTrackingNumber?: string | null;
  totalClp?: number;
  createdAt?: string | null;
  paidAt?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  items?: TrackingItem[];
}

export interface TrackingStep {
  key: string;
  label: string;
  detail?: string;
  done: boolean;
  at?: string | null;
}

const STATUS_ORDER: OrderStatus[] = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED'];

/** Devuelve el pedido o `null` si el código no existe (404). */
export async function getOrderTracking(code: string): Promise<OrderTracking | null> {
  try {
    const res = await api.get<OrderTracking>(`/public/orders/track/${encodeURIComponent(code)}`, {
      signal: AbortSignal.timeout(2500),
    });
    return res.data ?? null;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

/** Construye la línea de tiempo del pedido. */
export function trackingSteps(order: OrderTracking): TrackingStep[] {
  const index = STATUS_ORDER.indexOf(order.status);
  return [
    { key: 'PENDING', label: 'Pedido recibido', done: index >= 0, at: order.createdAt },
    { key: 'PAID', label: 'Pago confirmado — en preparación', done: index >= 1, at: order.paidAt },
    {
      key: 'SHIPPED',
      label: order.courierName ? `Despachado por ${order.courierName}` : 'Despachado',
      detail: order.courierTrackingNumber ?? undefined,
      done: index >= 2,
      at: order.shippedAt,
    },
    { key: 'DELIVERED', label: 'Entregado', done: index >= 3, at: order.deliveredAt },
  ];
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Pendiente de pago / verificación',
  PAID: 'Pagado — en preparación',
  SHIPPED: 'Despachado',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
};
