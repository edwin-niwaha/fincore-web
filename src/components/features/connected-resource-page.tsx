'use client';

import type { ReactNode } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { RecordsListPanel } from '@/components/records/records-list-panel';
import { RecordsPageLayout } from '@/components/records/records-page-layout';
import { RecordsPagination } from '@/components/records/records-pagination';
import { Card, CardTitle } from '@/components/ui/card';
import type { Column } from '@/components/ui/data-table';
import { DataTable } from '@/components/ui/data-table';
import { Field, Input } from '@/components/ui/input';
import { StateView } from '@/components/ui/state-view';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useApiResource } from '@/hooks/use-api-resource';
import { isPaginatedResponse, listCount, unwrapList } from '@/lib/api/format';
import { formSelectClassName } from '@/features/admin/shared';
import type { PaginatedResponse } from '@/types/api';

type QueryValue = string | number | boolean | undefined;
type Query = Record<string, QueryValue>;

export type ConnectedColumn<T> = Column<T>;

export type ConnectedFilter<T> = {
  key: string;
  label: string;
  options: Array<{ label: string; value: string }>;
  defaultValue?: string;
  queryParam?: string | false;
  apply?: (row: T, value: string) => boolean;
};

export type ConnectedMetric<T> = {
  label: string;
  value: (rows: T[], data: T[] | PaginatedResponse<T> | null) => ReactNode;
  hint?: (rows: T[], data: T[] | PaginatedResponse<T> | null) => ReactNode;
  accent?: 'brand' | 'slate' | 'amber';
};

export function ConnectedResourcePage<T extends { id?: string | number }>({
  title,
  description,
  loader,
  columns,
  emptyMessage,
  emptyTitle,
  filters = [],
  metrics = [],
  querySearchParam = false,
  searchPlaceholder = 'Search records...',
  searchAccessor,
  tableTitle,
  tableDescription,
  primaryAction,
  renderMobileCard,
}: {
  title: string;
  description: string;
  loader: (query?: Query) => Promise<T[] | PaginatedResponse<T>>;
  columns: ConnectedColumn<T>[];
  emptyMessage?: string;
  emptyTitle?: string;
  filters?: ConnectedFilter<T>[];
  metrics?: ConnectedMetric<T>[];
  querySearchParam?: string | false;
  searchPlaceholder?: string;
  searchAccessor?: (row: T) => string;
  tableTitle?: string;
  tableDescription?: string;
  primaryAction?: ReactNode;
  renderMobileCard?: (row: T, index: number) => ReactNode;
}) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filterValues, setFilterValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      filters.map((filter) => [filter.key, filter.defaultValue ?? 'all']),
    ),
  );
  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  const loadRecords = useCallback(() => {
    const query: Query = { page };

    if (querySearchParam && debouncedSearch) {
      query[querySearchParam] = debouncedSearch;
    }

    filters.forEach((filter) => {
      const value = filterValues[filter.key] ?? filter.defaultValue ?? 'all';
      if (!filter.queryParam || value === 'all') return;
      query[filter.queryParam] = value;
    });

    return loader(query);
  }, [debouncedSearch, filterValues, filters, loader, page, querySearchParam]);

  const { data, error, isLoading, reload } = useApiResource<
    T[] | PaginatedResponse<T>
  >(loadRecords);

  const rows = unwrapList(data);
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (
        debouncedSearch &&
        searchAccessor &&
        !searchAccessor(row).toLowerCase().includes(debouncedSearch.toLowerCase())
      ) {
        return false;
      }

      return filters.every((filter) => {
        const selectedValue =
          filterValues[filter.key] ?? filter.defaultValue ?? 'all';
        if (selectedValue === 'all' || !filter.apply) return true;
        return filter.apply(row, selectedValue);
      });
    });
  }, [debouncedSearch, filterValues, filters, rows, searchAccessor]);

  const pagination = isPaginatedResponse(data)
    ? {
        count: listCount(data),
        hasNext: Boolean(data.next),
        hasPrevious: Boolean(data.previous),
      }
    : null;

  const resolvedMetrics = metrics.map((metric) => ({
    label: metric.label,
    value: metric.value(filteredRows, data),
    hint: metric.hint?.(filteredRows, data),
    accent: metric.accent,
  }));

  return (
    <RecordsPageLayout
      title={title}
      description={description}
      metrics={resolvedMetrics}
      filterPanel={
        <Card className="grid gap-4">
          <CardTitle>Search and filters</CardTitle>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Search">
              <Input
                placeholder={searchPlaceholder}
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </Field>

            {filters.map((filter) => (
              <Field key={filter.key} label={filter.label}>
                <select
                  className={formSelectClassName}
                  value={filterValues[filter.key] ?? filter.defaultValue ?? 'all'}
                  onChange={(event) =>
                    {
                      setFilterValues((current) => ({
                        ...current,
                        [filter.key]: event.target.value,
                      }));
                      setPage(1);
                    }
                  }
                >
                  {filter.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
            ))}
          </div>
        </Card>
      }
    >
      <RecordsListPanel
        title={tableTitle ?? `${title} list`}
        description={
          tableDescription ??
          'Browse the live records returned by the connected API.'
        }
        action={primaryAction}
        footer={
          pagination ? (
            <RecordsPagination
              count={pagination.count}
              page={page}
              rowsOnPage={filteredRows.length}
              hasNext={pagination.hasNext}
              hasPrevious={pagination.hasPrevious}
              onPageChange={setPage}
            />
          ) : undefined
        }
      >
        <div className="grid gap-4 p-5">
          {error && data ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Showing the most recent results we have, but refreshing the list failed.
              <button
                type="button"
                className="ml-2 font-bold underline underline-offset-2"
                onClick={() => {
                  void reload();
                }}
              >
                Retry
              </button>
            </div>
          ) : null}

          {error && !data ? (
            <StateView
              title={`Could not load ${title.toLowerCase()}`}
              description={error}
              actionLabel="Retry"
              onAction={reload}
            />
          ) : (
            <DataTable<T>
              data={filteredRows}
              columns={columns}
              emptyTitle={emptyTitle}
              emptyMessage={emptyMessage}
              loading={isLoading}
              renderMobileCard={renderMobileCard}
            />
          )}
        </div>
      </RecordsListPanel>
    </RecordsPageLayout>
  );
}
