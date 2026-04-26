'use client';

import { use, useCallback } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { StateView } from '@/components/ui/state-view';
import { resourcesApi } from '@/lib/api/services';
import { useApiResource } from '@/hooks/use-api-resource';
import type { Client } from '@/types/api';

export default function ClientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const loadClient = useCallback(() => resourcesApi.clients.get(id), [id]);
  const { data, error, isLoading, reload } = useApiResource<Client>(loadClient);
  if (isLoading) return <StateView title="Loading client profile..." />;
  if (error) return <StateView title="Could not load client profile" description={error} actionLabel="Retry" onAction={reload} />;
  return (
    <div className="grid gap-6">
      <PageHeader title="Client profile" description="Live profile, KYC, and account information from fincore-api." />
      <Card>
        <dl className="grid gap-3 text-sm md:grid-cols-2">
          <div><dt className="font-semibold">Member number</dt><dd>{data?.member_number ?? data?.member_no ?? data?.id}</dd></div>
          <div><dt className="font-semibold">Name</dt><dd>{data?.full_name ?? `${data?.first_name ?? ''} ${data?.last_name ?? ''}`.trim()}</dd></div>
          <div><dt className="font-semibold">Phone</dt><dd>{data?.phone ?? '-'}</dd></div>
          <div><dt className="font-semibold">KYC</dt><dd>{data?.kyc_status ?? '-'}</dd></div>
          <div><dt className="font-semibold">Status</dt><dd>{data?.status ?? '-'}</dd></div>
        </dl>
      </Card>
    </div>
  );
}
