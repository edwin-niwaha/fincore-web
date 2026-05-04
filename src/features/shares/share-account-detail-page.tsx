'use client';

import Link from 'next/link';
import { useCallback } from 'react';
import { ArrowDownCircle, ArrowLeft, ArrowUpCircle, WalletCards } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import type { Column } from '@/components/ui/data-table';
import { DataTable } from '@/components/ui/data-table';
import { StateView } from '@/components/ui/state-view';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDate } from '@/features/admin/shared';
import { useApiResource } from '@/hooks/use-api-resource';
import { money } from '@/lib/api/format';
import { sharesApi } from '@/lib/api/services';
import type { ShareAccount, ShareTransaction } from '@/types/api';
import { SharesFeatureGate, SharesWorkspaceHeader } from '@/features/shares/shared';

export function ShareAccountDetailPage({ accountId }: { accountId: string }) {
  const loadAccount = useCallback(() => sharesApi.accounts.get(accountId), [accountId]);
  const { data, error, isLoading, reload } = useApiResource<ShareAccount>(loadAccount);

  const recentTransactions = data?.recent_transactions ?? [];

  const transactionColumns: Column<ShareTransaction>[] = [
    {
      header: 'Transaction',
      accessor: (row) => (
        <div>
          <p className="font-bold text-slate-900">{row.reference || 'Reference'}</p>
          <p className="text-xs text-slate-500">{row.type_label || row.type || 'Posted entry'}</p>
        </div>
      ),
    },
    {
      header: 'Type',
      accessor: (row) => <StatusBadge status={row.type} />,
    },
    {
      header: 'Shares',
      accessor: (row) => (
        <span className="whitespace-nowrap font-bold tabular-nums">
          {Number(row.shares ?? 0).toLocaleString('en-UG')}
        </span>
      ),
      align: 'right',
    },
    {
      header: 'Amount',
      accessor: (row) => (
        <span className="whitespace-nowrap font-bold tabular-nums">{money(row.amount)}</span>
      ),
      align: 'right',
    },
    {
      header: 'Date',
      accessor: (row) => formatDate(row.created_at),
    },
  ];

  return (
    <SharesFeatureGate
      unavailableTitle="Share account details are not available"
      unavailableDescription="Only staff roles can review share account details."
    >
      <div className="grid gap-6">
        <SharesWorkspaceHeader
          title="Share account details"
          description="Review account holdings, product configuration, and recent share activity."
          actions={
            <>
              <Link href="/shares/accounts">
                <Button
                  type="button"
                  className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to accounts
                </Button>
              </Link>

              {data?.status === 'active' ? (
                <>
                  <Link href={`/shares/purchase?account=${data.id}`}>
                    <Button type="button">
                      <ArrowUpCircle className="mr-2 h-4 w-4" />
                      Purchase shares
                    </Button>
                  </Link>
                  <Link href={`/shares/redemption?account=${data.id}`}>
                    <Button
                      type="button"
                      className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                    >
                      <ArrowDownCircle className="mr-2 h-4 w-4" />
                      Redeem shares
                    </Button>
                  </Link>
                </>
              ) : null}
            </>
          }
        />

        {isLoading ? <StateView title="Loading share account..." /> : null}

        {error ? (
          <StateView
            title="Could not load share account"
            description={error}
            actionLabel="Retry"
            onAction={reload}
          />
        ) : null}

        {data ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card className="grid gap-2 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Account number
                </p>
                <p className="text-lg font-black text-slate-900">{data.account_number}</p>
              </Card>
              <Card className="grid gap-2 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Current shares
                </p>
                <p className="text-lg font-black text-slate-900">
                  {Number(data.shares ?? 0).toLocaleString('en-UG')}
                </p>
              </Card>
              <Card className="grid gap-2 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Share capital
                </p>
                <p className="text-lg font-black text-slate-900">{money(data.total_value)}</p>
              </Card>
              <Card className="grid gap-2 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Status
                </p>
                <div>
                  <StatusBadge status={data.status} />
                </div>
              </Card>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
              <Card className="grid gap-4 p-5">
                <div className="flex items-center gap-3">
                  <WalletCards className="h-5 w-5 text-[#127D61]" />
                  <CardTitle>Account summary</CardTitle>
                </div>

                <dl className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                      Member
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-slate-900">
                      {data.client_name || '-'}
                    </dd>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                      Member number
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-slate-900">
                      {data.client_member_number || '-'}
                    </dd>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                      Product
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-slate-900">
                      {data.product_name || '-'}
                    </dd>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                      Nominal price
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-slate-900">
                      {money(data.nominal_price)}
                    </dd>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                      Branch
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-slate-900">
                      {data.branch_name || '-'}
                    </dd>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                      Last activity
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-slate-900">
                      {formatDate(data.last_transaction_at ?? data.updated_at)}
                    </dd>
                  </div>
                </dl>
              </Card>

              <Card className="grid gap-4 p-5">
                <CardTitle>Related navigation</CardTitle>
                <div className="grid gap-2">
                  <Link href="/shares/transactions">
                    <Button
                      type="button"
                      className="w-full bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                    >
                      Full share ledger
                    </Button>
                  </Link>
                  <Link href="/shares/reports">
                    <Button
                      type="button"
                      className="w-full bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                    >
                      Share reports
                    </Button>
                  </Link>
                  {data.client ? (
                    <Link href={`/clients/${data.client}`}>
                      <Button
                        type="button"
                        className="w-full bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                      >
                        Member profile
                      </Button>
                    </Link>
                  ) : null}
                </div>
              </Card>
            </div>

            <Card className="grid gap-4 p-5">
              <CardTitle>Recent share transactions</CardTitle>
              <div className="min-w-0 overflow-x-auto">
                <DataTable<ShareTransaction>
                  data={recentTransactions}
                  columns={transactionColumns}
                  emptyMessage="No share transactions have been recorded for this account yet."
                />
              </div>
            </Card>
          </>
        ) : null}
      </div>
    </SharesFeatureGate>
  );
}
