// src/lib/utils/time.ts

export type SnapMode = 'nearest' | 'floor' | 'ceil';

/** YYYY-MM-DD from a Date (local time). */
export const formatDateKey = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** "HH:MM" -> total minutes from 00:00 */
export const timeToMinutes = (t: string): number => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

/** total minutes -> "HH:MM" (24h) */
export const minutesToTime = (mins: number): string => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/** "HH:MM" (24h) -> "h:MM AM/PM" */
export const to12h = (t: string): string => {
  if (!t) return '';
  const [H, M] = t.split(':').map(Number);
  const ampm = H >= 12 ? 'PM' : 'AM';
  const h12 = H % 12 || 12;
  return `${h12}:${String(M).padStart(2, '0')} ${ampm}`;
};

/** Open interval overlap check in minutes. */
export const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number): boolean =>
  aStart < bEnd && bStart < aEnd;

/** Snap minutes to a step anchored at `anchorMin` (day start). */
export const snapToAnchor = (
  mins: number,
  step: number,
  anchorMin: number,
  mode: SnapMode = 'nearest'
): number => {
  const rel = (mins - anchorMin) / step;
  const q = mode === 'floor' ? Math.floor(rel) : mode === 'ceil' ? Math.ceil(rel) : Math.round(rel);
  return anchorMin + q * step;
};
