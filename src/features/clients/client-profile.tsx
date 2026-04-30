'use client';

import Link from 'next/link';
import { useCallback } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardTitle } from '@/components/ui/card';
import type { Column } from '@/components/ui/data-table';
import { DataTable } from '@/components/ui/data-table';
import { StateView } from '@/components/ui/state-view';
import { formatDate, statusLabel, statusPillClassName } from '@/features/admin/shared';
import { useApiResource } from '@/hooks/use-api-resource';
import { clientName, money } from '@/lib/api/format';
import { clientsApi } from '@/lib/api/services';
import type {
  ClientLoanSnapshot,
  ClientProfile,
  ClientSavingsActivity,
  Transaction,
} from '@/types/api';

function DetailItem({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-slate-900">{value || '-'}</dd>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card>
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-[#127D61]">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{hint}</p>
    </Card>
  );
}

export function ClientProfileView({ id }: { id: string }) {
  const loadClient = useCallback(() => clientsApi.getProfile(id), [id]);
  const { data, error, isLoading, reload } = useApiResource<ClientProfile>(
    loadClient,
  );

  const recentSavingsColumns: Column<ClientSavingsActivity>[] = [
    {
      header: 'Savings activity',
      accessor: (row) => (
        <div>
          <p className="font-bold text-slate-900">
            {(row.type ?? 'transaction').replaceAll('_', ' ')}
          </p>
          <p className="text-xs text-slate-500">
            {row.account_number || row.reference || 'No reference'}
          </p>
        </div>
      ),
    },
    {
      header: 'Amount',
      accessor: (row) => money(row.amount),
    },
    {
      header: 'Balance after',
      accessor: (row) => money(row.balance_after),
    },
    {
      header: 'Date',
      accessor: (row) => formatDate(row.created_at),
    },
  ];

  const recentLoanColumns: Column<ClientLoanSnapshot>[] = [
    {
      header: 'Loan',
      accessor: (row) => (
        <div>
          <p className="font-bold text-slate-900">{row.product_name || 'Loan'}</p>
          <p className="text-xs text-slate-500">
            {row.term_months ? `${row.term_months} months` : 'Term not set'}
          </p>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: (row) => (
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusPillClassName(
            row.status,
          )}`}
        >
          {statusLabel(row.status)}
        </span>
      ),
    },
    {
      header: 'Amount',
      accessor: (row) => money(row.amount),
    },
    {
      header: 'Outstanding',
      accessor: (row) => money(row.principal_balance),
    },
    {
      header: 'Date',
      accessor: (row) => formatDate(row.disbursed_at ?? row.created_at),
    },
  ];

  const recentTransactionColumns: Column<Transaction>[] = [
    {
      header: 'Transaction',
      accessor: (row) => (
        <div>
          <p className="font-bold text-slate-900">{row.reference || 'Reference'}</p>
          <p className="text-xs text-slate-500">{row.category || 'General'}</p>
        </div>
      ),
    },
    {
      header: 'Direction',
      accessor: (row) => (
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${row.direction === 'credit' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}
        >
          {statusLabel(row.direction)}
        </span>
      ),
    },
    {
      header: 'Amount',
      accessor: (row) => money(row.amount),
    },
    {
      header: 'Date',
      accessor: (row) => formatDate(row.created_at ?? row.date),
    },
  ];

  if (isLoading) return <StateView title="Loading client profile..." />;
  if (error)
    return (
      <StateView
        title="Could not load client profile"
        description={error}
        actionLabel="Retry"
        onAction={reload}
      />
    );

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title={clientName(data)}
          description={`Member number ${data?.member_number ?? data?.id ?? '-'}`}
        />
        <Link
          href="/clients"
          className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
        >
          Back to clients
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Savings balance"
          value={money(data?.savings_summary?.total_balance)}
          hint={`${data?.savings_summary?.active_account_count ?? 0} active accounts`}
        />
        <SummaryCard
          label="Outstanding principal"
          value={money(data?.loans_summary?.outstanding_principal_balance)}
          hint={`${data?.loans_summary?.open_application_count ?? 0} open applications`}
        />
        <SummaryCard
          label="Net transaction flow"
          value={money(data?.transactions_summary?.net_flow)}
          hint={`${data?.transactions_summary?.count ?? 0} ledger entries`}
        />
        <SummaryCard
          label="Interest outstanding"
          value={money(data?.loans_summary?.outstanding_interest_balance)}
          hint={`${data?.loans_summary?.disbursed_loan_count ?? 0} disbursed loans`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <Card className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Client profile</CardTitle>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusPillClassName(
                data?.status,
              )}`}
            >
              {statusLabel(data?.status)}
            </span>
          </div>
          <dl className="grid gap-4 md:grid-cols-2">
            <DetailItem
              label="Institution"
              value={data?.institution_name || data?.institution_code || null}
            />
            <DetailItem label="Branch" value={data?.branch_name || null} />
            <DetailItem
              label="Phone"
              value={data?.phone || null}
            />
            <DetailItem
              label="Email"
              value={data?.email || null}
            />
            <DetailItem
              label="National ID"
              value={data?.national_id || null}
            />
            <DetailItem
              label="Portal access"
              value={
                data?.user
                  ? data?.user_full_name && data?.user_email
                    ? `${data.user_full_name} (${data.user_email})`
                    : data?.user_full_name || data?.user_email || 'Linked user'
                  : 'Not linked'
              }
            />
            <DetailItem
              label="Date of birth"
              value={formatDate(data?.date_of_birth || undefined)}
            />
            <DetailItem
              label="Occupation"
              value={data?.occupation || null}
            />
            <DetailItem
              label="Next of kin"
              value={
                data?.next_of_kin_name
                  ? `${data.next_of_kin_name}${data.next_of_kin_phone ? ` (${data.next_of_kin_phone})` : ''}`
                  : data?.next_of_kin_phone || null
              }
            />
            <DetailItem label="Address" value={data?.address || null} />
            <DetailItem
              label="Created by"
              value={data?.created_by_email || 'System'}
            />
            <DetailItem
              label="Last updated by"
              value={data?.updated_by_email || 'System'}
            />
            <DetailItem
              label="Profile updated"
              value={formatDate(data?.updated_at ?? data?.created_at)}
            />
          </dl>
        </Card>

        <Card className="grid gap-4">
          <CardTitle>Financial snapshot</CardTitle>
          <div className="grid gap-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Savings activity
              </p>
              <p className="mt-2 text-lg font-black text-slate-900">
                {data?.savings_summary?.transaction_count ?? 0} transactions
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Total balance {money(data?.savings_summary?.total_balance)}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Loan portfolio
              </p>
              <p className="mt-2 text-lg font-black text-slate-900">
                {data?.loans_summary?.application_count ?? 0} applications
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Requested {money(data?.loans_summary?.total_requested_amount)}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Transaction mix
              </p>
              <p className="mt-2 text-lg font-black text-slate-900">
                Credits {money(data?.transactions_summary?.total_credits)}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Debits {money(data?.transactions_summary?.total_debits)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="grid gap-4">
        <CardTitle>Recent savings</CardTitle>
        <DataTable<ClientSavingsActivity>
          data={data?.recent_savings_transactions ?? []}
          columns={recentSavingsColumns}
          emptyMessage="No savings activity has been recorded for this client."
        />
      </Card>

      <Card className="grid gap-4">
        <CardTitle>Recent loans</CardTitle>
        <DataTable<ClientLoanSnapshot>
          data={data?.recent_loans ?? []}
          columns={recentLoanColumns}
          emptyMessage="No loan applications have been recorded for this client."
        />
      </Card>

      <Card className="grid gap-4">
        <CardTitle>Recent transactions</CardTitle>
        <DataTable<Transaction>
          data={data?.recent_transactions ?? []}
          columns={recentTransactionColumns}
          emptyMessage="No transactions have been recorded for this client."
        />
      </Card>
    </div>
  );
}
