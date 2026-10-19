import { useEffect, useMemo, useState } from 'react';
import type { Product, SaleMode } from '../../lib/catalog';
import {
  getAdminProducts,
  quickUpdateProduct,
  type CompatibilityWarning,
  type ProductQuickUpdate,
} from '../../lib/admin-products';
import { formatCLP, parseCLP } from '../../lib/formatters';
import ProductFormModal from './ProductFormModal';
import ExcelBatchModal from './ExcelBatchModal';

type EditableField = 'priceClp' | 'stock';

interface CellEdit {
  id: number;
  field: EditableField;
  value: string;
}

export default function ProductsExcelTable() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<CompatibilityWarning[]>([]);
  const [query, setQuery] = useState('');
  const [savedId, setSavedId] = useState<number | null>(null);
  const [cell, setCell] = useState<CellEdit | null>(null);
  const [editing, setEditing] = useState<Product | 'new' | null>(null);
  const [batchOpen, setBatchOpen] = useState(false);

  useEffect(() => {
    getAdminProducts()
      .then((result) => {
        setProducts(result.products);
        setLoading(false);
      })
      .catch((caught) => {
        setError(caught instanceof Error ? caught.message : 'No pudimos cargar el inventario.');
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return products;
    return products.filter((product) =>
      `${product.name} ${product.sku} ${product.oemPartNumber ?? ''}`.toLowerCase().includes(term),
    );
  }, [products, query]);

  function flashSaved(id: number) {
    setSavedId(id);
    window.setTimeout(() => setSavedId((current) => (current === id ? null : current)), 1600);
  }

  async function commit(id: number, changes: ProductQuickUpdate) {
    setError(null);
    const previousSnapshot = products.find((product) => product.id === id);
    setProducts((previous) =>
      previous.map((product) => (product.id === id ? { ...product, ...changes } : product)),
    );
    try {
      await quickUpdateProduct(id, changes);
      flashSaved(id);
    } catch (caught) {
      if (previousSnapshot) {
        setProducts((previous) =>
          previous.map((product) => (product.id === id ? previousSnapshot : product)),
        );
      }
      setError(
        caught instanceof Error ? caught.message : 'No pudimos guardar el cambio en el servidor.',
      );
    }
  }

  function beginEdit(product: Product, field: EditableField) {
    setCell({ id: product.id, field, value: String(product[field] ?? 0) });
  }

  function commitCell(): number | null {
    if (!cell) return null;
    const parsed = Math.max(0, parseCLP(cell.value));
    const product = products.find((entry) => entry.id === cell.id);
    if (product && product[cell.field] !== parsed) {
      void commit(cell.id, { [cell.field]: parsed } as ProductQuickUpdate);
    }
    const editedId = cell.id;
    setCell(null);
    return editedId;
  }

  function commitAndNext(field: EditableField) {
    const editedId = commitCell();
    if (editedId == null) return;
    const index = filtered.findIndex((entry) => entry.id === editedId);
    const next = filtered[index + 1];
    if (next) setCell({ id: next.id, field, value: String(next[field] ?? 0) });
  }

  function renderEditable(product: Product, field: EditableField, formatted: string, alignRight: boolean) {
    const isEditing = cell?.id === product.id && cell.field === field;
    if (isEditing && cell) {
      return (
        <input
          autoFocus
          value={cell.value}
          onChange={(event) => setCell((current) => (current ? { ...current, value: event.target.value } : current))}
          onBlur={() => commitCell()}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commitAndNext(field);
            } else if (event.key === 'Escape') {
              setCell(null);
            }
          }}
          className={`w-24 rounded border border-competicion-500 px-2 py-1 text-sm outline-none ${alignRight ? 'text-right' : ''}`}
        />
      );
    }
    return (
      <button
        type="button"
        onClick={() => beginEdit(product, field)}
        className={`w-full rounded px-2 py-1 text-sm hover:bg-acero-200/70 ${alignRight ? 'text-right font-semibold' : ''}`}
      >
        {formatted}
      </button>
    );
  }

  return (
    <div>
      {error && (
        <p className="mb-4 rounded-lg bg-stock-out/10 px-3 py-2 text-xs font-medium text-stock-out">
          {error}
        </p>
      )}
      {warnings.length > 0 && (
        <div className="mb-4 rounded-lg bg-stock-low/15 px-3 py-2 text-xs text-stock-low">
          <p className="font-bold">Aviso sobre motos compatibles:</p>
          <ul className="mt-1 list-disc pl-4">
            {warnings.map((w, idx) => (
              <li key={`${w.brand}-${w.model}-${idx}`}>{w.message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por SKU, nombre o N° de parte…"
          className="w-full flex-1 rounded-lg border border-acero-300 px-3 py-2.5 text-sm outline-none focus:border-competicion-500 sm:w-auto"
        />
        <button
          type="button"
          onClick={() => setBatchOpen(true)}
          className="rounded-lg border border-acero-300 px-4 py-2.5 text-sm font-semibold hover:border-carbon-900"
        >
          Carga masiva en Excel
        </button>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="rounded-lg bg-competicion-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-competicion-600"
        >
          + Nuevo producto
        </button>
      </div>

      <p className="mt-2 text-xs text-acero-500">
        Haz clic en una celda para editarla. Con <kbd className="rounded bg-acero-200 px-1">Enter</kbd> guardas y
        pasas al siguiente producto.
      </p>

      {loading ? (
        <p className="mt-6 text-sm text-acero-500">Cargando inventario…</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-acero-200">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="bg-acero-200/50 text-xs uppercase tracking-wide text-acero-600">
              <tr>
                <th className="px-3 py-2">SKU</th>
                <th className="px-3 py-2">Foto</th>
                <th className="px-3 py-2">Nombre</th>
                <th className="px-3 py-2">Categoría</th>
                <th className="px-3 py-2 text-right">Precio</th>
                <th className="px-3 py-2 text-center">Stock</th>
                <th className="px-3 py-2">Modo de venta</th>
                <th className="px-3 py-2 text-center">Visible</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-acero-200">
              {filtered.map((product) => (
                <tr key={product.id} className="align-middle">
                  <td className="px-3 py-2 font-mono text-xs">{product.sku}</td>
                  <td className="px-3 py-2">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt="" className="h-9 w-9 rounded object-cover" />
                    ) : (
                      <span className="grid h-9 w-9 place-items-center rounded bg-acero-200/60 text-sm" aria-hidden="true">🏍️</span>
                    )}
                  </td>
                  <td className="max-w-[16rem] px-3 py-2">
                    <span className="line-clamp-2 font-medium">{product.name}</span>
                    {!product.isActive && <span className="text-[11px] font-semibold text-stock-out">Oculto</span>}
                  </td>
                  <td className="px-3 py-2 text-acero-600">{product.category ?? '—'}</td>
                  <td className="px-3 py-2">{renderEditable(product, 'priceClp', formatCLP(product.priceClp), true)}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => void commit(product.id, { stock: Math.max(0, product.stock - 1) })}
                        className="grid h-7 w-7 place-items-center rounded border border-acero-300 font-bold hover:border-carbon-900"
                        aria-label="Restar stock"
                      >
                        −
                      </button>
                      <span className="w-12">{renderEditable(product, 'stock', String(product.stock), true)}</span>
                      <button
                        type="button"
                        onClick={() => void commit(product.id, { stock: product.stock + 1 })}
                        className="grid h-7 w-7 place-items-center rounded border border-acero-300 font-bold hover:border-carbon-900"
                        aria-label="Sumar stock"
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={product.saleMode}
                      onChange={(event) => void commit(product.id, { saleMode: event.target.value as SaleMode })}
                      className="rounded border border-acero-300 px-2 py-1 text-xs outline-none focus:border-competicion-500"
                    >
                      <option value="DIRECT">Compra Directa</option>
                      <option value="WHATSAPP_ONLY">Solo WhatsApp</option>
                    </select>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={product.isActive ?? true}
                      onChange={(event) => void commit(product.id, { isActive: event.target.checked })}
                      className="h-5 w-5 accent-competicion-500"
                      aria-label={`Visible en tienda: ${product.name}`}
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    {savedId === product.id ? (
                      <span className="text-xs font-semibold text-stock-ok">Guardado ✓</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditing(product)}
                        className="text-xs font-semibold text-competicion-600 underline"
                      >
                        Editar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="p-6 text-center text-sm text-acero-500">No hay productos que coincidan con la búsqueda.</p>
          )}
        </div>
      )}

      <p className="mt-2 text-right text-xs text-acero-500">{filtered.length} producto(s)</p>

      {editing && (
        <ProductFormModal
          product={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={(saved, saveWarnings) => {
            setWarnings(saveWarnings);
            if (editing === 'new') {
              setProducts((previous) => [saved, ...previous]);
            } else {
              setProducts((previous) =>
                previous.map((entry) => (entry.id === saved.id ? { ...entry, ...saved } : entry)),
              );
            }
            flashSaved(saved.id);
            setEditing(null);
          }}
        />
      )}

      {batchOpen && (
        <ExcelBatchModal
          products={products}
          onClose={() => setBatchOpen(false)}
          onApplied={(updated) => setProducts(updated)}
        />
      )}
    </div>
  );
}
