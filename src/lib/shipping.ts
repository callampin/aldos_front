/**
 * Tarifas de envío por región de Chile (RF-10).
 * Se alimenta de `GET /public/shipping-rates`; si el backend no responde,
 * usa una tabla local de referencia para que la ficha siga siendo útil.
 */

import { api } from './api-client';
import { REGIONS } from './chile-locations';

export interface ShippingRate {
  regionCode: string;
  regionName: string;
  baseCostClp: number;
  estimatedDays: string;
  courierName: string;
}

const COURIER = 'Courier Propio / Convenio';

const COSTS: Record<string, { cost: number; days: string }> = {
  XV: { cost: 8990, days: '3 a 5 días hábiles' },
  I: { cost: 7990, days: '3 a 4 días hábiles' },
  II: { cost: 7990, days: '3 a 4 días hábiles' },
  III: { cost: 6990, days: '2 a 4 días hábiles' },
  IV: { cost: 5990, days: '2 a 3 días hábiles' },
  V: { cost: 4490, days: '1 a 2 días hábiles' },
  RM: { cost: 3990, days: '24 a 48 hrs hábiles' },
  VI: { cost: 4490, days: '1 a 2 días hábiles' },
  VII: { cost: 4990, days: '2 a 3 días hábiles' },
  XVI: { cost: 5490, days: '2 a 3 días hábiles' },
  VIII: { cost: 5990, days: '2 a 3 días hábiles' },
  IX: { cost: 6490, days: '3 a 4 días hábiles' },
  XIV: { cost: 6990, days: '3 a 4 días hábiles' },
  X: { cost: 7490, days: '3 a 5 días hábiles' },
  XI: { cost: 9990, days: '4 a 6 días hábiles' },
  XII: { cost: 9990, days: '4 a 6 días hábiles' },
};

export const ISLA_DE_PASCUA_NOTE =
  'Isla de Pascua (Rapa Nui): el despacho se cotiza caso a caso. Escríbenos por WhatsApp para coordinar.';

export const DISPATCH_CUTOFF_NOTE =
  'Los pedidos pagados antes del cierre se despachan el mismo día hábil.';

export const FALLBACK_SHIPPING_RATES: ShippingRate[] = REGIONS.map((region) => ({
  regionCode: region.code,
  regionName: region.name,
  baseCostClp: COSTS[region.code]?.cost ?? 5990,
  estimatedDays: COSTS[region.code]?.days ?? '2 a 4 días hábiles',
  courierName: COURIER,
}));

function normalizeRate(value: unknown): ShippingRate {
  const raw = (value ?? {}) as Record<string, unknown>;
  const pick = <T>(camel: string, snake: string, fallback: T): T =>
    (raw[camel] as T | undefined) ?? (raw[snake] as T | undefined) ?? fallback;

  return {
    regionCode: pick('regionCode', 'region_code', ''),
    regionName: pick('regionName', 'region_name', ''),
    baseCostClp: pick('baseCostClp', 'base_cost_clp', 0),
    estimatedDays: pick('estimatedDays', 'estimated_days', ''),
    courierName: pick('courierName', 'courier_name', COURIER),
  };
}

/** Tarifas por región, con respaldo local si la API falla. */
export async function getShippingRates(): Promise<{ rates: ShippingRate[]; source: 'api' | 'fallback' }> {
  try {
    const res = await api.get<ShippingRate[]>('/public/shipping-rates', {
      signal: AbortSignal.timeout(2500),
    });
    if (Array.isArray(res.data) && res.data.length > 0) {
      return { rates: res.data.map(normalizeRate), source: 'api' };
    }
  } catch {
    /* Sin backend: se usa la tabla local de referencia. */
  }
  return { rates: FALLBACK_SHIPPING_RATES, source: 'fallback' };
}
