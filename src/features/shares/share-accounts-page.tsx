'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { Eye } from 'lucide-react';
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
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useApiResource } from '@/hooks/use-api-resource';
import { isPaginatedResponse, listCount, money, unwrapList } from '@/lib/api/format';
import { sharesApi } from '@/lib/api/services';
import type { ShareAccount, ShareProduct } from '@/types/api';
import {
  SharesFeatureGate,
  shareStatusOptions,
} from '@/features/shares/shared';

export function ShareAccountsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('all');
  const [page, setPage] = useState(1);

  const searchQuery = useDebouncedValue(search.trim(), 300);

  const loadAccounts = useCallback(
    () =>
      sharesApi.accounts.list({
        search: searchQuery || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        product: productFilter === 'all' ? undefined : productFilter,
        page,
        ordering: 'account_number',
      }),
    [page, productFilter, searchQuery, statusFilter],
  );

  const loadProducts = useCallback(() => sharesApi.products.list({ ordering: 'name' }), []);

  const { data, error, isLoading, reload } = useApiResource(loadAccounts);
  const { data: productsData } = useApiResource(loadProducts);

  const accounts = unwrapList(data);
  const products = unwrapList(productsData) as ShareProduct[];
  const pagination = isPaginatedResponse(data)
    ? {
        count: listCount(data),
        hasNext: Boolean(data.next),
        hasPrevious: Boolean(data.previous),
      }
    : null;

  const visibleCapital = accounts.reduce(
    (sum, account) => sum + Number(account.total_value ?? 0),
    0,
  );
  const activeAccounts = accounts.filter((account) => account.status === 'active').length;

  const columns: Column<ShareAccount>[] = [
    {
      header: 'Account',
      accessor: (account) => (
        <div>
          <p className="font-bold text-slate-900">{account.account_number || account.id}</p>
          <p className="text-xs text-slate-500">
            {account.client_member_number || account.client_name || 'Member'}
          </p>
        </div>
      ),
    },
    {
      header: 'Member',
      accessor: (account) => (
        <div>
          <p className="font-bold text-slate-900">{account.client_name || 'Member'}</p>
          <p className="text-xs text-slate-500">{account.branch_name || 'Branch not set'}</p>
        </div>
      ),
    },
    {
      header: 'Product',
      accessor: (account) => (
        <div>
          <p className="font-bold text-slate-900">{account.product_name || 'Share product'}</p>
          <p className="text-xs text-slate-500">{account.product_code || '-'}</p>
        </div>
      ),
    },
    {
      header: 'Holdings',
      accessor: (account) => (
        <div className="text-right">
          <p className="font-bold text-slate-900">
            {Number(account.shares ?? 0).toLocaleString('en-UG')} shares
          </p>
          <p className="text-xs text-slate-500">{money(account.total_value)}</p>
        </div>
      ),
      align: 'right',
    },
    {
      header: 'Status',
      accessor: (account) => <StatusBadge status={account.status} />,
    },
    {
      header: 'Last activity',
      accessor: (account) => formatDate(account.last_transaction_at ?? account.updated_at),
    },
    {
      header: 'Actions',
      accessor: (account) => (
        <div className="flex justify-end gap-2">
          <Link href={`/shares/accounts/${account.id}`}>
            <Button
              type="button"
              className="bg-white px-3 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
            >
              <Eye className="mr-2 h-4 w-4" />
              View
            </Button>
          </Link>
        </div>
      ),
      align: 'right',
    },
  ];

  return (
    <SharesFeatureGate
      unavailableTitle="Share accounts are not available"
      unavailableDescription="Only staff roles can access share accounts."
    >
      <RecordsPageLayout
        title="Share accounts"
        description="Review member share accounts, balances, statuses, and recent activity."
        metrics={[
          {
            label: 'Visible accounts',
            value: accounts.length,
            hint: 'Matching the current account filters.',
          },
          {
            label: 'Active accounts',
            value: activeAccounts,
            hint: 'Accounts currently eligible for live transactions.',
          },
          {
            label: 'Visible capital',
            value: money(visibleCapital),
            hint: 'Current capital represented by the visible account set.',
            accent: 'slate',
          },
        ]}
        filterPanel={
          <Card className="grid gap-4">
            <CardTitle>Filters</CardTitle>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Search">
                <Input
                  placeholder="Account, member, phone, or product"
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
                  {shareStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Product">
                <select
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-950 shadow-sm outline-none transition focus:border-[#127D61] focus:ring-4 focus:ring-emerald-100"
                  value={productFilter}
                  onChange={(event) => {
                    setProductFilter(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="all">All products</option>
                  {products.map((product) => (
                    <option key={product.id} value={String(product.id)}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </Card>
        }
      >
        <RecordsListPanel
          title="Account register"
          description="Live share accounts from /api/v1/shares/accounts/."
          footer={
            pagination ? (
              <RecordsPagination
                count={pagination.count}
                page={page}
                rowsOnPage={accounts.length}
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
                title="Could not load share accounts"
                description={error}
                actionLabel="Retry"
                onAction={reload}
              />
            ) : (
              <DataTable<ShareAccount>
                data={accounts}
                columns={columns}
                loading={isLoading}
                emptyTitle="No share accounts found"
                emptyMessage="Try widening the current filters or open more share accounts."
                renderMobileCard={(account) => (
                  <article className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-base font-bold text-slate-900">
                            {account.account_number || account.id}
                          </p>
                          <StatusBadge status={account.status} />
                        </div>
                        <p className="mt-1 text-sm font-semibold text-slate-600">
                          {account.client_name || 'Member'}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {account.product_name || 'Share product'}
                        </p>
                      </div>

                      <Link href={`/shares/accounts/${account.id}`}>
                        <Button
                          type="button"
                          className="bg-white px-3 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                        >
                          View
                        </Button>
                      </Link>
                    </div>

                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                        Holdings
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-700">
                        {Number(account.shares ?? 0).toLocaleString('en-UG')} shares worth{' '}
                        {money(account.total_value)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Last activity {formatDate(account.last_transaction_at ?? account.updated_at)}
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
