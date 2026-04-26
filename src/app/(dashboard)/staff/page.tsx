'use client';

import { MetricCard } from '@/components/dashboard/metric-card';
import { PageHeader } from '@/components/layout/page-header';
import { StateView } from '@/components/ui/state-view';
import { dashboardApi } from '@/lib/api/services';
import { money } from '@/lib/api/format';
import { useApiResource } from '@/hooks/use-api-resource';
import type { StaffDashboardSummary } from '@/types/api';

export default function StaffDashboardPage() {
  const { data, error, isLoading, reload } = useApiResource<StaffDashboardSummary>(dashboardApi.staff);
  if (isLoading) return <StateView title="Loading staff dashboard..." />;
  if (error) return <StateView title="Could not load staff dashboard" description={error} actionLabel="Retry" onAction={reload} />;
  return (
    <div className="grid gap-6">
      <PageHeader title="Staff dashboard" description="Collections, pending applications, active clients, portfolio, and quick actions." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Today's collections" value={money(data?.todays_collections)} />
        <MetricCard label="Pending loans" value={String(data?.pending_loan_applications ?? 0)} />
        <MetricCard label="Active clients" value={String(data?.active_clients ?? 0)} />
        <MetricCard label="Portfolio summary" value={money(data?.portfolio_summary)} />
      </div>
    </div>
  );
}
