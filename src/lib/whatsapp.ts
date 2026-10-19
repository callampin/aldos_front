/**
 * Generador de enlaces `wa.me` con mensajes pre-armados.
 *
 * Los mensajes son 100% estáticos y redactados por humanos: aquí NO hay chatbots
 * ni respuestas automáticas (Restricción C-01 / RF-18).
 */

import { toWhatsAppNumber } from './formatters';

const FALLBACK_PHONE = import.meta.env.PUBLIC_WHATSAPP_NUMBER || '';
const FALLBACK_STORE_NAME = import.meta.env.PUBLIC_STORE_NAME || 'la tienda';

/** Número de WhatsApp de la tienda (solo dígitos, formato `wa.me`). */
export function storeWhatsAppNumber(): string {
  return toWhatsAppNumber(FALLBACK_PHONE);
}

/**
 * Construye un enlace `https://wa.me/<número>?text=<mensaje>`.
 * Si no se indica `phone`, usa el número configurado de la tienda.
 */
export function buildWhatsAppLink(phone: string | undefined, message?: string): string {
  const number = toWhatsAppNumber(phone || FALLBACK_PHONE);
  const base = `https://wa.me/${number}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export interface ProductInquiryInput {
  productName: string;
  sku: string;
  url?: string;
  oemPartNumber?: string | null;
  customerName?: string;
  storeName?: string;
  phone?: string;
}

/** Consulta por un repuesto concreto (RF-09 / HU-07): incluye nombre, SKU y enlace. */
export function productInquiryLink(input: ProductInquiryInput): string {
  const store = input.storeName ?? FALLBACK_STORE_NAME;
  const lines = [
    `Hola ${store}, me interesa este repuesto:`,
    `• ${input.productName}`,
    `• SKU: ${input.sku}`,
    input.oemPartNumber ? `• N° de parte (OEM): ${input.oemPartNumber}` : null,
    input.url ? `• ${input.url}` : null,
    '',
    input.customerName ? `Mi nombre es ${input.customerName}. ` : '',
    '¿Tienen disponibilidad y precio?',
  ].filter((line): line is string => line !== null);
  return buildWhatsAppLink(input.phone, lines.join('\n'));
}

/** Consulta libre (dudas técnicas). El cliente escribe el mensaje. */
export function generalInquiryLink(options: { message: string; phone?: string }): string {
  return buildWhatsAppLink(options.phone, options.message);
}

export interface DispatchNoticeInput {
  /** Nombre del cliente (destinatario). */
  customerName: string;
  orderNumber: string;
  courier: string;
  trackingNumber: string;
  /** WhatsApp del cliente, para avisarle del despacho (RF-08 / HU-03). */
  phone: string;
  storeName?: string;
}

/** Aviso de despacho que Estrella envía al cliente en 1 clic. */
export function dispatchNoticeLink(input: DispatchNoticeInput): string {
  const store = input.storeName ?? FALLBACK_STORE_NAME;
  const message =
    `¡Hola ${input.customerName}! Soy ${store}. ` +
    `Tu pedido #${input.orderNumber} ya fue despachado hoy por ${input.courier}. ` +
    `Tu código de seguimiento es ${input.trackingNumber}. ¡Gracias por tu compra!`;
  return buildWhatsAppLink(input.phone, message);
}
