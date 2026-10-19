/**
 * Formateadores y validadores de datos chilenos.
 * Sin dependencias externas. Todo el dinero se maneja como entero CLP.
 */

/* ============================ Dinero (CLP) ============================ */

const clpFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

/** Formatea un entero CLP con separador de miles: `300000` → `$300.000`. */
export function formatCLP(value: number | null | undefined): string {
  const n = Number(value);
  return clpFormatter.format(Number.isFinite(n) ? Math.round(n) : 0);
}

/** Extrae un entero CLP desde texto libre: `"$300.000"` → `300000`. */
export function parseCLP(input: string): number {
  const digits = input.replace(/[^\d-]/g, '');
  const n = Number.parseInt(digits, 10);
  return Number.isNaN(n) ? 0 : n;
}

/* ============================== RUT chileno ============================== */

/** Normaliza un RUT dejando solo dígitos y la letra verificadora en mayúscula. */
export function cleanRut(rut: string): string {
  return rut.replace(/[^0-9kK]/g, '').toUpperCase();
}

/** Calcula el dígito verificador (módulo 11) del cuerpo de un RUT. */
export function computeRutDv(body: string): string {
  let sum = 0;
  let factor = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const remainder = 11 - (sum % 11);
  if (remainder === 11) return '0';
  if (remainder === 10) return 'K';
  return String(remainder);
}

/** Valida un RUT chileno aplicando el algoritmo del módulo 11. */
export function validateRut(rut: string): boolean {
  const clean = cleanRut(rut);
  // Cuerpo de 7 u 8 dígitos + dígito verificador.
  if (clean.length < 8 || clean.length > 9) return false;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  if (!/^\d+$/.test(body)) return false;
  return computeRutDv(body) === dv;
}

/** Formatea un RUT con puntos y guion: `123456785` → `12.345.678-5`. */
export function formatRut(rut: string): string {
  const clean = cleanRut(rut);
  if (clean.length < 2) return clean;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  const withDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${withDots}-${dv}`;
}

/* =============================== Teléfonos =============================== */

/** Deja el número en estado "nacional" (sin +56 ni 0 de larga distancia). */
function nationalDigits(input: string): string {
  let digits = input.replace(/\D/g, '');
  if (digits.startsWith('56')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}

/**
 * Normaliza un teléfono chileno al formato E.164 usado por el backend: `+56912345678`.
 * Acepta `9 1234 5678`, `912345678`, `56912345678` o `+56 9 1234 5678`.
 */
export function normalizePhone(input: string): string {
  return `+56${nationalDigits(input)}`;
}

/** Comprueba si el número corresponde a un móvil chileno (`+569` + 8 dígitos). */
export function isValidChileanMobile(input: string): boolean {
  return /^9\d{8}$/.test(nationalDigits(input));
}

/** Muestra un móvil chileno como `+56 9 1234 5678`. */
export function formatPhone(input: string): string {
  const national = nationalDigits(input);
  if (/^9\d{8}$/.test(national)) {
    return `+56 ${national[0]} ${national.slice(1, 5)} ${national.slice(5)}`;
  }
  return `+56 ${national}`.trim();
}

/** Devuelve solo dígitos para enlaces `wa.me`: `+56912345678` → `56912345678`. */
export function toWhatsAppNumber(input: string): string {
  return normalizePhone(input).replace(/^\+/, '');
}

/* ================================ Fechas ================================ */

const dateFormatter = new Intl.DateTimeFormat('es-CL', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'America/Santiago',
});

const dateTimeFormatter = new Intl.DateTimeFormat('es-CL', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Santiago',
});

function toDate(value: Date | string | number): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Formatea una fecha en horario de Chile: `dd-mm-yyyy`. */
export function formatDateCL(value: Date | string | number): string {
  const date = toDate(value);
  return date ? dateFormatter.format(date) : '';
}

/** Formatea fecha y hora en horario de Chile: `dd-mm-yyyy HH:mm`. */
export function formatDateTimeCL(value: Date | string | number): string {
  const date = toDate(value);
  return date ? dateTimeFormatter.format(date) : '';
}
