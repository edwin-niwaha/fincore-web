'use client';

import { useCallback, useState } from 'react';
import { RecordsListPanel } from '@/components/records/records-list-panel';
import { RecordsPageLayout } from '@/components/records/records-page-layout';
import { RecordsPagination } from '@/components/records/records-pagination';
import { Card, CardTitle } from '@/components/ui/card';
import type { Column } from '@/components/ui/data-table';
import { DataTable } from '@/components/ui/data-table';
import { Field, Input } from '@/components/ui/input';
import { StateView } from '@/components/ui/state-view';
import { formSelectClassName, formatDate, statusLabel } from '@/features/admin/shared';
import { useApiResource } from '@/hooks/use-api-resource';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import {
  isPaginatedResponse,
  listCount,
  money,
  unwrapList,
} from '@/lib/api/format';
import { selfServiceApi } from '@/lib/api/services';
import type { Transaction } from '@/types/api';

const sourceOptions = [
  { value: 'all', label: 'All sources' },
  { value: 'savings', label: 'Savings' },
  { value: 'loans', label: 'Loans' },
] as const;

const typeOptions = [
  { value: 'all', label: 'All types' },
  { value: 'savings_deposit', label: 'Savings deposit' },
  { value: 'savings_withdrawal', label: 'Savings withdrawal' },
  { value: 'loan_disbursement', label: 'Loan disbursement' },
  { value: 'loan_repayment', label: 'Loan repayment' },
] as const;

const dateWindowOptions = [
  { value: 'all', label: 'All dates' },
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
] as const;

function buildDateWindowQuery(dateWindow: string) {
  if (dateWindow === 'all') return {};

  const end = new Date();
  const start = new Date(end);

  if (dateWindow === '7d') {
    start.setDate(end.getDate() - 6);
  } else if (dateWindow === '30d') {
    start.setDate(end.getDate() - 29);
  }

  const dateFrom = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
  const dateTo = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;

  return { date_from: dateFrom, date_to: dateTo };
}

export function SelfServiceTransactionsPage() {
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateWindow, setDateWindow] = useState('all');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  const loadTransactions = useCallback(
    () =>
      selfServiceApi.transactions.list({
        search: debouncedSearch || undefined,
        source: sourceFilter === 'all' ? undefined : sourceFilter,
        type: typeFilter === 'all' ? undefined : typeFilter,
        page,
        ...buildDateWindowQuery(dateWindow),
      }),
    [dateWindow, debouncedSearch, page, sourceFilter, typeFilter],
  );

  const { data, error, isLoading, reload } = useApiResource(loadTransactions);
  const transactions = unwrapList(data);
  const pagination = isPaginatedResponse(data)
    ? {
        count: listCount(data),
        hasNext: Boolean(data.next),
        hasPrevious: Boolean(data.previous),
      }
    : null;

  const totalMovement = transactions.reduce(
    (sum, row) => sum + Number(row.amount ?? 0),
    0,
  );

  const columns: Column<Transaction>[] = [
    {
      header: 'Date',
      accessor: (row) => formatDate(row.date ?? row.created_at),
    },
    {
      header: 'Reference',
      accessor: (row) => (
        <div>
          <p className="font-bold text-slate-900">{row.reference ?? row.id}</p>
          <p className="text-xs text-slate-500">
            {row.account_number
              ? `Account ${row.account_number}`
              : row.loan_id
                ? `Loan ${row.loan_id}`
                : 'Client activity'}
          </p>
        </div>
      ),
    },
    {
      header: 'Type',
      accessor: (row) => (
        <div>
          <p className="font-semibold text-slate-900">
            {statusLabel(row.type_label ?? row.category ?? row.type)}
          </p>
          <p className="text-xs text-slate-500">
            {statusLabel(row.source)}
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
      header: 'Running balance',
      accessor: (row) => money(row.running_balance),
      align: 'right',
    },
    {
      header: 'Status',
      accessor: (row) => statusLabel(row.status),
    },
  ];

  return (
    <RecordsPageLayout
      title="Transactions"
      description="View savings deposits, withdrawals, loan disbursements, and repayments from your client account history."
      metrics={[
        {
          label: 'Transactions in view',
          value: transactions.length,
          hint: 'Records matching the current search and filters.',
        },
        {
          label: 'Total movement',
          value: money(totalMovement),
          hint: 'Combined value of the current page of transactions.',
        },
        {
          label: 'Savings entries',
          value: transactions.filter((row) => row.source === 'savings').length,
          hint: 'Savings-related transactions on this page.',
          accent: 'slate',
        },
      ]}
      filterPanel={
        <Card className="grid gap-4">
          <CardTitle>Search and filters</CardTitle>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Search">
              <Input
                placeholder="Reference, type, or description"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </Field>

            <Field label="Source">
              <select
                className={formSelectClassName}
                value={sourceFilter}
                onChange={(event) => {
                  setSourceFilter(event.target.value);
                  setPage(1);
                }}
              >
                {sourceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Type">
              <select
                className={formSelectClassName}
                value={typeFilter}
                onChange={(event) => {
                  setTypeFilter(event.target.value);
                  setPage(1);
                }}
              >
                {typeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Date window">
              <select
                className={formSelectClassName}
                value={dateWindow}
                onChange={(event) => {
                  setDateWindow(event.target.value);
                  setPage(1);
                }}
              >
                {dateWindowOptions.map((option) => (
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
      <RecordsListPanel
        title="Unified transaction history"
        description="A single feed for savings and loan activity tied to your member profile."
        footer={
          pagination ? (
            <RecordsPagination
              count={pagination.count}
              page={page}
              rowsOnPage={transactions.length}
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
              Transaction refresh failed.
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
              title="Could not load your transactions"
              description={error}
              actionLabel="Retry"
              onAction={() => {
                void reload();
              }}
            />
          ) : (
            <DataTable<Transaction>
              data={transactions}
              columns={columns}
              loading={isLoading}
              emptyTitle="No transactions found"
              emptyMessage="Your savings and loan activity will appear here once records are posted by branch staff."
            />
          )}
        </div>
      </RecordsListPanel>
    </RecordsPageLayout>
  );
}
