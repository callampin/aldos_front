/**
 * Capa de datos del panel de administración (Etapa 4).
 *
 * MODO DEMO: si el backend no responde, usa pedidos de ejemplo locales.
 * Ver `NOTAS.md` — el login, la sesión y estos datos deben reemplazarse por
 * el Worker API (`/api/v1/admin/*`) antes de desplegar.
 */

import { ApiError, api } from './api-client';
import { SEED_PRODUCTS } from './catalog-seed';

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

export interface AdminSession {
  email: string;
  name: string;
  token: string;
}

export interface DashboardStats {
  toDispatchToday: number;
  pendingPayment: number;
  shippedToday: number;
  lowStock: number;
  outOfStock: number;
}

const TODAY = new Date().toISOString().slice(0, 10);

export const MOCK_ORDERS: AdminOrder[] = [
  {
    id: 1,
    orderNumber: 'ALD-2026-0001',
    trackingCode: 'ALD-8F3K9P',
    customerName: 'Juan Pérez',
    customerPhone: '+56912345678',
    customerEmail: 'juan@example.cl',
    customerRut: '12.345.678-5',
    regionName: 'Metropolitana',
    comuna: 'Maipú',
    addressLine: 'Av. Los Pajaritos 1234, casa 5',
    addressReference: 'Portón negro',
    paymentMethod: 'KHIPU',
    paymentStatus: 'PAID',
    status: 'PAID',
    subtotalClp: 84980,
    shippingCostClp: 3990,
    totalClp: 88970,
    items: [
      { sku: 'XR250R-PST-STD', name: 'Kit Pistón Original Honda XR 250R STD', quantity: 1, unitPriceClp: 45990 },
      { sku: 'XR250-KIT-ARR', name: 'Kit de Arrastre Honda XR 250 Tornado', quantity: 1, unitPriceClp: 38990 },
    ],
    createdAt: `${TODAY}T09:12:00`,
    paidAt: `${TODAY}T09:13:00`,
  },
  {
    id: 2,
    orderNumber: 'ALD-2026-0002',
    trackingCode: 'ALD-K2M4QP',
    customerName: 'María Soto',
    customerPhone: '+56987654321',
    customerEmail: 'maria@example.cl',
    regionName: 'Biobío',
    comuna: 'Concepción',
    addressLine: 'Calle O’Higgins 456',
    paymentMethod: 'BANK_TRANSFER',
    paymentStatus: 'PENDING',
    status: 'PENDING',
    subtotalClp: 19990,
    shippingCostClp: 5990,
    totalClp: 25980,
    items: [{ sku: 'EXC-BRAKE-FR', name: 'Pastillas de Freno Delanteras KTM EXC', quantity: 1, unitPriceClp: 19990 }],
    createdAt: `${TODAY}T10:05:00`,
  },
  {
    id: 3,
    orderNumber: 'ALD-2026-0003',
    trackingCode: 'ALD-P7R2WX',
    customerName: 'Pedro Rojas',
    customerPhone: '+56955551234',
    customerEmail: 'pedro@example.cl',
    regionName: 'Valparaíso',
    comuna: 'Viña del Mar',
    addressLine: 'Av. Libertad 789, depto 12',
    paymentMethod: 'KHIPU',
    paymentStatus: 'PAID',
    status: 'SHIPPED',
    courierName: 'Chilexpress',
    courierTrackingNumber: 'CX-99887766',
    subtotalClp: 15990,
    shippingCostClp: 4490,
    totalClp: 20480,
    items: [{ sku: 'MOTOREX-2T', name: 'Aceite Motorex Cross Power 2T', quantity: 1, unitPriceClp: 15990 }],
    createdAt: `${TODAY}T08:40:00`,
    paidAt: `${TODAY}T08:41:00`,
    shippedAt: `${TODAY}T11:30:00`,
  },
  {
    id: 4,
    orderNumber: 'ALD-2026-0004',
    trackingCode: 'ALD-Z9T4HN',
    customerName: 'Camila Díaz',
    customerPhone: '+56944443322',
    customerEmail: 'camila@example.cl',
    regionName: 'La Araucanía',
    comuna: 'Temuco',
    addressLine: 'Calle Prat 321',
    paymentMethod: 'KHIPU',
    paymentStatus: 'PAID',
    status: 'PAID',
    subtotalClp: 8990,
    shippingCostClp: 6490,
    totalClp: 15480,
    items: [{ sku: 'NGK-IR-UNIV', name: 'Bujía NGK Iridium', quantity: 1, unitPriceClp: 8990 }],
    createdAt: `${TODAY}T11:50:00`,
    paidAt: `${TODAY}T11:51:00`,
  },
  {
    id: 5,
    orderNumber: 'ALD-2026-0005',
    trackingCode: 'ALD-Q5N8VB',
    customerName: 'Rodrigo Fuentes',
    customerPhone: '+56922223333',
    customerEmail: 'rodrigo@example.cl',
    regionName: 'Metropolitana',
    comuna: 'Providencia',
    addressLine: 'Av. Providencia 1000, of. 302',
    paymentMethod: 'BANK_TRANSFER',
    paymentStatus: 'PAID',
    status: 'DELIVERED',
    courierName: 'Starken',
    courierTrackingNumber: 'ST-11223344',
    subtotalClp: 54990,
    shippingCostClp: 3990,
    totalClp: 58980,
    items: [{ sku: 'XR250-CLUTCH', name: 'Kit de Embrague Honda XR 250 Tornado', quantity: 1, unitPriceClp: 54990 }],
    createdAt: `${TODAY}T07:20:00`,
    paidAt: `${TODAY}T07:35:00`,
    shippedAt: `${TODAY}T09:00:00`,
    deliveredAt: `${TODAY}T15:10:00`,
  },
  {
    id: 6,
    orderNumber: 'ALD-2026-0006',
    trackingCode: 'ALD-A1B2C3',
    customerName: 'Sofía Muñoz',
    customerPhone: '+56911112222',
    customerEmail: 'sofia@example.cl',
    regionName: 'Los Lagos',
    comuna: 'Puerto Montt',
    addressLine: 'Calle Urmeneta 55',
    paymentMethod: 'KHIPU',
    paymentStatus: 'PAID',
    status: 'PAID',
    subtotalClp: 27990,
    shippingCostClp: 7490,
    totalClp: 35480,
    items: [{ sku: 'CHAIN-520-XRING', name: 'Cadena 520 X-Ring Reforzada', quantity: 1, unitPriceClp: 27990 }],
    createdAt: `${TODAY}T12:15:00`,
    paidAt: `${TODAY}T12:16:00`,
  },
];

/** Inicia sesión. Sin backend devuelve una sesión demo (ver NOTAS.md). */
export async function adminLogin(email: string, password: string): Promise<AdminSession> {
  try {
    const res = await api.post<AdminSession>('/admin/auth/login', { email, password });
    return res.data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    return { email, name: email.split('@')[0] || 'Estrella', token: 'demo-session' };
  }
}

/** Recuperación de contraseña (demo). */
export async function adminForgotPassword(email: string): Promise<void> {
  try {
    await api.post('/admin/auth/forgot-password', { email });
  } catch {
    /* Sin backend: se simula el envío. */
  }
}

/** Pedidos del panel. Sin backend devuelve los de ejemplo. */
export async function getAdminOrders(): Promise<{ orders: AdminOrder[]; source: 'api' | 'mock' }> {
  try {
    const res = await api.get<AdminOrder[]>('/admin/orders', { signal: AbortSignal.timeout(2500) });
    if (Array.isArray(res.data)) return { orders: res.data, source: 'api' };
  } catch {
    /* Sin backend: datos de ejemplo. */
  }
  return { orders: MOCK_ORDERS, source: 'mock' };
}

/** Cambia el estado de un pedido (best-effort hacia la API). */
export async function patchOrderStatus(
  orderId: number,
  status: AdminOrderStatus,
  extra?: { courierName?: string; courierTrackingNumber?: string },
): Promise<void> {
  try {
    await api.patch(`/admin/orders/${orderId}/status`, { status, ...extra });
  } catch {
    /* Sin backend: el cambio queda solo en memoria del panel. */
  }
}

/** Indicadores del día para el resumen del panel. */
export async function getDashboardStats(): Promise<{ stats: DashboardStats; source: 'api' | 'mock' }> {
  let orders = MOCK_ORDERS;
  let source: 'api' | 'mock' = 'mock';
  try {
    const res = await api.get<AdminOrder[]>('/admin/orders', { signal: AbortSignal.timeout(2500) });
    if (Array.isArray(res.data) && res.data.length > 0) {
      orders = res.data;
      source = 'api';
    }
  } catch {
    /* usa mock */
  }

  const lowStock = SEED_PRODUCTS.filter(
    (product) => product.stock > 0 && product.stock <= product.lowStockThreshold,
  ).length;
  const outOfStock = SEED_PRODUCTS.filter((product) => product.stock <= 0).length;

  return {
    stats: {
      toDispatchToday: orders.filter((order) => order.status === 'PAID').length,
      pendingPayment: orders.filter((order) => order.status === 'PENDING').length,
      shippedToday: orders.filter((order) => order.status === 'SHIPPED').length,
      lowStock,
      outOfStock,
    },
    source,
  };
}
