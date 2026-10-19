import { useEffect, useState } from 'react';
import type { Product, ProductCondition, ProductCompatibility, SaleMode } from '../../lib/catalog';
import { CATEGORIES } from '../../lib/catalog';
import { getMotorcycleCatalog, type MotorcycleBrand } from '../../lib/motorcycles';
import {
  deleteProductMedia,
  getProductMedia,
  saveAdminProduct,
  slugify,
  uploadProductMedia,
  type CompatibilityWarning,
  type ProductImageItem,
} from '../../lib/admin-products';
import { compressImageToWebp, fileToDataUrl } from '../../lib/image-compressor';
import { formatCLP, parseCLP } from '../../lib/formatters';

interface PendingImage {
  file: File;
  previewUrl: string;
}

interface Props {
  /** `null` = producto nuevo. */
  product: Product | null;
  onClose: () => void;
  onSave: (product: Product, warnings: CompatibilityWarning[]) => void;
}

const inputClass =
  'w-full rounded-lg border border-acero-300 px-3 py-2.5 text-sm outline-none focus:border-competicion-500 focus:ring-2 focus:ring-competicion-500/20';

export default function ProductFormModal({ product, onClose, onSave }: Props) {
  const [name, setName] = useState(product?.name ?? '');
  const [sku, setSku] = useState(product?.sku ?? '');
  const [slug, setSlug] = useState(product?.slug ?? '');
  const [categorySlug, setCategorySlug] = useState(product?.categorySlug ?? CATEGORIES[0]!.slug);
  const [price, setPrice] = useState(String(product?.priceClp ?? ''));
  const [stock, setStock] = useState(String(product?.stock ?? '0'));
  const [threshold, setThreshold] = useState(String(product?.lowStockThreshold ?? '1'));
  const [saleMode, setSaleMode] = useState<SaleMode>(product?.saleMode ?? 'DIRECT');
  const [condition, setCondition] = useState<ProductCondition>(product?.condition ?? 'NEW');
  const [oem, setOem] = useState(product?.oemPartNumber ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [isUniversal, setIsUniversal] = useState(product?.isUniversal ?? false);
  const [isActive, setIsActive] = useState(product?.isActive ?? true);

  // Fotos ya subidas en R2 vs fotos comprimidas listas para subir
  const [savedImages, setSavedImages] = useState<ProductImageItem[]>(
    (product?.images ?? (product?.imageUrl ? [product.imageUrl] : [])).map((url, idx) => ({
      id: 0,
      url,
      isPrimary: idx === 0,
      sortOrder: idx,
    })),
  );
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [compressing, setCompressing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [catalog, setCatalog] = useState<MotorcycleBrand[]>([]);
  const [selected, setSelected] = useState<Set<string>>(
    new Set((product?.compatibility ?? []).map((entry) => `${entry.brand}||${entry.model}`)),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getMotorcycleCatalog().then((data) => {
      if (active) setCatalog(data);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!product || product.id <= 0) return;
    let active = true;
    getProductMedia(product.id)
      .then((media) => {
        if (active && media.length > 0) setSavedImages(media);
      })
      .catch(() => {
        /* Mantiene las URLs ya presentes en el producto. */
      });
    return () => {
      active = false;
    };
  }, [product]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setCompressing(true);
    setError(null);

    try {
      for (const file of Array.from(files)) {
        const compressed = await compressImageToWebp(file);
        if (product && product.id > 0) {
          const uploaded = await uploadProductMedia(product.id, compressed, {
            altText: name.trim() || product.name,
            isPrimary: savedImages.length === 0,
          });
          setSavedImages((previous) => [...previous, uploaded]);
        } else {
          const previewUrl = await fileToDataUrl(compressed);
          setPendingImages((previous) => [...previous, { file: compressed, previewUrl }]);
        }
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'No pudimos procesar o subir la foto. Intenta con otra imagen.',
      );
    } finally {
      setCompressing(false);
    }
  }

  async function removeSavedImage(item: ProductImageItem, index: number) {
    setError(null);
    if (item.id > 0) {
      try {
        await deleteProductMedia(item.id);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'No pudimos borrar la foto.');
        return;
      }
    }
    setSavedImages((previous) => previous.filter((_, idx) => idx !== index));
  }

  function removePendingImage(index: number) {
    setPendingImages((previous) => previous.filter((_, idx) => idx !== index));
  }

  function toggleCompatibility(brand: string, model: string) {
    const key = `${brand}||${model}`;
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleSave() {
    if (!name.trim() || !sku.trim()) {
      setError('El nombre y el SKU son obligatorios.');
      return;
    }
    setError(null);
    setSaving(true);

    const category = CATEGORIES.find((entry) => entry.slug === categorySlug);
    const compatibility: ProductCompatibility[] = [...selected].map((key) => {
      const [brand, model] = key.split('||');
      return { brand: brand ?? '', model: model ?? '' };
    });

    const draft: Product = {
      id: product?.id ?? 0,
      sku: sku.trim(),
      name: name.trim(),
      slug: (slug.trim() || slugify(name)).trim(),
      priceClp: parseCLP(price),
      stock: Math.max(0, Number.parseInt(stock || '0', 10) || 0),
      lowStockThreshold: Math.max(0, Number.parseInt(threshold || '1', 10) || 1),
      saleMode,
      condition,
      category: category?.name,
      categorySlug: category?.slug,
      oemPartNumber: oem.trim() || null,
      description: description.trim() || undefined,
      isUniversal,
      isActive,
      compatibility,
    };

    try {
      const response = await saveAdminProduct(draft);
      const savedProduct = response.product ?? { ...draft };
      const uploadedUrls: string[] = [];

      // Si el repuesto es nuevo y había fotos listas, se suben ahora a R2 con su nuevo ID.
      if (pendingImages.length > 0 && savedProduct.id > 0) {
        for (let idx = 0; idx < pendingImages.length; idx += 1) {
          const pending = pendingImages[idx]!;
          const uploaded = await uploadProductMedia(savedProduct.id, pending.file, {
            altText: savedProduct.name,
            isPrimary: savedImages.length === 0 && idx === 0,
          });
          uploadedUrls.push(uploaded.url);
        }
      }

      const allUrls = [...savedImages.map((img) => img.url), ...uploadedUrls];
      onSave(
        {
          ...savedProduct,
          imageUrl: allUrls[0] ?? savedProduct.imageUrl ?? null,
          images: allUrls.length > 0 ? allUrls : (savedProduct.images ?? []),
        },
        response.warnings ?? [],
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No pudimos guardar el repuesto.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-carbon-950/60 p-4">
      <div className="my-4 w-full max-w-2xl rounded-xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-acero-200 px-4 py-3">
          <h2 className="font-bold">{product ? 'Editar producto' : 'Nuevo producto'}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-acero-500 hover:bg-acero-200/60 hover:text-carbon-900"
            aria-label="Cerrar"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        <div className="space-y-4 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-acero-600 sm:col-span-2">
              Nombre del repuesto *
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                onBlur={() => !slug && name && setSlug(slugify(name))}
                className={`mt-1 ${inputClass}`}
                placeholder="Ej. Kit Pistón Original Honda XR 250R STD"
              />
            </label>

            <label className="block text-xs font-semibold text-acero-600">
              SKU *
              <input type="text" value={sku} onChange={(event) => setSku(event.target.value)} className={`mt-1 ${inputClass}`} placeholder="XR250R-PST-STD" />
            </label>

            <label className="block text-xs font-semibold text-acero-600">
              Enlace del producto (SEO)
              <input type="text" value={slug} onChange={(event) => setSlug(event.target.value)} className={`mt-1 ${inputClass}`} placeholder="kit-piston-honda-xr-250r" />
            </label>

            <label className="block text-xs font-semibold text-acero-600">
              Categoría
              <select value={categorySlug} onChange={(event) => setCategorySlug(event.target.value)} className={`mt-1 ${inputClass}`}>
                {CATEGORIES.map((entry) => (
                  <option key={entry.slug} value={entry.slug}>{entry.name}</option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-semibold text-acero-600">
              N° de parte (OEM)
              <input type="text" value={oem} onChange={(event) => setOem(event.target.value)} className={`mt-1 ${inputClass}`} placeholder="13101-KCE-670" />
            </label>

            <label className="block text-xs font-semibold text-acero-600">
              Precio ($ CLP)
              <input type="text" inputMode="numeric" value={price} onChange={(event) => setPrice(event.target.value)} className={`mt-1 ${inputClass}`} placeholder="45990" />
              {price && <span className="mt-1 block text-[11px] text-acero-400">{formatCLP(parseCLP(price))}</span>}
            </label>

            <label className="block text-xs font-semibold text-acero-600">
              Stock actual
              <input type="text" inputMode="numeric" value={stock} onChange={(event) => setStock(event.target.value)} className={`mt-1 ${inputClass}`} />
            </label>

            <label className="block text-xs font-semibold text-acero-600">
              Aviso de bajo stock (unidades)
              <input type="text" inputMode="numeric" value={threshold} onChange={(event) => setThreshold(event.target.value)} className={`mt-1 ${inputClass}`} />
            </label>

            <label className="block text-xs font-semibold text-acero-600">
              Modo de venta
              <select value={saleMode} onChange={(event) => setSaleMode(event.target.value as SaleMode)} className={`mt-1 ${inputClass}`}>
                <option value="DIRECT">Compra Directa</option>
                <option value="WHATSAPP_ONLY">Solo Consultar WhatsApp</option>
              </select>
            </label>

            <label className="block text-xs font-semibold text-acero-600">
              Condición
              <select value={condition} onChange={(event) => setCondition(event.target.value as ProductCondition)} className={`mt-1 ${inputClass}`}>
                <option value="NEW">Nuevo</option>
                <option value="USED">Usado</option>
              </select>
            </label>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={isUniversal} onChange={(event) => setIsUniversal(event.target.checked)} className="h-5 w-5 accent-competicion-500" />
              Sirve para cualquier moto (universal)
            </label>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} className="h-5 w-5 accent-competicion-500" />
              Visible en la tienda
            </label>
          </div>

          <label className="block text-xs font-semibold text-acero-600">
            Descripción
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className={`mt-1 ${inputClass}`} />
          </label>

          {/* Fotos */}
          <div>
            <p className="text-xs font-semibold text-acero-600">Fotos</p>
            <p className="mt-0.5 text-[11px] text-acero-400">
              Se comprimen automáticamente a WebP (menos de 300 KB) y se guardan en Cloudflare R2.
            </p>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => void handleFiles(event.target.files)}
              className="mt-2 block w-full text-sm"
            />
            {compressing && <p className="mt-1 text-xs text-acero-500">Comprimiendo y subiendo fotos…</p>}
            {(savedImages.length > 0 || pendingImages.length > 0) && (
              <ul className="mt-2 flex flex-wrap gap-2">
                {savedImages.map((image, index) => (
                  <li key={`saved-${image.id}-${index}`} className="relative">
                    <img src={image.url} alt="" className="h-16 w-16 rounded-lg border border-acero-200 object-cover" />
                    <button
                      type="button"
                      onClick={() => void removeSavedImage(image, index)}
                      className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-carbon-900 text-xs text-white"
                      aria-label="Quitar foto"
                    >
                      ×
                    </button>
                  </li>
                ))}
                {pendingImages.map((pending, index) => (
                  <li key={`pending-${index}`} className="relative">
                    <img src={pending.previewUrl} alt="" className="h-16 w-16 rounded-lg border border-competicion-500 object-cover" />
                    <button
                      type="button"
                      onClick={() => removePendingImage(index)}
                      className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-carbon-900 text-xs text-white"
                      aria-label="Quitar foto"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Motos compatibles */}
          <div>
            <p className="text-xs font-semibold text-acero-600">Motos compatibles</p>
            <div className="mt-2 max-h-52 space-y-3 overflow-y-auto rounded-lg border border-acero-200 p-3">
              {catalog.map((brand) => (
                <div key={brand.brand}>
                  <p className="text-xs font-bold text-carbon-900">{brand.brand}</p>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                    {brand.models.map((model) => {
                      const key = `${brand.brand}||${model.model}`;
                      return (
                        <label key={key} className="flex items-center gap-1.5 text-sm">
                          <input type="checkbox" checked={selected.has(key)} onChange={() => toggleCompatibility(brand.brand, model.model)} className="h-4 w-4 accent-competicion-500" />
                          {model.model}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && <p className="rounded-lg bg-stock-out/10 px-3 py-2 text-sm text-stock-out">{error}</p>}
        </div>

        <footer className="flex justify-end gap-2 border-t border-acero-200 px-4 py-3">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="rounded-lg border border-acero-300 px-5 py-2.5 text-sm font-semibold hover:border-carbon-900 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={saving || compressing}
            onClick={() => void handleSave()}
            className="rounded-lg bg-competicion-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-competicion-600 disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar producto'}
          </button>
        </footer>
      </div>
    </div>
  );
}
