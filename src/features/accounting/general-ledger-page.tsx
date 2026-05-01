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
  buildGeneralLedgerData,
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
import type { GeneralLedgerRow } from '@/features/accounting/reporting';
import type { JournalEntry, LedgerAccount } from '@/types/api';

export function GeneralLedgerPage() {
  const [institutionFilter, setInstitutionFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [startDate, setStartDate] = useState(startOfMonthValue());
  const [endDate, setEndDate] = useState(todayValue());
  const [accountFilter, setAccountFilter] = useState('');

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

  const accounts = useMemo(() => accountsData ?? [], [accountsData]);
  const entries = useMemo(() => entriesData ?? [], [entriesData]);
  const selectableAccounts = useMemo(() => {
    return accounts.filter((account) => {
      if (resolvedInstitutionFilter === 'all') return true;
      return String(account.institution ?? '') === resolvedInstitutionFilter;
    });
  }, [accounts, resolvedInstitutionFilter]);

  const selectedAccount =
    selectableAccounts.find((account) => String(account.id) === accountFilter) ??
    selectableAccounts[0] ??
    null;

  const ledger = useMemo(
    () =>
      buildGeneralLedgerData(selectedAccount, entries, {
        institutionId:
          resolvedInstitutionFilter === 'all'
            ? undefined
            : resolvedInstitutionFilter,
        branchId: resolvedBranchFilter === 'all' ? undefined : resolvedBranchFilter,
        startDate,
        endDate,
      }),
    [
      endDate,
      entries,
      resolvedBranchFilter,
      resolvedInstitutionFilter,
      selectedAccount,
      startDate,
    ],
  );

  if (!canAccessAccountingReports(actorRole)) {
    return (
      <StateView
        title="General ledger is not available"
        description="Only admin, branch manager, and accounting roles can access the general ledger."
      />
    );
  }

  if (
    (institutionsLoading || branchesLoading || accountsLoading) &&
    !institutions.length &&
    !availableBranches.length &&
    !accounts.length
  ) {
    return <StateView title="Loading general ledger..." />;
  }

  if (
    (institutionsError && !institutions.length) ||
    (branchesError && !availableBranches.length) ||
    (accountsError && !accounts.length)
  ) {
    return (
      <StateView
        title="Could not load general ledger filters"
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

  if (entriesError && !entries.length) {
    return (
      <StateView
        title="Could not load general ledger entries"
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
          title="General ledger"
          description="Inspect posted journal activity for a selected ledger account with running balances, counterpart accounts, and branch-aware filtering."
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
            <CardTitle>Ledger filters</CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              Set the account and date range before reviewing branch or institution activity.
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
                    setAccountFilter('');
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

            <Field label="Ledger account">
              <select
                className="form-select"
                value={selectedAccount ? String(selectedAccount.id) : ''}
                onChange={(event) => setAccountFilter(event.target.value)}
              >
                {selectableAccounts.map((account) => (
                  <option key={account.id} value={String(account.id)}>
                    {account.code} - {account.name}
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
          </div>

          <div className="alert alert-info">
            Period: <strong>{formatDate(startDate)}</strong> to{' '}
            <strong>{formatDate(endDate)}</strong>. Selected account:{' '}
            <strong>
              {selectedAccount ? `${selectedAccount.code} - ${selectedAccount.name}` : 'None'}
            </strong>.
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Opening Balance */}
        <Card className="p-4 min-w-0">
          <p className="text-sm font-semibold text-slate-500">Opening balance</p>

          <div className="mt-3 flex items-end justify-between gap-2">
            <span className="text-xs font-bold text-slate-500">USh</span>
            <p className="max-w-[140px] break-words text-right text-lg font-black tabular-nums text-[#127D61]">
              {moneyPrecise(ledger.openingBalance).replace('USh', '').trim()}
            </p>
          </div>

          <p className="mt-2 text-sm text-slate-500">
            Balance before the selected period begins.
          </p>
        </Card>

        {/* Period Debits */}
        <Card className="p-4 min-w-0">
          <p className="text-sm font-semibold text-slate-500">Period debits</p>

          <div className="mt-3 flex items-end justify-between gap-2">
            <span className="text-xs font-bold text-slate-500">USh</span>
            <p className="max-w-[140px] break-words text-right text-lg font-black tabular-nums text-[#127D61]">
              {moneyPrecise(ledger.totalDebits).replace('USh', '').trim()}
            </p>
          </div>

          <p className="mt-2 text-sm text-slate-500">
            Debit movement for the reporting range.
          </p>
        </Card>

        {/* Period Credits */}
        <Card className="p-4 min-w-0">
          <p className="text-sm font-semibold text-slate-500">Period credits</p>

          <div className="mt-3 flex items-end justify-between gap-2">
            <span className="text-xs font-bold text-slate-500">USh</span>
            <p className="max-w-[140px] break-words text-right text-lg font-black tabular-nums text-[#127D61]">
              {moneyPrecise(ledger.totalCredits).replace('USh', '').trim()}
            </p>
          </div>

          <p className="mt-2 text-sm text-slate-500">
            Credit movement for the reporting range.
          </p>
        </Card>

        {/* Closing Balance */}
        <Card className="p-4 min-w-0">
          <p className="text-sm font-semibold text-slate-500">Closing balance</p>

          <div className="mt-3 flex items-end justify-between gap-2">
            <span className="text-xs font-bold text-slate-500">USh</span>
            <p className="max-w-[140px] break-words text-right text-lg font-black tabular-nums text-[#127D61]">
              {moneyPrecise(ledger.closingBalance).replace('USh', '').trim()}
            </p>
          </div>

          <p className="mt-2 text-sm text-slate-500">
            Running balance after all filtered entries.
          </p>
        </Card>
      </div>
      <Card className="overflow-hidden p-0">
        <div className="card-header border-b border-slate-200 bg-slate-50/80 px-5 py-4">
          <div>
            <CardTitle>Ledger detail</CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              Each row shows the selected account line, branch scope, and counterpart accounts from the same journal entry.
            </p>
          </div>
        </div>
        <div className="card-body grid gap-4 p-5">
          {entriesError && entries.length ? (
            <div className="alert alert-warning">
              The latest general ledger refresh failed, but the most recent results are still visible.
            </div>
          ) : null}

          <DataTable<GeneralLedgerRow>
            data={ledger.rows}
            loading={entriesLoading}
            emptyTitle="No ledger activity found"
            emptyMessage="No posted journal lines matched the selected account and date range."
            columns={[
              {
                header: 'Date',
                accessor: (row) => formatDate(row.date),
              },
              {
                header: 'Reference',
                accessor: (row) => (
                  <div>
                    <p className="font-bold text-slate-900">{row.reference}</p>
                    <p className="text-xs text-slate-500">{row.source}</p>
                  </div>
                ),
              },
              {
                header: 'Description',
                accessor: (row) => (
                  <div>
                    <p className="font-medium text-slate-900">{row.description}</p>
                    <p className="text-xs text-slate-500">{row.branchName}</p>
                  </div>
                ),
              },
              {
                header: 'Counterpart',
                accessor: (row) => row.counterpart,
              },
              {
                header: 'Debit',
                accessor: (row) => moneyPrecise(row.debit),
                align: 'right',
              },
              {
                header: 'Credit',
                accessor: (row) => moneyPrecise(row.credit),
                align: 'right',
              },
              {
                header: 'Running balance',
                accessor: (row) => moneyPrecise(row.runningBalance),
                align: 'right',
              },
            ]}
            tableFooter={
              <tfoot>
                <tr>
                  <td colSpan={4} className="font-bold text-slate-900">
                    Totals
                  </td>
                  <td className="text-right font-bold text-slate-900">
                    {moneyPrecise(ledger.totalDebits)}
                  </td>
                  <td className="text-right font-bold text-slate-900">
                    {moneyPrecise(ledger.totalCredits)}
                  </td>
                  <td className="text-right font-bold text-slate-900">
                    {moneyPrecise(ledger.closingBalance)}
                  </td>
                </tr>
              </tfoot>
            }
            renderMobileCard={(row) => (
              <article className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-bold text-slate-900">{row.reference}</p>
                    <p className="mt-1 text-sm text-slate-500">{formatDate(row.date)}</p>
                  </div>
                  <p className="text-sm font-bold text-slate-900">
                    {moneyPrecise(row.runningBalance)}
                  </p>
                </div>
                <div className="mt-4 grid gap-3 text-sm text-slate-600">
                  <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                      Description
                    </p>
                    <p className="mt-1 text-slate-800">{row.description}</p>
                    <p className="text-xs text-slate-500">{row.source}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                      Counterpart
                    </p>
                    <p className="mt-1 text-slate-800">{row.counterpart}</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                        Debit
                      </p>
                      <p className="mt-1 font-medium text-slate-800">
                        {moneyPrecise(row.debit)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                        Credit
                      </p>
                      <p className="mt-1 font-medium text-slate-800">
                        {moneyPrecise(row.credit)}
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            )}
          />
        </div>
      </Card>
    </div>
  );
}
