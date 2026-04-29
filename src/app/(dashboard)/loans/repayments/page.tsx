'use client';

import { ConnectedResourcePage } from '@/components/features/connected-resource-page';
import { resourcesApi } from '@/lib/api/services';
import { money } from '@/lib/api/format';
import type { LoanRepayment } from '@/types/api';

export default function LoanRepaymentsPage() {
  return (
    <ConnectedResourcePage<LoanRepayment>
      title="Loan repayments"
      description="Recorded loan repayments from fincore-api."
      loader={resourcesApi.loanRepayments.list}
      columns={[
        {
          header: 'Loan',
          accessor: (row) =>
            typeof row.loan_application === 'object'
              ? row.loan_application.id
              : (row.loan_application ?? '-'),
        },
        { header: 'Amount', accessor: (row) => money(row.amount) },
        { header: 'Principal', accessor: (row) => money(row.principal_amount) },
        {
          header: 'Date',
          accessor: (row) => row.paid_at ?? row.created_at ?? '-',
        },
      ]}
    />
  );
}
