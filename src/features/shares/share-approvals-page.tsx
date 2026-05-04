'use client';

import Link from 'next/link';
import { useCallback } from 'react';
import { Eye, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Column } from '@/components/ui/data-table';
import { DataTable } from '@/components/ui/data-table';
import { StateView } from '@/components/ui/state-view';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDate } from '@/features/admin/shared';
import { useApiResource } from '@/hooks/use-api-resource';
import type { ShareAccount } from '@/types/api';
import {
  SharesFeatureGate,
  SharesMiniStat,
  SharesSectionCard,
  SharesWorkspaceHeader,
  shareApprovalRoles,
} from '@/features/shares/shared';
import { sharesApi } from '@/lib/api/services';

export function ShareApprovalsPage() {
  const loadPendingAccounts = useCallback(
    () => sharesApi.accounts.listAll({ status: 'pending', ordering: 'account_number' }),
    [],
  );

  const { data, error, isLoading, reload } = useApiResource(loadPendingAccounts);
  const pendingAccounts = data ?? [];

  const columns: Column<ShareAccount>[] = [
    {
      header: 'Account',
      accessor: (account) => (
        <div>
          <p className="font-bold text-slate-900">{account.account_number || account.id}</p>
          <p className="text-xs text-slate-500">{account.product_name || 'Share product'}</p>
        </div>
      ),
    },
    {
      header: 'Member',
      accessor: (account) => (
        <div>
          <p className="font-bold text-slate-900">{account.client_name || 'Member'}</p>
          <p className="text-xs text-slate-500">{account.client_member_number || '-'}</p>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: (account) => <StatusBadge status={account.status} />,
    },
    {
      header: 'Created',
      accessor: (account) => formatDate(account.created_at),
    },
    {
      header: 'Actions',
      accessor: (account) => (
        <Link href={`/shares/accounts/${account.id}`}>
          <Button
            type="button"
            className="bg-white px-3 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
          >
            <Eye className="mr-2 h-4 w-4" />
            Review
          </Button>
        </Link>
      ),
      align: 'right',
    },
  ];

  return (
    <SharesFeatureGate
      roles={shareApprovalRoles}
      unavailableTitle="Share approvals are not available"
      unavailableDescription="Only approval roles can access the shares approval queue."
    >
      <div className="grid gap-6">
        <SharesWorkspaceHeader
          title="Share approvals"
          description="Track the live approval queue for share accounts and monitor upcoming approval workflows."
        />

        {isLoading && !data ? <StateView title="Loading share approvals..." /> : null}

        {error ? (
          <StateView
            title="Could not load pending share accounts"
            description={error}
            actionLabel="Retry"
            onAction={reload}
          />
        ) : null}

        {!error ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SharesMiniStat
                label="Pending account approvals"
                value={pendingAccounts.length.toLocaleString('en-UG')}
                hint="Current live count from share accounts in pending status."
                icon={<ListChecks className="h-5 w-5" />}
              />
            </div>

            <SharesSectionCard
              title="Pending share accounts"
              description="The live queue currently supported by the shares API."
            >
              <div className="min-w-0 overflow-x-auto">
                <DataTable<ShareAccount>
                  data={pendingAccounts}
                  columns={columns}
                  emptyMessage="There are no pending share account approvals right now."
                />
              </div>
            </SharesSectionCard>

            <Card className="grid gap-4 p-5">
              <div>
                <h2 className="text-lg font-black text-slate-900">Upcoming approval queues</h2>
                <p className="mt-1 text-sm text-slate-500">
                  The navigation is ready for broader shares approvals, but these queues still need dedicated backend workflow states and endpoints.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {[
                  'Additional share request approvals',
                  'Transfer approvals',
                  'Redemption approvals',
                  'Dividend declaration approvals',
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </Card>
          </>
        ) : null}
      </div>
    </SharesFeatureGate>
  );
}
