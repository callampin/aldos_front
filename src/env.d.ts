/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** URL base del Worker backend, ej. `http://localhost:8787/api/v1`. */
  readonly PUBLIC_API_URL: string;
  /** Número de WhatsApp Business de la tienda en formato `569XXXXXXXX`. */
  readonly PUBLIC_WHATSAPP_NUMBER: string;
  /** Correo institucional visible en la tienda. */
  readonly PUBLIC_STORE_EMAIL: string;
  /** Nombre comercial de la tienda. */
  readonly PUBLIC_STORE_NAME: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
