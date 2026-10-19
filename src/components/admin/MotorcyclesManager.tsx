import { useEffect, useState } from 'react';
import { getMotorcycleCatalog, type MotorcycleBrand } from '../../lib/motorcycles';

/**
 * Mantenedor simple de marcas y modelos de motos compatibles.
 * MODO DEMO: los cambios quedan en memoria (ver `NOTAS.md`).
 */
export default function MotorcyclesManager() {
  const [catalog, setCatalog] = useState<MotorcycleBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBrand, setNewBrand] = useState('');
  const [modelDrafts, setModelDrafts] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getMotorcycleCatalog().then((data) => {
      setCatalog(data);
      setLoading(false);
    });
  }, []);

  function flashSaved() {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  }

  function addBrand() {
    const brand = newBrand.trim();
    if (!brand) return;
    if (catalog.some((entry) => entry.brand.toLowerCase() === brand.toLowerCase())) return;
    setCatalog((previous) => [...previous, { brand, models: [] }]);
    setNewBrand('');
    flashSaved();
  }

  function removeBrand(brand: string) {
    setCatalog((previous) => previous.filter((entry) => entry.brand !== brand));
    flashSaved();
  }

  function addModel(brand: string) {
    const model = (modelDrafts[brand] ?? '').trim();
    if (!model) return;
    setCatalog((previous) =>
      previous.map((entry) =>
        entry.brand === brand && !entry.models.some((m) => m.model.toLowerCase() === model.toLowerCase())
          ? { ...entry, models: [...entry.models, { model }] }
          : entry,
      ),
    );
    setModelDrafts((previous) => ({ ...previous, [brand]: '' }));
    flashSaved();
  }

  function removeModel(brand: string, model: string) {
    setCatalog((previous) =>
      previous.map((entry) =>
        entry.brand === brand ? { ...entry, models: entry.models.filter((m) => m.model !== model) } : entry,
      ),
    );
    flashSaved();
  }

  if (loading) return <p className="text-sm text-acero-500">Cargando motos…</p>;

  return (
    <div className="space-y-5">
      <p className="rounded-lg bg-stock-low/10 px-3 py-2 text-xs font-medium text-stock-low">
        MODO DEMO: los cambios quedan en memoria (el backend aún no está conectado).
        {saved && <span className="ml-2 font-bold text-stock-ok">Guardado ✓</span>}
      </p>

      <div className="flex flex-wrap gap-2 rounded-xl border border-acero-200 p-3">
        <input
          type="text"
          value={newBrand}
          onChange={(event) => setNewBrand(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && addBrand()}
          placeholder="Agregar marca (ej. Honda)"
          className="min-w-48 flex-1 rounded-lg border border-acero-300 px-3 py-2.5 text-sm outline-none focus:border-competicion-500"
        />
        <button
          type="button"
          onClick={addBrand}
          className="rounded-lg bg-competicion-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-competicion-600"
        >
          Agregar marca
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {catalog.map((brand) => (
          <div key={brand.brand} className="rounded-xl border border-acero-200 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">{brand.brand}</h3>
              <button
                type="button"
                onClick={() => removeBrand(brand.brand)}
                className="text-xs font-semibold text-acero-500 underline hover:text-stock-out"
              >
                Quitar marca
              </button>
            </div>

            <ul className="mt-2 flex flex-wrap gap-1.5">
              {brand.models.map((model) => (
                <li key={model.model} className="flex items-center gap-1 rounded-full bg-acero-200/70 px-2.5 py-1 text-xs">
                  {model.model}
                  <button
                    type="button"
                    onClick={() => removeModel(brand.brand, model.model)}
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
                onKeyDown={(event) => event.key === 'Enter' && addModel(brand.brand)}
                placeholder="Agregar modelo (ej. XR 250R)"
                className="flex-1 rounded-lg border border-acero-300 px-3 py-2 text-sm outline-none focus:border-competicion-500"
              />
              <button
                type="button"
                onClick={() => addModel(brand.brand)}
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
