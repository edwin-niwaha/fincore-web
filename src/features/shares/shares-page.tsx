'use client';

import { ConnectedResourcePage } from '@/components/features/connected-resource-page';
import { money } from '@/lib/api/format';
import { sharesApi } from '@/lib/api/services';
import type { ShareAccount } from '@/types/api';

export function SharesPage() {
  return (
    <ConnectedResourcePage<ShareAccount>
      title="Shares"
      description="Manage member share accounts, share balances and share capital value."
      loader={sharesApi.accounts.list}
      querySearchParam="search"
      searchPlaceholder="Search account, member, client or product..."
      searchAccessor={(row) => `${row.account_number ?? ''} ${row.client_name ?? ''} ${row.client_member_number ?? ''} ${row.product_name ?? ''}`}
      filters={[
        {
          key: 'status',
          label: 'Status',
          queryParam: 'status',
          options: [
            { label: 'All statuses', value: 'all' },
            { label: 'Active', value: 'active' },
            { label: 'Inactive', value: 'inactive' },
            { label: 'Closed', value: 'closed' },
          ],
        },
      ]}
      metrics={[
        { label: 'Loaded accounts', value: (rows) => rows.length },
        { label: 'Total shares', value: (rows) => rows.reduce((sum, row) => sum + Number(row.shares ?? 0), 0), accent: 'slate' },
        { label: 'Share capital', value: (rows) => money(rows.reduce((sum, row) => sum + Number(row.total_value ?? 0), 0)), accent: 'amber' },
      ]}
      columns={[
        { header: 'Account', accessor: (row) => <span className="font-semibold text-slate-900">{row.account_number}</span> },
        { header: 'Client', accessor: (row) => row.client_name ?? row.client_member_number ?? '-' },
        { header: 'Product', accessor: (row) => row.product_name ?? '-' },
        { header: 'Shares', accessor: (row) => row.shares ?? 0, align: 'right' },
        { header: 'Value', accessor: (row) => money(row.total_value), align: 'right' },
        { header: 'Branch', accessor: (row) => row.branch_name ?? '-' },
        { header: 'Status', accessor: (row) => row.status ?? '-' },
      ]}
      tableTitle="Share accounts"
      tableDescription="Connected to /api/v1/shares/accounts/. Purchase and redeem actions are available from the API endpoints."
      emptyTitle="No share accounts yet"
      emptyMessage="Create share products and member share accounts to begin tracking share capital."
    />
  );
}
