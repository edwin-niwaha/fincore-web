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

/**
 * Format money safely (SSR-compatible)
 */
export function money(value?: string | number | null): string {
  const amount = Number(value ?? 0);

  if (Number.isNaN(amount)) return 'UGX 0';

  try {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    // Fallback (very rare, but safe for SSR edge cases)
    return `UGX ${amount.toLocaleString()}`;
  }
}

export function moneyPrecise(value?: string | number | null): string {
  const amount = Number(value ?? 0);

  if (Number.isNaN(amount)) return 'UGX 0.00';

  try {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `UGX ${amount.toFixed(2)}`;
  }
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
