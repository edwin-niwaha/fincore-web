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

  if (path.includes('profit-and-loss')) {
    return 'Review income, expenses, and net surplus or deficit for the selected period.';
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

  const resolvedInstitutionFilter = canChooseInstitution
    ? institutionFilter
    : institutions[0]?.id
      ? String(institutions[0].id)
      : institutionFilter;

  const resolvedBranchFilter =
    actorRole === 'branch_manager' && availableBranches[0]
      ? String(availableBranches[0].id)
      : branchFilter;

  const loadSummarySnapshot = useCallback(async () => {
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
  }, [asOf, resolvedBranchFilter, resolvedInstitutionFilter]);

  const { data, error, isLoading, reload } =
    useApiResource<SummarySnapshot>(loadSummarySnapshot);

  const balanceSheet = useMemo(
    () => buildBalanceSheetData(data?.trialBalance),
    [data?.trialBalance],
  );

  const topRows = useMemo(() => {
    return [...(data?.trialBalance.rows ?? [])]
      .sort(
        (a, b) =>
          Math.abs(Number(b.balance ?? 0)) - Math.abs(Number(a.balance ?? 0)),
      )
      .slice(0, 6);
  }, [data?.trialBalance.rows]);

  const reportLinks = [
    '/reports/trial-balance',
    '/reports/general-ledger',
    '/reports/cashflow-statement',
    '/reports/balance-sheet',
    '/reports/profit-and-loss',
  ];

  const summaryCards = [
    {
      label: 'Total assets',
      value: moneyPrecise(balanceSheet.totalAssets),
      note: 'From the live trial balance snapshot.',
      tone: 'text-[#127D61]',
    },
    {
      label: 'Savings liability',
      value: moneyPrecise(data?.savingsBalances.total_balance),
      note: `${data?.savingsBalances.accounts ?? 0} savings accounts in scope.`,
      tone: 'text-[#127D61]',
    },
    {
      label: 'Loan portfolio',
      value: moneyPrecise(data?.loanPortfolio.principal_outstanding),
      note: `${data?.loanPortfolio.loans ?? 0} loans, ${
        data?.loanPortfolio.pending ?? 0
      } pending.`,
      tone: 'text-[#127D61]',
    },
    {
      label: 'Balance difference',
      value: moneyPrecise(balanceSheet.difference),
      note: balanceSheet.isBalanced
        ? 'Assets equal liabilities plus equity.'
        : 'Review detailed reports to resolve the variance.',
      tone: balanceSheet.isBalanced ? 'text-emerald-700' : 'text-rose-700',
    },
  ];

  if (!canAccessAccountingReports(actorRole)) {
    return (
      <StateView
        title="Reports are not available"
        description="Only admin, branch manager, and accounting roles can access report workspaces."
      />
    );
  }

  if (
    (institutionsLoading || branchesLoading) &&
    !institutions.length &&
    !availableBranches.length
  ) {
    return <StateView title="Loading report scope..." />;
  }

  if (
    (institutionsError && !institutions.length) ||
    (branchesError && !availableBranches.length)
  ) {
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
    <div className="mx-auto grid w-full max-w-[1600px] gap-5 px-2 sm:px-4 lg:px-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <PageHeader
          title="Summary report"
          description="A SACCO-ready overview of the accounting position, savings exposure, and loan portfolio for the selected reporting scope."
        />

        <Button
          type="button"
          className="btn-outline-secondary w-full bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100 lg:w-auto print-hidden"
          onClick={() => window.print()}
        >
          Print
        </Button>
      </div>

      <Card className="grid min-w-0 gap-4 overflow-hidden p-0">
        <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-4 sm:px-5">
          <CardTitle>Reporting scope</CardTitle>
          <p className="mt-1 text-sm text-slate-500">
            Adjust the institution, branch, and reporting date before opening
            the detailed reports below.
          </p>
        </div>

        <div className="grid gap-4 p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
              <Input
                type="date"
                value={asOf}
                onChange={(event) => setAsOf(event.target.value)}
              />
            </Field>

            <Field label="Generated">
              <Input value={formatDate(data?.trialBalance.generated_at)} readOnly />
            </Field>
          </div>

          <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-800">
            Scope date: <strong>{formatDate(asOf)}</strong>. Balance status:{' '}
            <strong>{balanceSheet.isBalanced ? 'Balanced' : 'Needs review'}</strong>.
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((item) => (
          <Card
            key={item.label}
            className="relative grid min-w-0 max-w-full gap-2 overflow-hidden bg-white/98 p-4"
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#127D61] via-emerald-400 to-transparent" />

            <p className="truncate text-sm font-semibold text-slate-500">
              {item.label}
            </p>

            <div className={`min-w-0 max-w-full ${item.tone}`}>
              <p className="text-xs font-black uppercase tracking-wide">USh</p>
              <p className="min-w-0 max-w-full overflow-hidden break-all text-[clamp(1rem,1.5vw,1.35rem)] font-black leading-tight tabular-nums">
                {item.value.replace('USh', '').trim()}
              </p>
            </div>

            <p className="text-sm leading-snug text-slate-500">
              {item.note}
            </p>
          </Card>
        ))}
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="min-w-0 overflow-hidden p-0">
          <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-4 sm:px-5">
            <CardTitle>Report shortcuts</CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              Open each accounting report with the same branch-aware scope.
            </p>
          </div>

          <div className="grid gap-4 p-4 sm:p-5 md:grid-cols-2">
            {reportLinks.map((href) => (
              <Link href={href} key={href} className="block min-w-0">
                <Card className="h-full min-w-0 transition hover:border-[#127D61] hover:bg-emerald-50/40">
                  <CardTitle className="break-words">
                    {statusLabel(href.split('/').at(-1)?.replaceAll('-', ' '))}
                  </CardTitle>
                  <p className="mt-2 text-sm text-slate-600">
                    {reportLinkDescription(href)}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="min-w-0 overflow-hidden p-0">
          <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-4 sm:px-5">
            <CardTitle>Balance check</CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              Quick view of the accounting control totals as of {formatDate(asOf)}.
            </p>
          </div>

          <div className="grid gap-3 p-4 sm:p-5">
            {[
              ['Assets', balanceSheet.totalAssets],
              ['Liabilities', balanceSheet.totalLiabilities],
              ['Equity', balanceSheet.totalEquity],
              ['Liabilities + equity', balanceSheet.totalLiabilitiesAndEquity],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="grid grid-cols-[1fr_auto] items-center gap-3 text-sm"
              >
                <span className="min-w-0 font-semibold text-slate-500">
                  {label}
                </span>
                <span className="max-w-[150px] break-words text-right font-bold text-slate-900 tabular-nums">
                  {moneyPrecise(value)}
                </span>
              </div>
            ))}

            <div
              className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
                balanceSheet.isBalanced
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-rose-50 text-rose-700'
              }`}
            >
              {balanceSheet.isBalanced
                ? 'The balance sheet is in balance for this reporting date.'
                : 'The balance sheet does not balance yet. Review detailed ledgers and postings.'}
            </div>
          </div>
        </Card>
      </div>

      <Card className="min-w-0 overflow-hidden p-0">
        <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-4 sm:px-5">
          <CardTitle>Top balances in scope</CardTitle>
          <p className="mt-1 text-sm text-slate-500">
            Largest balances from the trial balance to help branch and finance
            teams spot concentration quickly.
          </p>
        </div>

        <div className="min-w-0 overflow-x-auto p-4 sm:p-5">
          <DataTable<TrialBalanceRow>
            data={topRows}
            loading={isLoading}
            emptyTitle="No balances available"
            emptyMessage="No posted ledger activity matched the selected scope."
            columns={[
              {
                header: 'Account',
                accessor: (row) => (
                  <div className="min-w-[180px]">
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
                  <div className="min-w-0">
                    <p className="break-words text-base font-bold text-slate-900">
                      {row.name}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {row.code} • {statusLabel(row.type)}
                    </p>
                  </div>
                  <p className="max-w-[140px] break-words text-right text-sm font-bold text-slate-900 tabular-nums">
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