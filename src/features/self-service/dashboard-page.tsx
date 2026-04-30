'use client';

import Link from 'next/link';
import { useState } from 'react';
import { MetricCard } from '@/components/dashboard/metric-card';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Modal } from '@/components/ui/modal';
import { StateView } from '@/components/ui/state-view';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDate, statusLabel } from '@/features/admin/shared';
import { useApiResource } from '@/hooks/use-api-resource';
import { money } from '@/lib/api/format';
import { selfServiceApi } from '@/lib/api/services';
import type {
  LoanApplication,
  LoanRepayment,
  SavingsTransaction,
  SelfServiceDashboardSummary,
} from '@/types/api';
import { SelfServiceProfileEditorCard } from './profile-editor-card';

export function SelfServiceDashboardPage() {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const { data, error, isLoading, reload } = useApiResource<SelfServiceDashboardSummary>(
    selfServiceApi.dashboard,
  );

  if (isLoading && !data) {
    return <StateView title="Loading your self-service dashboard..." />;
  }

  if (error && !data) {
    return (
      <StateView
        title="Could not load the self-service dashboard"
        description={error}
        actionLabel="Retry"
        onAction={() => {
          void reload();
        }}
      />
    );
  }

  const profile = data?.profile_summary;
  const recentSavings = data?.recent_savings_transactions ?? [];
  const recentApplications = data?.recent_loan_applications ?? [];
  const recentRepayments = data?.recent_repayments ?? [];
  const recentNotifications = data?.recent_notifications ?? [];

  return (
    <div className="grid gap-6">
      <PageHeader
        title={profile?.full_name || 'Self-service'}
        description={`Member ${profile?.member_number ?? profile?.client_number ?? '-'} • ${
          profile?.branch_name ?? 'Branch not assigned'
        }`}
      />

      {error && data ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Some dashboard data could not be refreshed.
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Savings balance"
          value={money(data?.total_savings_balance)}
        />
        <MetricCard
          label="Active loans"
          value={String(data?.active_loans_count ?? 0)}
        />
        <MetricCard
          label="Pending applications"
          value={String(data?.pending_loan_applications_count ?? 0)}
        />
        <MetricCard
          label="Unread notifications"
          value={String(data?.unread_notifications_count ?? 0)}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="grid gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Profile summary</CardTitle>
              <p className="mt-2 text-sm text-slate-500">
                Review your member details, branch assignment, and contact
                information.
              </p>
            </div>
            <StatusBadge status={profile?.status} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Contact
              </p>
              <p className="mt-1 font-semibold text-slate-900">
                {profile?.phone || '-'}
              </p>
              <p className="text-sm text-slate-500">
                {profile?.email || 'No email on file'}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Assignment
              </p>
              <p className="mt-1 font-semibold text-slate-900">
                {profile?.institution_name || '-'}
              </p>
              <p className="text-sm text-slate-500">
                {profile?.branch_name || 'Branch not assigned'}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:col-span-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Address
              </p>
              <p className="mt-1 font-semibold text-slate-900">
                {profile?.address || 'No address on file'}
              </p>
            </div>
          </div>
        </Card>

        <Card className="grid gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Quick actions</CardTitle>
              <p className="mt-2 text-sm text-slate-500">
                Continue with the most common self-service tasks.
              </p>
            </div>
            <Button type="button" onClick={() => setIsProfileModalOpen(true)}>
              Edit profile
            </Button>
          </div>

          <div className="grid gap-3">
            <Link
              href="/self-service/loan-applications"
              className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm font-bold text-emerald-900 transition hover:bg-emerald-100"
            >
              Apply for a loan
              <p className="mt-1 text-xs font-medium text-emerald-700">
                Start a fresh application and track its review status.
              </p>
            </Link>

            <Link
              href="/self-service/transactions"
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-900 transition hover:bg-slate-100"
            >
              View all transactions
              <p className="mt-1 text-xs font-medium text-slate-500">
                Savings, loan disbursements, and repayments in one place.
              </p>
            </Link>

            <Link
              href="/self-service/notifications"
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-900 transition hover:bg-slate-100"
            >
              Check notifications
              <p className="mt-1 text-xs font-medium text-slate-500">
                {data?.unread_notifications_count ?? 0} unread message(s).
              </p>
            </Link>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="grid gap-4">
          <CardTitle>Recent savings transactions</CardTitle>
          <DataTable<SavingsTransaction>
            data={recentSavings}
            emptyTitle="No savings activity yet"
            emptyMessage="Savings deposits and withdrawals will appear here once they are recorded by branch staff."
            columns={[
              {
                header: 'Date',
                accessor: (row) => formatDate(row.created_at),
              },
              {
                header: 'Reference',
                accessor: (row) => row.reference ?? row.id,
              },
              {
                header: 'Type',
                accessor: (row) => statusLabel(row.type),
              },
              {
                header: 'Amount',
                accessor: (row) => money(row.amount),
                align: 'right',
              },
            ]}
          />
        </Card>

        <Card className="grid gap-4">
          <CardTitle>Recent notifications</CardTitle>
          {recentNotifications.length ? (
            <div className="grid gap-3">
              {recentNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-900">
                        {notification.title}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {notification.message}
                      </p>
                    </div>
                    <StatusBadge
                      status={notification.is_read ? 'active' : 'pending'}
                      label={notification.is_read ? 'Read' : 'Unread'}
                    />
                  </div>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    {formatDate(notification.created_at)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <StateView
              title="No notifications yet"
              description="Self-service alerts will appear here after savings, loan, or repayment activity is recorded."
            />
          )}
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="grid gap-4">
          <CardTitle>Recent loan applications</CardTitle>
          <DataTable<LoanApplication>
            data={recentApplications}
            emptyTitle="No applications yet"
            emptyMessage="Your recent loan requests will appear here."
            columns={[
              {
                header: 'Product',
                accessor: (row) => row.product_name ?? 'Loan product',
              },
              {
                header: 'Amount',
                accessor: (row) => money(row.amount),
                align: 'right',
              },
              {
                header: 'Status',
                accessor: (row) => <StatusBadge status={row.status} />,
              },
              {
                header: 'Date',
                accessor: (row) => formatDate(row.created_at),
              },
            ]}
          />
        </Card>

        <Card className="grid gap-4">
          <CardTitle>Recent repayments</CardTitle>
          <DataTable<LoanRepayment>
            data={recentRepayments}
            emptyTitle="No repayments recorded"
            emptyMessage="Repayments recorded against your loans will appear here."
            columns={[
              {
                header: 'Date',
                accessor: (row) => formatDate(row.created_at),
              },
              {
                header: 'Reference',
                accessor: (row) => row.reference ?? row.id,
              },
              {
                header: 'Amount',
                accessor: (row) => money(row.amount),
                align: 'right',
              },
              {
                header: 'Remaining balance',
                accessor: (row) => money(row.remaining_balance_after),
                align: 'right',
              },
            ]}
          />
        </Card>
      </div>

      {isProfileModalOpen ? (
        <Modal
          open={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          size="lg"
          title="Update profile"
          description="Only safe contact fields can be changed from self-service."
        >
          <SelfServiceProfileEditorCard
            profile={profile}
            onSaved={async () => {
              await reload();
              setIsProfileModalOpen(false);
            }}
            onCancel={() => setIsProfileModalOpen(false)}
          />
        </Modal>
      ) : null}
    </div>
  );
}
