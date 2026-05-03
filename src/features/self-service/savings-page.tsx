'use client';

import { useState } from 'react';
import { Activity, FileText, WalletCards } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { StateView } from '@/components/ui/state-view';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDate, statusLabel } from '@/features/admin/shared';
import { useApiResource } from '@/hooks/use-api-resource';
import { currencyMoney } from '@/lib/api/format';
import { selfServiceApi } from '@/lib/api/services';
import type { SelfServiceSavingsSummary } from '@/types/api';
import { SelfServiceSavingsStatementModal } from './savings-statement-modal';

function CompactMoney({ value }: { value: string }) {
  return (
    <span className="block min-w-0 truncate text-base font-bold leading-tight text-[#127D61] tabular-nums sm:text-lg">
      {value}
    </span>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white px-3 py-2">
      <p className="truncate text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 min-w-0 truncate text-sm font-semibold text-slate-900 tabular-nums">
        {value}
      </p>
    </div>
  );
}

export function SelfServiceSavingsPage() {
  const [isStatementOpen, setIsStatementOpen] = useState(false);
  const { data, error, isLoading, reload } =
    useApiResource<SelfServiceSavingsSummary>(selfServiceApi.savings.summary);

  if (isLoading && !data) {
    return <StateView title="Loading your savings..." />;
  }

  if (error && !data) {
    return (
      <StateView
        title="Could not load your savings"
        description={error}
        actionLabel="Retry"
        onAction={() => {
          void reload();
        }}
      />
    );
  }

  const currency = data?.currency || 'UGX';
  const recentActivity = data?.recent_activity?.slice(0, 5) ?? [];
  const accounts = data?.accounts ?? [];
  const totalBalance = currencyMoney(data?.total_balance, currency, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="grid min-w-0 gap-4 sm:gap-6">
      <PageHeader
        title="My savings"
        description="See your savings balance at a glance and open your statement when you need details."
      />

      {error && data ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Your latest savings summary could not be refreshed.
          <button
            type="button"
            className="ml-2 font-bold underline underline-offset-2"
            onClick={() => {
              void reload();
            }}
          >
            Retry
          </button>
        </div>
      ) : null}

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
        <Card className="grid min-w-0 gap-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle>Savings balance</CardTitle>
              <p className="mt-1 truncate text-sm text-slate-500">
                {data?.client_name || 'Member account'}
              </p>
              <p className="truncate text-xs text-slate-500">
                {data?.member_number || 'No member number'}
              </p>
            </div>
            <StatusBadge status={accounts[0]?.status ?? 'active'} label={currency} />
          </div>

          <div className="min-w-0 rounded-[24px] border border-emerald-200 bg-[linear-gradient(135deg,#f1fff8_0%,#ecfdf5_45%,#ffffff_100%)] p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700/70">
                  Total savings balance
                </p>
                <p className="mt-2 min-w-0 truncate text-xl font-black leading-tight text-[#127D61] tabular-nums sm:text-2xl">
                  {totalBalance}
                </p>
                <p className="mt-1 truncate text-xs text-slate-500">
                  {data?.account_count ?? 0} savings account(s)
                </p>
              </div>
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[#127D61] ring-1 ring-emerald-100">
                <WalletCards className="h-5 w-5" />
              </span>
            </div>
          </div>

          {accounts.length ? (
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">
                        {account.account_number || account.id}
                      </p>
                      <p className="mt-1 min-w-0 truncate text-sm font-semibold text-[#127D61] tabular-nums">
                        {currencyMoney(account.balance, currency, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                    <StatusBadge status={account.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-4 text-sm text-slate-600">
              No savings accounts are linked to your profile yet.
            </div>
          )}

          <Button
            type="button"
            className="min-h-11 w-full justify-center px-5 sm:w-fit"
            onClick={() => setIsStatementOpen(true)}
          >
            <FileText className="mr-2 h-4 w-4" />
            View Savings Statement
          </Button>
        </Card>

        <Card className="grid min-w-0 gap-4 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle>Recent activity</CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                Latest branch-posted savings transactions.
              </p>
            </div>
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 ring-1 ring-slate-200">
              <Activity className="h-4 w-4" />
            </span>
          </div>

          {recentActivity.length ? (
            <div className="grid min-w-0 gap-3">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">
                        {activity.reference || activity.id}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDate(activity.date)}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-slate-200 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-700">
                      {statusLabel(
                        activity.transaction_type_label ?? activity.transaction_type,
                      )}
                    </span>
                  </div>

                  <div className="mt-3 grid min-w-0 gap-2 sm:grid-cols-2">
                    <MiniStat
                      label="Amount"
                      value={currencyMoney(activity.amount, currency, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    />
                    <MiniStat
                      label="Balance"
                      value={currencyMoney(activity.balance, currency, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-5 text-sm text-slate-600">
              No recent savings activity has been posted yet.
            </div>
          )}
        </Card>
      </div>

      {isStatementOpen ? (
        <SelfServiceSavingsStatementModal
          open={isStatementOpen}
          onClose={() => setIsStatementOpen(false)}
          defaultCurrency={currency}
        />
      ) : null}
    </div>
  );
}
