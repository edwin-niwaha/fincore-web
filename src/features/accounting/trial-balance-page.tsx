'use client';

import { useCallback, useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import type { Column } from '@/components/ui/data-table';
import { DataTable } from '@/components/ui/data-table';
import { Field, Input } from '@/components/ui/input';
import { StateView } from '@/components/ui/state-view';
import { formSelectClassName, formatDate, statusLabel } from '@/features/admin/shared';
import { normalBalanceLabel } from '@/features/accounting/shared';
import { useAuth } from '@/features/auth/auth-provider';
import { useApiResource } from '@/hooks/use-api-resource';
import { moneyPrecise, unwrapList } from '@/lib/api/format';
import { accountingApi, adminApi } from '@/lib/api/services';
import type { Branch, Institution, TrialBalanceReport, TrialBalanceRow } from '@/types/api';

function institutionPlaceholder(user: {
  institution?: string | number | null;
  institution_name?: string | null;
  institution_code?: string | null;
}) {
  if (!user.institution) return [];

  return [
    {
      id: user.institution,
      name: user.institution_name || 'Assigned institution',
      code: user.institution_code || '',
      status: 'active',
    },
  ] as Institution[];
}

function branchPlaceholder(user: {
  branch?: string | number | null;
  branch_name?: string | null;
  branch_code?: string | null;
  institution?: string | number | null;
  institution_name?: string | null;
  institution_code?: string | null;
}) {
  if (!user.branch) return [];

  return [
    {
      id: user.branch,
      institution: user.institution ?? undefined,
      institution_name: user.institution_name ?? undefined,
      institution_code: user.institution_code ?? undefined,
      name: user.branch_name || 'Assigned branch',
      code: user.branch_code || '',
      status: 'active',
    },
  ] as Branch[];
}

function branchInstitutionId(branch: Branch) {
  if (typeof branch.institution === 'object') {
    return branch.institution?.id ? String(branch.institution.id) : '';
  }
  return branch.institution ? String(branch.institution) : '';
}

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

export function TrialBalancePage() {
  const { user } = useAuth();
  const actorRole = user?.role ?? null;
  const fixedInstitutionId = user?.institution ? String(user.institution) : '';
  const fixedBranchId = user?.branch ? String(user.branch) : '';
  const canChooseInstitution = actorRole === 'super_admin';

  const [institutionFilter, setInstitutionFilter] = useState(
    canChooseInstitution ? 'all' : fixedInstitutionId || 'all',
  );
  const [branchFilter, setBranchFilter] = useState(fixedBranchId || 'all');
  const [asOf, setAsOf] = useState(todayValue());

  const loadInstitutions = useCallback(() => {
    if (actorRole === 'super_admin' || actorRole === 'institution_admin') {
      return adminApi.institutions.list({ status: 'active' });
    }
    return Promise.resolve([] as Institution[]);
  }, [actorRole]);

  const loadBranches = useCallback(() => {
    if (actorRole === 'super_admin' || actorRole === 'institution_admin') {
      return adminApi.branches.list({
        status: 'active',
        institution:
          actorRole === 'institution_admin' ? fixedInstitutionId : undefined,
      });
    }
    return Promise.resolve([] as Branch[]);
  }, [actorRole, fixedInstitutionId]);

  const loadTrialBalance = useCallback(
    () =>
      accountingApi.trialBalance({
        institution: institutionFilter === 'all' ? undefined : institutionFilter,
        branch: branchFilter === 'all' ? undefined : branchFilter,
        as_of: asOf || undefined,
      }),
    [asOf, branchFilter, institutionFilter],
  );

  const {
    data: institutionsData,
    error: institutionsError,
    isLoading: institutionsLoading,
    reload: reloadInstitutions,
  } = useApiResource(loadInstitutions);
  const {
    data: branchesData,
    error: branchesError,
    isLoading: branchesLoading,
    reload: reloadBranches,
  } = useApiResource(loadBranches);
  const { data, error, isLoading, reload } =
    useApiResource<TrialBalanceReport>(loadTrialBalance);

  const loadedInstitutions = unwrapList(institutionsData);
  const loadedBranches = unwrapList(branchesData);
  const institutions =
    actorRole === 'super_admin' || actorRole === 'institution_admin'
      ? loadedInstitutions
      : institutionPlaceholder({
          institution: user?.institution,
          institution_name: user?.institution_name,
          institution_code: user?.institution_code,
        });
  const branches =
    actorRole === 'super_admin' || actorRole === 'institution_admin'
      ? loadedBranches
      : branchPlaceholder({
          branch: user?.branch,
          branch_name: user?.branch_name,
          branch_code: user?.branch_code,
          institution: user?.institution,
          institution_name: user?.institution_name,
          institution_code: user?.institution_code,
        });

  const rows = data?.rows ?? [];
  const availableBranches = branches.filter((branch) => {
    const selectedInstitution =
      institutionFilter === 'all' ? fixedInstitutionId : institutionFilter;
    if (!selectedInstitution) return true;
    return branchInstitutionId(branch) === selectedInstitution;
  });

  const columns: Column<TrialBalanceRow>[] = useMemo(
    () => [
      {
        header: 'Account',
        accessor: (row) => (
          <div>
            <p className="font-bold text-slate-900">{row.name}</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {row.code}
            </p>
          </div>
        ),
      },
      {
        header: 'Type',
        accessor: (row) => (
          <div>
            <p>{statusLabel(row.type)}</p>
            <p className="text-xs text-slate-500">
              Normal {normalBalanceLabel(row.normal_balance)}
            </p>
          </div>
        ),
      },
      {
        header: 'Debit',
        accessor: (row) => moneyPrecise(row.total_debit),
      },
      {
        header: 'Credit',
        accessor: (row) => moneyPrecise(row.total_credit),
      },
      {
        header: 'Balance',
        accessor: (row) => (
          <span
            className={
              Number(row.balance ?? 0) === 0
                ? 'font-semibold text-slate-500'
                : 'font-bold text-slate-900'
            }
          >
            {moneyPrecise(row.balance)}
          </span>
        ),
      },
    ],
    [],
  );

  if (!actorRole || actorRole === 'client' || actorRole === 'teller' || actorRole === 'loan_officer') {
    return (
      <StateView
        title="Trial balance is not available"
        description="Only accounting and admin roles can access the general ledger report."
      />
    );
  }

  if (isLoading && !data) {
    return <StateView title="Loading trial balance..." />;
  }

  if (
    (institutionsLoading || branchesLoading) &&
    (!institutionsData || !branchesData)
  ) {
    return <StateView title="Loading report filters..." />;
  }

  if (error && !data) {
    return (
      <StateView
        title="Could not load trial balance"
        description={error}
        actionLabel="Retry"
        onAction={reload}
      />
    );
  }

  if ((institutionsError && !institutionsData) || (branchesError && !branchesData)) {
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

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Trial balance"
          description="Review posted debits and credits by ledger account as of a chosen reporting date."
        />
        <Button
          type="button"
          className="btn-outline-secondary bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100 print-hidden"
          onClick={() => window.print()}
        >
          Print
        </Button>
      </div>

      <Card className="grid gap-4">
        <CardTitle>Report filters</CardTitle>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {canChooseInstitution ? (
            <Field label="Institution">
              <select
                className={formSelectClassName}
                value={institutionFilter}
                onChange={(event) => setInstitutionFilter(event.target.value)}
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
              className={formSelectClassName}
              value={branchFilter}
              onChange={(event) => setBranchFilter(event.target.value)}
            >
              <option value="all">All branches</option>
              {availableBranches.map((branch) => (
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
            <Input
              value={formatDate(data?.generated_at)}
              readOnly
            />
          </Field>
        </div>

        <div
          className={`alert ${Number(data?.totals?.difference ?? 0) === 0 ? 'alert-success' : 'alert-danger'}`}
        >
          Report date: <strong>{formatDate(asOf)}</strong>. Difference:{' '}
          <strong>{moneyPrecise(data?.totals?.difference)}</strong>.
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-sm font-semibold text-slate-500">Accounts</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{rows.length}</p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-slate-500">Total debits</p>
          <p className="mt-2 text-3xl font-black text-slate-950">
            {moneyPrecise(data?.totals?.debit)}
          </p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-slate-500">Total credits</p>
          <p className="mt-2 text-3xl font-black text-slate-950">
            {moneyPrecise(data?.totals?.credit)}
          </p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-slate-500">Difference</p>
          <p
            className={`mt-2 text-3xl font-black ${Number(data?.totals?.difference ?? 0) === 0 ? 'text-emerald-700' : 'text-rose-700'}`}
          >
            {moneyPrecise(data?.totals?.difference)}
          </p>
        </Card>
      </div>

      <Card className="grid gap-4">
        <CardTitle>Trial balance rows</CardTitle>
        <DataTable<TrialBalanceRow>
          data={rows}
          columns={columns}
          emptyMessage="No posted journal activity matched this reporting scope."
          tableFooter={
            <tfoot>
              <tr>
                <td colSpan={2} className="font-bold text-slate-900">
                  Totals
                </td>
                <td className="text-right font-bold text-slate-900">
                  {moneyPrecise(data?.totals?.debit)}
                </td>
                <td className="text-right font-bold text-slate-900">
                  {moneyPrecise(data?.totals?.credit)}
                </td>
                <td className="text-right font-bold text-slate-900">
                  {moneyPrecise(data?.totals?.difference)}
                </td>
              </tr>
            </tfoot>
          }
        />
      </Card>
    </div>
  );
}
