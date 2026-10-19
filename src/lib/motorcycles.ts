/**
 * Catálogo de motos para compatibilidad (Marca → Modelo → Año).
 * Se alimenta de `GET /public/motorcycles`; si el backend no está disponible,
 * usa el listado local de respaldo (líneas Honda XR y Enduro del negocio).
 */

import { api } from './api-client';

export interface MotorcycleModel {
  model: string;
  yearFrom?: number;
  yearTo?: number;
}

export interface MotorcycleBrand {
  brand: string;
  models: MotorcycleModel[];
}

export const FALLBACK_MOTORCYCLES: MotorcycleBrand[] = [
  {
    brand: 'Honda',
    models: [
      { model: 'XR 125' },
      { model: 'XR 150' },
      { model: 'XR 190' },
      { model: 'XR 250 Tornado' },
      { model: 'XR 250R', yearFrom: 1996, yearTo: 2004 },
      { model: 'XR 400R' },
      { model: 'XR 600R' },
      { model: 'XR 650R' },
      { model: 'CRF 250R' },
      { model: 'CRF 450R' },
    ],
  },
  {
    brand: 'KTM',
    models: [{ model: 'EXC 250' }, { model: 'EXC 300' }, { model: 'EXC 450' }],
  },
  {
    brand: 'Yamaha',
    models: [{ model: 'WR 250F' }, { model: 'WR 450F' }, { model: 'YZ 250' }],
  },
  {
    brand: 'Husqvarna',
    models: [{ model: 'TE 300' }, { model: 'FE 450' }],
  },
  {
    brand: 'Suzuki',
    models: [{ model: 'DR 650' }],
  },
];

/** Años disponibles para un modelo (por rango, o desde 1990 al año actual). */
export function modelYears(model: MotorcycleModel): number[] {
  const currentYear = new Date().getFullYear();
  const from = model.yearFrom ?? 1990;
  const to = model.yearTo ?? currentYear;
  const years: number[] = [];
  for (let year = to; year >= from; year--) years.push(year);
  return years;
}

/** Devuelve el árbol de motos, con respaldo local si la API falla. */
export async function getMotorcycleCatalog(): Promise<MotorcycleBrand[]> {
  try {
    const res = await api.get<MotorcycleBrand[]>('/public/motorcycles', {
      signal: AbortSignal.timeout(2500),
    });
    if (Array.isArray(res.data) && res.data.length > 0) return res.data;
  } catch {
    /* Sin backend: se usa el catálogo local de respaldo. */
  }
  return FALLBACK_MOTORCYCLES;
}
