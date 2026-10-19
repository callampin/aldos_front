/**
 * Importación / exportación masiva en Excel (.xlsx) con SheetJS (RF-07 / R-02).
 * `xlsx` se importa dinámicamente: solo se usa en el navegador (descarga y lectura).
 */

import type { Product, SaleMode } from './catalog';
import { parseCLP } from './formatters';

export const EXCEL_HEADERS = [
  'SKU',
  'Nombre',
  'Categoria',
  'Precio',
  'Stock',
  'ModoVenta',
  'OEM',
  'ModelosCompatibles',
  'Visible',
] as const;

export interface ParsedRow {
  sku: string;
  name: string;
  category?: string;
  priceClp: number;
  stock: number;
  saleMode: SaleMode;
  oemPartNumber?: string | null;
  /** `Marca:Modelo`, ej. `["Honda:XR 250R"]`. */
  compatibility: string[];
  isActive: boolean;
}

export interface RowError {
  /** Fila en la planilla (1 = encabezado). */
  row: number;
  sku?: string;
  message: string;
}

export interface ParseResult {
  rows: ParsedRow[];
  errors: RowError[];
}

export type ChangeType = 'create' | 'update' | 'unchanged';

export interface RowChange {
  row: ParsedRow;
  type: ChangeType;
  /** Campos modificados (solo en `update`). */
  changes: string[];
}

async function loadXlsx() {
  return import('xlsx');
}

function saleModeToText(mode: SaleMode): string {
  return mode === 'DIRECT' ? 'Compra Directa' : 'Solo WhatsApp';
}

function parseSaleMode(value: unknown): SaleMode {
  const text = String(value ?? '').toLowerCase();
  if (text.includes('whatsapp') || text.includes('consulta')) return 'WHATSAPP_ONLY';
  return 'DIRECT';
}

function parseVisible(value: unknown): boolean {
  const text = String(value ?? '').trim().toLowerCase();
  return !(text === 'no' || text === '0' || text === 'false' || text === 'oculto');
}

function toRows(products: Product[]): Array<Record<string, string | number>> {
  return products.map((product) => ({
    SKU: product.sku,
    Nombre: product.name,
    Categoria: product.category ?? '',
    Precio: product.priceClp,
    Stock: product.stock,
    ModoVenta: saleModeToText(product.saleMode),
    OEM: product.oemPartNumber ?? '',
    ModelosCompatibles: (product.compatibility ?? [])
      .map((entry) => `${entry.brand}:${entry.model}`)
      .join(' | '),
    Visible: (product.isActive ?? true) ? 'Sí' : 'No',
  }));
}

const INSTRUCTIONS = [
  ['Cómo usar esta planilla'],
  [''],
  ['1. Edita el precio, el stock o el modo de venta directamente en la hoja "Catálogo".'],
  ['2. Puedes agregar filas nuevas; el SKU es obligatorio y único.'],
  ['3. Guarda el archivo como .xlsx y súbelo al panel para revisar los cambios.'],
  [''],
  ['Columnas:'],
  ['SKU: código único del repuesto.'],
  ['Nombre: nombre visible del producto.'],
  ['Categoria: por ejemplo Motor, Frenos, Transmisión, Accesorios Enduro.'],
  ['Precio: en pesos chilenos, sin puntos (ej. 45990).'],
  ['Stock: unidades disponibles.'],
  ['ModoVenta: "Compra Directa" o "Solo WhatsApp".'],
  ['OEM: número de parte original (opcional).'],
  ['ModelosCompatibles: Marca:Modelo separados por " | " (ej. Honda:XR 250R | KTM:EXC 300).'],
  ['Visible: "Sí" o "No".'],
];

async function buildWorkbook(products: Product[], withInstructions: boolean) {
  const XLSX = await loadXlsx();
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(toRows(products), { header: [...EXCEL_HEADERS] });
  XLSX.utils.book_append_sheet(workbook, sheet, 'Catálogo');
  if (withInstructions) {
    const help = XLSX.utils.aoa_to_sheet(INSTRUCTIONS);
    XLSX.utils.book_append_sheet(workbook, help, 'Instrucciones');
  }
  return { XLSX, workbook };
}

/** Descarga el catálogo actual como `.xlsx`. */
export async function exportCatalogToXlsx(products: Product[], filename = 'catalogo-aldos.xlsx'): Promise<void> {
  const { XLSX, workbook } = await buildWorkbook(products, true);
  XLSX.writeFile(workbook, filename);
}

/** Genera el catálogo en `.xlsx` como bytes (sin descargar). */
export async function buildCatalogWorkbookArrayBuffer(products: Product[]): Promise<ArrayBuffer> {
  const { XLSX, workbook } = await buildWorkbook(products, true);
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}

/** Descarga una plantilla vacía (con ejemplo e instrucciones). */
export async function exportTemplateXlsx(): Promise<void> {
  const example: Product[] = [
    {
      id: 0,
      sku: 'EJEMPLO-001',
      name: 'Kit Pistón Honda XR 250R',
      slug: 'ejemplo',
      priceClp: 45990,
      stock: 3,
      lowStockThreshold: 1,
      saleMode: 'DIRECT',
      condition: 'NEW',
      category: 'Motor',
      oemPartNumber: '13101-KCE-670',
      isActive: true,
      compatibility: [{ brand: 'Honda', model: 'XR 250R' }],
    },
  ];
  const { XLSX, workbook } = await buildWorkbook(example, true);
  XLSX.writeFile(workbook, 'plantilla-catalogo-aldos.xlsx');
}

/** Lee un `.xlsx` subido y valida cada fila. */
export async function parseProductsXlsx(input: File | ArrayBuffer | Uint8Array): Promise<ParseResult> {
  const XLSX = await loadXlsx();
  let buffer: ArrayBuffer;
  if (input instanceof ArrayBuffer) {
    buffer = input;
  } else if (input instanceof Uint8Array) {
    buffer = input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength) as ArrayBuffer;
  } else {
    buffer = await input.arrayBuffer();
  }
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
  if (!sheet) {
    return { rows: [], errors: [{ row: 0, message: 'El archivo no tiene hojas.' }] };
  }

  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  const rows: ParsedRow[] = [];
  const errors: RowError[] = [];

  raw.forEach((entry, index) => {
    const excelRow = index + 2; // la fila 1 es el encabezado
    const sku = String(entry.SKU ?? '').trim();
    const name = String(entry.Nombre ?? '').trim();

    if (!sku) {
      errors.push({ row: excelRow, message: 'Falta el SKU.' });
      return;
    }
    if (!name) {
      errors.push({ row: excelRow, sku, message: 'Falta el nombre.' });
      return;
    }

    const priceValue = entry.Precio;
    const priceClp =
      typeof priceValue === 'number' ? Math.round(priceValue) : parseCLP(String(priceValue ?? ''));
    if (!Number.isFinite(priceClp) || priceClp < 0) {
      errors.push({ row: excelRow, sku, message: 'El precio no es válido.' });
      return;
    }

    const stockValue = Number(entry.Stock);
    if (!Number.isFinite(stockValue) || stockValue < 0) {
      errors.push({ row: excelRow, sku, message: 'El stock no es válido.' });
      return;
    }

    const compatibility = String(entry.ModelosCompatibles ?? '')
      .split('|')
      .map((part) => part.trim())
      .filter(Boolean);

    rows.push({
      sku,
      name,
      category: String(entry.Categoria ?? '').trim() || undefined,
      priceClp,
      stock: Math.trunc(stockValue),
      saleMode: parseSaleMode(entry.ModoVenta),
      oemPartNumber: String(entry.OEM ?? '').trim() || null,
      compatibility,
      isActive: parseVisible(entry.Visible),
    });
  });

  return { rows, errors };
}

function compatibilityKey(list: Array<string | undefined>): string {
  return (list ?? []).filter(Boolean).join(' | ');
}

/** Compara la planilla con el catálogo actual y clasifica cada fila. */
export function diffProducts(existing: Product[], parsed: ParsedRow[]): RowChange[] {
  const bySku = new Map(existing.map((product) => [product.sku, product]));

  return parsed.map((row) => {
    const current = bySku.get(row.sku);
    if (!current) return { row, type: 'create', changes: [] };

    const changes: string[] = [];
    if (current.name !== row.name) changes.push('Nombre');
    if (current.priceClp !== row.priceClp) changes.push('Precio');
    if (current.stock !== row.stock) changes.push('Stock');
    if (current.saleMode !== row.saleMode) changes.push('Modo de venta');
    if ((current.oemPartNumber ?? '') !== (row.oemPartNumber ?? '')) changes.push('OEM');
    if ((current.isActive ?? true) !== row.isActive) changes.push('Visibilidad');
    const currentCompat = compatibilityKey((current.compatibility ?? []).map((entry) => `${entry.brand}:${entry.model}`));
    if (currentCompat !== compatibilityKey(row.compatibility)) changes.push('Motos compatibles');

    return { row, type: changes.length > 0 ? 'update' : 'unchanged', changes };
  });
}

/** Resumen del lote para la previsualización. */
export function summarizeChanges(changes: RowChange[], errors: RowError[]): {
  created: number;
  updated: number;
  unchanged: number;
  errors: number;
} {
  return {
    created: changes.filter((change) => change.type === 'create').length,
    updated: changes.filter((change) => change.type === 'update').length,
    unchanged: changes.filter((change) => change.type === 'unchanged').length,
    errors: errors.length,
  };
}
