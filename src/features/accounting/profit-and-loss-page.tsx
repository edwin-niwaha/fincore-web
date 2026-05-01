'use client';

import { useCallback, useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Field, Input } from '@/components/ui/input';
import { StateView } from '@/components/ui/state-view';
import { formatDate, statusLabel } from '@/features/admin/shared';
import {
  branchInstitutionId,
  canAccessAccountingReports,
  useReportScope,
} from '@/features/accounting/use-report-scope';
import { useApiResource } from '@/hooks/use-api-resource';
import { moneyPrecise } from '@/lib/api/format';
import { accountingApi } from '@/lib/api/services';
import type { TrialBalanceReport, TrialBalanceRow } from '@/types/api';

type ProfitLossRow = {
  id: string;
  code: string;
  name: string;
  type: string;
  amount: number;
};

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

function monthStartValue() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
}

function toAmount(value?: string | number | null) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function amountWithoutCurrency(value: string) {
  return value.replace('USh', '').trim();
}

function isIncomeRow(row: TrialBalanceRow) {
  const type = String(row.type ?? '').toLowerCase();
  return type === 'income' || type === 'revenue';
}

function isExpenseRow(row: TrialBalanceRow) {
  const type = String(row.type ?? '').toLowerCase();
  return type === 'expense' || type === 'expenses';
}

function profitLossRow(row: TrialBalanceRow): ProfitLossRow {
  return {
    id: String(row.id ?? row.account ?? row.code),
    code: row.code,
    name: row.name,
    type: row.type,
    amount: Math.abs(toAmount(row.balance)),
  };
}

export function ProfitAndLossPage() {
  const [institutionFilter, setInstitutionFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState(monthStartValue());
  const [dateTo, setDateTo] = useState(todayValue());

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

  const loadProfitAndLoss = useCallback(
    () =>
      accountingApi.reports.trialBalance({
        institution:
          resolvedInstitutionFilter === 'all'
            ? undefined
            : resolvedInstitutionFilter,
        branch: resolvedBranchFilter === 'all' ? undefined : resolvedBranchFilter,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        as_of: dateTo || undefined,
      }),
    [dateFrom, dateTo, resolvedBranchFilter, resolvedInstitutionFilter],
  );

  const { data, error, isLoading, reload } =
    useApiResource<TrialBalanceReport>(loadProfitAndLoss);

  const incomeRows = useMemo<ProfitLossRow[]>(
    () => (data?.rows ?? []).filter(isIncomeRow).map(profitLossRow),
    [data?.rows],
  );

  const expenseRows = useMemo<ProfitLossRow[]>(
    () => (data?.rows ?? []).filter(isExpenseRow).map(profitLossRow),
    [data?.rows],
  );

  const totalIncome = incomeRows.reduce((sum, row) => sum + row.amount, 0);
  const totalExpenses = expenseRows.reduce((sum, row) => sum + row.amount, 0);
  const netResult = totalIncome - totalExpenses;

  const summaryCards = [
    {
      label: 'Total income',
      value: moneyPrecise(totalIncome),
      note: `${incomeRows.length} income accounts in scope.`,
      tone: 'text-[#127D61]',
    },
    {
      label: 'Total expenses',
      value: moneyPrecise(totalExpenses),
      note: `${expenseRows.length} expense accounts in scope.`,
      tone: 'text-amber-700',
    },
    {
      label: netResult >= 0 ? 'Net surplus' : 'Net deficit',
      value: moneyPrecise(Math.abs(netResult)),
      note:
        netResult >= 0
          ? 'Income is greater than expenses.'
          : 'Expenses are greater than income.',
      tone: netResult >= 0 ? 'text-emerald-700' : 'text-rose-700',
    },
  ];

  if (!canAccessAccountingReports(actorRole)) {
    return (
      <StateView
        title="Profit and loss report is not available"
        description="Only admin, branch manager, and accounting roles can access accounting reports."
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
    return <StateView title="Loading profit and loss report..." />;
  }

  if (error && !data) {
    return (
      <StateView
        title="Could not load profit and loss report"
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
          title="Profit and loss report"
          description="Review income, expenses, and net surplus or deficit for the selected reporting period."
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
          <CardTitle>Report filters</CardTitle>
          <p className="mt-1 text-sm text-slate-500">
            Choose the institution, branch, and reporting period.
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

            <Field label="From">
              <Input
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
              />
            </Field>

            <Field label="To">
              <Input
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
              />
            </Field>
          </div>

          <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-800">
            Period: <strong>{formatDate(dateFrom)}</strong> to{' '}
            <strong>{formatDate(dateTo)}</strong>. Generated:{' '}
            <strong>{formatDate(data?.generated_at)}</strong>.
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
                {amountWithoutCurrency(item.value)}
              </p>
            </div>

            <p className="text-sm leading-snug text-slate-500">{item.note}</p>
          </Card>
        ))}
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-2">
        <Card className="min-w-0 overflow-hidden p-0">
          <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-4 sm:px-5">
            <CardTitle>Income</CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              Revenue and income accounts for the selected period.
            </p>
          </div>

          <div className="min-w-0 overflow-x-auto p-4 sm:p-5">
            <DataTable<ProfitLossRow>
              data={incomeRows}
              loading={isLoading}
              emptyTitle="No income available"
              emptyMessage="No income balances matched the selected scope."
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
                  header: 'Amount',
                  accessor: (row) => moneyPrecise(row.amount),
                  align: 'right',
                },
              ]}
              tableFooter={
                <tfoot className="border-t border-slate-200 bg-slate-50 text-sm font-black text-slate-900">
                  <tr>
                    <td className="px-4 py-3" colSpan={2}>
                      Total income
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {moneyPrecise(totalIncome)}
                    </td>
                  </tr>
                </tfoot>
              }
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
                      {moneyPrecise(row.amount)}
                    </p>
                  </div>
                </article>
              )}
            />
          </div>
        </Card>

        <Card className="min-w-0 overflow-hidden p-0">
          <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-4 sm:px-5">
            <CardTitle>Expenses</CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              Expense accounts for the selected period.
            </p>
          </div>

          <div className="min-w-0 overflow-x-auto p-4 sm:p-5">
            <DataTable<ProfitLossRow>
              data={expenseRows}
              loading={isLoading}
              emptyTitle="No expenses available"
              emptyMessage="No expense balances matched the selected scope."
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
                  header: 'Amount',
                  accessor: (row) => moneyPrecise(row.amount),
                  align: 'right',
                },
              ]}
              tableFooter={
                <tfoot className="border-t border-slate-200 bg-slate-50 text-sm font-black text-slate-900">
                  <tr>
                    <td className="px-4 py-3" colSpan={2}>
                      Total expenses
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {moneyPrecise(totalExpenses)}
                    </td>
                  </tr>
                </tfoot>
              }
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
                      {moneyPrecise(row.amount)}
                    </p>
                  </div>
                </article>
              )}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
