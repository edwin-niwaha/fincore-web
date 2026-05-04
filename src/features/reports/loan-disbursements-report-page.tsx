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
import { startOfMonthValue, todayValue } from '@/features/accounting/reporting';
import {
  branchInstitutionId,
  canAccessLoanReports,
  useReportScope,
} from '@/features/accounting/use-report-scope';
import { useApiResource } from '@/hooks/use-api-resource';
import { moneyPrecise, unwrapList } from '@/lib/api/format';
import { accountingApi, loanApi } from '@/lib/api/services';
import type { LoanDisbursementReport, LoanProduct } from '@/types/api';
import { LoanReportMetricCard } from './loan-report-metric-card';
import { reportScopeValue } from './report-utils';

export function LoanDisbursementsReportPage() {
  const [institutionFilter, setInstitutionFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState(startOfMonthValue());
  const [dateTo, setDateTo] = useState(todayValue());

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
      accountingApi.reports.loanDisbursements({
        institution: reportScopeValue(resolvedInstitutionFilter),
        branch: reportScopeValue(resolvedBranchFilter),
        product: reportScopeValue(productFilter),
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      }),
    [dateFrom, dateTo, productFilter, resolvedBranchFilter, resolvedInstitutionFilter],
  );

  const { data, error, isLoading, reload } =
    useApiResource<LoanDisbursementReport>(loadReport);

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
    return <StateView title="Loading loan disbursement report..." />;
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
        title="Could not load disbursement report"
        description={error}
        actionLabel="Retry"
        onAction={reload}
      />
    );
  }

  if (isLoading && !data) {
    return <StateView title="Loading loan disbursement report..." />;
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Loan disbursements"
          description="Monitor released loans by branch, product, method, and current outstanding balance."
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
            Filter disbursements by reporting window, branch, and loan product.
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

            <Field label="Date from">
              <Input
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
              />
            </Field>

            <Field label="Date to">
              <Input
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <LoanReportMetricCard
              label="Disbursements"
              value={String(data?.totals?.count ?? 0)}
              helper="Loans released in the selected period."
            />
            <LoanReportMetricCard
              label="Total disbursed"
              value={moneyPrecise(data?.totals?.amount)}
              helper="Gross amount released to borrowers."
            />
            <LoanReportMetricCard
              label="Principal outstanding"
              value={moneyPrecise(data?.totals?.principal_outstanding)}
              helper="Remaining principal on loans in this report."
            />
            <LoanReportMetricCard
              label="Interest outstanding"
              value={moneyPrecise(data?.totals?.interest_outstanding)}
              helper={`Generated ${formatDate(data?.generated_at)}.`}
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
          <CardTitle>Disbursement register</CardTitle>
          <p className="mt-1 text-sm text-slate-500">
            Operational disbursement listing with product, method, and current balances.
          </p>
        </div>
        <div className="p-5">
          <DataTable
            data={rows}
            loading={isLoading}
            emptyTitle="No disbursements found"
            emptyMessage="No disbursed loans matched the selected filters."
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
                header: 'Disbursed',
                accessor: (row) => formatDate(row.disbursed_at),
              },
              {
                header: 'Reference',
                accessor: (row) => (
                  <div>
                    <p className="font-semibold text-slate-900">
                      {row.disbursement_reference || '-'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {row.disbursement_method || 'No method'}
                    </p>
                  </div>
                ),
              },
              {
                header: 'Amount',
                accessor: (row) => moneyPrecise(row.amount),
                align: 'right',
              },
              {
                header: 'Outstanding',
                accessor: (row) => moneyPrecise(row.outstanding_balance),
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
                  <p>Disbursed: {formatDate(row.disbursed_at)}</p>
                  <p>Reference: {row.disbursement_reference || '-'}</p>
                  <p>Method: {row.disbursement_method || 'No method'}</p>
                  <p>Amount: {moneyPrecise(row.amount)}</p>
                  <p className="sm:col-span-2">
                    Outstanding: {moneyPrecise(row.outstanding_balance)}
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
