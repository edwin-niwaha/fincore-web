'use client';

import { ConnectedResourcePage } from '@/components/features/connected-resource-page';
import { resourcesApi } from '@/lib/api/services';
import { clientName, money } from '@/lib/api/format';
import type { LoanApplication } from '@/types/api';

export default function LoanApplicationsPage() {
  return (
    <ConnectedResourcePage<LoanApplication>
      title="Loan applications"
      description="Loan applications from fincore-api."
      loader={resourcesApi.loanApplications.list}
      columns={[
        { header: 'Client', accessor: (row) => row.client_name ?? clientName(row.client) },
        { header: 'Amount', accessor: (row) => money(row.requested_amount ?? row.amount ?? row.principal_balance) },
        { header: 'Status', accessor: (row) => row.status },
        { header: 'Submitted', accessor: (row) => row.submitted_at ?? row.created_at ?? '-' },
      ]}
    />
  );
}
