import type { ColorName } from './types';

export const COLORS: { name: ColorName; bg: string; text: string }[] = [
  { name: 'blue', bg: 'bg-blue-200', text: 'text-blue-800' },
  { name: 'green', bg: 'bg-green-200', text: 'text-green-800' },
  { name: 'yellow', bg: 'bg-yellow-200', text: 'text-yellow-800' },
  { name: 'purple', bg: 'bg-purple-200', text: 'text-purple-800' },
  { name: 'pink', bg: 'bg-pink-200', text: 'text-pink-800' },
  { name: 'orange', bg: 'bg-orange-200', text: 'text-orange-800' },
  { name: 'cyan', bg: 'bg-cyan-200', text: 'text-cyan-800' },
  { name: 'neutral', bg: 'bg-neutral-200', text: 'text-neutral-800' },
] as const;
