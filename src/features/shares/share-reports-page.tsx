'use client';

import { useCallback } from 'react';
import { BarChart3, FileText } from 'lucide-react';
import { Card, CardTitle } from '@/components/ui/card';
import type { Column } from '@/components/ui/data-table';
import { DataTable } from '@/components/ui/data-table';
import { StateView } from '@/components/ui/state-view';
import { money } from '@/lib/api/format';
import { sharesApi } from '@/lib/api/services';
import type { ShareAccount, ShareProduct } from '@/types/api';
import { useApiResource } from '@/hooks/use-api-resource';
import {
  SharesFeatureGate,
  SharesMiniStat,
  SharesWorkspaceHeader,
} from '@/features/shares/shared';

type ReportsPayload = {
  accounts: ShareAccount[];
  products: ShareProduct[];
};

export function ShareReportsPage() {
  const loadReportsData = useCallback(
    async (): Promise<ReportsPayload> => {
      const [accounts, products] = await Promise.all([
        sharesApi.accounts.listAll({ ordering: 'account_number' }),
        sharesApi.productsAll({ ordering: 'name' }),
      ]);

      return { accounts, products };
    },
    [],
  );

  const { data, error, isLoading, reload } =
    useApiResource<ReportsPayload>(loadReportsData);

  const accounts = data?.accounts ?? [];
  const products = data?.products ?? [];

  const capitalSummary = products.map((product) => {
    const productAccounts = accounts.filter(
      (account) => String(account.product) === String(product.id),
    );
    const totalValue = productAccounts.reduce(
      (sum, account) => sum + Number(account.total_value ?? 0),
      0,
    );

    return {
      id: String(product.id),
      product: product.name,
      accounts: productAccounts.length,
      totalValue,
    };
  });

  const totalCapital = accounts.reduce(
    (sum, account) => sum + Number(account.total_value ?? 0),
    0,
  );
  const fundedMembers = new Set(
    accounts
      .filter((account) => Number(account.shares ?? 0) > 0)
      .map((account) => String(account.client ?? '')),
  ).size;

  const summaryColumns: Column<(typeof capitalSummary)[number]>[] = [
    {
      header: 'Product',
      accessor: (row) => row.product,
    },
    {
      header: 'Accounts',
      accessor: (row) => row.accounts.toLocaleString('en-UG'),
      align: 'right',
    },
    {
      header: 'Capital',
      accessor: (row) => money(row.totalValue),
      align: 'right',
    },
  ];

  const previewColumns: Column<ShareAccount>[] = [
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
      header: 'Product',
      accessor: (account) => account.product_name || '-',
    },
    {
      header: 'Shares',
      accessor: (account) => Number(account.shares ?? 0).toLocaleString('en-UG'),
      align: 'right',
    },
    {
      header: 'Value',
      accessor: (account) => money(account.total_value),
      align: 'right',
    },
  ];

  return (
    <SharesFeatureGate
      unavailableTitle="Share reports are not available"
      unavailableDescription="Only staff roles can access the shares reporting workspace."
    >
      <div className="grid gap-6">
        <SharesWorkspaceHeader
          title="Share reports"
          description="Preview live share register and capital summary data while dedicated exports and formal reports are completed."
        />

        {isLoading && !data ? <StateView title="Loading share reports..." /> : null}

        {error ? (
          <StateView
            title="Could not load shares reporting data"
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
                value={money(totalCapital)}
                hint="Current capital represented by all visible share accounts."
                icon={<BarChart3 className="h-5 w-5" />}
              />
              <SharesMiniStat
                label="Funded members"
                value={fundedMembers.toLocaleString('en-UG')}
                hint="Members currently holding one or more shares."
                icon={<FileText className="h-5 w-5" />}
                tone="sky"
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <Card className="grid gap-4 p-5">
                <div>
                  <CardTitle>Share capital summary</CardTitle>
                  <p className="mt-1 text-sm text-slate-500">
                    Live product-level summary that can back the future share capital report.
                  </p>
                </div>

                <div className="min-w-0 overflow-x-auto">
                  <DataTable data={capitalSummary} columns={summaryColumns} />
                </div>
              </Card>

              <Card className="grid gap-4 p-5">
                <div>
                  <CardTitle>Share register preview</CardTitle>
                  <p className="mt-1 text-sm text-slate-500">
                    Current account-level preview for statement and register style reports.
                  </p>
                </div>

                <div className="min-w-0 overflow-x-auto">
                  <DataTable
                    data={accounts.slice(0, 8)}
                    columns={previewColumns}
                    emptyMessage="No share accounts are available for the register preview."
                  />
                </div>
              </Card>
            </div>

            <Card className="grid gap-4 p-5">
              <div>
                <CardTitle>Planned report set</CardTitle>
                <p className="mt-1 text-sm text-slate-500">
                  These report types are exposed in navigation scope, but still need dedicated backend endpoints and export flows.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {[
                  'Share statement',
                  'Share register',
                  'Share capital summary',
                  'Dividend report',
                  'Transfers and redemptions',
                  'Underfunded members',
                ].map((reportName) => (
                  <div
                    key={reportName}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700"
                  >
                    {reportName}
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
