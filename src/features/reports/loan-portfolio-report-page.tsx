'use client';

import { useCallback, useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Field, Input } from '@/components/ui/input';
import { StateView } from '@/components/ui/state-view';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDate, statusLabel } from '@/features/admin/shared';
import { todayValue } from '@/features/accounting/reporting';
import {
  branchInstitutionId,
  canAccessLoanReports,
  useReportScope,
} from '@/features/accounting/use-report-scope';
import { useApiResource } from '@/hooks/use-api-resource';
import { moneyPrecise, unwrapList } from '@/lib/api/format';
import { accountingApi, loanApi } from '@/lib/api/services';
import type { LoanPortfolioReport, LoanProduct } from '@/types/api';
import { LoanReportMetricCard } from './loan-report-metric-card';
import { numericValue, percentLabel, reportScopeValue } from './report-utils';

const statusOptions = [
  'draft',
  'submitted',
  'under_review',
  'appraised',
  'recommended',
  'approved',
  'rejected',
  'withdrawn',
  'disbursed',
  'closed',
  'written_off',
] as const;

function BreakdownList({
  title,
  description,
  rows,
}: {
  title: string;
  description: string;
  rows: Array<{
    id: string;
    label: string;
    count: number;
    amount: string;
    balance: string;
  }>;
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4">
        <CardTitle>{title}</CardTitle>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <div className="grid gap-3 p-5">
        {rows.length ? (
          rows.map((row) => (
            <div
              key={row.id}
              className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[minmax(0,1fr)_auto_auto]"
            >
              <div className="min-w-0">
                <p className="font-bold text-slate-900">{row.label}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {row.count} loan{row.count === 1 ? '' : 's'}
                </p>
              </div>
              <div className="text-sm font-semibold text-slate-600 md:text-right">
                <p>Requested</p>
                <p className="mt-1 text-slate-900">{row.amount}</p>
              </div>
              <div className="text-sm font-semibold text-slate-600 md:text-right">
                <p>Outstanding</p>
                <p className="mt-1 text-slate-900">{row.balance}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-5 text-sm text-slate-600">
            No breakdown rows matched the selected scope.
          </div>
        )}
      </div>
    </Card>
  );
}

export function LoanPortfolioReportPage() {
  const [institutionFilter, setInstitutionFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [asOf, setAsOf] = useState(todayValue());

  const {
    actorRole,
    fixedInstitutionId,
    fixedBranchId,
    canChooseInstitution,
    institutions,
    availableBranches,
    institutionsError,
    branchesError,
    institutionsLoading,
    branchesLoading,
    reloadInstitutions,
    reloadBranches,
  } = useReportScope(institutionFilter);

  const resolvedInstitutionFilter =
    canChooseInstitution ? institutionFilter : fixedInstitutionId || institutionFilter;
  const resolvedBranchFilter =
    actorRole === 'branch_manager' ? fixedBranchId || branchFilter : branchFilter;

  const loadProducts = useCallback(
    () => loanApi.products.list({ page_size: 100 }),
    [],
  );

  const {
    data: productsData,
    error: productsError,
    isLoading: productsLoading,
    reload: reloadProducts,
  } = useApiResource(loadProducts);

  const products = unwrapList(productsData) as LoanProduct[];

  const loadReport = useCallback(
    () =>
      accountingApi.reports.loanPortfolio({
        institution: reportScopeValue(resolvedInstitutionFilter),
        branch: reportScopeValue(resolvedBranchFilter),
        product: reportScopeValue(productFilter),
        status: reportScopeValue(statusFilter),
        as_of: asOf || undefined,
        include_rows: true,
      }),
    [asOf, productFilter, resolvedBranchFilter, resolvedInstitutionFilter, statusFilter],
  );

  const { data, error, isLoading, reload } =
    useApiResource<LoanPortfolioReport>(loadReport);

  const rows = data?.rows ?? [];
  const parRatio = useMemo(() => {
    const portfolioBalance = numericValue(data?.portfolio_balance);
    if (portfolioBalance <= 0) return 0;
    return (numericValue(data?.arrears_balance) / portfolioBalance) * 100;
  }, [data?.arrears_balance, data?.portfolio_balance]);

  const statusBreakdownRows = (data?.status_breakdown ?? [])
    .map((row) => ({
      id: row.status,
      label: statusLabel(row.status),
      count: row.count,
      amount: moneyPrecise(row.requested_amount),
      balance: moneyPrecise(row.outstanding_balance),
    }))
    .sort((left, right) => right.count - left.count);

  const productBreakdownRows = (data?.product_breakdown ?? [])
    .map((row) => ({
      id: String(row.product_id ?? row.product_code ?? row.product_name ?? 'product'),
      label: row.product_code
        ? `${row.product_name ?? 'Loan product'} (${row.product_code})`
        : (row.product_name ?? 'Loan product'),
      count: Number(row.loan_count ?? 0),
      amount: moneyPrecise(row.requested_amount),
      balance: moneyPrecise(row.outstanding_balance),
      rawBalance: numericValue(row.outstanding_balance),
    }))
    .sort((left, right) => right.rawBalance - left.rawBalance)
    .map(({ rawBalance, ...row }) => row);

  if (!canAccessLoanReports(actorRole)) {
    return (
      <StateView
        title="Loan reports are not available"
        description="Only staff roles can access the loan reporting workspace."
      />
    );
  }

  if (
    (institutionsLoading || branchesLoading || productsLoading) &&
    !institutions.length &&
    !availableBranches.length &&
    !products.length
  ) {
    return <StateView title="Loading loan portfolio report..." />;
  }

  if ((institutionsError && !institutions.length) || (branchesError && !availableBranches.length)) {
    return (
      <StateView
        title="Could not load report filters"
        description={institutionsError || branchesError || undefined}
        actionLabel="Retry"
        onAction={() => {
          void reloadInstitutions();
          void reloadBranches();
        }}
      />
    );
  }

  if (error && !data) {
    return (
      <StateView
        title="Could not load loan portfolio report"
        description={error}
        actionLabel="Retry"
        onAction={reload}
      />
    );
  }

  if (isLoading && !data) {
    return <StateView title="Loading loan portfolio report..." />;
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Loan portfolio"
          description="Track the live loan book, pipeline mix, and overdue exposure across institution and branch scope."
        />
        <Button
          type="button"
          className="btn-outline-secondary bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100 print-hidden"
          onClick={() => window.print()}
        >
          Print
        </Button>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4">
          <CardTitle>Report filters</CardTitle>
          <p className="mt-1 text-sm text-slate-500">
            Narrow the loan book by scope, product, status, and reporting date.
          </p>
        </div>
        <div className="grid gap-4 p-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {canChooseInstitution ? (
              <Field label="Institution">
                <select
                  className="form-select"
                  value={institutionFilter}
                  onChange={(event) => {
                    setInstitutionFilter(event.target.value);
                    setBranchFilter('all');
                  }}
                >
                  <option value="all">All institutions</option>
                  {institutions.map((institution) => (
                    <option key={institution.id} value={String(institution.id)}>
                      {institution.name}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}

            <Field label="Branch">
              <select
                className="form-select"
                value={resolvedBranchFilter}
                onChange={(event) => setBranchFilter(event.target.value)}
                disabled={actorRole === 'branch_manager'}
              >
                <option value="all">All branches</option>
                {availableBranches
                  .filter((branch) => {
                    if (institutionFilter === 'all') return true;
                    return branchInstitutionId(branch) === institutionFilter;
                  })
                  .map((branch) => (
                    <option key={branch.id} value={String(branch.id)}>
                      {branch.name}
                    </option>
                  ))}
              </select>
            </Field>

            <Field label="Product">
              <select
                className="form-select"
                value={productFilter}
                onChange={(event) => setProductFilter(event.target.value)}
              >
                <option value="all">All products</option>
                {products.map((product) => (
                  <option key={product.id} value={String(product.id)}>
                    {product.name} ({product.code})
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Status">
              <select
                className="form-select"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="all">All statuses</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel(status)}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="As of">
              <Input
                type="date"
                value={asOf}
                onChange={(event) => setAsOf(event.target.value)}
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <LoanReportMetricCard
              label="Portfolio balance"
              value={moneyPrecise(data?.portfolio_balance)}
              helper="Principal plus interest currently outstanding."
            />
            <LoanReportMetricCard
              label="Active loans"
              value={String(data?.active ?? 0)}
              helper={`${data?.approved ?? 0} approved loans are still awaiting disbursement.`}
            />
            <LoanReportMetricCard
              label="Overdue balance"
              value={moneyPrecise(data?.arrears_balance)}
              helper={`${data?.overdue_loans ?? 0} loans currently sit in arrears.`}
              tone={numericValue(data?.arrears_balance) > 0 ? 'text-rose-700' : 'text-[#127D61]'}
            />
            <LoanReportMetricCard
              label="Portfolio at risk"
              value={percentLabel(parRatio)}
              helper={`Snapshot generated ${formatDate(data?.generated_at)}.`}
              tone={parRatio > 0 ? 'text-amber-700' : 'text-[#127D61]'}
            />
          </div>

          {productsError ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Loan products could not be loaded for filtering.
              <button
                type="button"
                className="ml-2 font-bold underline underline-offset-2"
                onClick={() => {
                  void reloadProducts();
                }}
              >
                Retry
              </button>
            </div>
          ) : null}
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <BreakdownList
          title="Status breakdown"
          description="See where the portfolio is concentrated across the lending lifecycle."
          rows={statusBreakdownRows}
        />
        <BreakdownList
          title="Product concentration"
          description="Compare requested and outstanding balances across loan products."
          rows={productBreakdownRows}
        />
      </div>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4">
          <CardTitle>Portfolio rows</CardTitle>
          <p className="mt-1 text-sm text-slate-500">
            Detailed loan book view for operations, approvals, and arrears follow-up.
          </p>
        </div>
        <div className="p-5">
          <DataTable
            data={rows}
            loading={isLoading}
            emptyTitle="No loans found"
            emptyMessage="No loans matched the selected portfolio scope."
            columns={[
              {
                header: 'Borrower',
                accessor: (row) => (
                  <div className="min-w-[220px]">
                    <p className="font-bold text-slate-900">{row.client_name || 'Client'}</p>
                    <p className="text-xs text-slate-500">
                      {row.client_member_number || 'No member number'} •{' '}
                      {row.product_name || 'Loan product'}
                    </p>
                  </div>
                ),
              },
              {
                header: 'Status',
                accessor: (row) => <StatusBadge status={row.status} />,
              },
              {
                header: 'Requested',
                accessor: (row) => moneyPrecise(row.amount),
                align: 'right',
              },
              {
                header: 'Outstanding',
                accessor: (row) => moneyPrecise(row.outstanding_balance),
                align: 'right',
              },
              {
                header: 'Next due',
                accessor: (row) => formatDate(row.next_due_date),
              },
              {
                header: 'Overdue',
                accessor: (row) => (
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">
                      {moneyPrecise(row.overdue_amount)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {row.days_past_due ? `${row.days_past_due} day(s)` : 'Current'}
                    </p>
                  </div>
                ),
                align: 'right',
              },
            ]}
            renderMobileCard={(row) => (
              <article className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-base font-bold text-slate-900">
                      {row.client_name || 'Client'}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {row.product_name || 'Loan product'} •{' '}
                      {row.client_member_number || 'No member number'}
                    </p>
                  </div>
                  <StatusBadge status={row.status} />
                </div>

                <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                  <p>Requested: {moneyPrecise(row.amount)}</p>
                  <p>Outstanding: {moneyPrecise(row.outstanding_balance)}</p>
                  <p>Next due: {formatDate(row.next_due_date)}</p>
                  <p>
                    Overdue: {moneyPrecise(row.overdue_amount)} /{' '}
                    {row.days_past_due ? `${row.days_past_due} day(s)` : 'Current'}
                  </p>
                </div>
              </article>
            )}
          />
        </div>
      </Card>
    </div>
  );
}
