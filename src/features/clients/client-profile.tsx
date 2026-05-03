'use client';

import Link from 'next/link';
import { useCallback } from 'react';
import { ArrowLeft, Banknote, BriefcaseBusiness, Landmark, WalletCards } from 'lucide-react';
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

type SummaryTone = 'green' | 'slate' | 'amber' | 'blue';

function DetailItem({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2">
      <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </dt>
      <dd className="mt-1 min-w-0 break-words text-sm font-semibold text-slate-900">
        {value || '-'}
      </dd>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  icon,
  tone = 'green',
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
  tone?: SummaryTone;
}) {
  const toneClassName: Record<SummaryTone, string> = {
    green: 'bg-emerald-50 text-[#127D61] ring-emerald-100',
    slate: 'bg-slate-100 text-slate-700 ring-slate-200',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
  };

  return (
    <Card className="min-w-0 overflow-hidden p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {/* Label */}
          <p className="truncate text-xs font-bold uppercase tracking-wide text-slate-500">
            {label}
          </p>

          {/* ✅ FIXED AMOUNT (SMALL + NO OVERFLOW) */}
          <p className="mt-1 min-w-0 truncate text-sm font-semibold text-slate-900 tabular-nums">
            {value}
          </p>
        </div>

        {/* Icon */}
        <span
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${toneClassName[tone]}`}
        >
          {icon}
        </span>
      </div>

      {/* Hint */}
      <p className="mt-1 truncate text-xs text-slate-500">
        {hint}
      </p>
    </Card>
  );
}

function SnapshotBox({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 break-words text-lg font-black text-slate-900 tabular-nums">
        {value}
      </p>
      <p className="mt-1 break-words text-sm text-slate-500">{hint}</p>
    </div>
  );
}

export function ClientProfileView({ id }: { id: string }) {
  const loadClient = useCallback(() => clientsApi.getProfile(id), [id]);
  const { data, error, isLoading, reload } = useApiResource<ClientProfile>(loadClient);

  const recentSavingsColumns: Column<ClientSavingsActivity>[] = [
    {
      header: 'Savings activity',
      accessor: (row) => (
        <div className="min-w-[150px]">
          <p className="font-bold capitalize text-slate-900">
            {(row.type ?? 'transaction').replaceAll('_', ' ')}
          </p>
          <p className="break-words text-xs text-slate-500">
            {row.account_number || row.reference || 'No reference'}
          </p>
        </div>
      ),
    },
    {
      header: 'Amount',
      accessor: (row) => (
        <span className="whitespace-nowrap font-bold tabular-nums">
          {money(row.amount)}
        </span>
      ),
      align: 'right',
    },
    {
      header: 'Balance after',
      accessor: (row) => (
        <span className="whitespace-nowrap font-bold tabular-nums text-[#127D61]">
          {money(row.balance_after)}
        </span>
      ),
      align: 'right',
    },
    {
      header: 'Date',
      accessor: (row) => <span className="whitespace-nowrap">{formatDate(row.created_at)}</span>,
    },
  ];

  const recentLoanColumns: Column<ClientLoanSnapshot>[] = [
    {
      header: 'Loan',
      accessor: (row) => (
        <div className="min-w-[150px]">
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
      accessor: (row) => <span className="whitespace-nowrap tabular-nums">{money(row.amount)}</span>,
      align: 'right',
    },
    {
      header: 'Outstanding',
      accessor: (row) => (
        <span className="whitespace-nowrap font-bold tabular-nums">
          {money(row.principal_balance)}
        </span>
      ),
      align: 'right',
    },
    {
      header: 'Date',
      accessor: (row) => <span className="whitespace-nowrap">{formatDate(row.disbursed_at ?? row.created_at)}</span>,
    },
  ];

  const recentTransactionColumns: Column<Transaction>[] = [
    {
      header: 'Transaction',
      accessor: (row) => (
        <div className="min-w-[150px]">
          <p className="break-words font-bold text-slate-900">{row.reference || 'Reference'}</p>
          <p className="text-xs text-slate-500">{row.category || 'General'}</p>
        </div>
      ),
    },
    {
      header: 'Direction',
      accessor: (row) => (
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
            row.direction === 'credit'
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-amber-100 text-amber-800'
          }`}
        >
          {statusLabel(row.direction)}
        </span>
      ),
    },
    {
      header: 'Amount',
      accessor: (row) => <span className="whitespace-nowrap font-bold tabular-nums">{money(row.amount)}</span>,
      align: 'right',
    },
    {
      header: 'Date',
      accessor: (row) => <span className="whitespace-nowrap">{formatDate(row.created_at ?? row.date)}</span>,
    },
  ];

  if (isLoading) return <StateView title="Loading client profile..." />;

  if (error) {
    return (
      <StateView
        title="Could not load client profile"
        description={error}
        actionLabel="Retry"
        onAction={reload}
      />
    );
  }

  return (
    <div className="grid min-w-0 gap-4 sm:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title={clientName(data)}
          description={`Member number ${data?.member_number ?? data?.id ?? '-'}`}
        />
        <Link
          href="/clients"
          className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to clients
        </Link>
      </div>

      <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Savings balance"
          value={money(data?.savings_summary?.total_balance)}
          hint={`${data?.savings_summary?.active_account_count ?? 0} active accounts`}
          icon={<WalletCards className="h-5 w-5" />}
        />
        <SummaryCard
          label="Outstanding principal"
          value={money(data?.loans_summary?.outstanding_principal_balance)}
          hint={`${data?.loans_summary?.open_application_count ?? 0} open applications`}
          icon={<Landmark className="h-5 w-5" />}
          tone="blue"
        />
        <SummaryCard
          label="Net transaction flow"
          value={money(data?.transactions_summary?.net_flow)}
          hint={`${data?.transactions_summary?.count ?? 0} ledger entries`}
          icon={<Banknote className="h-5 w-5" />}
          tone="slate"
        />
        <SummaryCard
          label="Interest outstanding"
          value={money(data?.loans_summary?.outstanding_interest_balance)}
          hint={`${data?.loans_summary?.disbursed_loan_count ?? 0} disbursed loans`}
          icon={<BriefcaseBusiness className="h-5 w-5" />}
          tone="amber"
        />
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <Card className="grid min-w-0 gap-4 p-4 sm:p-5">
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

          <dl className="grid min-w-0 gap-3 md:grid-cols-2">
            <DetailItem label="Institution" value={data?.institution_name || data?.institution_code || null} />
            <DetailItem label="Branch" value={data?.branch_name || null} />
            <DetailItem label="Phone" value={data?.phone || null} />
            <DetailItem label="Email" value={data?.email || null} />
            <DetailItem label="National ID" value={data?.national_id || null} />
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
            <DetailItem label="Date of birth" value={formatDate(data?.date_of_birth || undefined)} />
            <DetailItem label="Occupation" value={data?.occupation || null} />
            <DetailItem
              label="Next of kin"
              value={
                data?.next_of_kin_name
                  ? `${data.next_of_kin_name}${
                      data.next_of_kin_phone ? ` (${data.next_of_kin_phone})` : ''
                    }`
                  : data?.next_of_kin_phone || null
              }
            />
            <DetailItem label="Address" value={data?.address || null} />
            <DetailItem label="Created by" value={data?.created_by_email || 'System'} />
            <DetailItem label="Last updated by" value={data?.updated_by_email || 'System'} />
            <DetailItem label="Profile updated" value={formatDate(data?.updated_at ?? data?.created_at)} />
          </dl>
        </Card>

        <Card className="grid min-w-0 gap-4 p-4 sm:p-5">
          <CardTitle>Financial snapshot</CardTitle>
          <div className="grid min-w-0 gap-3">
            <SnapshotBox
              label="Savings activity"
              value={`${data?.savings_summary?.transaction_count ?? 0} transactions`}
              hint={`Total balance ${money(data?.savings_summary?.total_balance)}`}
            />
            <SnapshotBox
              label="Loan portfolio"
              value={`${data?.loans_summary?.application_count ?? 0} applications`}
              hint={`Requested ${money(data?.loans_summary?.total_requested_amount)}`}
            />
            <SnapshotBox
              label="Transaction mix"
              value={`Credits ${money(data?.transactions_summary?.total_credits)}`}
              hint={`Debits ${money(data?.transactions_summary?.total_debits)}`}
            />
          </div>
        </Card>
      </div>

      <Card className="grid min-w-0 gap-4 p-4 sm:p-5">
        <CardTitle>Recent savings</CardTitle>
        <div className="min-w-0 overflow-x-auto">
          <DataTable<ClientSavingsActivity>
            data={data?.recent_savings_transactions ?? []}
            columns={recentSavingsColumns}
            emptyMessage="No savings activity has been recorded for this client."
          />
        </div>
      </Card>

      <Card className="grid min-w-0 gap-4 p-4 sm:p-5">
        <CardTitle>Recent loans</CardTitle>
        <div className="min-w-0 overflow-x-auto">
          <DataTable<ClientLoanSnapshot>
            data={data?.recent_loans ?? []}
            columns={recentLoanColumns}
            emptyMessage="No loan applications have been recorded for this client."
          />
        </div>
      </Card>

      <Card className="grid min-w-0 gap-4 p-4 sm:p-5">
        <CardTitle>Recent transactions</CardTitle>
        <div className="min-w-0 overflow-x-auto">
          <DataTable<Transaction>
            data={data?.recent_transactions ?? []}
            columns={recentTransactionColumns}
            emptyMessage="No transactions have been recorded for this client."
          />
        </div>
      </Card>
    </div>
  );
}
