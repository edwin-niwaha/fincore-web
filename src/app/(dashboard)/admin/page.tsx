'use client';

import Link from 'next/link';
import { MetricCard } from '@/components/dashboard/metric-card';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardTitle } from '@/components/ui/card';
import { StateView } from '@/components/ui/state-view';
import { dashboardApi } from '@/lib/api/services';
import { money } from '@/lib/api/format';
import { useApiResource } from '@/hooks/use-api-resource';
import type { AdminDashboardSummary } from '@/types/api';

export default function AdminDashboardPage() {
  const { data, error, isLoading, reload } =
    useApiResource<AdminDashboardSummary>(dashboardApi.admin);
  if (isLoading) return <StateView title="Loading admin dashboard..." />;
  if (error)
    return (
      <StateView
        title="Could not load admin dashboard"
        description={error}
        actionLabel="Retry"
        onAction={reload}
      />
    );
  return (
    <div className="grid gap-6">
      <PageHeader
        title="Admin dashboard"
        description="Total clients, deposits, portfolio, repayments, branches, staff activity, and reports shortcuts."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total clients"
          value={String(data?.total_clients ?? data?.clients_count ?? 0)}
        />
        <MetricCard
          label="Total deposits"
          value={money(data?.total_deposits ?? data?.total_savings_balance)}
        />
        <MetricCard
          label="Loan portfolio"
          value={money(data?.loan_portfolio ?? data?.active_loan_principal)}
        />
        <MetricCard
          label="Pending loans"
          value={String(data?.pending_loans ?? 0)}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Link href="/institutions">
          <Card className="h-full transition hover:border-[#127D61] hover:bg-emerald-50/40">
            <CardTitle>Institution management</CardTitle>
            <p className="mt-2 text-sm text-slate-600">
              Maintain institution profiles, status, contact details, and
              currency settings.
            </p>
          </Card>
        </Link>
        <Link href="/branches">
          <Card className="h-full transition hover:border-[#127D61] hover:bg-emerald-50/40">
            <CardTitle>Branch management</CardTitle>
            <p className="mt-2 text-sm text-slate-600">
              Create and manage branches within the institutions you are allowed
              to administer.
            </p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
