'use client';

import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import type { Column } from '@/components/ui/data-table';
import { DataTable } from '@/components/ui/data-table';
import { Field, Input } from '@/components/ui/input';
import { StateView } from '@/components/ui/state-view';
import {
  formSelectClassName,
  formatDate,
  statusPillClassName,
} from '@/features/admin/shared';
import {
  balanceBadgeClassName,
  journalSourceOptions,
  journalStatusOptions,
  sourceLabel,
} from '@/features/accounting/shared';
import { useAuth } from '@/features/auth/auth-provider';
import { useApiResource } from '@/hooks/use-api-resource';
import { moneyPrecise, unwrapList } from '@/lib/api/format';
import { accountingApi, adminApi } from '@/lib/api/services';
import type {
  ApiProblem,
  Branch,
  Institution,
  JournalEntry,
  JournalEntryLine,
  LedgerAccount,
} from '@/types/api';

type JournalLineForm = {
  account: string;
  description: string;
  debit: string;
  credit: string;
};

type JournalFormState = {
  institution: string;
  branch: string;
  reference: string;
  description: string;
  entry_date: string;
  lines: JournalLineForm[];
};

function createEmptyLine(accountId = ''): JournalLineForm {
  return {
    account: accountId,
    description: '',
    debit: '',
    credit: '',
  };
}

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

function createEmptyJournalForm(
  institutionId = '',
  branchId = '',
): JournalFormState {
  return {
    institution: institutionId,
    branch: branchId,
    reference: '',
    description: '',
    entry_date: todayValue(),
    lines: [createEmptyLine()],
  };
}

function journalFormFromRecord(entry: JournalEntry): JournalFormState {
  return {
    institution: entry.institution ? String(entry.institution) : '',
    branch: entry.branch ? String(entry.branch) : '',
    reference: entry.reference,
    description: entry.description ?? '',
    entry_date: entry.entry_date ?? todayValue(),
    lines:
      entry.lines?.map((line) => ({
        account: String(line.account),
        description: line.description ?? '',
        debit: String(line.debit ?? ''),
        credit: String(line.credit ?? ''),
      })) ?? [createEmptyLine()],
  };
}

function getProblemMessage(
  error: unknown,
  fallback = 'Unable to save journal entry changes.',
) {
  const problem = error as ApiProblem;
  return problem?.message || fallback;
}

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

function toAmount(value?: string | number | null) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function formTotals(lines: JournalLineForm[]) {
  return lines.reduce(
    (totals, line) => ({
      debit: totals.debit + toAmount(line.debit),
      credit: totals.credit + toAmount(line.credit),
    }),
    { debit: 0, credit: 0 },
  );
}

function isEditableDraft(entry: JournalEntry | null) {
  return Boolean(entry && entry.status === 'draft' && entry.source === 'manual');
}

export function JournalEntriesPage() {
  const { user } = useAuth();
  const actorRole = user?.role ?? null;
  const fixedInstitutionId = user?.institution ? String(user.institution) : '';
  const fixedBranchId = user?.branch ? String(user.branch) : '';
  const canChooseInstitution = actorRole === 'super_admin';
  const canChooseBranch =
    actorRole === 'super_admin' || actorRole === 'institution_admin';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [institutionFilter, setInstitutionFilter] = useState(
    canChooseInstitution ? 'all' : fixedInstitutionId || 'all',
  );
  const [branchFilter, setBranchFilter] = useState(
    fixedBranchId || 'all',
  );
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const [form, setForm] = useState<JournalFormState>(() =>
    createEmptyJournalForm(fixedInstitutionId, fixedBranchId),
  );

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

  const selectedInstitutionForAccounts =
    form.institution || fixedInstitutionId || (institutionFilter !== 'all' ? institutionFilter : '');

  const loadAccounts = useCallback(
    () =>
      accountingApi.accounts.list({
        institution: selectedInstitutionForAccounts || undefined,
        is_active: true,
      }),
    [selectedInstitutionForAccounts],
  );

  const loadEntries = useCallback(
    () =>
      accountingApi.journalEntries.list({
        search: search.trim() || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        source: sourceFilter === 'all' ? undefined : sourceFilter,
        institution: institutionFilter === 'all' ? undefined : institutionFilter,
        branch: branchFilter === 'all' ? undefined : branchFilter,
      }),
    [branchFilter, institutionFilter, search, sourceFilter, statusFilter],
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
  const {
    data: accountsData,
    error: accountsError,
    isLoading: accountsLoading,
    reload: reloadAccounts,
  } = useApiResource(loadAccounts);
  const { data, error, isLoading, reload } = useApiResource(loadEntries);

  const loadedInstitutions = unwrapList(institutionsData);
  const loadedBranches = unwrapList(branchesData);
  const loadedAccounts = unwrapList(accountsData);
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
  const entries = unwrapList(data);

  const defaultInstitutionId =
    fixedInstitutionId || (institutions.length === 1 ? String(institutions[0].id) : '');
  const selectedInstitutionId = form.institution || defaultInstitutionId;
  const availableBranches = branches.filter((branch) => {
    if (!selectedInstitutionId) return true;
    return branchInstitutionId(branch) === selectedInstitutionId;
  });
  const selectedBranchId =
    form.branch ||
    fixedBranchId ||
    (availableBranches.length === 1 ? String(availableBranches[0].id) : '');

  const availableAccounts = loadedAccounts.filter((account) => {
    if (!selectedInstitutionId) return true;
    return String(account.institution ?? '') === selectedInstitutionId;
  });

  const selectedEntry =
    entries.find((entry) => String(entry.id) === editingEntryId) ?? null;
  const totals = formTotals(form.lines);
  const difference = totals.debit - totals.credit;

  const columns: Column<JournalEntry>[] = [
    {
      header: 'Reference',
      accessor: (entry) => (
        <div>
          <p className="font-bold text-slate-900">{entry.reference}</p>
          <p className="text-xs text-slate-500">
            {sourceLabel(entry.source)}
          </p>
        </div>
      ),
    },
    {
      header: 'Scope',
      accessor: (entry) => (
        <div>
          <p>{entry.branch_name || entry.institution_name || '-'}</p>
          <p className="text-xs text-slate-500">
            {entry.entry_date ? formatDate(entry.entry_date) : '-'}
          </p>
        </div>
      ),
    },
    {
      header: 'Totals',
      accessor: (entry) => (
        <div>
          <p>Dr {moneyPrecise(entry.total_debit)}</p>
          <p className="text-xs text-slate-500">
            Cr {moneyPrecise(entry.total_credit)}
          </p>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: (entry) => (
        <div className="grid gap-1">
          <span
            className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold ${balanceBadgeClassName(
              entry.status,
            )}`}
          >
            {entry.status === 'posted' ? 'Posted' : 'Draft'}
          </span>
          <span
            className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold ${entry.is_balanced ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'}`}
          >
            {entry.is_balanced ? 'Balanced' : 'Out of balance'}
          </span>
        </div>
      ),
    },
    {
      header: 'Actions',
      accessor: (entry) => (
        <div className="flex flex-wrap gap-2">
          {isEditableDraft(entry) ? (
            <>
              <Button
                type="button"
                className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                onClick={() => {
                  setEditingEntryId(String(entry.id));
                  setForm(journalFormFromRecord(entry));
                }}
              >
                Edit
              </Button>
              <Button
                type="button"
                className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                onClick={async () => {
                  try {
                    await accountingApi.journalEntries.post(entry.id);
                    toast.success('Journal entry posted');
                    await reload();
                  } catch (postError) {
                    toast.error(
                      getProblemMessage(postError, 'Unable to post journal entry.'),
                    );
                  }
                }}
              >
                Post
              </Button>
              <Button
                type="button"
                className="bg-red-50 text-red-700 hover:bg-red-100"
                disabled={deletingEntryId === String(entry.id)}
                onClick={async () => {
                  if (
                    !window.confirm(
                      `Delete draft ${entry.reference}? This cannot be undone.`,
                    )
                  ) {
                    return;
                  }

                  setDeletingEntryId(String(entry.id));
                  try {
                    await accountingApi.journalEntries.remove(entry.id);
                    toast.success('Draft journal entry deleted');
                    if (editingEntryId === String(entry.id)) {
                      setEditingEntryId(null);
                      setForm(
                        createEmptyJournalForm(defaultInstitutionId, fixedBranchId),
                      );
                    }
                    await reload();
                  } catch (deleteError) {
                    toast.error(
                      getProblemMessage(
                        deleteError,
                        'Unable to delete journal entry.',
                      ),
                    );
                  } finally {
                    setDeletingEntryId(null);
                  }
                }}
              >
                Delete
              </Button>
            </>
          ) : (
            <span className="text-xs font-semibold text-slate-400">Read only</span>
          )}
        </div>
      ),
    },
  ];

  if (!actorRole || actorRole === 'client' || actorRole === 'teller' || actorRole === 'loan_officer') {
    return (
      <StateView
        title="Journal entries are not available"
        description="Only accounting and admin roles can create or post journal entries."
      />
    );
  }

  if (isLoading && !data) {
    return <StateView title="Loading journal entries..." />;
  }

  if (
    (institutionsLoading || branchesLoading || accountsLoading) &&
    (!institutionsData || !branchesData || !accountsData)
  ) {
    return <StateView title="Loading journal setup..." />;
  }

  if (error && !data) {
    return (
      <StateView
        title="Could not load journal entries"
        description={error}
        actionLabel="Retry"
        onAction={reload}
      />
    );
  }

  if ((institutionsError && !institutionsData) || (branchesError && !branchesData) || (accountsError && !accountsData)) {
    return (
      <StateView
        title="Could not load journal setup"
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

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Journal entries"
        description="Create draft journals, validate balance, and post manual entries into the live ledger."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm font-semibold text-slate-500">Entries in scope</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{entries.length}</p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-slate-500">Draft entries</p>
          <p className="mt-2 text-3xl font-black text-slate-950">
            {entries.filter((entry) => entry.status === 'draft').length}
          </p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-slate-500">Posted entries</p>
          <p className="mt-2 text-3xl font-black text-slate-950">
            {entries.filter((entry) => entry.status === 'posted').length}
          </p>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card className="grid gap-4">
          <div className="flex flex-col gap-3">
            <div>
              <CardTitle>Journal register</CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                Draft entries can be edited and posted; system-generated entries stay read-only.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <Field label="Search">
                <Input
                  placeholder="Reference or description..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </Field>

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
                  {branches
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

              <Field label="Status">
                <select
                  className={formSelectClassName}
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  {journalStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Source">
                <select
                  className={formSelectClassName}
                  value={sourceFilter}
                  onChange={(event) => setSourceFilter(event.target.value)}
                >
                  {journalSourceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          <DataTable<JournalEntry>
            data={entries}
            columns={columns}
            emptyMessage="No journal entries matched this filter."
          />
        </Card>

        <Card className="grid gap-4 self-start">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>
                {editingEntryId ? 'Edit draft journal' : 'New journal entry'}
              </CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                Build the lines first, then save as draft or post once debits and credits match.
              </p>
            </div>
            {editingEntryId ? (
              <Button
                type="button"
                className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                onClick={() => {
                  setEditingEntryId(null);
                  setForm(createEmptyJournalForm(defaultInstitutionId, fixedBranchId));
                }}
              >
                New
              </Button>
            ) : null}
          </div>

          <div className="grid gap-3 rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-500">Debit total</span>
              <span className="font-bold text-slate-900">
                {moneyPrecise(totals.debit)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-500">Credit total</span>
              <span className="font-bold text-slate-900">
                {moneyPrecise(totals.credit)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-500">Difference</span>
              <span
                className={`font-bold ${difference === 0 ? 'text-emerald-700' : 'text-rose-700'}`}
              >
                {moneyPrecise(Math.abs(difference))}
              </span>
            </div>
          </div>

          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
            }}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Institution">
                <select
                  className={formSelectClassName}
                  value={selectedInstitutionId}
                  disabled={!canChooseInstitution}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      institution: event.target.value,
                      branch: '',
                      lines: current.lines.map((line) => ({
                        ...line,
                        account: '',
                      })),
                    }))
                  }
                >
                  {!canChooseInstitution && defaultInstitutionId ? null : (
                    <option value="">Select institution</option>
                  )}
                  {institutions.map((institution) => (
                    <option key={institution.id} value={String(institution.id)}>
                      {institution.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Branch">
                <select
                  className={formSelectClassName}
                  value={selectedBranchId}
                  disabled={!canChooseBranch && Boolean(fixedBranchId)}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      branch: event.target.value,
                    }))
                  }
                >
                  {canChooseBranch ? <option value="">Institution-level</option> : null}
                  {availableBranches.map((branch) => (
                    <option key={branch.id} value={String(branch.id)}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Reference">
                <Input
                  value={form.reference}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reference: event.target.value,
                    }))
                  }
                  placeholder="JV-2026-001"
                  required
                />
              </Field>
              <Field label="Entry date">
                <Input
                  type="date"
                  value={form.entry_date}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      entry_date: event.target.value,
                    }))
                  }
                  required
                />
              </Field>
            </div>

            <Field label="Description">
              <Input
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Monthly adjustment or manual reclass"
              />
            </Field>

            <div className="grid gap-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-sm">Journal lines</CardTitle>
                <Button
                  type="button"
                  className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      lines: [...current.lines, createEmptyLine()],
                    }))
                  }
                >
                  Add line
                </Button>
              </div>

              {form.lines.map((line, index) => (
                <div
                  key={`${editingEntryId || 'new'}-${index}`}
                  className="grid gap-3 rounded-2xl border border-slate-200 p-4"
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label={`Account ${index + 1}`}>
                      <select
                        className={formSelectClassName}
                        value={line.account}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            lines: current.lines.map((currentLine, currentIndex) =>
                              currentIndex === index
                                ? { ...currentLine, account: event.target.value }
                                : currentLine,
                            ),
                          }))
                        }
                      >
                        <option value="">Select account</option>
                        {availableAccounts.map((account) => (
                          <option key={account.id} value={String(account.id)}>
                            {account.code} - {account.name}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Line description">
                      <Input
                        value={line.description}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            lines: current.lines.map((currentLine, currentIndex) =>
                              currentIndex === index
                                ? {
                                    ...currentLine,
                                    description: event.target.value,
                                  }
                                : currentLine,
                            ),
                          }))
                        }
                        placeholder="Optional"
                      />
                    </Field>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <Field label="Debit">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.debit}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            lines: current.lines.map((currentLine, currentIndex) =>
                              currentIndex === index
                                ? { ...currentLine, debit: event.target.value }
                                : currentLine,
                            ),
                          }))
                        }
                        placeholder="0.00"
                      />
                    </Field>
                    <Field label="Credit">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.credit}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            lines: current.lines.map((currentLine, currentIndex) =>
                              currentIndex === index
                                ? { ...currentLine, credit: event.target.value }
                                : currentLine,
                            ),
                          }))
                        }
                        placeholder="0.00"
                      />
                    </Field>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        className="w-full bg-red-50 text-red-700 hover:bg-red-100"
                        disabled={form.lines.length === 1}
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            lines: current.lines.filter((_, currentIndex) => currentIndex !== index),
                          }))
                        }
                      >
                        Remove line
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={isSaving}
                onClick={async () => {
                  setIsSaving(true);
                  try {
                    const payload = {
                      institution: selectedInstitutionId || defaultInstitutionId,
                      branch: selectedBranchId || null,
                      reference: form.reference.trim(),
                      description: form.description.trim(),
                      entry_date: form.entry_date,
                      status: 'draft',
                      lines: form.lines.map((line) => ({
                        account: line.account,
                        description: line.description.trim(),
                        debit: line.debit || '0.00',
                        credit: line.credit || '0.00',
                      })),
                    };

                    const savedEntry = editingEntryId
                      ? await accountingApi.journalEntries.update(
                          editingEntryId,
                          payload,
                        )
                      : await accountingApi.journalEntries.create(payload);

                    toast.success(
                      editingEntryId ? 'Draft updated' : 'Draft saved',
                    );
                    setEditingEntryId(String(savedEntry.id));
                    setForm(journalFormFromRecord(savedEntry));
                    await reload();
                  } catch (saveError) {
                    toast.error(getProblemMessage(saveError));
                  } finally {
                    setIsSaving(false);
                  }
                }}
              >
                {isSaving ? 'Saving...' : 'Save draft'}
              </Button>

              <Button
                type="button"
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={async () => {
                  setIsSaving(true);
                  try {
                    const payload = {
                      institution: selectedInstitutionId || defaultInstitutionId,
                      branch: selectedBranchId || null,
                      reference: form.reference.trim(),
                      description: form.description.trim(),
                      entry_date: form.entry_date,
                      status: 'posted',
                      lines: form.lines.map((line) => ({
                        account: line.account,
                        description: line.description.trim(),
                        debit: line.debit || '0.00',
                        credit: line.credit || '0.00',
                      })),
                    };

                    const savedEntry = editingEntryId
                      ? await accountingApi.journalEntries.update(
                          editingEntryId,
                          payload,
                        )
                      : await accountingApi.journalEntries.create(payload);

                    toast.success('Journal entry posted');
                    setEditingEntryId(null);
                    setForm(createEmptyJournalForm(defaultInstitutionId, fixedBranchId));
                    await reload();
                    if (savedEntry.institution) {
                      await reloadAccounts();
                    }
                  } catch (saveError) {
                    toast.error(
                      getProblemMessage(saveError, 'Unable to post journal entry.'),
                    );
                  } finally {
                    setIsSaving(false);
                  }
                }}
              >
                Post entry
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
