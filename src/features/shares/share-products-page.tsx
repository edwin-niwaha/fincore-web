'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { Eye, Pencil, Plus } from 'lucide-react';
import { RecordsListPanel } from '@/components/records/records-list-panel';
import { RecordsPageLayout } from '@/components/records/records-page-layout';
import { RecordsPagination } from '@/components/records/records-pagination';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import type { Column } from '@/components/ui/data-table';
import { DataTable } from '@/components/ui/data-table';
import { Field, Input } from '@/components/ui/input';
import { StateView } from '@/components/ui/state-view';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDate } from '@/features/admin/shared';
import { useAuth } from '@/features/auth/auth-provider';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useApiResource } from '@/hooks/use-api-resource';
import { isPaginatedResponse, listCount, money, unwrapList } from '@/lib/api/format';
import { sharesApi } from '@/lib/api/services';
import type { ShareProduct } from '@/types/api';
import {
  SharesFeatureGate,
  canAccessShareFeature,
  shareProductManagerRoles,
  shareProductStatusOptions,
} from '@/features/shares/shared';

export function ShareProductsPage() {
  const { user } = useAuth();
  const actorRole = user?.role ?? null;
  const canManageProducts = canAccessShareFeature(actorRole, shareProductManagerRoles);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const searchQuery = useDebouncedValue(search.trim(), 300);

  const loadProducts = useCallback(
    () =>
      sharesApi.products.list({
        search: searchQuery || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        page,
        ordering: 'name',
      }),
    [page, searchQuery, statusFilter],
  );

  const { data, error, isLoading, reload } = useApiResource(loadProducts);
  const products = unwrapList(data);
  const pagination = isPaginatedResponse(data)
    ? {
        count: listCount(data),
        hasNext: Boolean(data.next),
        hasPrevious: Boolean(data.previous),
      }
    : null;

  const activeProducts = products.filter((product) => product.status === 'active').length;
  const dividendProducts = products.filter((product) => product.allow_dividends).length;

  const columns: Column<ShareProduct>[] = [
    {
      header: 'Product',
      accessor: (product) => (
        <div>
          <p className="font-bold text-slate-900">{product.name}</p>
          <p className="text-xs text-slate-500">{product.code}</p>
        </div>
      ),
    },
    {
      header: 'Price',
      accessor: (product) => (
        <div>
          <p className="font-bold text-slate-900">{money(product.nominal_price)}</p>
          <p className="text-xs text-slate-500">
            {product.allow_dividends ? 'Dividends enabled' : 'Dividends disabled'}
          </p>
        </div>
      ),
      align: 'right',
    },
    {
      header: 'Limits',
      accessor: (product) => (
        <div>
          <p className="font-bold text-slate-900">Min {product.minimum_shares ?? 1}</p>
          <p className="text-xs text-slate-500">
            {product.maximum_shares == null
              ? 'No maximum configured'
              : `Max ${product.maximum_shares}`}
          </p>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: (product) => <StatusBadge status={product.status} />,
    },
    {
      header: 'Updated',
      accessor: (product) => formatDate(product.updated_at ?? product.created_at),
    },
    {
      header: 'Actions',
      accessor: (product) => (
        <div className="flex justify-end gap-2">
          <Link href={`/shares/products/${product.id}`}>
            <Button
              type="button"
              className="bg-white px-3 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
            >
              {canManageProducts ? (
                <>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  View
                </>
              )}
            </Button>
          </Link>
        </div>
      ),
      align: 'right',
    },
  ];

  return (
    <SharesFeatureGate
      unavailableTitle="Share products are not available"
      unavailableDescription="Only staff roles can access the share products workspace."
    >
      <RecordsPageLayout
        title="Share products"
        description="Configure share products, nominal prices, holding rules, and dividend eligibility."
        headerAction={
          canManageProducts ? (
            <Link href="/shares/products/new">
              <Button type="button">
                <Plus className="mr-2 h-4 w-4" />
                Create product
              </Button>
            </Link>
          ) : undefined
        }
        metrics={[
          {
            label: 'Visible products',
            value: products.length,
            hint: 'Matching the current search and status filter.',
          },
          {
            label: 'Active products',
            value: activeProducts,
            hint: 'Products currently open for new share accounts.',
          },
          {
            label: 'Dividend enabled',
            value: dividendProducts,
            hint: 'Products configured to support dividend allocation.',
            accent: 'slate',
          },
        ]}
        filterPanel={
          <Card className="grid gap-4">
            <CardTitle>Filters</CardTitle>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Search">
                <Input
                  placeholder="Product name or code"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                />
              </Field>

              <Field label="Status">
                <select
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-950 shadow-sm outline-none transition focus:border-[#127D61] focus:ring-4 focus:ring-emerald-100"
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value);
                    setPage(1);
                  }}
                >
                  {shareProductStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </Card>
        }
      >
        <RecordsListPanel
          title="Product register"
          description="Live share product configuration from the shares API."
          footer={
            pagination ? (
              <RecordsPagination
                count={pagination.count}
                page={page}
                rowsOnPage={products.length}
                hasNext={pagination.hasNext}
                hasPrevious={pagination.hasPrevious}
                onPageChange={setPage}
              />
            ) : undefined
          }
        >
          <div className="grid gap-4 p-5">
            {error && !data ? (
              <StateView
                title="Could not load share products"
                description={error}
                actionLabel="Retry"
                onAction={reload}
              />
            ) : (
              <DataTable<ShareProduct>
                data={products}
                columns={columns}
                loading={isLoading}
                emptyTitle="No share products found"
                emptyMessage="Try widening the current search or status filter."
                renderMobileCard={(product) => (
                  <article className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-base font-bold text-slate-900">
                            {product.name}
                          </p>
                          <StatusBadge status={product.status} />
                        </div>
                        <p className="mt-1 text-sm font-semibold text-slate-600">{product.code}</p>
                      </div>

                      <Link href={`/shares/products/${product.id}`}>
                        <Button
                          type="button"
                          className="bg-white px-3 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                        >
                          {canManageProducts ? 'Edit' : 'View'}
                        </Button>
                      </Link>
                    </div>

                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                        Product rules
                      </p>
                      <p className="mt-1 text-sm text-slate-700">
                        Price {money(product.nominal_price)}. Minimum{' '}
                        {product.minimum_shares ?? 1} shares.
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {product.maximum_shares == null
                          ? 'No maximum share limit set.'
                          : `Maximum ${product.maximum_shares} shares.`}
                      </p>
                    </div>
                  </article>
                )}
              />
            )}
          </div>
        </RecordsListPanel>
      </RecordsPageLayout>
    </SharesFeatureGate>
  );
}
