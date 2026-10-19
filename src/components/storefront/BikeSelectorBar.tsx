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
  /** Versión compacta (solo ícono) para pantallas móviles. */
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
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={shownBike ? `Mi moto: ${bikeLabel(shownBike)}` : 'Seleccionar mi moto'}
        className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
          shownBike
            ? 'border-stock-ok/40 bg-stock-ok/10 text-carbon-900'
            : 'border-acero-300 text-carbon-900 hover:border-carbon-900'
        }`}
      >
        <svg
          className="h-5 w-5 text-competicion-600"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <circle cx="5.5" cy="17.5" r="3.5" />
          <circle cx="18.5" cy="17.5" r="3.5" />
          <path d="M9 17.5h4l3-7h-3l-2-3H8l1 3H6" />
        </svg>
        {!compact && <span>{shownBike ? bikeLabel(shownBike) : 'Mi Moto'}</span>}
        {compact && shownBike && <span className="h-2 w-2 rounded-full bg-stock-ok" aria-hidden="true" />}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-72 rounded-xl border border-acero-200 bg-white p-4 text-left shadow-xl">
          <p className="text-sm font-bold text-carbon-900">¿Qué moto tienes?</p>
          <p className="mt-0.5 text-xs text-acero-500">Mostramos los repuestos compatibles con tu moto.</p>

          <div className="mt-3 space-y-3">
            <label className="block text-xs font-semibold text-acero-600">
              Marca
              <select
                value={brand}
                onChange={(event) => {
                  setBrand(event.target.value);
                  setModel('');
                  setYear('');
                }}
                className="mt-1 w-full rounded-lg border border-acero-300 bg-white px-3 py-2 text-sm font-normal text-carbon-900 outline-none focus:border-competicion-500"
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
                className="mt-1 w-full rounded-lg border border-acero-300 bg-white px-3 py-2 text-sm font-normal text-carbon-900 outline-none focus:border-competicion-500 disabled:bg-acero-200/50 disabled:text-acero-500"
              >
                <option value="">{brand ? 'Elige un modelo…' : 'Primero la marca'}</option>
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
                className="mt-1 w-full rounded-lg border border-acero-300 bg-white px-3 py-2 text-sm font-normal text-carbon-900 outline-none focus:border-competicion-500 disabled:bg-acero-200/50 disabled:text-acero-500"
              >
                <option value="">Todos los años</option>
                {years.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={apply}
              disabled={!brand || !model}
              className="flex-1 rounded-lg bg-competicion-500 px-3 py-2.5 text-sm font-bold text-white hover:bg-competicion-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Ver repuestos compatibles
            </button>
            {shownBike && (
              <button
                type="button"
                onClick={remove}
                className="rounded-lg border border-acero-300 px-3 py-2.5 text-sm font-semibold text-acero-600 hover:border-carbon-900"
              >
                Quitar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
