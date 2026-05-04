'use client';

import { useCallback, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Field, Input } from '@/components/ui/input';
import { StateView } from '@/components/ui/state-view';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDate } from '@/features/admin/shared';
import { todayValue } from '@/features/accounting/reporting';
import {
  branchInstitutionId,
  canAccessLoanReports,
  useReportScope,
} from '@/features/accounting/use-report-scope';
import { useApiResource } from '@/hooks/use-api-resource';
import { moneyPrecise, unwrapList } from '@/lib/api/format';
import { accountingApi, loanApi } from '@/lib/api/services';
import type { LoanArrearsAgingReport, LoanProduct } from '@/types/api';
import { LoanReportMetricCard } from './loan-report-metric-card';
import { percentLabel, reportScopeValue } from './report-utils';

export function LoanArrearsAgingReportPage() {
  const [institutionFilter, setInstitutionFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('all');
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
      accountingApi.reports.loanArrearsAging({
        institution: reportScopeValue(resolvedInstitutionFilter),
        branch: reportScopeValue(resolvedBranchFilter),
        product: reportScopeValue(productFilter),
        as_of: asOf || undefined,
      }),
    [asOf, productFilter, resolvedBranchFilter, resolvedInstitutionFilter],
  );

  const { data, error, isLoading, reload } =
    useApiResource<LoanArrearsAgingReport>(loadReport);

  const rows = (data?.rows ?? []).map((row) => ({
    ...row,
    id: row.loan_id,
  }));

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
    return <StateView title="Loading arrears aging report..." />;
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
        title="Could not load arrears aging report"
        description={error}
        actionLabel="Retry"
        onAction={reload}
      />
    );
  }

  if (isLoading && !data) {
    return <StateView title="Loading arrears aging report..." />;
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Loan arrears aging"
          description="Identify overdue loans quickly using aging buckets, days past due, and portfolio at risk."
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
            Review arrears exposure by scope, product, and portfolio date.
          </p>
        </div>
        <div className="grid gap-4 p-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
              label="Loans in arrears"
              value={String(data?.totals?.loans_in_arrears ?? 0)}
              helper="Distinct loans with at least one overdue schedule row."
              tone="text-rose-700"
            />
            <LoanReportMetricCard
              label="Overdue balance"
              value={moneyPrecise(data?.totals?.overdue_balance)}
              helper="Total overdue amount across the selected scope."
              tone="text-rose-700"
            />
            <LoanReportMetricCard
              label="Portfolio at risk"
              value={percentLabel(Number(data?.totals?.par_ratio ?? 0))}
              helper="Overdue balance divided by outstanding portfolio."
              tone="text-amber-700"
            />
            <LoanReportMetricCard
              label="91+ days bucket"
              value={moneyPrecise(data?.totals?.bucket_91_plus)}
              helper={`Generated ${formatDate(data?.generated_at)}.`}
              tone="text-rose-700"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <LoanReportMetricCard
              label="1-30 days"
              value={moneyPrecise(data?.totals?.bucket_1_30)}
              helper="Short-term arrears bucket."
              tone="text-amber-700"
            />
            <LoanReportMetricCard
              label="31-60 days"
              value={moneyPrecise(data?.totals?.bucket_31_60)}
              helper="Emerging arrears bucket."
              tone="text-orange-700"
            />
            <LoanReportMetricCard
              label="61-90 days"
              value={moneyPrecise(data?.totals?.bucket_61_90)}
              helper="High-risk arrears bucket."
              tone="text-rose-700"
            />
            <LoanReportMetricCard
              label="Portfolio balance"
              value={moneyPrecise(data?.totals?.portfolio_balance)}
              helper="Outstanding loan balance used for the PAR calculation."
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

      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4">
          <CardTitle>Arrears register</CardTitle>
          <p className="mt-1 text-sm text-slate-500">
            Use the aging buckets below to prioritize follow-up with borrowers.
          </p>
        </div>
        <div className="p-5">
          <DataTable
            data={rows}
            loading={isLoading}
            emptyTitle="No arrears found"
            emptyMessage="No loans in arrears matched the selected scope."
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
                header: 'Oldest due',
                accessor: (row) => formatDate(row.oldest_due_date),
              },
              {
                header: 'Days past due',
                accessor: (row) => (
                  <span className="font-semibold text-rose-700">
                    {row.days_past_due ?? 0}
                  </span>
                ),
                align: 'right',
              },
              {
                header: 'Overdue',
                accessor: (row) => moneyPrecise(row.overdue_amount),
                align: 'right',
              },
              {
                header: '91+',
                accessor: (row) => moneyPrecise(row.bucket_91_plus),
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
                  <p>Oldest due: {formatDate(row.oldest_due_date)}</p>
                  <p>Days past due: {row.days_past_due ?? 0}</p>
                  <p>Overdue: {moneyPrecise(row.overdue_amount)}</p>
                  <p>Outstanding: {moneyPrecise(row.outstanding_balance)}</p>
                  <p>1-30: {moneyPrecise(row.bucket_1_30)}</p>
                  <p>31-60: {moneyPrecise(row.bucket_31_60)}</p>
                  <p>61-90: {moneyPrecise(row.bucket_61_90)}</p>
                  <p>91+: {moneyPrecise(row.bucket_91_plus)}</p>
                </div>
              </article>
            )}
          />
        </div>
      </Card>
    </div>
  );
}
