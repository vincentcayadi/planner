/**
 * Shared interval options used across SettingsPanel and GlobalSettingsDialog
 * Ensures consistency between components
 */

export const INTERVAL_OPTIONS = [
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "60", label: "60 minutes" },
] as const;

export type IntervalValue = typeof INTERVAL_OPTIONS[number]['value'];