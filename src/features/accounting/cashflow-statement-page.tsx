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
  buildCashflowData,
  CashAccountBalance,
  CashflowGroupRow,
  startOfMonthValue,
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
import type { JournalEntry, LedgerAccount } from '@/types/api';

function TotalsFooter({
  label,
  amount,
}: {
  label: string;
  amount: number;
}) {
  return (
    <tfoot>
      <tr>
        <td className="font-bold text-slate-900">{label}</td>
        <td className="text-right font-bold text-slate-900">
          {moneyPrecise(amount)}
        </td>
      </tr>
    </tfoot>
  );
}

export function CashflowStatementPage() {
  const [institutionFilter, setInstitutionFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [startDate, setStartDate] = useState(startOfMonthValue());
  const [endDate, setEndDate] = useState(todayValue());

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

  const loadAccounts = useCallback(
    () =>
      accountingApi.accounts.listAll({
        institution:
          resolvedInstitutionFilter === 'all'
            ? undefined
            : resolvedInstitutionFilter,
        is_active: true,
      }),
    [resolvedInstitutionFilter],
  );

  const loadEntries = useCallback(
    () =>
      accountingApi.journalEntries.listAll({
        institution:
          resolvedInstitutionFilter === 'all'
            ? undefined
            : resolvedInstitutionFilter,
        branch: resolvedBranchFilter === 'all' ? undefined : resolvedBranchFilter,
        status: 'posted',
        ordering: 'entry_date',
      }),
    [resolvedBranchFilter, resolvedInstitutionFilter],
  );

  const {
    data: accountsData,
    error: accountsError,
    isLoading: accountsLoading,
    reload: reloadAccounts,
  } = useApiResource<LedgerAccount[]>(loadAccounts);
  const {
    data: entriesData,
    error: entriesError,
    isLoading: entriesLoading,
    reload: reloadEntries,
  } = useApiResource<JournalEntry[]>(loadEntries);

  const cashflow = useMemo(
    () =>
      buildCashflowData(accountsData ?? [], entriesData ?? [], {
        institutionId:
          resolvedInstitutionFilter === 'all'
            ? undefined
            : resolvedInstitutionFilter,
        branchId: resolvedBranchFilter === 'all' ? undefined : resolvedBranchFilter,
        startDate,
        endDate,
      }),
    [
      accountsData,
      endDate,
      entriesData,
      resolvedBranchFilter,
      resolvedInstitutionFilter,
      startDate,
    ],
  );

  if (!canAccessAccountingReports(actorRole)) {
    return (
      <StateView
        title="Cashflow statement is not available"
        description="Only admin, branch manager, and accounting roles can access the cashflow statement."
      />
    );
  }

  if (
    (institutionsLoading || branchesLoading || accountsLoading) &&
    !institutions.length &&
    !availableBranches.length &&
    !(accountsData ?? []).length
  ) {
    return <StateView title="Loading cashflow statement..." />;
  }

  if (
    (institutionsError && !institutions.length) ||
    (branchesError && !availableBranches.length) ||
    (accountsError && !(accountsData ?? []).length)
  ) {
    return (
      <StateView
        title="Could not load cashflow filters"
        description={institutionsError || branchesError || accountsError || undefined}
        actionLabel="Retry"
        onAction={() => {
          void reloadInstitutions();
          void reloadBranches();
          void reloadAccounts();
        }}
      />
    );
  }

  if (entriesError && !(entriesData ?? []).length) {
    return (
      <StateView
        title="Could not load cashflow entries"
        description={entriesError}
        actionLabel="Retry"
        onAction={reloadEntries}
      />
    );
  }

  return (
    <div className="container-fluid grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Cashflow statement"
          description="Track opening cash, inflows, outflows, and closing cash position from posted journal activity within the selected branch or institution scope."
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
              Choose the reporting period and organization scope for the cashflow statement.
            </p>
          </div>
        </div>
        <div className="card-body grid gap-4 p-5">
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

            <Field label="Start date">
              <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </Field>

            <Field label="End date">
              <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            </Field>

            <Field label="Generated">
              <Input value={formatDate(new Date().toISOString())} readOnly />
            </Field>
          </div>

          <div className="alert alert-info">
            Period: <strong>{formatDate(startDate)}</strong> to{' '}
            <strong>{formatDate(endDate)}</strong>. Cash accounts found:{' '}
            <strong>{cashflow.cashAccounts.length}</strong>.
          </div>
        </div>
      </Card>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="min-w-0 p-4">
        <p className="text-sm font-semibold text-slate-500">Opening cash</p>
        <div className="mt-3 flex items-end justify-between gap-2">
          <span className="text-xs font-bold text-slate-500">USh</span>
          <p className="max-w-[140px] break-words text-right text-lg font-black tabular-nums text-[#127D61]">
            {moneyPrecise(cashflow.openingBalance).replace('USh', '').trim()}
          </p>
        </div>
        <p className="mt-2 text-sm text-slate-500">Cash and bank balance before the period.</p>
      </Card>

      <Card className="min-w-0 p-4">
        <p className="text-sm font-semibold text-slate-500">Cash inflows</p>
        <div className="mt-3 flex items-end justify-between gap-2">
          <span className="text-xs font-bold text-slate-500">USh</span>
          <p className="max-w-[140px] break-words text-right text-lg font-black tabular-nums text-[#127D61]">
            {moneyPrecise(cashflow.totalInflows).replace('USh', '').trim()}
          </p>
        </div>
        <p className="mt-2 text-sm text-slate-500">Deposits, repayments, and other receipts.</p>
      </Card>

      <Card className="min-w-0 p-4">
        <p className="text-sm font-semibold text-slate-500">Cash outflows</p>
        <div className="mt-3 flex items-end justify-between gap-2">
          <span className="text-xs font-bold text-slate-500">USh</span>
          <p className="max-w-[140px] break-words text-right text-lg font-black tabular-nums text-[#127D61]">
            {moneyPrecise(cashflow.totalOutflows).replace('USh', '').trim()}
          </p>
        </div>
        <p className="mt-2 text-sm text-slate-500">Withdrawals, disbursements, and other payouts.</p>
      </Card>

      <Card className="min-w-0 p-4">
        <p className="text-sm font-semibold text-slate-500">Closing cash</p>
        <div className="mt-3 flex items-end justify-between gap-2">
          <span className="text-xs font-bold text-slate-500">USh</span>
          <p className="max-w-[140px] break-words text-right text-lg font-black tabular-nums text-[#127D61]">
            {moneyPrecise(cashflow.closingBalance).replace('USh', '').trim()}
          </p>
        </div>
        <p className="mt-2 text-sm text-slate-500">
          Net cashflow{' '}
          <span className="font-bold tabular-nums">
            {moneyPrecise(cashflow.netCashflow)}
          </span>{' '}
          for the selected period.
        </p>
      </Card>
    </div>

      {cashflow.cashAccounts.length ? (
        <Card className="overflow-hidden p-0">
          <div className="card-header border-b border-slate-200 bg-slate-50/80 px-5 py-4">
            <div>
              <CardTitle>Cash and bank balances</CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                Opening and closing balance per cash account identified from the chart of accounts.
              </p>
            </div>
          </div>
          <div className="card-body p-5">
            <DataTable<CashAccountBalance>
              data={cashflow.cashAccounts}
              emptyTitle="No cash accounts found"
              emptyMessage="No active cash or bank ledger accounts were identified in this scope."
              columns={[
                {
                  header: 'Account',
                  accessor: (row) => row.label,
                },
                {
                  header: 'Opening',
                  accessor: (row) => moneyPrecise(row.openingBalance),
                  align: 'right',
                },
                {
                  header: 'Closing',
                  accessor: (row) => moneyPrecise(row.closingBalance),
                  align: 'right',
                },
              ]}
            />
          </div>
        </Card>
      ) : (
        <div className="alert alert-warning">
          No cash or bank accounts were detected from the current chart of accounts, so the cashflow statement may be incomplete.
        </div>
      )}

      <div className="row">
        <div className="col-12 col-lg-6">
          <Card className="overflow-hidden p-0">
            <div className="card-header border-b border-slate-200 bg-slate-50/80 px-5 py-4">
              <div>
                <CardTitle>Cash inflows</CardTitle>
                <p className="mt-1 text-sm text-slate-500">
                  Receipts grouped by counterpart ledger account or category.
                </p>
              </div>
            </div>
            <div className="card-body p-5">
              <DataTable<CashflowGroupRow>
                data={cashflow.inflows}
                loading={entriesLoading}
                emptyTitle="No inflows found"
                emptyMessage="No cash receipts were posted during the selected period."
                columns={[
                  {
                    header: 'Category',
                    accessor: (row) => row.label,
                  },
                  {
                    header: 'Amount',
                    accessor: (row) => moneyPrecise(row.amount),
                    align: 'right',
                  },
                ]}
                tableFooter={<TotalsFooter label="Total inflows" amount={cashflow.totalInflows} />}
              />
            </div>
          </Card>
        </div>

        <div className="col-12 col-lg-6">
          <Card className="overflow-hidden p-0">
            <div className="card-header border-b border-slate-200 bg-slate-50/80 px-5 py-4">
              <div>
                <CardTitle>Cash outflows</CardTitle>
                <p className="mt-1 text-sm text-slate-500">
                  Payouts grouped by counterpart ledger account or category.
                </p>
              </div>
            </div>
            <div className="card-body p-5">
              <DataTable<CashflowGroupRow>
                data={cashflow.outflows}
                loading={entriesLoading}
                emptyTitle="No outflows found"
                emptyMessage="No cash payments were posted during the selected period."
                columns={[
                  {
                    header: 'Category',
                    accessor: (row) => row.label,
                  },
                  {
                    header: 'Amount',
                    accessor: (row) => moneyPrecise(row.amount),
                    align: 'right',
                  },
                ]}
                tableFooter={<TotalsFooter label="Total outflows" amount={cashflow.totalOutflows} />}
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
