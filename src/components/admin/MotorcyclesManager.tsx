import { useEffect, useMemo, useState } from 'react';
import type { ProductLine } from '../../lib/catalog';
import {
  createAdminMotorcycle,
  deleteAdminMotorcycle,
  getAdminMotorcycles,
  type AdminMotorcycleItem,
} from '../../lib/admin-products';

/**
 * Mantenedor de marcas y modelos de motos compatibles conectado al backend (`/api/v1/admin/motorcycles`).
 */
export default function MotorcyclesManager() {
  const [items, setItems] = useState<AdminMotorcycleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBrand, setNewBrand] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newLine, setNewLine] = useState<ProductLine>('ENDURO');
  const [modelDrafts, setModelDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    getAdminMotorcycles()
      .then((data) => {
        setItems(data);
        setLoading(false);
      })
      .catch((caught) => {
        setError(caught instanceof Error ? caught.message : 'No pudimos cargar el catálogo de motos.');
        setLoading(false);
      });
  }, []);

  const groupedByBrand = useMemo(() => {
    const map = new Map<string, AdminMotorcycleItem[]>();
    for (const item of items) {
      const list = map.get(item.brand) ?? [];
      list.push(item);
      map.set(item.brand, list);
    }
    return [...map.entries()].map(([brand, models]) => ({ brand, models }));
  }, [items]);

  function flashNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice((current) => (current === message ? null : current)), 3000);
  }

  async function addBrandAndModel() {
    const brand = newBrand.trim();
    const model = newModel.trim();
    if (!brand || !model) {
      setError('Ingresa tanto la marca como el modelo (ej. Honda + XR 250R).');
      return;
    }
    setError(null);
    try {
      const created = await createAdminMotorcycle({ brand, model, line: newLine });
      setItems((previous) => [
        ...previous,
        { id: created.id, brand, model, line: newLine, yearFrom: null, yearTo: null },
      ]);
      setNewBrand('');
      setNewModel('');
      flashNotice(`Moto ${brand} ${model} agregada.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No pudimos guardar la moto.');
    }
  }

  async function addModelToBrand(brand: string) {
    const model = (modelDrafts[brand] ?? '').trim();
    if (!model) return;
    setError(null);
    const defaultLine: ProductLine = brand.toLowerCase() === 'honda' && model.toUpperCase().includes('XR')
      ? 'XR_CLASSIC'
      : 'ENDURO';
    try {
      const created = await createAdminMotorcycle({ brand, model, line: defaultLine });
      setItems((previous) => [
        ...previous,
        { id: created.id, brand, model, line: defaultLine, yearFrom: null, yearTo: null },
      ]);
      setModelDrafts((previous) => ({ ...previous, [brand]: '' }));
      flashNotice(`Modelo ${brand} ${model} agregado.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No pudimos agregar el modelo.');
    }
  }

  async function removeModel(item: AdminMotorcycleItem) {
    setError(null);
    try {
      const res = await deleteAdminMotorcycle(item.id);
      setItems((previous) => previous.filter((entry) => entry.id !== item.id));
      flashNotice(res.message);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No pudimos quitar el modelo.');
    }
  }

  if (loading) return <p className="text-sm text-acero-500">Cargando motos…</p>;

  return (
    <div className="space-y-5">
      {error && (
        <p className="rounded-lg bg-stock-out/10 px-3 py-2 text-xs font-medium text-stock-out">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-lg bg-stock-ok/10 px-3 py-2 text-xs font-bold text-stock-ok">
          {notice}
        </p>
      )}

      <div className="flex flex-wrap gap-2 rounded-xl border border-acero-200 bg-white p-3">
        <input
          type="text"
          value={newBrand}
          onChange={(event) => setNewBrand(event.target.value)}
          placeholder="Marca (ej. Honda)"
          className="min-w-36 flex-1 rounded-lg border border-acero-300 px-3 py-2.5 text-sm outline-none focus:border-competicion-500"
        />
        <input
          type="text"
          value={newModel}
          onChange={(event) => setNewModel(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && void addBrandAndModel()}
          placeholder="Modelo (ej. XR 250 Tornado)"
          className="min-w-44 flex-1 rounded-lg border border-acero-300 px-3 py-2.5 text-sm outline-none focus:border-competicion-500"
        />
        <select
          value={newLine}
          onChange={(event) => setNewLine(event.target.value as ProductLine)}
          className="rounded-lg border border-acero-300 px-3 py-2.5 text-sm outline-none focus:border-competicion-500"
        >
          <option value="XR_CLASSIC">Línea Clásica XR</option>
          <option value="ENDURO">Enduro</option>
          <option value="CROSS">Motocross</option>
          <option value="MULTI">Multimarcas / Calle</option>
        </select>
        <button
          type="button"
          onClick={() => void addBrandAndModel()}
          className="rounded-lg bg-competicion-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-competicion-600"
        >
          + Agregar moto
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {groupedByBrand.map((brand) => (
          <div key={brand.brand} className="rounded-xl border border-acero-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">{brand.brand}</h3>
              <span className="text-xs text-acero-400">{brand.models.length} modelo(s)</span>
            </div>

            <ul className="mt-2 flex flex-wrap gap-1.5">
              {brand.models.map((model) => (
                <li
                  key={model.id}
                  className="flex items-center gap-1 rounded-full bg-acero-200/70 px-2.5 py-1 text-xs"
                >
                  {model.model}
                  <button
                    type="button"
                    onClick={() => void removeModel(model)}
                    className="text-acero-500 hover:text-stock-out"
                    aria-label={`Quitar ${model.model}`}
                  >
                    ×
                  </button>
                </li>
              ))}
              {brand.models.length === 0 && <li className="text-xs text-acero-400">Sin modelos</li>}
            </ul>

            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={modelDrafts[brand.brand] ?? ''}
                onChange={(event) =>
                  setModelDrafts((previous) => ({ ...previous, [brand.brand]: event.target.value }))
                }
                onKeyDown={(event) => event.key === 'Enter' && void addModelToBrand(brand.brand)}
                placeholder="Agregar modelo (ej. XR 250R)"
                className="flex-1 rounded-lg border border-acero-300 px-3 py-2 text-sm outline-none focus:border-competicion-500"
              />
              <button
                type="button"
                onClick={() => void addModelToBrand(brand.brand)}
                className="rounded-lg border border-acero-300 px-3 py-2 text-sm font-semibold hover:border-carbon-900"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
