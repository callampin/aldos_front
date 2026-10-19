/**
 * Capa de datos del panel de administración de Estrella (`/api/v1/admin/*`).
 *
 * Todas las llamadas usan la cookie `HttpOnly` de sesión (`credentials: 'include'`).
 */

import { ApiError, api } from './api-client';
import type { Product } from './catalog';
import type { ShippingRate } from './shipping';
import type { AdminSession } from '../stores/auth.store';

export type { AdminSession };

export type AdminOrderStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
export type AdminPaymentMethod = 'KHIPU' | 'BANK_TRANSFER';
export type AdminPaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface AdminOrderItem {
  sku: string;
  name: string;
  quantity: number;
  unitPriceClp: number;
}

export interface AdminOrder {
  id: number;
  orderNumber: string;
  trackingCode: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerRut?: string | null;
  deliveryMethod?: 'SHIPPING' | 'PICKUP';
  regionName: string;
  comuna: string;
  addressLine: string;
  addressReference?: string | null;
  notes?: string | null;
  paymentMethod: AdminPaymentMethod;
  paymentStatus: AdminPaymentStatus;
  status: AdminOrderStatus;
  courierName?: string | null;
  courierTrackingNumber?: string | null;
  subtotalClp: number;
  shippingCostClp: number;
  totalClp: number;
  items: AdminOrderItem[];
  createdAt: string;
  paidAt?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
}

export interface DispatchLabelData {
  from: {
    storeName: string;
    whatsapp: string;
    email: string;
  };
  to: {
    name: string;
    rut: string | null;
    phone: string;
    addressLine: string;
    addressReference: string | null;
    comuna: string;
    regionName: string;
    deliveryMethod: 'SHIPPING' | 'PICKUP';
  };
  order: {
    orderNumber: string;
    trackingCode: string;
    purchasedAt: string;
    items: AdminOrderItem[];
  };
}

export interface DashboardStats {
  toDispatchToday: number;
  pendingPayment: number;
  shippedToday: number;
  lowStock: number;
  outOfStock: number;
}

export interface OrderStatusUpdateResult {
  order: AdminOrder;
  whatsappUrl?: string | null;
  stockRestored: number;
  paymentConfirmed: boolean;
  message: string;
}

export interface AdminSettingsResponse {
  settings: Record<string, string>;
  shippingRates: ShippingRate[];
}

/** Inicia sesión contra el Worker API (`POST /api/v1/admin/auth/login`). */
export async function adminLogin(email: string, password: string): Promise<AdminSession> {
  const res = await api.post<AdminSession>('/admin/auth/login', { email, password });
  return res.data;
}

/** Cierra la sesión actual en el Worker API (`POST /api/v1/admin/auth/logout`). */
export async function adminLogout(): Promise<void> {
  try {
    await api.post('/admin/auth/logout');
  } catch {
    /* Incluso si la red falla al cerrar, se limpia la sesión local. */
  }
}

/** Verifica si existe sesión activa (`GET /api/v1/admin/auth/me`). */
export async function adminGetMe(): Promise<AdminSession | null> {
  try {
    const res = await api.get<{ admin: { id: number; email: string; name: string }; expiresAt: number }>(
      '/admin/auth/me',
    );
    if (!res.data?.admin) return null;
    return {
      id: res.data.admin.id,
      email: res.data.admin.email,
      name: res.data.admin.name,
      expiresAt: res.data.expiresAt,
    };
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      return null;
    }
    throw error;
  }
}

/** Solicita enlace de recuperación de contraseña (`POST /api/v1/admin/auth/forgot-password`). */
export async function adminForgotPassword(email: string): Promise<string> {
  const res = await api.post<{ message: string }>('/admin/auth/forgot-password', { email });
  return (
    res.data?.message ??
    'Si el correo está registrado, te enviamos instrucciones para recuperar tu contraseña.'
  );
}

/** Restablece la contraseña con el token recibido por correo (`POST /api/v1/admin/auth/reset-password`). */
export async function adminResetPassword(token: string, password: string): Promise<string> {
  const res = await api.post<{ message: string }>('/admin/auth/reset-password', { token, password });
  return res.data?.message ?? 'Tu contraseña quedó actualizada. Ya puedes ingresar.';
}

/** Lista los pedidos del panel (`GET /api/v1/admin/orders`). */
export async function getAdminOrders(options?: {
  cookieHeader?: string | null;
}): Promise<{ orders: AdminOrder[]; source: 'api' }> {
  const headers: Record<string, string> = {};
  if (options?.cookieHeader) headers['Cookie'] = options.cookieHeader;

  const res = await api.get<AdminOrder[]>('/admin/orders', {
    headers,
    signal: AbortSignal.timeout(5000),
  });
  return { orders: Array.isArray(res.data) ? res.data : [], source: 'api' };
}

/** Obtiene el detalle de un pedido con etiqueta de despacho y link de WhatsApp (`GET /api/v1/admin/orders/:id`). */
export async function getAdminOrderDetail(
  orderId: number,
): Promise<{ order: AdminOrder; whatsappUrl: string; dispatchLabel: DispatchLabelData }> {
  const res = await api.get<{ order: AdminOrder; whatsappUrl: string; dispatchLabel: DispatchLabelData }>(
    `/admin/orders/${orderId}`,
  );
  return res.data;
}

/** Cambia el estado de un pedido (`PATCH /api/v1/admin/orders/:id/status`). */
export async function patchOrderStatus(
  orderId: number,
  status: AdminOrderStatus,
  extra?: { courierName?: string; courierTrackingNumber?: string },
): Promise<OrderStatusUpdateResult> {
  const res = await api.patch<OrderStatusUpdateResult>(`/admin/orders/${orderId}/status`, {
    status,
    ...extra,
  });
  return res.data;
}

/** Indicadores reales del día para el resumen del panel (`/admin`). */
export async function getDashboardStats(options?: {
  cookieHeader?: string | null;
}): Promise<{ stats: DashboardStats; source: 'api' | 'offline' }> {
  const headers: Record<string, string> = {};
  if (options?.cookieHeader) headers['Cookie'] = options.cookieHeader;

  try {
    const [ordersRes, productsRes] = await Promise.all([
      api.get<AdminOrder[]>('/admin/orders', { headers, signal: AbortSignal.timeout(4000) }),
      api.get<Product[]>('/admin/products', { headers, signal: AbortSignal.timeout(4000) }),
    ]);

    const orders = Array.isArray(ordersRes.data) ? ordersRes.data : [];
    const products = Array.isArray(productsRes.data) ? productsRes.data : [];

    const lowStock = products.filter(
      (product) => product.stock > 0 && product.stock <= (product.lowStockThreshold ?? 1),
    ).length;
    const outOfStock = products.filter((product) => product.stock <= 0).length;

    return {
      stats: {
        toDispatchToday: orders.filter((order) => order.status === 'PAID').length,
        pendingPayment: orders.filter((order) => order.status === 'PENDING').length,
        shippedToday: orders.filter((order) => order.status === 'SHIPPED').length,
        lowStock,
        outOfStock,
      },
      source: 'api',
    };
  } catch {
    return {
      stats: {
        toDispatchToday: 0,
        pendingPayment: 0,
        shippedToday: 0,
        lowStock: 0,
        outOfStock: 0,
      },
      source: 'offline',
    };
  }
}

/** Lee la configuración de la tienda y las tarifas de envío (`GET /api/v1/admin/settings`). */
export async function getAdminSettings(): Promise<AdminSettingsResponse> {
  const res = await api.get<AdminSettingsResponse>('/admin/settings', {
    signal: AbortSignal.timeout(5000),
  });
  return res.data;
}

/** Guarda claves de configuración de la tienda (`PUT /api/v1/admin/settings`). */
export async function saveAdminSettings(
  settings: Record<string, string | number | boolean>,
): Promise<Record<string, string>> {
  const res = await api.put<{ settings: Record<string, string> }>('/admin/settings', { settings });
  return res.data.settings;
}

/** Actualiza el costo o plazo de envío de una región (`PUT /api/v1/admin/settings/shipping-rates/:regionCode`). */
export async function saveAdminShippingRate(
  regionCode: string,
  changes: {
    baseCostClp?: number;
    estimatedDays?: string;
    courierName?: string;
    isPayableOnDelivery?: boolean;
    isActive?: boolean;
  },
): Promise<ShippingRate> {
  const res = await api.put<ShippingRate>(
    `/admin/settings/shipping-rates/${encodeURIComponent(regionCode)}`,
    changes,
  );
  return res.data;
}
