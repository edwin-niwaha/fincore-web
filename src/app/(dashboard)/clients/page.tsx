'use client';

import { ConnectedResourcePage } from '@/components/features/connected-resource-page';
import { resourcesApi } from '@/lib/api/services';
import type { Client } from '@/types/api';

export default function ClientsPage() {
  return (
    <ConnectedResourcePage<Client>
      title="Clients"
      description="Live client list from fincore-api."
      loader={resourcesApi.clients.list}
      columns={[
        { header: 'Member no.', accessor: (row) => row.member_number ?? row.member_no ?? row.id },
        { header: 'Name', accessor: (row) => row.full_name ?? `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim() },
        { header: 'Phone', accessor: (row) => row.phone ?? '-' },
        { header: 'Status', accessor: (row) => row.status ?? '-' },
      ]}
    />
  );
}
