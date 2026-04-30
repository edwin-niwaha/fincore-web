'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Field, Input } from '@/components/ui/input';
import { StateView } from '@/components/ui/state-view';
import { formatDate, statusLabel } from '@/features/admin/shared';
import {
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
import type {
  LoanPortfolioReport,
  SavingsBalancesReport,
  TrialBalanceReport,
  TrialBalanceRow,
} from '@/types/api';

type SummarySnapshot = {
  trialBalance: TrialBalanceReport;
  savingsBalances: SavingsBalancesReport;
  loanPortfolio: LoanPortfolioReport;
};

function reportLinkDescription(path: string) {
  if (path.includes('trial-balance')) {
    return 'Review debits, credits, and balancing differences by ledger account.';
  }
  if (path.includes('general-ledger')) {
    return 'Drill into account activity with running balances and counterpart lines.';
  }
  if (path.includes('cashflow')) {
    return 'Track cash inflows, outflows, and branch-level movement for the period.';
  }
  if (path.includes('balance-sheet')) {
    return 'Review assets, liabilities, and equity with a balance check.';
  }
  return 'Open the report workspace.';
}

export function ReportsOverviewPage() {
  const [institutionFilter, setInstitutionFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [asOf, setAsOf] = useState(todayValue());

  const {
    actorRole,
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
    canChooseInstitution ? institutionFilter : institutions[0]?.id ? String(institutions[0].id) : institutionFilter;
  const resolvedBranchFilter =
    actorRole === 'branch_manager' && availableBranches[0]
      ? String(availableBranches[0].id)
      : branchFilter;

  const loadSummarySnapshot = useCallback(
    async () => {
      const query = {
        institution:
          resolvedInstitutionFilter === 'all'
            ? undefined
            : resolvedInstitutionFilter,
        branch: resolvedBranchFilter === 'all' ? undefined : resolvedBranchFilter,
        as_of: asOf || undefined,
      };

      const [trialBalance, savingsBalances, loanPortfolio] = await Promise.all([
        accountingApi.reports.trialBalance(query),
        accountingApi.reports.savingsBalances({
          institution:
            resolvedInstitutionFilter === 'all'
              ? undefined
              : resolvedInstitutionFilter,
          branch: resolvedBranchFilter === 'all' ? undefined : resolvedBranchFilter,
        }),
        accountingApi.reports.loanPortfolio({
          institution:
            resolvedInstitutionFilter === 'all'
              ? undefined
              : resolvedInstitutionFilter,
          branch: resolvedBranchFilter === 'all' ? undefined : resolvedBranchFilter,
        }),
      ]);

      return {
        trialBalance,
        savingsBalances,
        loanPortfolio,
      };
    },
    [asOf, resolvedBranchFilter, resolvedInstitutionFilter],
  );

  const { data, error, isLoading, reload } =
    useApiResource<SummarySnapshot>(loadSummarySnapshot);

  const balanceSheet = useMemo(
    () => buildBalanceSheetData(data?.trialBalance),
    [data?.trialBalance],
  );

  const topRows = useMemo(() => {
    return [...(data?.trialBalance.rows ?? [])]
      .sort((a, b) => Math.abs(Number(b.balance ?? 0)) - Math.abs(Number(a.balance ?? 0)))
      .slice(0, 6);
  }, [data?.trialBalance.rows]);

  const reportLinks = [
    '/reports/trial-balance',
    '/reports/general-ledger',
    '/reports/cashflow-statement',
    '/reports/balance-sheet',
  ];

  if (!canAccessAccountingReports(actorRole)) {
    return (
      <StateView
        title="Reports are not available"
        description="Only admin, branch manager, and accounting roles can access report workspaces."
      />
    );
  }

  if ((institutionsLoading || branchesLoading) && !institutions.length && !availableBranches.length) {
    return <StateView title="Loading report scope..." />;
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

  if (isLoading && !data) {
    return <StateView title="Loading summary report..." />;
  }

  if (error && !data) {
    return (
      <StateView
        title="Could not load summary report"
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
          title="Summary report"
          description="A SACCO-ready overview of the accounting position, savings exposure, and loan portfolio for the selected reporting scope."
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            className="btn-outline-secondary bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100 print-hidden"
            onClick={() => window.print()}
          >
            Print
          </Button>
        </div>
      </div>

      <Card className="grid gap-4">
        <div className="card-header rounded-t-2xl border-b border-slate-200 bg-slate-50/80 px-5 py-4">
          <div>
            <CardTitle>Reporting scope</CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              Adjust the institution, branch, and reporting date before opening the detailed reports below.
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
              <Input value={formatDate(data?.trialBalance.generated_at)} readOnly />
            </Field>
          </div>

          <div className="alert alert-info">
            Scope date: <strong>{formatDate(asOf)}</strong>. Balance status:{' '}
            <strong>{balanceSheet.isBalanced ? 'Balanced' : 'Needs review'}</strong>.
          </div>
        </div>
      </Card>

      <div className="row">
        <div className="col-12 col-md-6 col-xl-3">
          <Card className="relative overflow-hidden bg-white/98">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#127D61] via-emerald-400 to-transparent" />
            <p className="text-sm font-semibold text-slate-500">Total assets</p>
            <p className="mt-3 text-3xl font-black tracking-tight text-[#127D61]">
              {moneyPrecise(balanceSheet.totalAssets)}
            </p>
            <p className="mt-2 text-sm text-slate-500">From the live trial balance snapshot.</p>
          </Card>
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <Card className="relative overflow-hidden bg-white/98">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#127D61] via-emerald-400 to-transparent" />
            <p className="text-sm font-semibold text-slate-500">Savings liability</p>
            <p className="mt-3 text-3xl font-black tracking-tight text-[#127D61]">
              {moneyPrecise(data?.savingsBalances.total_balance)}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {data?.savingsBalances.accounts ?? 0} savings accounts in scope.
            </p>
          </Card>
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <Card className="relative overflow-hidden bg-white/98">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#127D61] via-emerald-400 to-transparent" />
            <p className="text-sm font-semibold text-slate-500">Loan portfolio</p>
            <p className="mt-3 text-3xl font-black tracking-tight text-[#127D61]">
              {moneyPrecise(data?.loanPortfolio.principal_outstanding)}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {data?.loanPortfolio.loans ?? 0} loans, {data?.loanPortfolio.pending ?? 0} pending.
            </p>
          </Card>
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <Card className="relative overflow-hidden bg-white/98">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#127D61] via-emerald-400 to-transparent" />
            <p className="text-sm font-semibold text-slate-500">Balance difference</p>
            <p
              className={`mt-3 text-3xl font-black tracking-tight ${
                balanceSheet.isBalanced ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {moneyPrecise(balanceSheet.difference)}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {balanceSheet.isBalanced
                ? 'Assets equal liabilities plus equity.'
                : 'Review detailed reports to resolve the variance.'}
            </p>
          </Card>
        </div>
      </div>

      <div className="row">
        <div className="col-12 col-lg-8">
          <Card className="overflow-hidden p-0">
            <div className="card-header border-b border-slate-200 bg-slate-50/80 px-5 py-4">
              <div>
                <CardTitle>Report shortcuts</CardTitle>
                <p className="mt-1 text-sm text-slate-500">
                  Open each accounting report with the same branch-aware scope.
                </p>
              </div>
            </div>
            <div className="card-body grid gap-4 p-5 md:grid-cols-2">
              {reportLinks.map((href) => (
                <Link href={href} key={href}>
                  <Card className="h-full transition hover:border-[#127D61] hover:bg-emerald-50/40">
                    <CardTitle>{statusLabel(href.split('/').at(-1)?.replaceAll('-', ' '))}</CardTitle>
                    <p className="mt-2 text-sm text-slate-600">
                      {reportLinkDescription(href)}
                    </p>
                  </Card>
                </Link>
              ))}
            </div>
          </Card>
        </div>

        <div className="col-12 col-lg-4">
          <Card className="overflow-hidden p-0">
            <div className="card-header border-b border-slate-200 bg-slate-50/80 px-5 py-4">
              <div>
                <CardTitle>Balance check</CardTitle>
                <p className="mt-1 text-sm text-slate-500">
                  Quick view of the accounting control totals as of {formatDate(asOf)}.
                </p>
              </div>
            </div>
            <div className="card-body grid gap-3 p-5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-500">Assets</span>
                <span className="font-bold text-slate-900">
                  {moneyPrecise(balanceSheet.totalAssets)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-500">Liabilities</span>
                <span className="font-bold text-slate-900">
                  {moneyPrecise(balanceSheet.totalLiabilities)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-500">Equity</span>
                <span className="font-bold text-slate-900">
                  {moneyPrecise(balanceSheet.totalEquity)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-500">Liabilities + equity</span>
                <span className="font-bold text-slate-900">
                  {moneyPrecise(balanceSheet.totalLiabilitiesAndEquity)}
                </span>
              </div>
              <div
                className={`alert ${
                  balanceSheet.isBalanced ? 'alert-success' : 'alert-danger'
                }`}
              >
                {balanceSheet.isBalanced
                  ? 'The balance sheet is in balance for this reporting date.'
                  : 'The balance sheet does not balance yet. Review detailed ledgers and postings.'}
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="card-header border-b border-slate-200 bg-slate-50/80 px-5 py-4">
          <div>
            <CardTitle>Top balances in scope</CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              Largest balances from the trial balance to help branch and finance teams spot concentration quickly.
            </p>
          </div>
        </div>
        <div className="card-body p-5">
          <DataTable<TrialBalanceRow>
            data={topRows}
            loading={isLoading}
            emptyTitle="No balances available"
            emptyMessage="No posted ledger activity matched the selected scope."
            columns={[
              {
                header: 'Account',
                accessor: (row) => (
                  <div>
                    <p className="font-bold text-slate-900">{row.name}</p>
                    <p className="text-xs text-slate-500">{row.code}</p>
                  </div>
                ),
              },
              {
                header: 'Type',
                accessor: (row) => statusLabel(row.type),
              },
              {
                header: 'Balance',
                accessor: (row) => moneyPrecise(row.balance),
                align: 'right',
              },
            ]}
            renderMobileCard={(row) => (
              <article className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-bold text-slate-900">{row.name}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {row.code} • {statusLabel(row.type)}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-slate-900">
                    {moneyPrecise(row.balance)}
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
