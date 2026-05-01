'use client';

import { useCallback, useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Field, Input } from '@/components/ui/input';
import { StateView } from '@/components/ui/state-view';
import { formatDate } from '@/features/admin/shared';
import {
  BalanceSheetRow,
  buildBalanceSheetData,
  todayValue,
} from '@/features/accounting/reporting';
import {
  branchInstitutionId,
  canAccessAccountingReports,
  useReportScope,
} from '@/features/accounting/use-report-scope';
import { useApiResource } from '@/hooks/use-api-resource';
import { moneyPrecise } from '@/lib/api/format';
import { accountingApi } from '@/lib/api/services';
import type { TrialBalanceReport } from '@/types/api';

function SectionTable({
  title,
  description,
  rows,
  totalLabel,
  totalAmount,
}: {
  title: string;
  description: string;
  rows: BalanceSheetRow[];
  totalLabel: string;
  totalAmount: number;
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="card-header border-b border-slate-200 bg-slate-50/80 px-5 py-4">
        <div>
          <CardTitle>{title}</CardTitle>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
      </div>
      <div className="card-body p-5">
        <DataTable<BalanceSheetRow>
          data={rows}
          emptyTitle={`No ${title.toLowerCase()} found`}
          emptyMessage={`No ${title.toLowerCase()} matched this reporting scope.`}
          columns={[
            {
              header: 'Code',
              accessor: (row) => row.code,
            },
            {
              header: 'Account',
              accessor: (row) => row.name,
            },
            {
              header: 'Amount',
              accessor: (row) => moneyPrecise(row.amount),
              align: 'right',
            },
          ]}
          tableFooter={
            <tfoot>
              <tr>
                <td colSpan={2} className="font-bold text-slate-900">
                  {totalLabel}
                </td>
                <td className="text-right font-bold text-slate-900">
                  {moneyPrecise(totalAmount)}
                </td>
              </tr>
            </tfoot>
          }
          renderMobileCard={(row) => (
            <article className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-bold text-slate-900">{row.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{row.code}</p>
                </div>
                <p className="text-sm font-bold text-slate-900">
                  {moneyPrecise(row.amount)}
                </p>
              </div>
            </article>
          )}
        />
      </div>
    </Card>
  );
}

export function BalanceSheetPage() {
  const [institutionFilter, setInstitutionFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
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

  const loadBalanceSheet = useCallback(
    () =>
      accountingApi.reports.trialBalance({
        institution:
          resolvedInstitutionFilter === 'all'
            ? undefined
            : resolvedInstitutionFilter,
        branch: resolvedBranchFilter === 'all' ? undefined : resolvedBranchFilter,
        as_of: asOf || undefined,
      }),
    [asOf, resolvedBranchFilter, resolvedInstitutionFilter],
  );

  const { data, error, isLoading, reload } =
    useApiResource<TrialBalanceReport>(loadBalanceSheet);

  const balanceSheet = useMemo(() => buildBalanceSheetData(data), [data]);

  if (!canAccessAccountingReports(actorRole)) {
    return (
      <StateView
        title="Balance sheet is not available"
        description="Only admin, branch manager, and accounting roles can access the balance sheet."
      />
    );
  }

  if ((institutionsLoading || branchesLoading) && !institutions.length && !availableBranches.length) {
    return <StateView title="Loading balance sheet..." />;
  }

  if ((institutionsError && !institutions.length) || (branchesError && !availableBranches.length)) {
    return (
      <StateView
        title="Could not load balance sheet filters"
        description={institutionsError || branchesError || undefined}
        actionLabel="Retry"
        onAction={() => {
          void reloadInstitutions();
          void reloadBranches();
        }}
      />
    );
  }

  if (isLoading && !data) {
    return <StateView title="Loading balance sheet..." />;
  }

  if (error && !data) {
    return (
      <StateView
        title="Could not load balance sheet"
        description={error}
        actionLabel="Retry"
        onAction={reload}
      />
    );
  }

  return (
    <div className="container-fluid grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Balance sheet"
          description="Review assets, liabilities, and equity for the selected reporting date with a clear control check for branch or institution scope."
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
        <div className="card-header border-b border-slate-200 bg-slate-50/80 px-5 py-4">
          <div>
            <CardTitle>Filters</CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              Generate a balance sheet snapshot for a specific date and organizational scope.
            </p>
          </div>
        </div>
        <div className="card-body grid gap-4 p-5">
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

            <Field label="As of">
              <Input type="date" value={asOf} onChange={(event) => setAsOf(event.target.value)} />
            </Field>

            <Field label="Generated">
              <Input value={formatDate(data?.generated_at)} readOnly />
            </Field>
          </div>

          <div className={`alert ${balanceSheet.isBalanced ? 'alert-success' : 'alert-danger'}`}>
            {balanceSheet.isBalanced
              ? `Balanced as of ${formatDate(asOf)}. Total assets equal liabilities plus equity.`
              : `Out of balance as of ${formatDate(asOf)}. Difference ${moneyPrecise(balanceSheet.difference)}.`}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="min-w-0 p-4">
          <p className="text-sm font-semibold text-slate-500">Assets</p>
          <div className="mt-3 flex items-end justify-between gap-2">
            <span className="text-xs font-bold text-slate-500">USh</span>
            <p className="max-w-[140px] break-words text-right text-lg font-black tabular-nums text-[#127D61]">
              {moneyPrecise(balanceSheet.totalAssets).replace('USh', '').trim()}
            </p>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {balanceSheet.assets.length} asset accounts in scope.
          </p>
        </Card>

        <Card className="min-w-0 p-4">
          <p className="text-sm font-semibold text-slate-500">Liabilities</p>
          <div className="mt-3 flex items-end justify-between gap-2">
            <span className="text-xs font-bold text-slate-500">USh</span>
            <p className="max-w-[140px] break-words text-right text-lg font-black tabular-nums text-[#127D61]">
              {moneyPrecise(balanceSheet.totalLiabilities).replace('USh', '').trim()}
            </p>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {balanceSheet.liabilities.length} liability accounts in scope.
          </p>
        </Card>

        <Card className="min-w-0 p-4">
          <p className="text-sm font-semibold text-slate-500">Equity</p>
          <div className="mt-3 flex items-end justify-between gap-2">
            <span className="text-xs font-bold text-slate-500">USh</span>
            <p className="max-w-[140px] break-words text-right text-lg font-black tabular-nums text-[#127D61]">
              {moneyPrecise(balanceSheet.totalEquity).replace('USh', '').trim()}
            </p>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Includes retained earnings of{' '}
            <span className="font-bold tabular-nums">
              {moneyPrecise(balanceSheet.retainedEarnings)}
            </span>
            .
          </p>
        </Card>

        <Card className="min-w-0 p-4">
          <p className="text-sm font-semibold text-slate-500">Difference</p>
          <div className="mt-3 flex items-end justify-between gap-2">
            <span className="text-xs font-bold text-slate-500">USh</span>
            <p
              className={`max-w-[140px] break-words text-right text-lg font-black tabular-nums ${
                balanceSheet.isBalanced ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {moneyPrecise(balanceSheet.difference).replace('USh', '').trim()}
            </p>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Assets vs liabilities + equity control value.
          </p>
        </Card>
      </div>

      <div className="row">
        <div className="col-12 col-lg-6">
          <SectionTable
            title="Assets"
            description="Asset accounts, including cash, receivables, and any other debit-balance resources."
            rows={balanceSheet.assets}
            totalLabel="Total assets"
            totalAmount={balanceSheet.totalAssets}
          />
        </div>
        <div className="col-12 col-lg-6">
          <SectionTable
            title="Liabilities"
            description="Client obligations and other liabilities included in the selected reporting scope."
            rows={balanceSheet.liabilities}
            totalLabel="Total liabilities"
            totalAmount={balanceSheet.totalLiabilities}
          />
        </div>
      </div>

      <SectionTable
        title="Equity"
        description="Owner and retained earnings balances contributing to the equity position."
        rows={balanceSheet.equity}
        totalLabel="Total equity"
        totalAmount={balanceSheet.totalEquity}
      />

      <Card className="overflow-hidden p-0">
        <div className="card-header border-b border-slate-200 bg-slate-50/80 px-5 py-4">
          <div>
            <CardTitle>Control totals</CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              Final comparison of both sides of the statement.
            </p>
          </div>
        </div>
        <div className="card-body grid gap-3 p-5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-slate-500">Total assets</span>
            <span className="font-bold text-slate-900">
              {moneyPrecise(balanceSheet.totalAssets)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-slate-500">Total liabilities + equity</span>
            <span className="font-bold text-slate-900">
              {moneyPrecise(balanceSheet.totalLiabilitiesAndEquity)}
            </span>
          </div>
          <div className={`alert ${balanceSheet.isBalanced ? 'alert-success' : 'alert-danger'}`}>
            {balanceSheet.isBalanced
              ? 'The balance sheet balances for this reporting date.'
              : `Balance sheet variance: ${moneyPrecise(balanceSheet.difference)}.`}
          </div>
        </div>
      </Card>
    </div>
  );
}
