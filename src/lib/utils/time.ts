// src/lib/utils/time.ts

export type SnapMode = 'nearest' | 'floor' | 'ceil';

/** YYYY-MM-DD from a Date (local time). */
export const formatDateKey = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * Converts time string to total minutes since midnight
 * @param t - Time in "HH:MM" format (24-hour)
 * @returns Total minutes since 00:00 (e.g., "09:30" returns 570)
 * @example timeToMinutes("09:30") // 570
 */
export const timeToMinutes = (t: string): number => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

/**
 * Converts total minutes to time string
 * @param mins - Total minutes since midnight
 * @returns Time string in "HH:MM" format (24-hour)
 * @example minutesToTime(570) // "09:30"
 */
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

/**
 * Checks if two time intervals overlap (open interval check)
 * @param aStart - Start time of first interval in minutes
 * @param aEnd - End time of first interval in minutes
 * @param bStart - Start time of second interval in minutes
 * @param bEnd - End time of second interval in minutes
 * @returns true if intervals overlap, false otherwise
 * @example overlaps(570, 630, 600, 660) // true (9:30-10:30 overlaps with 10:00-11:00)
 */
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
