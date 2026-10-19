/**
 * Datos y acciones del inventario, fotos en R2 y mantenedor de motos (`/api/v1/admin/*`).
 */

import { api } from './api-client';
import type { Product, ProductLine, SaleMode } from './catalog';

export interface ProductQuickUpdate {
  priceClp?: number;
  stock?: number;
  lowStockThreshold?: number;
  saleMode?: SaleMode;
  isActive?: boolean;
}

export interface CompatibilityWarning {
  brand: string;
  model: string;
  message: string;
}

export interface ProductSaveResponse {
  product: Product;
  warnings: CompatibilityWarning[];
}

export interface ProductImageItem {
  id: number;
  url: string;
  altText?: string | null;
  isPrimary: boolean;
  sortOrder: number;
}

export interface BatchReportEntry {
  row: number;
  sku?: string;
  message: string;
}

export interface BatchImportReport {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: BatchReportEntry[];
  warnings: BatchReportEntry[];
}

export interface AdminMotorcycleItem {
  id: number;
  brand: string;
  model: string;
  line: ProductLine;
  yearFrom: number | null;
  yearTo: number | null;
}

/** Lista de productos del panel (`GET /api/v1/admin/products`). */
export async function getAdminProducts(): Promise<{ products: Product[]; source: 'api' }> {
  const res = await api.get<Product[]>('/admin/products', { signal: AbortSignal.timeout(5000) });
  return { products: Array.isArray(res.data) ? res.data : [], source: 'api' };
}

/** Guardado inmediato de una celda editada en la tabla (`PATCH /api/v1/admin/products/:id/quick-update`). */
export async function quickUpdateProduct(id: number, changes: ProductQuickUpdate): Promise<void> {
  await api.patch(`/admin/products/${id}/quick-update`, changes);
}

/** Crea o actualiza un producto completo (`POST` o `PUT /api/v1/admin/products`). */
export async function saveAdminProduct(product: Product): Promise<ProductSaveResponse> {
  const payload = {
    sku: product.sku,
    name: product.name,
    slug: product.slug || undefined,
    categorySlug: product.categorySlug || undefined,
    description: product.description ?? null,
    oemPartNumber: product.oemPartNumber ?? null,
    priceClp: product.priceClp,
    stock: product.stock,
    lowStockThreshold: product.lowStockThreshold,
    saleMode: product.saleMode,
    condition: product.condition,
    isUniversal: product.isUniversal ?? false,
    isFeatured: product.isFeatured ?? false,
    isActive: product.isActive ?? true,
    compatibility: (product.compatibility ?? []).map((entry) => ({
      brand: entry.brand,
      model: entry.model,
      yearFrom: entry.yearFrom ?? null,
      yearTo: entry.yearTo ?? null,
      fitmentNotes: entry.fitmentNotes ?? null,
    })),
  };

  if (product.id > 0) {
    const res = await api.put<ProductSaveResponse>(`/admin/products/${product.id}`, payload);
    return res.data;
  }

  const res = await api.post<ProductSaveResponse>('/admin/products', payload);
  return res.data;
}

/** Lista las fotos guardadas en R2 para un repuesto (`GET /api/v1/admin/media/product/:productId`). */
export async function getProductMedia(productId: number): Promise<ProductImageItem[]> {
  const res = await api.get<ProductImageItem[]>(`/admin/media/product/${productId}`);
  return Array.isArray(res.data) ? res.data : [];
}

/** Sube una foto comprimida en WebP a Cloudflare R2 (`POST /api/v1/admin/media/upload`). */
export async function uploadProductMedia(
  productId: number,
  file: File,
  options?: { altText?: string; isPrimary?: boolean },
): Promise<ProductImageItem> {
  const form = new FormData();
  form.append('productId', String(productId));
  form.append('file', file);
  if (options?.altText) form.append('altText', options.altText);
  if (options?.isPrimary) form.append('isPrimary', 'true');

  const res = await api.post<{ image: ProductImageItem }>('/admin/media/upload', form);
  return res.data.image;
}

/** Borra una foto de R2 y de la base de datos (`DELETE /api/v1/admin/media/:imageId`). */
export async function deleteProductMedia(
  imageId: number,
): Promise<{ id: number; promotedImageId: number | null; message: string }> {
  const res = await api.delete<{ id: number; promotedImageId: number | null; message: string }>(
    `/admin/media/${imageId}`,
  );
  return res.data;
}

/** Envía el lote validado al backend (`POST /api/v1/admin/products/batch-import`). */
export async function batchImportProducts(rows: unknown[]): Promise<BatchImportReport> {
  const res = await api.post<BatchImportReport>('/admin/products/batch-import', { rows });
  return res.data;
}

/** Lista todas las motos compatibles del mantenedor (`GET /api/v1/admin/motorcycles`). */
export async function getAdminMotorcycles(): Promise<AdminMotorcycleItem[]> {
  const res = await api.get<AdminMotorcycleItem[]>('/admin/motorcycles', {
    signal: AbortSignal.timeout(5000),
  });
  return Array.isArray(res.data) ? res.data : [];
}

/** Agrega un nuevo modelo de moto al mantenedor (`POST /api/v1/admin/motorcycles`). */
export async function createAdminMotorcycle(input: {
  brand: string;
  model: string;
  line?: ProductLine;
  yearFrom?: number | null;
  yearTo?: number | null;
}): Promise<{ id: number }> {
  const res = await api.post<{ id: number }>('/admin/motorcycles', input);
  return res.data;
}

/** Elimina una moto del mantenedor (`DELETE /api/v1/admin/motorcycles/:id`). */
export async function deleteAdminMotorcycle(
  id: number,
): Promise<{ id: number; message: string }> {
  const res = await api.delete<{ id: number; message: string }>(`/admin/motorcycles/${id}`);
  return res.data;
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
