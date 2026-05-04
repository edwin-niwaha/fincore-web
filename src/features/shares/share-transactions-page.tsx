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
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDate } from '@/features/admin/shared';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useApiResource } from '@/hooks/use-api-resource';
import { isPaginatedResponse, listCount, money, unwrapList } from '@/lib/api/format';
import { sharesApi } from '@/lib/api/services';
import type { ShareTransaction } from '@/types/api';
import {
  SharesFeatureGate,
  shareTransactionTypeOptions,
} from '@/features/shares/shared';

export function ShareTransactionsPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  const searchQuery = useDebouncedValue(search.trim(), 300);

  const loadTransactions = useCallback(
    () =>
      sharesApi.transactions.list({
        search: searchQuery || undefined,
        type: typeFilter === 'all' ? undefined : typeFilter,
        created_at__date__gte: dateFrom || undefined,
        created_at__date__lte: dateTo || undefined,
        ordering: '-created_at',
        page,
      }),
    [dateFrom, dateTo, page, searchQuery, typeFilter],
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

  const purchaseTotal = transactions
    .filter((row) => row.type === 'purchase')
    .reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  const redemptionTotal = transactions
    .filter((row) => row.type === 'redeem')
    .reduce((sum, row) => sum + Number(row.amount ?? 0), 0);

  const columns: Column<ShareTransaction>[] = [
    {
      header: 'Reference',
      accessor: (row) => (
        <div>
          <p className="font-bold text-slate-900">{row.reference || 'Reference'}</p>
          <p className="text-xs text-slate-500">{row.account_number || 'Share account'}</p>
        </div>
      ),
    },
    {
      header: 'Member',
      accessor: (row) => (
        <div>
          <p className="font-bold text-slate-900">{row.client_name || 'Member'}</p>
          <p className="text-xs text-slate-500">
            {row.client_member_number || row.branch_name || 'Branch'}
          </p>
        </div>
      ),
    },
    {
      header: 'Type',
      accessor: (row) => (
        <StatusBadge status={row.type} label={row.type_label || undefined} />
      ),
    },
    {
      header: 'Shares',
      accessor: (row) => (
        <span className="whitespace-nowrap font-bold tabular-nums">
          {Number(row.shares ?? 0).toLocaleString('en-UG')}
        </span>
      ),
      align: 'right',
    },
    {
      header: 'Amount',
      accessor: (row) => (
        <span className="whitespace-nowrap font-bold tabular-nums">{money(row.amount)}</span>
      ),
      align: 'right',
    },
    {
      header: 'Recorded by',
      accessor: (row) => row.recorded_by_email || '-',
    },
    {
      header: 'Date',
      accessor: (row) => formatDate(row.created_at),
    },
  ];

  return (
    <SharesFeatureGate
      unavailableTitle="Share transactions are not available"
      unavailableDescription="Only staff roles can access the share transaction ledger."
    >
      <RecordsPageLayout
        title="Share transactions"
        description="Review the full share ledger for purchases, redemptions, transfers, dividends, and adjustments."
        metrics={[
          {
            label: 'Visible entries',
            value: transactions.length,
            hint: 'Transactions matching the current filters.',
          },
          {
            label: 'Purchase value',
            value: money(purchaseTotal),
            hint: 'Current visible purchase postings.',
          },
          {
            label: 'Redemption value',
            value: money(redemptionTotal),
            hint: 'Current visible redemption postings.',
            accent: 'slate',
          },
        ]}
        filterPanel={
          <Card className="grid gap-4">
            <CardTitle>Ledger filters</CardTitle>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <Field label="Search">
                <Input
                  placeholder="Reference, member, or account"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                />
              </Field>

              <Field label="Type">
                <select
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-950 shadow-sm outline-none transition focus:border-[#127D61] focus:ring-4 focus:ring-emerald-100"
                  value={typeFilter}
                  onChange={(event) => {
                    setTypeFilter(event.target.value);
                    setPage(1);
                  }}
                >
                  {shareTransactionTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="From date">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => {
                    setDateFrom(event.target.value);
                    setPage(1);
                  }}
                />
              </Field>

              <Field label="To date">
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(event) => {
                    setDateTo(event.target.value);
                    setPage(1);
                  }}
                />
              </Field>
            </div>
          </Card>
        }
      >
        <RecordsListPanel
          title="Share ledger"
          description="System-posted share transactions from /api/v1/shares/transactions/."
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
            {error && !data ? (
              <StateView
                title="Could not load share transactions"
                description={error}
                actionLabel="Retry"
                onAction={reload}
              />
            ) : (
              <DataTable<ShareTransaction>
                data={transactions}
                columns={columns}
                loading={isLoading}
                emptyTitle="No share transactions found"
                emptyMessage="Try widening the filters or post a share purchase or redemption."
              />
            )}
          </div>
        </RecordsListPanel>
      </RecordsPageLayout>
    </SharesFeatureGate>
  );
}
