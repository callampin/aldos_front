import { useEffect, useState } from 'react';
import { formatCLP, parseCLP } from '../../lib/formatters';
import { FALLBACK_SHIPPING_RATES, type ShippingRate } from '../../lib/shipping';
import { STORE_CONFIG, type BankDetails } from '../../lib/store-config';
import { getAdminSettings, saveAdminSettings, saveAdminShippingRate } from '../../lib/admin';

type ShippingDraft = Record<string, { cost: string; days: string }>;

/**
 * Configuración editable por Estrella conectada a `/api/v1/admin/settings`:
 * tarifas de envío por región, datos de transferencia bancaria y contacto.
 */
export default function ShippingConfig() {
  const [rates, setRates] = useState<ShippingRate[]>(FALLBACK_SHIPPING_RATES);
  const [drafts, setDrafts] = useState<ShippingDraft>({});
  const [bank, setBank] = useState<BankDetails>({ ...STORE_CONFIG.bank });
  const [whatsapp, setWhatsapp] = useState(STORE_CONFIG.whatsappNumber);
  const [email, setEmail] = useState(STORE_CONFIG.storeEmail);
  const [pickupEnabled, setPickupEnabled] = useState(STORE_CONFIG.pickupEnabled);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getAdminSettings()
      .then((data) => {
        if (!active) return;
        if (Array.isArray(data.shippingRates) && data.shippingRates.length > 0) {
          setRates(data.shippingRates);
        }
        const s = data.settings ?? {};
        if (s['whatsapp_number']) setWhatsapp(s['whatsapp_number']);
        if (s['store_email']) setEmail(s['store_email']);
        if (s['pickup_enabled'] !== undefined) {
          setPickupEnabled(s['pickup_enabled'] === 'true' || s['pickup_enabled'] === '1');
        }
        if (s['bank_transfer_details']) {
          try {
            const parsed = JSON.parse(s['bank_transfer_details']) as Record<string, string>;
            setBank({
              bankName: parsed['banco'] ?? parsed['bankName'] ?? parsed['bank'] ?? STORE_CONFIG.bank.bankName,
              accountType:
                parsed['tipo_cuenta'] ?? parsed['accountType'] ?? parsed['type'] ?? STORE_CONFIG.bank.accountType,
              accountNumber:
                parsed['numero'] ??
                parsed['accountNumber'] ??
                parsed['number'] ??
                STORE_CONFIG.bank.accountNumber,
              holderName:
                parsed['titular'] ?? parsed['holderName'] ?? parsed['holder'] ?? STORE_CONFIG.bank.holderName,
              holderRut: parsed['rut'] ?? parsed['holderRut'] ?? STORE_CONFIG.bank.holderRut,
              holderEmail: parsed['email'] ?? parsed['holderEmail'] ?? STORE_CONFIG.bank.holderEmail,
            });
          } catch {
            /* mantiene el valor actual */
          }
        }
      })
      .catch((caught) => {
        if (active) {
          setError(
            caught instanceof Error ? caught.message : 'No pudimos cargar la configuración.',
          );
        }
      });

    return () => {
      active = false;
    };
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

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      // 1. Guarda las tarifas de envío que Estrella modificó
      const changedRegions = Object.entries(drafts);
      for (const [regionCode, draft] of changedRegions) {
        const current = rates.find((r) => r.regionCode === regionCode);
        const nextCost = Math.max(0, parseCLP(draft.cost));
        const nextDays = draft.days.trim();
        if (
          current &&
          (current.baseCostClp !== nextCost || current.estimatedDays !== nextDays)
        ) {
          const updated = await saveAdminShippingRate(regionCode, {
            baseCostClp: nextCost,
            estimatedDays: nextDays || current.estimatedDays,
          });
          setRates((prev) =>
            prev.map((r) => (r.regionCode === regionCode ? { ...r, ...updated } : r)),
          );
        }
      }

      // 2. Guarda los ajustes globales de la tienda
      await saveAdminSettings({
        whatsapp_number: whatsapp.trim(),
        store_email: email.trim(),
        pickup_enabled: pickupEnabled,
        bank_transfer_details: JSON.stringify({
          banco: bank.bankName.trim(),
          tipo_cuenta: bank.accountType.trim(),
          numero: bank.accountNumber.trim(),
          titular: bank.holderName.trim(),
          rut: bank.holderRut.trim(),
          email: bank.holderEmail.trim(),
        }),
      });

      setDrafts({});
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'No pudimos guardar la configuración.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-lg bg-stock-out/10 px-3 py-2 text-xs font-medium text-stock-out">
          {error}
        </p>
      )}
      {saved && (
        <p className="rounded-lg bg-stock-ok/10 px-3 py-2 text-xs font-bold text-stock-ok">
          Configuración guardada correctamente ✓
        </p>
      )}

      {/* Tarifas de envío */}
      <section>
        <h2 className="text-base font-bold">Tarifas de envío por región</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-acero-200 bg-white">
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
                className="mt-1 w-full rounded-lg border border-acero-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-competicion-500"
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
              className="mt-1 w-full rounded-lg border border-acero-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-competicion-500"
            />
          </label>
          <label className="block text-xs font-semibold text-acero-600">
            Correo institucional
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-lg border border-acero-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-competicion-500"
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
        disabled={saving}
        onClick={() => void handleSave()}
        className="rounded-lg bg-competicion-500 px-6 py-3 text-sm font-bold text-white hover:bg-competicion-600 disabled:opacity-50"
      >
        {saving ? 'Guardando…' : 'Guardar configuración'}
      </button>
    </div>
  );
}
