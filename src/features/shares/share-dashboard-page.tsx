'use client';

import Link from 'next/link';
import { useCallback } from 'react';
import { ArrowUpCircle, ClipboardList, Package2, WalletCards } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Column } from '@/components/ui/data-table';
import { DataTable } from '@/components/ui/data-table';
import { StateView } from '@/components/ui/state-view';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDate, statusLabel } from '@/features/admin/shared';
import { useApiResource } from '@/hooks/use-api-resource';
import { money } from '@/lib/api/format';
import { sharesApi } from '@/lib/api/services';
import type { ShareAccount, ShareProduct, ShareTransaction } from '@/types/api';
import {
  SharesFeatureGate,
  SharesMiniStat,
  SharesSectionCard,
  SharesWorkspaceHeader,
} from '@/features/shares/shared';

type DashboardPayload = {
  accounts: ShareAccount[];
  products: ShareProduct[];
  transactions: ShareTransaction[];
};

export function ShareDashboardPage() {
  const loadDashboard = useCallback(
    async (): Promise<DashboardPayload> => {
      const [accounts, products, transactions] = await Promise.all([
        sharesApi.accounts.listAll(),
        sharesApi.productsAll(),
        sharesApi.transactionsAll(),
      ]);

      return { accounts, products, transactions };
    },
    [],
  );

  const { data, error, isLoading, reload } =
    useApiResource<DashboardPayload>(loadDashboard);

  const accounts = data?.accounts ?? [];
  const products = data?.products ?? [];
  const transactions = data?.transactions ?? [];
  const recentTransactions = [...transactions].slice(0, 8);

  const totalShareCapital = accounts.reduce(
    (sum, account) => sum + Number(account.total_value ?? 0),
    0,
  );
  const fundedMemberCount = new Set(
    accounts
      .filter((account) => Number(account.shares ?? 0) > 0)
      .map((account) => String(account.client ?? '')),
  ).size;
  const pendingApprovals = accounts.filter((account) => account.status === 'pending').length;
  const purchaseCount = transactions.filter((row) => row.type === 'purchase').length;

  const columns: Column<ShareTransaction>[] = [
    {
      header: 'Member',
      accessor: (row) => (
        <div>
          <p className="font-bold text-slate-900">{row.client_name || 'Member'}</p>
          <p className="text-xs text-slate-500">
            {row.account_number || row.client_member_number || 'Share account'}
          </p>
        </div>
      ),
    },
    {
      header: 'Type',
      accessor: (row) => <StatusBadge status={row.type} label={statusLabel(row.type)} />,
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
      unavailableTitle="Shares dashboard is not available"
      unavailableDescription="Only staff roles can access the shares dashboard."
    >
      <div className="grid gap-6">
        <SharesWorkspaceHeader
          title="Shares dashboard"
          description="Track share capital, funded members, pending account approvals, and recent ledger activity."
          actions={
            <>
              <Link href="/shares/purchase">
                <Button type="button">
                  <ArrowUpCircle className="mr-2 h-4 w-4" />
                  Purchase shares
                </Button>
              </Link>
              <Link href="/shares/approvals">
                <Button
                  type="button"
                  className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                >
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Approval queue
                </Button>
              </Link>
            </>
          }
        />

        {isLoading && !data ? <StateView title="Loading shares dashboard..." /> : null}

        {error && !data ? (
          <StateView
            title="Could not load shares dashboard"
            description={error}
            actionLabel="Retry"
            onAction={reload}
          />
        ) : null}

        {data ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SharesMiniStat
                label="Share capital"
                value={money(totalShareCapital)}
                hint="Total value across visible share accounts."
                icon={<WalletCards className="h-5 w-5" />}
              />
              <SharesMiniStat
                label="Members with shares"
                value={fundedMemberCount.toLocaleString('en-UG')}
                hint={`${accounts.length} share accounts are currently in scope.`}
                icon={<Package2 className="h-5 w-5" />}
                tone="sky"
              />
              <SharesMiniStat
                label="Recent postings"
                value={purchaseCount.toLocaleString('en-UG')}
                hint="Purchase entries currently recorded in the share ledger."
                icon={<ArrowUpCircle className="h-5 w-5" />}
                tone="amber"
              />
              <SharesMiniStat
                label="Pending approvals"
                value={pendingApprovals.toLocaleString('en-UG')}
                hint="Current live count from pending share accounts."
                icon={<ClipboardList className="h-5 w-5" />}
                tone="slate"
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
              <SharesSectionCard
                title="Recent share transactions"
                description="Latest purchases, redemptions, transfers, and dividend postings visible to your role."
              >
                <div className="min-w-0 overflow-x-auto">
                  <DataTable<ShareTransaction>
                    data={recentTransactions}
                    columns={columns}
                    emptyMessage="No share transactions have been recorded yet."
                  />
                </div>
              </SharesSectionCard>

              <div className="grid gap-4">
                <SharesSectionCard
                  title="Quick actions"
                  description="Jump into the most common shares workflows."
                >
                  <div className="grid gap-2">
                    <Link href="/shares/products">
                      <Button
                        type="button"
                        className="w-full bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                      >
                        Manage share products
                      </Button>
                    </Link>
                    <Link href="/shares/accounts">
                      <Button
                        type="button"
                        className="w-full bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                      >
                        Review share accounts
                      </Button>
                    </Link>
                    <Link href="/shares/transactions">
                      <Button
                        type="button"
                        className="w-full bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                      >
                        Open share ledger
                      </Button>
                    </Link>
                  </div>
                </SharesSectionCard>

                <SharesSectionCard
                  title="Portfolio snapshot"
                  description="A quick view of the live products and approval posture."
                >
                  <div className="grid gap-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                        Active products
                      </p>
                      <p className="mt-2 text-lg font-black text-slate-900">
                        {products.filter((product) => product.status === 'active').length}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                        Approval scope
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {pendingApprovals > 0
                          ? `${pendingApprovals} share account approvals are waiting for review.`
                          : 'No live share account approvals are waiting right now.'}
                      </p>
                    </div>
                  </div>
                </SharesSectionCard>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </SharesFeatureGate>
  );
}
