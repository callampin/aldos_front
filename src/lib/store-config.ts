/**
 * Configuración de la tienda para checkout y confirmación.
 * Los datos bancarios y de retiro son PLACEHOLDER: deben reemplazarse por los
 * reales de Estrella (idealmente vía `store_settings` del backend).
 */

export interface BankDetails {
  bankName: string;
  accountType: string;
  accountNumber: string;
  holderName: string;
  holderRut: string;
  holderEmail: string;
}

export interface StoreConfig {
  storeName: string;
  storeEmail: string;
  whatsappNumber: string;
  pickupEnabled: boolean;
  pickupAddress: string;
  bank: BankDetails;
}

export const STORE_CONFIG: StoreConfig = {
  storeName: import.meta.env.PUBLIC_STORE_NAME || 'Aldos Motos',
  storeEmail: import.meta.env.PUBLIC_STORE_EMAIL || 'contacto@dominio.cl',
  whatsappNumber: import.meta.env.PUBLIC_WHATSAPP_NUMBER || '',
  pickupEnabled: true,
  pickupAddress: 'Retiro en taller (coordinar por WhatsApp antes de pasar).',
  bank: {
    bankName: 'Banco de Chile',
    accountType: 'Cuenta Corriente',
    accountNumber: '000-00000-00',
    holderName: 'Aldos Motos SpA',
    holderRut: '76.000.000-0',
    holderEmail: 'pagos@dominio.cl',
  },
};
