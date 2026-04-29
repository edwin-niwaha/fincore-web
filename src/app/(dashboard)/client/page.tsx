'use client';

import { MetricCard } from '@/components/dashboard/metric-card';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable } from '@/components/ui/data-table';
import { StateView } from '@/components/ui/state-view';
import { dashboardApi } from '@/lib/api/services';
import { money } from '@/lib/api/format';
import { useApiResource } from '@/hooks/use-api-resource';
import type { ClientDashboardSummary, Transaction } from '@/types/api';

export default function ClientDashboardPage() {
  const { data, error, isLoading, reload } =
    useApiResource<ClientDashboardSummary>(dashboardApi.client);
  if (isLoading) return <StateView title="Loading client dashboard..." />;
  if (error)
    return (
      <StateView
        title="Could not load client dashboard"
        description={error}
        actionLabel="Retry"
        onAction={reload}
      />
    );
  const rows = data?.recent_transactions ?? [];
  return (
    <div className="grid gap-6">
      <PageHeader
        title="Client self-service dashboard"
        description="Account summary, savings balance, active loans, repayments, transaction history, KYC, and notifications."
      />
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Savings balance"
          value={money(data?.total_savings_balance)}
        />
        <MetricCard
          label="Active loan balance"
          value={money(data?.active_loan_balance)}
        />
        <MetricCard
          label="Notifications"
          value={String(data?.notifications?.length ?? 0)}
        />
      </div>
      <DataTable<Transaction>
        data={rows}
        emptyMessage="No recent transactions returned by /dashboards/client/."
        columns={[
          { header: 'Reference', accessor: (row) => row.reference ?? row.id },
          {
            header: 'Type',
            accessor: (row) => row.category ?? row.type ?? 'Transaction',
          },
          { header: 'Amount', accessor: (row) => money(row.amount) },
          { header: 'Status', accessor: (row) => row.status ?? '-' },
        ]}
      />
    </div>
  );
}
