import type { Client, PaginatedResponse } from '@/types/api';

/**
 * Safely unwrap API list responses (DRF-style or plain arrays)
 */
export function unwrapList<T>(
  data: T[] | PaginatedResponse<T> | null | undefined,
): T[] {
  if (!data) return [];
  return Array.isArray(data) ? data : (data.results ?? []);
}

export function isPaginatedResponse<T>(
  data: T[] | PaginatedResponse<T> | null | undefined,
): data is PaginatedResponse<T> {
  return Boolean(data && !Array.isArray(data));
}

export function listCount<T>(
  data: T[] | PaginatedResponse<T> | null | undefined,
): number {
  if (!data) return 0;
  return Array.isArray(data) ? data.length : data.count;
}

/**
 * Format money safely (SSR-compatible)
 */
export function currencyMoney(
  value?: string | number | null,
  currency = 'UGX',
  options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  },
): string {
  const amount = Number(value ?? 0);

  if (Number.isNaN(amount)) return `${currency} 0`;

  try {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency,
      minimumFractionDigits: options?.minimumFractionDigits,
      maximumFractionDigits: options?.maximumFractionDigits,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

export function money(value?: string | number | null): string {
  return currencyMoney(value, 'UGX', { maximumFractionDigits: 0 });
}

export function moneyPrecise(value?: string | number | null): string {
  return currencyMoney(value, 'UGX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Resolve client display name safely
 */
export function clientName(client?: Client | string | number | null): string {
  if (!client) return '-';

  if (typeof client !== 'object') {
    return String(client);
  }

  const full =
    client.full_name ||
    `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim();

  return full || String(client.id ?? '-');
}
