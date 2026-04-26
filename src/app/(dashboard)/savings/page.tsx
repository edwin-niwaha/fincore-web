'use client';

import { ConnectedResourcePage } from '@/components/features/connected-resource-page';
import { resourcesApi } from '@/lib/api/services';
import { clientName, money } from '@/lib/api/format';
import type { SavingsAccount } from '@/types/api';

export default function SavingsPage() {
  return (
    <ConnectedResourcePage<SavingsAccount>
      title="Savings accounts"
      description="Savings account balances from fincore-api."
      loader={resourcesApi.savingsAccounts.list}
      columns={[
        { header: 'Account', accessor: (row) => row.account_number ?? row.account_no ?? row.id },
        { header: 'Client', accessor: (row) => row.client_name ?? clientName(row.client) },
        { header: 'Balance', accessor: (row) => money(row.balance) },
        { header: 'Status', accessor: (row) => row.status ?? '-' },
      ]}
    />
  );
}
