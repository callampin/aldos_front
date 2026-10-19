import { useEffect, useState } from 'react';
import type { Product } from '../../lib/catalog';
import {
  diffProducts,
  exportCatalogToXlsx,
  exportTemplateXlsx,
  parseProductsXlsx,
  summarizeChanges,
  type RowChange,
  type RowError,
} from '../../lib/excel-helper';
import { batchImportProducts, getAdminProducts } from '../../lib/admin-products';

interface Props {
  products: Product[];
  onClose: () => void;
  onApplied: (updated: Product[]) => void;
}

const TYPE_BADGE: Record<RowChange['type'], { text: string; className: string }> = {
  create: { text: 'Nuevo', className: 'bg-stock-ok/15 text-stock-ok' },
  update: { text: 'Actualiza', className: 'bg-competicion-500/15 text-competicion-600' },
  unchanged: { text: 'Sin cambios', className: 'bg-acero-200 text-acero-600' },
};

export default function ExcelBatchModal({ products, onClose, onApplied }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [changes, setChanges] = useState<RowChange[]>([]);
  const [errors, setErrors] = useState<RowError[]>([]);
  const [fileName, setFileName] = useState('');
  const [reading, setReading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const summary = summarizeChanges(changes, errors);
  const actionable = changes.filter((change) => change.type !== 'unchanged');

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setReading(true);
    setApplyError(null);
    try {
      const result = await parseProductsXlsx(file);
      setFileName(file.name);
      setErrors(result.errors);
      setChanges(diffProducts(products, result.rows));
      setStep(3);
    } catch {
      setApplyError('No pudimos leer el archivo. Asegúrate de que sea un .xlsx válido.');
    } finally {
      setReading(false);
    }
  }

  async function apply() {
    if (actionable.length === 0) {
      setApplyError('No hay cambios para aplicar.');
      return;
    }

    setApplying(true);
    setApplyError(null);

    try {
      const report = await batchImportProducts(actionable.map((change) => change.row));
      if (report.errors && report.errors.length > 0) {
        setErrors(report.errors);
      }

      const fresh = await getAdminProducts();
      onApplied(fresh.products);
      onClose();
    } catch (caught) {
      setApplyError(
        caught instanceof Error
          ? caught.message
          : 'No pudimos guardar el lote en la base de datos.',
      );
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-carbon-950/60 p-4">
      <div className="my-4 w-full max-w-3xl rounded-xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-acero-200 px-4 py-3">
          <h2 className="font-bold">Carga masiva en Excel (.xlsx)</h2>
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

        {/* Pasos */}
        <div className="flex gap-2 border-b border-acero-200 px-4 py-3 text-xs font-semibold">
          {[1, 2, 3].map((number) => (
            <span
              key={number}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 ${
                step >= number ? 'bg-competicion-500/10 text-competicion-600' : 'text-acero-400'
              }`}
            >
              <span className={`grid h-5 w-5 place-items-center rounded-full ${step >= number ? 'bg-competicion-500 text-white' : 'bg-acero-200'}`}>
                {number}
              </span>
              {number === 1 ? 'Descargar' : number === 2 ? 'Subir' : 'Previsualizar'}
            </span>
          ))}
        </div>

        <div className="space-y-4 p-4">
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-acero-600">
                Descarga tu catálogo actual en Excel (o una plantilla vacía), edítalo en tu computador y
                luego súbelo aquí.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => exportCatalogToXlsx(products)}
                  className="flex-1 rounded-lg bg-carbon-900 px-5 py-3 text-sm font-bold text-white hover:bg-carbon-800"
                >
                  ⬇️ Descargar mi catálogo actual
                </button>
                <button
                  type="button"
                  onClick={() => exportTemplateXlsx()}
                  className="flex-1 rounded-lg border border-acero-300 px-5 py-3 text-sm font-semibold hover:border-carbon-900"
                >
                  ⬇️ Descargar plantilla vacía
                </button>
              </div>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-lg bg-competicion-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-competicion-600"
              >
                Continuar
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-acero-600">Sube tu planilla editada (.xlsx):</p>
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-acero-300 p-8 text-center hover:border-competicion-500">
                <span className="text-3xl">📄</span>
                <span className="text-sm font-semibold">
                  {reading ? 'Leyendo archivo…' : 'Arrastra tu archivo o haz clic para elegirlo'}
                </span>
                <span className="text-xs text-acero-400">Formato .xlsx</span>
                <input
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="hidden"
                  onChange={(event) => void handleFile(event.target.files?.[0])}
                />
              </label>
              <button type="button" onClick={() => setStep(1)} className="text-sm font-medium text-acero-500 underline">
                Volver al paso anterior
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-xs text-acero-500">
                Archivo: <span className="font-mono">{fileName}</span>
              </p>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-lg bg-stock-ok/10 p-3">
                  <p className="text-2xl font-extrabold text-stock-ok">{summary.created}</p>
                  <p className="text-xs text-acero-600">Productos nuevos</p>
                </div>
                <div className="rounded-lg bg-competicion-500/10 p-3">
                  <p className="text-2xl font-extrabold text-competicion-600">{summary.updated}</p>
                  <p className="text-xs text-acero-600">Se actualizan</p>
                </div>
                <div className="rounded-lg bg-acero-200 p-3">
                  <p className="text-2xl font-extrabold text-acero-600">{summary.unchanged}</p>
                  <p className="text-xs text-acero-600">Sin cambios</p>
                </div>
                <div className="rounded-lg bg-stock-out/10 p-3">
                  <p className="text-2xl font-extrabold text-stock-out">{summary.errors}</p>
                  <p className="text-xs text-acero-600">Filas con errores</p>
                </div>
              </div>

              {errors.length > 0 && (
                <div className="rounded-lg border border-stock-out/30 p-3">
                  <p className="text-xs font-bold text-stock-out">Errores detectados</p>
                  <ul className="mt-1 max-h-32 space-y-0.5 overflow-y-auto text-xs text-acero-600">
                    {errors.slice(0, 50).map((error, index) => (
                      <li key={`${error.row}-${index}`}>
                        Fila {error.row}: {error.message} {error.sku ? `(${error.sku})` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="max-h-72 overflow-auto rounded-lg border border-acero-200">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-acero-200/80 text-acero-600">
                    <tr>
                      <th className="px-3 py-2">SKU</th>
                      <th className="px-3 py-2">Producto</th>
                      <th className="px-3 py-2">Estado</th>
                      <th className="px-3 py-2">Cambios</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-acero-200">
                    {changes.slice(0, 200).map((change) => {
                      const badge = TYPE_BADGE[change.type];
                      return (
                        <tr key={`${change.row.sku}-${change.type}`}>
                          <td className="px-3 py-1.5 font-mono">{change.row.sku}</td>
                          <td className="px-3 py-1.5">{change.row.name}</td>
                          <td className="px-3 py-1.5">
                            <span className={`rounded-full px-2 py-0.5 font-bold ${badge.className}`}>{badge.text}</span>
                          </td>
                          <td className="px-3 py-1.5 text-acero-500">{change.changes.join(', ') || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {applyError && <p className="rounded-lg bg-stock-out/10 px-3 py-2 text-sm text-stock-out">{applyError}</p>}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void apply()}
                  disabled={actionable.length === 0 || applying}
                  className="rounded-lg bg-competicion-500 px-5 py-3 text-sm font-bold text-white hover:bg-competicion-600 disabled:opacity-50"
                >
                  {applying ? 'Aplicando cambios…' : 'Confirmar y aplicar cambios'}
                </button>
                <button
                  type="button"
                  disabled={applying}
                  onClick={() => {
                    setStep(2);
                    setChanges([]);
                    setErrors([]);
                  }}
                  className="rounded-lg border border-acero-300 px-5 py-3 text-sm font-semibold hover:border-carbon-900 disabled:opacity-50"
                >
                  Elegir otro archivo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
