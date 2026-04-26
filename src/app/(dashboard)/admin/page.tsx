'use client';

import { MetricCard } from '@/components/dashboard/metric-card';
import { PageHeader } from '@/components/layout/page-header';
import { StateView } from '@/components/ui/state-view';
import { dashboardApi } from '@/lib/api/services';
import { money } from '@/lib/api/format';
import { useApiResource } from '@/hooks/use-api-resource';
import type { AdminDashboardSummary } from '@/types/api';

export default function AdminDashboardPage() {
  const { data, error, isLoading, reload } = useApiResource<AdminDashboardSummary>(dashboardApi.admin);
  if (isLoading) return <StateView title="Loading admin dashboard..." />;
  if (error) return <StateView title="Could not load admin dashboard" description={error} actionLabel="Retry" onAction={reload} />;
  return (
    <div className="grid gap-6">
      <PageHeader title="Admin dashboard" description="Total clients, deposits, portfolio, repayments, branches, staff activity, and reports shortcuts." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total clients" value={String(data?.total_clients ?? data?.clients_count ?? 0)} />
        <MetricCard label="Total deposits" value={money(data?.total_deposits ?? data?.total_savings_balance)} />
        <MetricCard label="Loan portfolio" value={money(data?.loan_portfolio ?? data?.active_loan_principal)} />
        <MetricCard label="Pending loans" value={String(data?.pending_loans ?? 0)} />
      </div>
    </div>
  );
}
