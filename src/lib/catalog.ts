/**
 * Capa de datos del catálogo público.
 * Intenta `GET /public/catalog`; si el backend no responde, filtra el catálogo
 * local de respaldo (`catalog-seed.ts`) para que la tienda siga navegable.
 */

import { api } from './api-client';
import { SEED_PRODUCTS } from './catalog-seed';

export type SaleMode = 'DIRECT' | 'WHATSAPP_ONLY';
export type ProductCondition = 'NEW' | 'USED';
export type ProductLine = 'XR_CLASSIC' | 'ENDURO' | 'MULTI';

export interface ProductCompatibility {
  brand: string;
  model: string;
  yearFrom?: number;
  yearTo?: number;
  /** Notas técnicas de Aldo (ej. "Solo versión japonesa con carburador original"). */
  fitmentNotes?: string;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  slug: string;
  priceClp: number;
  stock: number;
  lowStockThreshold: number;
  saleMode: SaleMode;
  condition: ProductCondition;
  category?: string;
  categorySlug?: string;
  line?: ProductLine;
  oemPartNumber?: string | null;
  description?: string;
  imageUrl?: string | null;
  images?: string[];
  isFeatured?: boolean;
  isUniversal?: boolean;
  /** Visible en la tienda (panel de Estrella). */
  isActive?: boolean;
  compatibility?: ProductCompatibility[];
}

export const CATEGORIES: Array<{ slug: string; name: string }> = [
  { slug: 'motor', name: 'Motor' },
  { slug: 'suspension', name: 'Suspensión' },
  { slug: 'frenos', name: 'Frenos' },
  { slug: 'transmision', name: 'Transmisión' },
  { slug: 'plasticos-chasis', name: 'Plásticos y Chasis' },
  { slug: 'electrico', name: 'Eléctrico' },
  { slug: 'accesorios-enduro', name: 'Accesorios Enduro' },
];

export type CatalogSort = 'price_asc' | 'price_desc' | 'newest';

export const SORT_OPTIONS: Array<{ value: CatalogSort; label: string }> = [
  { value: 'newest', label: 'Más nuevos' },
  { value: 'price_asc', label: 'Menor precio' },
  { value: 'price_desc', label: 'Mayor precio' },
];

export interface CatalogFilters {
  q?: string;
  category?: string;
  brand?: string;
  model?: string;
  year?: number;
  line?: ProductLine;
  inStockOnly?: boolean;
  sort?: CatalogSort;
  page?: number;
  limit?: number;
}

export interface CatalogResult {
  items: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  source: 'api' | 'fallback';
}

const DEFAULT_LIMIT = 12;

/** Normaliza un producto del backend aceptando `snake_case` o `camelCase`. */
function normalizeProduct(value: unknown): Product {
  const raw = (value ?? {}) as Partial<Product> & Record<string, unknown>;
  const pick = <T>(camel: string, snake: string, fallback: T): T =>
    (raw[camel] as T | undefined) ?? (raw[snake] as T | undefined) ?? fallback;

  return {
    id: pick('id', 'id', 0),
    sku: pick('sku', 'sku', ''),
    name: pick('name', 'name', ''),
    slug: pick('slug', 'slug', ''),
    priceClp: pick('priceClp', 'price_clp', 0),
    stock: pick('stock', 'stock', 0),
    lowStockThreshold: pick('lowStockThreshold', 'low_stock_threshold', 1),
    saleMode: pick<SaleMode>('saleMode', 'sale_mode', 'DIRECT'),
    condition: pick<ProductCondition>('condition', 'condition', 'NEW'),
    category: pick<string | undefined>('category', 'category', undefined),
    categorySlug: pick<string | undefined>('categorySlug', 'category_slug', undefined),
    line: pick<ProductLine | undefined>('line', 'line', undefined),
    oemPartNumber: pick<string | null>('oemPartNumber', 'oem_part_number', null),
    description: pick<string | undefined>('description', 'description', undefined),
    imageUrl: pick<string | null>('imageUrl', 'image_url', null),
    images: (raw.images as string[] | undefined) ?? undefined,
    isFeatured: Boolean(pick('isFeatured', 'is_featured', false)),
    isUniversal: Boolean(pick('isUniversal', 'is_universal', false)),
    isActive: pick<boolean>('isActive', 'is_active', true),
    compatibility: (raw.compatibility as ProductCompatibility[] | undefined) ?? [],
  };
}

/** Lee los filtros desde la URL (`/catalogo?...`). */
export function parseCatalogFilters(params: URLSearchParams): CatalogFilters {
  const sortParam = params.get('sort');
  const sort: CatalogSort =
    sortParam === 'price_asc' || sortParam === 'price_desc' || sortParam === 'newest'
      ? sortParam
      : 'newest';
  const lineParam = params.get('line');
  const yearParam = Number(params.get('year'));

  return {
    q: params.get('q')?.trim() || undefined,
    category: params.get('category') || undefined,
    brand: params.get('brand') || undefined,
    model: params.get('model') || undefined,
    year: Number.isFinite(yearParam) && yearParam > 1900 ? yearParam : undefined,
    line: lineParam === 'XR_CLASSIC' || lineParam === 'ENDURO' || lineParam === 'MULTI' ? lineParam : undefined,
    inStockOnly: params.get('inStock') === '1' || params.get('inStock') === 'true',
    sort,
    page: Math.max(1, Number(params.get('page')) || 1),
  };
}

function matchesBike(product: Product, filters: CatalogFilters): boolean {
  if (!filters.brand && !filters.model && !filters.year) return true;
  if (product.isUniversal) return true;
  return (product.compatibility ?? []).some((entry) => {
    if (filters.brand && entry.brand !== filters.brand) return false;
    if (filters.model && entry.model !== filters.model) return false;
    if (filters.year) {
      const from = entry.yearFrom ?? 0;
      const to = entry.yearTo ?? 9999;
      if (filters.year < from || filters.year > to) return false;
    }
    return true;
  });
}

function sortProducts(products: Product[], sort: CatalogSort): Product[] {
  const copy = [...products];
  if (sort === 'price_asc') return copy.sort((a, b) => a.priceClp - b.priceClp);
  if (sort === 'price_desc') return copy.sort((a, b) => b.priceClp - a.priceClp);
  return copy.sort((a, b) => b.id - a.id);
}

function foldText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function localCatalog(filters: CatalogFilters): CatalogResult {
  const q = filters.q ? foldText(filters.q) : '';
  const limit = filters.limit ?? DEFAULT_LIMIT;

  const filtered = SEED_PRODUCTS.filter((product) => {
    if (q) {
      const haystack = foldText(`${product.name} ${product.sku} ${product.oemPartNumber ?? ''}`);
      if (!haystack.includes(q)) return false;
    }
    if (filters.category && product.categorySlug !== filters.category) return false;
    if (filters.line && product.line !== filters.line) return false;
    if (filters.inStockOnly && product.stock <= 0) return false;
    return matchesBike(product, filters);
  });

  const sorted = sortProducts(filtered, filters.sort ?? 'newest');
  const total = sorted.length;
  const page = filters.page ?? 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;

  return {
    items: sorted.slice(start, start + limit),
    total,
    page,
    limit,
    totalPages,
    source: 'fallback',
  };
}

/** Busca productos aplicando filtros combinables (RF-01, RF-02). */
export async function getCatalog(filters: CatalogFilters): Promise<CatalogResult> {
  try {
    const res = await api.get<Product[]>('/public/catalog', {
      query: {
        q: filters.q,
        category: filters.category,
        brand: filters.brand,
        model: filters.model,
        year: filters.year,
        line: filters.line,
        inStockOnly: filters.inStockOnly,
        sort: filters.sort ?? 'newest',
        page: filters.page ?? 1,
        limit: filters.limit ?? DEFAULT_LIMIT,
      },
      signal: AbortSignal.timeout(2500),
    });
    const items = Array.isArray(res.data) ? res.data.map(normalizeProduct) : [];
    return {
      items,
      total: res.meta?.total ?? items.length,
      page: res.meta?.page ?? filters.page ?? 1,
      limit: res.meta?.limit ?? filters.limit ?? DEFAULT_LIMIT,
      totalPages: res.meta?.totalPages ?? 1,
      source: 'api',
    };
  } catch {
    return localCatalog(filters);
  }
}

/** Productos destacados para la portada. */
export async function getFeatured(limit = 8): Promise<{ items: Product[]; source: 'api' | 'fallback' }> {
  const result = await getCatalog({ sort: 'newest', limit: 24 });
  const featured = result.items.filter((product) => product.isFeatured);
  const items = (featured.length > 0 ? featured : result.items).slice(0, limit);
  return { items, source: result.source };
}

/** Detalle de un producto por su slug (RF-01). */
export async function getProductBySlug(slug: string): Promise<Product | null> {
  try {
    const res = await api.get<Product>(`/public/products/${encodeURIComponent(slug)}`, {
      signal: AbortSignal.timeout(2500),
    });
    return res.data ? normalizeProduct(res.data) : null;
  } catch {
    return SEED_PRODUCTS.find((product) => product.slug === slug) ?? null;
  }
}

/** Imágenes del producto (galería); al menos la principal si existe. */
export function productImages(product: Product): string[] {
  if (product.images && product.images.length > 0) return product.images;
  return product.imageUrl ? [product.imageUrl] : [];
}
