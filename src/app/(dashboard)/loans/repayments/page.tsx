'use client';

import { ConnectedResourcePage } from '@/components/features/connected-resource-page';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDate } from '@/features/admin/shared';
import { resourcesApi } from '@/lib/api/services';
import { money } from '@/lib/api/format';
import type { LoanRepayment } from '@/types/api';

export default function LoanRepaymentsPage() {
  return (
    <ConnectedResourcePage<LoanRepayment>
      title="Loan repayments"
      description="Recorded loan repayments from fincore-api."
      loader={resourcesApi.loanRepayments.list}
      querySearchParam="search"
      searchPlaceholder="Loan ID, amount, or status"
      searchAccessor={(row) =>
        [
          typeof row.loan_application === 'object'
            ? row.loan_application.id
            : row.loan_application,
          row.amount,
          row.principal_amount,
          row.interest_amount,
          row.status,
        ]
          .filter(Boolean)
          .join(' ')
      }
      metrics={[
        {
          label: 'Repayments in view',
          value: (rows) => rows.length,
          hint: () => 'Loaded repayment records matching the current filters.',
        },
        {
          label: 'Total collected',
          value: (rows) =>
            money(rows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0)),
          hint: () => 'Combined repayment amount on this page.',
        },
        {
          label: 'Posted repayments',
          value: (rows) =>
            rows.filter((row) => ['paid', 'posted'].includes(row.status ?? '')).length,
          hint: () => 'Repayments already finalized.',
          accent: 'slate',
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
            { value: 'paid', label: 'Paid' },
            { value: 'posted', label: 'Posted' },
            { value: 'reversed', label: 'Reversed' },
          ],
          apply: (row, value) => (row.status ?? 'unknown') === value,
        },
      ]}
      tableTitle="Repayment ledger"
      tableDescription="Monitor principal and interest collections from the live loan book."
      emptyTitle="No loan repayments found"
      emptyMessage="No repayments match the current search or filter."
      columns={[
        {
          header: 'Loan',
          accessor: (row) => {
            const loanId =
              typeof row.loan_application === 'object'
                ? row.loan_application.id
                : row.loan_application;

            return (
              <div>
                <p className="font-bold text-slate-900">Loan #{loanId ?? '-'}</p>
                <p className="text-xs text-slate-500">
                  Recorded {formatDate(row.paid_at ?? row.created_at)}
                </p>
              </div>
            );
          },
        },
        {
          header: 'Amount',
          accessor: (row) => money(row.amount),
          align: 'right',
        },
        {
          header: 'Principal',
          accessor: (row) => money(row.principal_amount),
          align: 'right',
        },
        {
          header: 'Interest',
          accessor: (row) => money(row.interest_amount),
          align: 'right',
        },
        {
          header: 'Status',
          accessor: (row) => <StatusBadge status={row.status} />,
        },
      ]}
    />
  );
}
