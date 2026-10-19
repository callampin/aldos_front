import { useEffect, useRef, useState } from 'react';
import { useStore } from '@nanostores/react';
import { $bike, bikeLabel, clearBike, setBike } from '../../stores/bike-filter.store';
import {
  FALLBACK_MOTORCYCLES,
  getMotorcycleCatalog,
  modelYears,
  type MotorcycleBrand,
} from '../../lib/motorcycles';

interface Props {
  /** Versión circular de filtro (botón lima junto al buscador). */
  compact?: boolean;
}

export default function BikeSelectorBar({ compact = false }: Props) {
  const bike = useStore($bike);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [catalog, setCatalog] = useState<MotorcycleBrand[]>(FALLBACK_MOTORCYCLES);
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

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
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const shownBike = mounted ? bike : null;
  const models = catalog.find((entry) => entry.brand === brand)?.models ?? [];
  const selectedModel = models.find((entry) => entry.model === model);
  const years = selectedModel ? modelYears(selectedModel) : [];

  function apply() {
    if (!brand || !model) return;
    setBike({ brand, model, year: year ? Number(year) : null });
    const params = new URLSearchParams({ brand, model });
    if (year) params.set('year', year);
    window.location.assign(`/catalogo?${params.toString()}`);
  }

  function remove() {
    clearBike();
    setBrand('');
    setModel('');
    setYear('');
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      {compact ? (
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label={shownBike ? `Filtrar por mi moto: ${bikeLabel(shownBike)}` : 'Filtrar por modelo de moto'}
          className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-lime-500 text-carbon-950 shadow-xs transition-transform active:scale-95 hover:bg-lime-400"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <line x1="4" y1="21" x2="4" y2="14" />
            <line x1="4" y1="10" x2="4" y2="3" />
            <line x1="12" y1="21" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12" y2="3" />
            <line x1="20" y1="21" x2="20" y2="16" />
            <line x1="20" y1="12" x2="20" y2="3" />
            <circle cx="4" cy="12" r="2" />
            <circle cx="12" cy="10" r="2" />
            <circle cx="20" cy="14" r="2" />
          </svg>
          {shownBike && (
            <span
              className="absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-carbon-950"
              aria-hidden="true"
            />
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label={shownBike ? `Mi moto: ${bikeLabel(shownBike)}` : 'Seleccionar mi moto'}
          className={`inline-flex min-h-11 shrink-0 items-center gap-2.5 rounded-full border py-1.5 pl-1.5 pr-3.5 text-sm font-semibold transition-all ${
            shownBike
              ? 'border-lime-500/60 bg-lime-500/15 text-carbon-900'
              : 'border-acero-200 bg-white text-carbon-900 shadow-2xs hover:bg-surface-muted'
          }`}
        >
          <span
            className={`grid h-8 w-8 place-items-center rounded-full text-sm ${
              shownBike ? 'bg-lime-500 text-carbon-950' : 'bg-surface-muted text-carbon-900'
            }`}
            aria-hidden="true"
          >
            🏍️
          </span>
          <span className="max-w-[11rem] truncate">
            {shownBike ? bikeLabel(shownBike) : 'Mi Moto'}
          </span>
          <svg
            className={`h-4 w-4 text-acero-500 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      )}

      {open && (
        <div className="absolute right-0 z-50 mt-2.5 w-80 rounded-3xl border border-acero-200 bg-white p-5 text-left shadow-2xl">
          <div className="flex items-center justify-between">
            <p className="text-base font-extrabold text-carbon-900">¿Qué moto tienes?</p>
            <span className="rounded-full bg-lime-500/20 px-2.5 py-0.5 text-[11px] font-bold text-carbon-900">
              Filtro exacto
            </span>
          </div>
          <p className="mt-1 text-xs text-acero-500">
            Te mostraremos los repuestos compatibles y universales para tu moto.
          </p>

          <div className="mt-4 space-y-3">
            <label className="block text-xs font-semibold text-acero-600">
              Marca
              <select
                value={brand}
                onChange={(event) => {
                  setBrand(event.target.value);
                  setModel('');
                  setYear('');
                }}
                className="mt-1 w-full rounded-2xl border border-transparent bg-surface-muted px-3.5 py-2.5 text-sm font-medium text-carbon-900 outline-none focus:border-carbon-900 focus:bg-white"
              >
                <option value="">Elige una marca…</option>
                {catalog.map((entry) => (
                  <option key={entry.brand} value={entry.brand}>
                    {entry.brand}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-semibold text-acero-600">
              Modelo
              <select
                value={model}
                disabled={!brand}
                onChange={(event) => {
                  setModel(event.target.value);
                  setYear('');
                }}
                className="mt-1 w-full rounded-2xl border border-transparent bg-surface-muted px-3.5 py-2.5 text-sm font-medium text-carbon-900 outline-none focus:border-carbon-900 focus:bg-white disabled:opacity-50"
              >
                <option value="">{brand ? 'Elige un modelo…' : 'Primero elige la marca'}</option>
                {models.map((entry) => (
                  <option key={entry.model} value={entry.model}>
                    {entry.model}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-semibold text-acero-600">
              Año <span className="font-normal text-acero-400">(opcional)</span>
              <select
                value={year}
                disabled={!model}
                onChange={(event) => setYear(event.target.value)}
                className="mt-1 w-full rounded-2xl border border-transparent bg-surface-muted px-3.5 py-2.5 text-sm font-medium text-carbon-900 outline-none focus:border-carbon-900 focus:bg-white disabled:opacity-50"
              >
                <option value="">Todos los años</option>
                {years.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={apply}
              disabled={!brand || !model}
              className="w-full rounded-full bg-lime-500 px-4 py-3 text-sm font-extrabold text-carbon-950 transition-colors hover:bg-lime-400 disabled:opacity-40"
            >
              Ver repuestos compatibles
            </button>

            {shownBike && (
              <button
                type="button"
                onClick={remove}
                className="w-full rounded-full border border-acero-300 px-3 py-2 text-xs font-semibold text-acero-600 hover:border-carbon-900 hover:text-carbon-900"
              >
                Quitar filtro ({bikeLabel(shownBike)})
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
