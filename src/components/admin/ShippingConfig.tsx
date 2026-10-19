import { useEffect, useState } from 'react';
import { formatCLP, parseCLP } from '../../lib/formatters';
import { FALLBACK_SHIPPING_RATES, getShippingRates, type ShippingRate } from '../../lib/shipping';
import { STORE_CONFIG, type BankDetails } from '../../lib/store-config';

type ShippingDraft = Record<string, { cost: string; days: string }>;

/**
 * Configuración editable por Estrella: tarifas de envío por región,
 * datos de transferencia y contacto. MODO DEMO: se guarda en memoria (ver `NOTAS.md`).
 */
export default function ShippingConfig() {
  const [rates, setRates] = useState<ShippingRate[]>(FALLBACK_SHIPPING_RATES);
  const [drafts, setDrafts] = useState<ShippingDraft>({});
  const [bank, setBank] = useState<BankDetails>({ ...STORE_CONFIG.bank });
  const [whatsapp, setWhatsapp] = useState(STORE_CONFIG.whatsappNumber);
  const [email, setEmail] = useState(STORE_CONFIG.storeEmail);
  const [pickupEnabled, setPickupEnabled] = useState(STORE_CONFIG.pickupEnabled);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getShippingRates().then((result) => setRates(result.rates));
  }, []);

  function draftFor(rate: ShippingRate) {
    return drafts[rate.regionCode] ?? { cost: String(rate.baseCostClp), days: rate.estimatedDays };
  }

  function updateDraft(code: string, patch: Partial<{ cost: string; days: string }>) {
    setDrafts((previous) => {
      const base = previous[code] ?? {
        cost: String(rates.find((rate) => rate.regionCode === code)?.baseCostClp ?? 0),
        days: rates.find((rate) => rate.regionCode === code)?.estimatedDays ?? '',
      };
      return { ...previous, [code]: { ...base, ...patch } };
    });
  }

  function handleSave() {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  return (
    <div className="space-y-6">
      <p className="rounded-lg bg-stock-low/10 px-3 py-2 text-xs font-medium text-stock-low">
        MODO DEMO: la configuración queda en memoria (el backend aún no está conectado).
        {saved && <span className="ml-2 font-bold text-stock-ok">Guardado ✓</span>}
      </p>

      {/* Tarifas de envío */}
      <section>
        <h2 className="text-base font-bold">Tarifas de envío por región</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-acero-200">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-acero-200/50 text-xs uppercase tracking-wide text-acero-600">
              <tr>
                <th className="px-3 py-2">Región</th>
                <th className="px-3 py-2">Costo ($ CLP)</th>
                <th className="px-3 py-2">Plazo estimado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-acero-200">
              {rates.map((rate) => {
                const draft = draftFor(rate);
                return (
                  <tr key={rate.regionCode}>
                    <td className="px-3 py-2">{rate.regionName}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={draft.cost}
                          onChange={(event) => updateDraft(rate.regionCode, { cost: event.target.value })}
                          className="w-28 rounded border border-acero-300 px-2 py-1 text-sm outline-none focus:border-competicion-500"
                        />
                        <span className="text-xs text-acero-400">{formatCLP(parseCLP(draft.cost))}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={draft.days}
                        onChange={(event) => updateDraft(rate.regionCode, { days: event.target.value })}
                        className="w-full rounded border border-acero-300 px-2 py-1 text-sm outline-none focus:border-competicion-500"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Datos de transferencia */}
      <section>
        <h2 className="text-base font-bold">Datos de transferencia bancaria</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {(
            [
              ['bankName', 'Banco'],
              ['accountType', 'Tipo de cuenta'],
              ['accountNumber', 'N° de cuenta'],
              ['holderName', 'Titular'],
              ['holderRut', 'RUT'],
              ['holderEmail', 'Correo para comprobantes'],
            ] as Array<[keyof BankDetails, string]>
          ).map(([field, label]) => (
            <label key={field} className="block text-xs font-semibold text-acero-600">
              {label}
              <input
                type="text"
                value={bank[field]}
                onChange={(event) => setBank((previous) => ({ ...previous, [field]: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-acero-300 px-3 py-2.5 text-sm outline-none focus:border-competicion-500"
              />
            </label>
          ))}
        </div>
      </section>

      {/* Contacto */}
      <section>
        <h2 className="text-base font-bold">Contacto de la tienda</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-acero-600">
            WhatsApp oficial (solo dígitos)
            <input
              type="text"
              value={whatsapp}
              onChange={(event) => setWhatsapp(event.target.value)}
              placeholder="56912345678"
              className="mt-1 w-full rounded-lg border border-acero-300 px-3 py-2.5 text-sm outline-none focus:border-competicion-500"
            />
          </label>
          <label className="block text-xs font-semibold text-acero-600">
            Correo institucional
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-lg border border-acero-300 px-3 py-2.5 text-sm outline-none focus:border-competicion-500"
            />
          </label>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={pickupEnabled}
            onChange={(event) => setPickupEnabled(event.target.checked)}
            className="h-5 w-5 accent-competicion-500"
          />
          Permitir retiro en taller
        </label>
      </section>

      <button
        type="button"
        onClick={handleSave}
        className="rounded-lg bg-competicion-500 px-6 py-3 text-sm font-bold text-white hover:bg-competicion-600"
      >
        Guardar configuración
      </button>
    </div>
  );
}
