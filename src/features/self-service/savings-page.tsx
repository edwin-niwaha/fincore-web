'use client';

import { useState } from 'react';
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

  return (
    <div className="grid gap-6">
      <PageHeader
        title="My savings"
        description="See your balance at a glance, then open a clean statement when you need the details."
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

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="grid gap-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Savings balance</CardTitle>
              <p className="mt-2 text-sm text-slate-500">
                {data?.client_name || 'Member account'}
              </p>
              <p className="text-sm text-slate-500">
                {data?.member_number || 'No member number'}
              </p>
            </div>
            <StatusBadge status={accounts[0]?.status ?? 'active'} label={currency} />
          </div>

          <div className="rounded-[28px] border border-emerald-200 bg-[linear-gradient(135deg,#f1fff8_0%,#ecfdf5_40%,#ffffff_100%)] px-6 py-7">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-700/70">
              Total savings balance
            </p>
            <p className="mt-3 text-3xl font-black tracking-tight text-[#127D61] sm:text-4xl">
              {currencyMoney(data?.total_balance, currency, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {data?.account_count ?? 0} savings account(s)
            </p>
          </div>

          {accounts.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-900">
                        {account.account_number || account.id}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
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

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              className="min-h-11 px-5"
              onClick={() => setIsStatementOpen(true)}
            >
              View Savings Statement
            </Button>
          </div>
        </Card>

        <Card className="grid gap-4">
          <div>
            <CardTitle>Recent activity</CardTitle>
            <p className="mt-2 text-sm text-slate-500">
              A compact snapshot of your latest branch-posted savings activity.
            </p>
          </div>

          {recentActivity.length ? (
            <div className="grid gap-3">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-900">
                        {activity.reference || activity.id}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {formatDate(activity.date)}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-200 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-700">
                      {statusLabel(
                        activity.transaction_type_label ?? activity.transaction_type,
                      )}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                    <span className="font-semibold text-slate-900">
                      {currencyMoney(activity.amount, currency, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    <span className="text-slate-500">
                      Balance{' '}
                      {currencyMoney(activity.balance, currency, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
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
