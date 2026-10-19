/**
 * Datos y acciones del inventario del panel (Etapa 4).
 * MODO DEMO: sin backend usa el catálogo de ejemplo. Ver `NOTAS.md`.
 */

import { api } from './api-client';
import { SEED_PRODUCTS } from './catalog-seed';
import type { Product, SaleMode } from './catalog';

export interface ProductQuickUpdate {
  priceClp?: number;
  stock?: number;
  saleMode?: SaleMode;
  isActive?: boolean;
}

export interface ProductDraft extends Partial<Product> {
  name: string;
  sku: string;
}

/** Lista de productos del panel (con respaldo local). */
export async function getAdminProducts(): Promise<{ products: Product[]; source: 'api' | 'mock' }> {
  try {
    const res = await api.get<Product[]>('/admin/products', { signal: AbortSignal.timeout(2500) });
    if (Array.isArray(res.data)) return { products: res.data, source: 'api' };
  } catch {
    /* Sin backend: catálogo de ejemplo. */
  }
  return { products: SEED_PRODUCTS.map((product) => ({ ...product })), source: 'mock' };
}

/** Guardado inmediato de una celda editada (inline editing). */
export async function quickUpdateProduct(id: number, changes: ProductQuickUpdate): Promise<void> {
  try {
    await api.patch(`/admin/products/${id}/quick-update`, changes);
  } catch {
    /* Sin backend: el cambio queda solo en memoria. */
  }
}

/** Crea o actualiza un producto completo. */
export async function saveAdminProduct(product: Product): Promise<void> {
  try {
    if (product.id > 0) await api.put(`/admin/products/${product.id}`, product);
    else await api.post('/admin/products', product);
  } catch {
    /* Sin backend: se refleja solo en memoria. */
  }
}

/** Envía el lote validado al backend (importación masiva tipo Excel). */
export async function batchImportProducts(rows: unknown[]): Promise<void> {
  try {
    await api.post('/admin/products/batch-import', { rows });
  } catch {
    /* Sin backend: el lote queda solo en memoria. */
  }
}

/** Genera un slug legible a partir del nombre. */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
