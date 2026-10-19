/**
 * Moto seleccionada por el cliente ("Mi Moto"), persistida en localStorage
 * para recordarla durante toda la navegación (HU-01).
 */

import { persistentJSON } from '@nanostores/persistent';

export interface BikeSelection {
  brand: string;
  model: string;
  year: number | null;
}

/** Moto actualmente seleccionada (`null` = sin selección). */
export const $bike = persistentJSON<BikeSelection>('aldos:bike', null);

/** Guarda la moto seleccionada. */
export function setBike(bike: BikeSelection): void {
  $bike.set(bike);
}

/** Elimina la selección de moto. */
export function clearBike(): void {
  $bike.set(null);
}

/** Texto legible de la selección, ej. `Honda XR 250 · 1998`. */
export function bikeLabel(bike: BikeSelection | null): string {
  if (!bike) return '';
  const parts = [bike.brand, bike.model].filter(Boolean).join(' ');
  return bike.year ? `${parts} · ${bike.year}` : parts;
}

/** Parámetros de catálogo derivados de la moto seleccionada (RF-02). */
export function bikeCatalogQuery(bike: BikeSelection | null): Record<string, string> {
  if (!bike) return {};
  const query: Record<string, string> = {};
  if (bike.brand) query.brand = bike.brand;
  if (bike.model) query.model = bike.model;
  if (bike.year) query.year = String(bike.year);
  return query;
}
