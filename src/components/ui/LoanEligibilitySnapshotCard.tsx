import { currencyMoney } from '@/lib/api/format';
import type { LoanEligibilityCheck, LoanEligibilitySnapshot } from '@/types/api';
import { statusLabel } from '@/features/admin/shared';
import { StatusBadge } from './status-badge';

type LoanEligibilitySnapshotCardProps = {
  currency: string;
  snapshot?: LoanEligibilitySnapshot | null;
  title?: string;
  description?: string;
  className?: string;
};

function toCurrencyValue(value: string | number | null | undefined, currency: string) {
  if (value == null || value === '') return '-';
  return currencyMoney(value, currency, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function normalizeEligibilityChecks(snapshot?: LoanEligibilitySnapshot | null) {
  if (!Array.isArray(snapshot?.checks)) return [] as LoanEligibilityCheck[];

  return snapshot.checks.filter(
    (check): check is LoanEligibilityCheck =>
      Boolean(check && typeof check === 'object' && 'code' in check),
  );
}

export function LoanEligibilitySnapshotCard({
  currency,
  snapshot,
  title = 'Eligibility snapshot',
  description = 'Current eligibility checks stored for this loan request.',
  className,
}: LoanEligibilitySnapshotCardProps) {
  const checks = normalizeEligibilityChecks(snapshot);
  const summary =
    snapshot?.summary && typeof snapshot.summary === 'object'
      ? snapshot.summary
      : undefined;
  const hasSnapshot = Boolean(
    snapshot &&
      (typeof snapshot.eligible === 'boolean' ||
        checks.length > 0 ||
        summary ||
        (Array.isArray(snapshot.errors) && snapshot.errors.length > 0)),
  );

  if (!hasSnapshot) {
    return null;
  }

  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4 ${className ?? ''}`.trim()}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
            {title}
          </p>
          <p className="mt-2 text-sm text-slate-600">{description}</p>
        </div>
        <StatusBadge
          status={snapshot?.eligible ? 'active' : 'pending'}
          label={snapshot?.eligible ? 'Eligible' : 'Needs review'}
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <LoanEligibilityMetric
          label="Estimated installment"
          value={toCurrencyValue(summary?.estimated_installment, currency)}
          helper="Largest expected installment from the schedule preview."
        />
        <LoanEligibilityMetric
          label="Savings balance"
          value={toCurrencyValue(summary?.savings_balance, currency)}
          helper="Current savings balance used for the product checks."
        />
        <LoanEligibilityMetric
          label="Share capital"
          value={toCurrencyValue(summary?.share_capital, currency)}
          helper="Current share capital used for the product checks."
        />
        <LoanEligibilityMetric
          label="Overdue loans"
          value={String(summary?.overdue_loans_count ?? 0)}
          helper="Existing overdue loans in the current portfolio."
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {checks.map((check) => (
          <div
            key={check.code}
            className={`rounded-2xl border px-4 py-3 text-sm ${
              check.passed
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : 'border-rose-200 bg-rose-50 text-rose-900'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-bold">{check.label || statusLabel(check.code)}</p>
              <StatusBadge
                status={check.passed ? 'active' : 'rejected'}
                label={check.passed ? 'Passed' : 'Failed'}
              />
            </div>
            <p className="mt-1 leading-6">{check.message}</p>
            {(check.value != null || check.threshold != null) ? (
              <p className="mt-2 text-xs text-current/75">
                Value {check.value ?? '-'} | Threshold {check.threshold ?? '-'}
              </p>
            ) : null}
          </div>
        ))}

        {!checks.length ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-4 text-sm text-slate-600 sm:col-span-2">
            No detailed eligibility checks were stored for this application yet.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function LoanEligibilityMetric({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 break-words font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{helper}</p>
    </div>
  );
}
