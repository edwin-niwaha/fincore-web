'use client';

import { ConnectedResourcePage } from '@/components/features/connected-resource-page';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDate } from '@/features/admin/shared';
import { resourcesApi } from '@/lib/api/services';
import { clientName, money } from '@/lib/api/format';
import type { LoanApplication } from '@/types/api';

export default function LoanApplicationsPage() {
  return (
    <ConnectedResourcePage<LoanApplication>
      title="Loan applications"
      description="Loan applications from fincore-api."
      loader={resourcesApi.loanApplications.list}
      querySearchParam="search"
      searchPlaceholder="Client, amount, or status"
      searchAccessor={(row) =>
        [
          row.client_name,
          clientName(row.client),
          row.product,
          row.status,
          row.requested_amount,
          row.amount,
        ]
          .filter(Boolean)
          .join(' ')
      }
      metrics={[
        {
          label: 'Applications in view',
          value: (rows) => rows.length,
          hint: () => 'Records matching the current filters.',
        },
        {
          label: 'Requested amount',
          value: (rows) =>
            money(
              rows.reduce(
                (sum, row) =>
                  sum + Number(row.requested_amount ?? row.amount ?? 0),
                0,
              ),
            ),
          hint: () => 'Combined requested amount on this screen.',
        },
        {
          label: 'Pending review',
          value: (rows) =>
            rows.filter((row) =>
              ['pending', 'submitted', 'review'].includes(row.status),
            ).length,
          hint: () => 'Applications that still need action.',
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
            { value: 'submitted', label: 'Submitted' },
            { value: 'approved', label: 'Approved' },
            { value: 'rejected', label: 'Rejected' },
          ],
          apply: (row, value) => row.status === value,
        },
      ]}
      tableTitle="Loan pipeline"
      tableDescription="Review applications, requested amounts, and current approval status."
      emptyTitle="No loan applications found"
      emptyMessage="Try changing the search or status filter to widen the pipeline."
      columns={[
        {
          header: 'Client',
          accessor: (row) => (
            <div>
              <p className="font-bold text-slate-900">
                {row.client_name ?? clientName(row.client)}
              </p>
              <p className="text-xs text-slate-500">
                Application #{row.id}
              </p>
            </div>
          ),
        },
        {
          header: 'Amount',
          accessor: (row) =>
            money(row.requested_amount ?? row.amount ?? row.principal_balance),
          align: 'right',
        },
        {
          header: 'Status',
          accessor: (row) => <StatusBadge status={row.status} />,
        },
        {
          header: 'Submitted',
          accessor: (row) => formatDate(row.submitted_at ?? row.created_at),
        },
      ]}
    />
  );
}
