'use client';

import type { ReactNode } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable } from '@/components/ui/data-table';
import { StateView } from '@/components/ui/state-view';
import { unwrapList } from '@/lib/api/format';
import { useApiResource } from '@/hooks/use-api-resource';
import type { PaginatedResponse } from '@/types/api';

export type ConnectedColumn<T> = {
  header: string;
  accessor: (row: T) => ReactNode;
};

export function ConnectedResourcePage<T extends { id?: string | number }>({
  title,
  description,
  loader,
  columns,
  emptyMessage,
}: {
  title: string;
  description: string;
  loader: () => Promise<T[] | PaginatedResponse<T>>;
  columns: ConnectedColumn<T>[];
  emptyMessage?: string;
}) {
  const { data, error, isLoading, reload } = useApiResource<
    T[] | PaginatedResponse<T>
  >(loader);

  if (isLoading)
    return <StateView title={`Loading ${title.toLowerCase()}...`} />;
  if (error)
    return (
      <StateView
        title={`Could not load ${title.toLowerCase()}`}
        description={error}
        actionLabel="Retry"
        onAction={reload}
      />
    );

  return (
    <div className="grid gap-6">
      <PageHeader title={title} description={description} />
      <DataTable<T>
        data={unwrapList(data)}
        columns={columns}
        emptyMessage={emptyMessage}
      />
    </div>
  );
}
