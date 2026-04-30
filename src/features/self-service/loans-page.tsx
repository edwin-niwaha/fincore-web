'use client';

import { useCallback, useState } from 'react';
import { RecordsListPanel } from '@/components/records/records-list-panel';
import { RecordsPageLayout } from '@/components/records/records-page-layout';
import { RecordsPagination } from '@/components/records/records-pagination';
import { Card, CardTitle } from '@/components/ui/card';
import type { Column } from '@/components/ui/data-table';
import { DataTable } from '@/components/ui/data-table';
import { Field, Input } from '@/components/ui/input';
import { LoanStatusStepper } from '@/components/ui/LoanStatusStepper';
import { RowActions } from '@/components/ui/row-actions';
import { StateView } from '@/components/ui/state-view';
import { StatusBadge } from '@/components/ui/status-badge';
import { formSelectClassName, formatDate } from '@/features/admin/shared';
import { useApiResource } from '@/hooks/use-api-resource';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import {
  isPaginatedResponse,
  listCount,
  money,
  unwrapList,
} from '@/lib/api/format';
import { selfServiceApi } from '@/lib/api/services';
import type {
  LoanApplication,
  LoanRepayment,
  RepaymentScheduleRow,
} from '@/types/api';

const loanStatusOptions = [
  { value: 'all', label: 'All statuses' },
  { value: 'approved', label: 'Approved' },
  { value: 'disbursed', label: 'Disbursed' },
  { value: 'closed', label: 'Closed' },
] as const;

export function SelfServiceLoansPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  const loadLoans = useCallback(
    () =>
      selfServiceApi.loans.list({
        search: debouncedSearch || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        page,
      }),
    [debouncedSearch, page, statusFilter],
  );

  const { data, error, isLoading, reload } = useApiResource(loadLoans);
  const loans = unwrapList(data);
  const activeLoanId =
    selectedLoanId ?? (loans[0] ? String(loans[0].id) : null);

  const loadSelectedLoan = useCallback(() => {
    if (!activeLoanId) return Promise.resolve(null);
    return selfServiceApi.loans.get(activeLoanId);
  }, [activeLoanId]);

  const {
    data: selectedLoanData,
    error: selectedLoanError,
    isLoading: selectedLoanLoading,
    reload: reloadSelectedLoan,
  } = useApiResource<LoanApplication | null>(loadSelectedLoan);

  const selectedLoan =
    selectedLoanData && String(selectedLoanData.id) === activeLoanId
      ? selectedLoanData
      : (loans.find((candidate) => String(candidate.id) === activeLoanId) ??
        null);
  const pagination = isPaginatedResponse(data)
    ? {
        count: listCount(data),
        hasNext: Boolean(data.next),
        hasPrevious: Boolean(data.previous),
      }
    : null;

  const outstandingBalance = loans.reduce(
    (sum, loan) => sum + Number(loan.outstanding_balance ?? 0),
    0,
  );

  const loanColumns: Column<LoanApplication>[] = [
    {
      header: 'Loan',
      accessor: (loan) => (
        <div>
          <p className="font-bold text-slate-900">
            {loan.product_name ?? 'Loan'}
          </p>
          <p className="text-xs text-slate-500">
            {loan.product_code ?? 'Product'} • {loan.term_months ?? 0} months
          </p>
        </div>
      ),
    },
    {
      header: 'Outstanding',
      accessor: (loan) => (
        <div>
          <p className="font-semibold text-slate-900">
            {money(loan.outstanding_balance)}
          </p>
          <p className="text-xs text-slate-500">
            Next due {formatDate(loan.next_due_date ?? undefined)}
          </p>
        </div>
      ),
      align: 'right',
    },
    {
      header: 'Status',
      accessor: (loan) => <StatusBadge status={loan.status} />,
    },
    {
      header: 'Actions',
      accessor: (loan) => (
        <RowActions
          align="end"
          actions={[
            {
              key: 'view',
              label: 'View',
              onClick: () => setSelectedLoanId(String(loan.id)),
              tone: 'success',
            },
          ]}
        />
      ),
      align: 'right',
    },
  ];

  const scheduleColumns: Column<RepaymentScheduleRow>[] = [
    { header: 'Due date', accessor: (row) => formatDate(row.due_date) },
    {
      header: 'Principal',
      accessor: (row) => money(row.principal_due),
      align: 'right',
    },
    {
      header: 'Interest',
      accessor: (row) => money(row.interest_due),
      align: 'right',
    },
    {
      header: 'Paid',
      accessor: (row) => money(row.paid_amount),
      align: 'right',
    },
    {
      header: 'Status',
      accessor: (row) => (
        <StatusBadge
          status={row.is_paid ? 'active' : 'pending'}
          label={row.is_paid ? 'Paid' : 'Pending'}
        />
      ),
    },
  ];

  const repaymentColumns: Column<LoanRepayment>[] = [
    { header: 'Date', accessor: (row) => formatDate(row.created_at) },
    { header: 'Reference', accessor: (row) => row.reference ?? row.id },
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
  ];

  return (
    <RecordsPageLayout
      title="My loans"
      description="Track approved and disbursed loans, their repayment schedules, and remaining balances."
      metrics={[
        {
          label: 'Loans in view',
          value: loans.length,
          hint: 'Approved, disbursed, and closed loans visible on this page.',
        },
        {
          label: 'Outstanding balance',
          value: money(outstandingBalance),
          hint: 'Combined outstanding balance for the current list.',
        },
        {
          label: 'Selected loan',
          value: selectedLoan
            ? money(selectedLoan.outstanding_balance)
            : 'UGX 0',
          hint: selectedLoan
            ? `${selectedLoan.product_name ?? 'Loan'} • ${selectedLoan.repayment_frequency ?? 'schedule'}`
            : 'Choose a loan to inspect its schedule and repayments.',
          accent: 'slate',
        },
      ]}
      filterPanel={
        <Card className="grid gap-4">
          <CardTitle>Search and filters</CardTitle>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Search">
              <Input
                placeholder="Loan product, reference, or purpose"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </Field>

            <Field label="Status">
              <select
                className={formSelectClassName}
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPage(1);
                }}
              >
                {loanStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Card>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <RecordsListPanel
          title="Loan portfolio"
          description="All approved and disbursed loans linked to your client profile."
          footer={
            pagination ? (
              <RecordsPagination
                count={pagination.count}
                page={page}
                rowsOnPage={loans.length}
                hasNext={pagination.hasNext}
                hasPrevious={pagination.hasPrevious}
                onPageChange={setPage}
              />
            ) : undefined
          }
        >
          <div className="grid gap-4 p-5">
            {error && data ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Loan list refresh failed.
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

            {error && !data ? (
              <StateView
                title="Could not load your loans"
                description={error}
                actionLabel="Retry"
                onAction={() => {
                  void reload();
                }}
              />
            ) : (
              <DataTable<LoanApplication>
                data={loans}
                columns={loanColumns}
                loading={isLoading}
                emptyTitle="No loans found"
                emptyMessage="Approved and disbursed loans will appear here once they move beyond application review."
              />
            )}
          </div>
        </RecordsListPanel>

        <Card className="grid gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Loan detail</CardTitle>
              <p className="mt-2 text-sm text-slate-500">
                Review the selected loan balance, repayment schedule, and
                recorded repayments.
              </p>
            </div>
            {selectedLoan ? <StatusBadge status={selectedLoan.status} /> : null}
          </div>

          {!selectedLoan ? (
            <StateView
              title="No loan selected"
              description="Choose a loan from the list to review its schedule and repayment activity."
            />
          ) : selectedLoanError && !selectedLoanData ? (
            <StateView
              title="Could not load the loan detail"
              description={selectedLoanError}
              actionLabel="Retry"
              onAction={() => {
                void reloadSelectedLoan();
              }}
            />
          ) : (
            <>
              <LoanStatusStepper
                className={selectedLoanLoading ? 'opacity-80' : undefined}
                loan={selectedLoan}
                title="Loan lifecycle"
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <LoanMetric
                  label="Product"
                  primary={selectedLoan.product_name ?? 'Loan'}
                  secondary={selectedLoan.product_code ?? 'Product'}
                />
                <LoanMetric
                  label="Outstanding"
                  primary={money(selectedLoan.outstanding_balance)}
                  secondary={`Next due ${formatDate(selectedLoan.next_due_date ?? undefined)}`}
                />
                <LoanMetric
                  label="Principal / interest"
                  primary={`${money(selectedLoan.principal_balance)} / ${money(
                    selectedLoan.interest_balance,
                  )}`}
                  secondary={`${selectedLoan.term_months ?? 0} months`}
                />
                <LoanMetric
                  label="Disbursed"
                  primary={formatDate(selectedLoan.disbursed_at ?? undefined)}
                  secondary={selectedLoan.repayment_frequency ?? 'No schedule'}
                />
              </div>

              <div className="grid gap-4">
                <div>
                  <CardTitle>Repayment schedule</CardTitle>
                  <div className="mt-3">
                    <DataTable<RepaymentScheduleRow>
                      data={selectedLoan.schedule ?? []}
                      columns={scheduleColumns}
                      loading={selectedLoanLoading}
                      emptyTitle="No schedule available"
                      emptyMessage="The repayment schedule will appear here once the loan is disbursed."
                    />
                  </div>
                </div>

                <div>
                  <CardTitle>Repayments</CardTitle>
                  <div className="mt-3">
                    <DataTable<LoanRepayment>
                      data={selectedLoan.repayments ?? []}
                      columns={repaymentColumns}
                      loading={selectedLoanLoading}
                      emptyTitle="No repayments recorded"
                      emptyMessage="Repayments will appear here as branch staff record them."
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </RecordsPageLayout>
  );
}

function LoanMetric({
  label,
  primary,
  secondary,
}: {
  label: string;
  primary: string;
  secondary?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 font-semibold text-slate-900">{primary}</p>
      {secondary ? <p className="text-sm text-slate-500">{secondary}</p> : null}
    </div>
  );
}
