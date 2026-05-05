import { SLOT_MINUTES } from '@shared/constants';

export const HOUR_INPUT_STEP = SLOT_MINUTES / 60;

export function snapHoursToStep(hours: number): number {
  const minutes = Math.round((hours * 60) / SLOT_MINUTES) * SLOT_MINUTES;
  return minutes / 60;
}

export function clampHours(hours: number, min?: number, max?: number): number {
  let next = hours;
  if (typeof min === 'number') {
    next = Math.max(min, next);
  }
  if (typeof max === 'number') {
    next = Math.min(max, next);
  }
  return snapHoursToStep(next);
}

export function formatHoursValue(hours: number): string {
  const snapped = snapHoursToStep(hours);
  return snapped.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
}

export function formatHoursLabel(hours: number): string {
  return `${formatHoursValue(hours)}h`;
}

export function parseHoursInputValue(raw: string): number | null {
  const text = raw.trim();
  if (!text) {
    return null;
  }

  const parsed = Number(text);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return snapHoursToStep(parsed);
}
