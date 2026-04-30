'use client';

import { useCallback, useState } from 'react';
import { RecordsListPanel } from '@/components/records/records-list-panel';
import { RecordsPageLayout } from '@/components/records/records-page-layout';
import { RecordsPagination } from '@/components/records/records-pagination';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import type { Column } from '@/components/ui/data-table';
import { DataTable } from '@/components/ui/data-table';
import { Field, Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { RowActions } from '@/components/ui/row-actions';
import { StateView } from '@/components/ui/state-view';
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
import type { LoanApplication, LoanRepayment } from '@/types/api';

export function SelfServiceRepaymentsPage() {
  const [search, setSearch] = useState('');
  const [loanFilter, setLoanFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedRepayment, setSelectedRepayment] = useState<LoanRepayment | null>(
    null,
  );
  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  const loadLoans = useCallback(
    () => selfServiceApi.loans.list({ page_size: 100 }),
    [],
  );
  const {
    data: loansData,
    error: loansError,
    isLoading: loansLoading,
    reload: reloadLoans,
  } = useApiResource(loadLoans);
  const loans = unwrapList(loansData);

  const loadRepayments = useCallback(
    () =>
      selfServiceApi.repayments.list({
        search: debouncedSearch || undefined,
        loan: loanFilter === 'all' ? undefined : loanFilter,
        page,
      }),
    [debouncedSearch, loanFilter, page],
  );

  const { data, error, isLoading, reload } = useApiResource(loadRepayments);
  const repayments = unwrapList(data);
  const pagination = isPaginatedResponse(data)
    ? {
        count: listCount(data),
        hasNext: Boolean(data.next),
        hasPrevious: Boolean(data.previous),
      }
    : null;

  const totalRepayments = repayments.reduce(
    (sum, repayment) => sum + Number(repayment.amount ?? 0),
    0,
  );

  const columns: Column<LoanRepayment>[] = [
    {
      header: 'Date',
      accessor: (row) => formatDate(row.created_at),
    },
    {
      header: 'Loan',
      accessor: (row) => (
        <div>
          <p className="font-bold text-slate-900">
            {row.loan_client_name ?? 'Loan'}
          </p>
          <p className="text-xs text-slate-500">
            {row.loan_client_member_number ?? 'Member'} • {row.reference ?? row.id}
          </p>
        </div>
      ),
    },
    {
      header: 'Amount',
      accessor: (row) => money(row.amount),
      align: 'right',
    },
    {
      header: 'Breakdown',
      accessor: (row) => (
        <div className="text-sm text-slate-600">
          <p>Principal {money(row.principal_component)}</p>
          <p>Interest {money(row.interest_component)}</p>
        </div>
      ),
    },
    {
      header: 'Actions',
      accessor: (row) => (
        <RowActions
          align="end"
          actions={[
            {
              key: 'view',
              label: 'View',
              onClick: () => setSelectedRepayment(row),
              tone: 'success',
            },
          ]}
        />
      ),
      align: 'right',
    },
  ];

  return (
    <RecordsPageLayout
      title="Repayments"
      description="Review repayments posted against your loans, including principal, interest, and remaining balance."
      metrics={[
        {
          label: 'Repayments in view',
          value: repayments.length,
          hint: 'Repayment records matching the current search and loan filter.',
        },
        {
          label: 'Total shown',
          value: money(totalRepayments),
          hint: 'Combined repayment amount for the current page.',
        },
        {
          label: 'Loans loaded',
          value: loans.length,
          hint: 'Loans available for repayment filtering.',
          accent: 'slate',
        },
      ]}
      filterPanel={
        <Card className="grid gap-4">
          <CardTitle>Search and filters</CardTitle>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Search">
              <Input
                placeholder="Reference or payment method"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </Field>

            <Field label="Loan">
              <select
                className={formSelectClassName}
                value={loanFilter}
                onChange={(event) => {
                  setLoanFilter(event.target.value);
                  setPage(1);
                }}
                disabled={loansLoading && !loansData}
              >
                <option value="all">All loans</option>
                {loans.map((loan: LoanApplication) => (
                  <option key={loan.id} value={String(loan.id)}>
                    {loan.product_name ?? 'Loan'} ({loan.product_code ?? loan.id})
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {loansError ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Could not load the loan filter list.
              <button
                type="button"
                className="ml-2 font-bold underline underline-offset-2"
                onClick={() => {
                  void reloadLoans();
                }}
              >
                Retry
              </button>
            </div>
          ) : null}
        </Card>
      }
    >
      <RecordsListPanel
        title="Repayment history"
        description="Every repayment recorded against loans linked to your client profile."
        footer={
          pagination ? (
            <RecordsPagination
              count={pagination.count}
              page={page}
              rowsOnPage={repayments.length}
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
              Repayment refresh failed.
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
              title="Could not load your repayments"
              description={error}
              actionLabel="Retry"
              onAction={() => {
                void reload();
              }}
            />
          ) : (
            <DataTable<LoanRepayment>
              data={repayments}
              columns={columns}
              loading={isLoading}
              emptyTitle="No repayments found"
              emptyMessage="Repayment records will appear here after branch staff post them against your loans."
            />
          )}
        </div>
      </RecordsListPanel>

      {selectedRepayment ? (
        <Modal
          open={Boolean(selectedRepayment)}
          onClose={() => setSelectedRepayment(null)}
          size="md"
          title="Repayment detail"
          description="Receipt-friendly repayment breakdown."
          footer={
            <Button
              type="button"
              className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
              onClick={() => setSelectedRepayment(null)}
            >
              Close
            </Button>
          }
        >
          <div className="grid gap-3">
            <DetailRow label="Date" value={formatDate(selectedRepayment.created_at)} />
            <DetailRow label="Reference" value={selectedRepayment.reference ?? '-'} />
            <DetailRow
              label="Payment method"
              value={selectedRepayment.payment_method || 'Not specified'}
            />
            <DetailRow label="Amount" value={money(selectedRepayment.amount)} />
            <DetailRow
              label="Principal paid"
              value={money(selectedRepayment.principal_component)}
            />
            <DetailRow
              label="Interest paid"
              value={money(selectedRepayment.interest_component)}
            />
            <DetailRow
              label="Penalty paid"
              value={money(selectedRepayment.penalty_component)}
            />
            <DetailRow
              label="Remaining balance"
              value={money(selectedRepayment.remaining_balance_after)}
            />
          </div>
        </Modal>
      ) : null}
    </RecordsPageLayout>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 font-semibold text-slate-900">{value}</p>
    </div>
  );
}
