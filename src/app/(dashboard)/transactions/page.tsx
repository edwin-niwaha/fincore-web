'use client';

import { ConnectedResourcePage } from '@/components/features/connected-resource-page';
import { resourcesApi } from '@/lib/api/services';
import { money } from '@/lib/api/format';
import type { Transaction } from '@/types/api';

export default function TransactionsPage() {
  return (
    <ConnectedResourcePage<Transaction>
      title="Transactions"
      description="Posted and pending financial transactions from fincore-api."
      loader={resourcesApi.transactions.list}
      columns={[
        { header: 'Reference', accessor: (row) => row.reference ?? row.id },
        { header: 'Type', accessor: (row) => row.category ?? row.type ?? '-' },
        { header: 'Amount', accessor: (row) => money(row.amount) },
        { header: 'Status', accessor: (row) => row.status ?? '-' },
      ]}
    />
  );
}
