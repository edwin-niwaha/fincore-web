'use client';

export function reportScopeValue(value: string) {
  return value === 'all' ? undefined : value;
}

export function numericValue(value?: string | number | null) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function percentLabel(value: number, fractionDigits = 2) {
  return `${value.toFixed(fractionDigits)}%`;
}
