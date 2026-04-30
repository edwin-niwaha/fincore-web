'use client';

import { ConnectedResourcePage } from '@/components/features/connected-resource-page';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDate, statusLabel } from '@/features/admin/shared';
import { resourcesApi } from '@/lib/api/services';
import { money } from '@/lib/api/format';
import type { Transaction } from '@/types/api';

export default function TransactionsPage() {
  return (
    <ConnectedResourcePage<Transaction>
      title="Transactions"
      description="Posted and pending financial transactions from fincore-api."
      loader={resourcesApi.transactions.list}
      querySearchParam="search"
      searchPlaceholder="Reference, client, type, or status"
      searchAccessor={(row) =>
        [
          row.reference,
          row.client_name,
          row.category,
          row.type,
          row.status,
          row.direction,
        ]
          .filter(Boolean)
          .join(' ')
      }
      metrics={[
        {
          label: 'Transactions in view',
          value: (rows) => rows.length,
          hint: () => 'Records matching the current filters.',
        },
        {
          label: 'Total movement',
          value: (rows) =>
            money(rows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0)),
          hint: () => 'Combined value for the loaded transactions.',
        },
        {
          label: 'Pending items',
          value: (rows) =>
            rows.filter((row) => row.status === 'pending').length,
          hint: () => 'Transactions still awaiting final posting.',
          accent: 'amber',
        },
      ]}
      filters={[
        {
          key: 'status',
          label: 'Status',
          queryParam: 'status',
          options: [
            { value: 'all', label: 'All statuses' },
            { value: 'pending', label: 'Pending' },
            { value: 'posted', label: 'Posted' },
            { value: 'completed', label: 'Completed' },
            { value: 'reversed', label: 'Reversed' },
          ],
          apply: (row, value) => (row.status ?? 'unknown') === value,
        },
      ]}
      tableTitle="Transaction feed"
      tableDescription="Review posted and in-flight transaction activity from the live API."
      emptyTitle="No transactions found"
      emptyMessage="There are no transactions matching the current search or filter."
      columns={[
        {
          header: 'Reference',
          accessor: (row) => (
            <div>
              <p className="font-bold text-slate-900">{row.reference ?? row.id}</p>
              <p className="text-xs text-slate-500">{row.client_name ?? 'No client linked'}</p>
            </div>
          ),
        },
        {
          header: 'Type',
          accessor: (row) => (
            <div>
              <p className="font-semibold text-slate-900">
                {statusLabel(row.category ?? row.type)}
              </p>
              <p className="text-xs text-slate-500">
                {row.direction ? statusLabel(row.direction) : 'Unclassified'}
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
          header: 'Status',
          accessor: (row) => <StatusBadge status={row.status} />,
        },
        {
          header: 'Date',
          accessor: (row) => formatDate(row.date ?? row.created_at),
        },
      ]}
    />
  );
}
