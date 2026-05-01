'use client';

import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import type { Column } from '@/components/ui/data-table';
import { DataTable } from '@/components/ui/data-table';
import { Field, Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { StateView } from '@/components/ui/state-view';
import {
  formSelectClassName,
  formatDate,
  statusLabel,
  statusPillClassName,
} from '@/features/admin/shared';
import {
  accountStatusOptions,
  accountTypeOptions,
  normalBalanceLabel,
} from '@/features/accounting/shared';
import { useAuth } from '@/features/auth/auth-provider';
import { useApiResource } from '@/hooks/use-api-resource';
import { unwrapList } from '@/lib/api/format';
import { accountingApi, adminApi } from '@/lib/api/services';
import type { ApiProblem, Institution, LedgerAccount } from '@/types/api';

type AccountFormState = {
  institution: string;
  code: string;
  name: string;
  type: string;
  description: string;
  is_active: boolean;
  allow_manual_entries: boolean;
};

function createEmptyAccountForm(institutionId = ''): AccountFormState {
  return {
    institution: institutionId,
    code: '',
    name: '',
    type: 'asset',
    description: '',
    is_active: true,
    allow_manual_entries: true,
  };
}

function accountFormFromRecord(account: LedgerAccount): AccountFormState {
  return {
    institution: account.institution ? String(account.institution) : '',
    code: account.code,
    name: account.name,
    type: account.type,
    description: account.description ?? '',
    is_active: account.is_active ?? true,
    allow_manual_entries: account.allow_manual_entries ?? true,
  };
}

function getProblemMessage(
  error: unknown,
  fallback = 'Unable to save ledger account changes.',
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

export function ChartOfAccountsPage() {
  const { user } = useAuth();
  const actorRole = user?.role ?? null;
  const fixedInstitutionId = user?.institution ? String(user.institution) : '';
  const canChooseInstitution = actorRole === 'super_admin';

  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [institutionFilter, setInstitutionFilter] = useState(
    canChooseInstitution ? 'all' : fixedInstitutionId || 'all',
  );
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(
    null,
  );
  const [form, setForm] = useState<AccountFormState>(() =>
    createEmptyAccountForm(fixedInstitutionId),
  );

  const loadInstitutions = useCallback(() => {
    if (actorRole === 'super_admin' || actorRole === 'institution_admin') {
      return adminApi.institutions.list({ status: 'active' });
    }
    return Promise.resolve([] as Institution[]);
  }, [actorRole]);

  const loadAccounts = useCallback(
    () =>
      accountingApi.accounts.list({
        type: typeFilter === 'all' ? undefined : typeFilter,
        is_active:
          statusFilter === 'all' ? undefined : statusFilter === 'true',
        institution: institutionFilter === 'all' ? undefined : institutionFilter,
      }),
    [institutionFilter, statusFilter, typeFilter],
  );

  const {
    data: institutionsData,
    error: institutionsError,
    isLoading: institutionsLoading,
    reload: reloadInstitutions,
  } = useApiResource(loadInstitutions);
  const { data, error, isLoading, reload } = useApiResource(loadAccounts);

  const loadedInstitutions = unwrapList(institutionsData);
  const institutions =
    actorRole === 'super_admin' || actorRole === 'institution_admin'
      ? loadedInstitutions
      : institutionPlaceholder({
          institution: user?.institution,
          institution_name: user?.institution_name,
          institution_code: user?.institution_code,
        });
  const accounts = unwrapList(data);
  const selectedAccount =
    accounts.find((account) => String(account.id) === editingAccountId) ?? null;

  const defaultInstitutionId =
    fixedInstitutionId || (institutions.length === 1 ? String(institutions[0].id) : '');
  const selectedInstitutionId = form.institution || defaultInstitutionId;

  const activeAccounts = accounts.filter((account) => account.is_active !== false).length;
  const systemAccounts = accounts.filter((account) => account.is_system).length;
  const manualAccounts = accounts.filter((account) => !account.is_system).length;
  const formId = 'ledger-account-form';

  function openCreateModal() {
    setEditingAccountId(null);
    setFormError(null);
    setForm(createEmptyAccountForm(defaultInstitutionId));
    setIsFormOpen(true);
  }

  function openEditModal(account: LedgerAccount) {
    setEditingAccountId(String(account.id));
    setFormError(null);
    setForm(accountFormFromRecord(account));
    setIsFormOpen(true);
  }

  function closeFormModal() {
    setIsFormOpen(false);
    setFormError(null);
  }

  const columns: Column<LedgerAccount>[] = useMemo(
    () => [
      {
        header: 'Account',
        accessor: (account) => (
          <div>
            <p className="font-bold text-slate-900">{account.name}</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {account.code}
            </p>
          </div>
        ),
      },
      {
        header: 'Classification',
        accessor: (account) => (
          <div>
            <p className="font-semibold text-slate-900">
              {statusLabel(account.type)}
            </p>
            <p className="text-xs text-slate-500">
              Normal balance {normalBalanceLabel(account.normal_balance)}
            </p>
          </div>
        ),
      },
      {
        header: 'Institution',
        accessor: (account) => account.institution_name ?? '-',
      },
      {
        header: 'Usage',
        accessor: (account) => (
          <div>
            <p>{account.journal_line_count ?? 0} lines</p>
            <p className="text-xs text-slate-500">
              {account.is_system ? 'System account' : 'Manual account'}
            </p>
          </div>
        ),
      },
      {
        header: 'Status',
        accessor: (account) => (
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusPillClassName(
              account.is_active ? 'active' : 'inactive',
            )}`}
          >
            {account.is_active ? 'Active' : 'Inactive'}
          </span>
        ),
      },
      {
        header: 'Actions',
        accessor: (account) => (
          <div className="flex flex-wrap gap-2">
            {!account.is_system ? (
              <>
                <Button
                  type="button"
                  className="btn-outline-secondary bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                  onClick={() => openEditModal(account)}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  className="btn-outline-danger bg-red-50 text-red-700 hover:bg-red-100"
                  disabled={deletingAccountId === String(account.id)}
                  onClick={async () => {
                    if (
                      !window.confirm(
                        `Delete ${account.code} ${account.name}? This cannot be undone.`,
                      )
                    ) {
                      return;
                    }

                    setDeletingAccountId(String(account.id));
                    try {
                      await accountingApi.accounts.remove(account.id);
                      toast.success('Ledger account deleted');
                      if (editingAccountId === String(account.id)) {
                        setEditingAccountId(null);
                        setForm(createEmptyAccountForm(defaultInstitutionId));
                        setIsFormOpen(false);
                      }
                      await reload();
                    } catch (deleteError) {
                      toast.error(
                        getProblemMessage(
                          deleteError,
                          'Unable to delete ledger account.',
                        ),
                      );
                    } finally {
                      setDeletingAccountId(null);
                    }
                  }}
                >
                  Delete
                </Button>
              </>
            ) : (
              <span className="text-xs font-semibold text-slate-400">
                Protected
              </span>
            )}
          </div>
        ),
      },
    ],
    [defaultInstitutionId, deletingAccountId, editingAccountId, reload],
  );

  if (!actorRole || actorRole === 'client' || actorRole === 'teller' || actorRole === 'loan_officer') {
    return (
      <StateView
        title="Chart of accounts is not available"
        description="Only accounting and admin roles can manage ledger accounts."
      />
    );
  }

  if (isLoading && !data) {
    return <StateView title="Loading chart of accounts..." />;
  }

  if (institutionsLoading && !institutionsData && (canChooseInstitution || actorRole === 'institution_admin')) {
    return <StateView title="Loading institutions..." />;
  }

  if (error && !data) {
    return (
      <StateView
        title="Could not load ledger accounts"
        description={error}
        actionLabel="Retry"
        onAction={reload}
      />
    );
  }

  if (institutionsError && !institutionsData) {
    return (
      <StateView
        title="Could not load institutions"
        description={institutionsError}
        actionLabel="Retry"
        onAction={reloadInstitutions}
      />
    );
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Chart of accounts"
        description="Maintain the live ledger structure used by savings, loans, and manual journals."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm font-semibold text-slate-500">Accounts in scope</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{accounts.length}</p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-slate-500">Active accounts</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{activeAccounts}</p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-slate-500">System accounts</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{systemAccounts}</p>
          <p className="mt-2 text-sm text-slate-500">{manualAccounts} manual accounts available for expansion.</p>
        </Card>
      </div>

      <div className="w-full min-w-0">
        <Card className="grid min-w-0 gap-4 p-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <CardTitle>Ledger directory</CardTitle>
                <p className="mt-1 text-sm text-slate-500">
                  System accounts stay protected while manual accounts can be added for operations and reporting.
                </p>
              </div>

              <Button type="button" onClick={openCreateModal} className="w-full lg:w-auto">
                New account
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {canChooseInstitution ? (
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
              ) : null}

              <select
                className={formSelectClassName}
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
              >
                <option value="all">All account types</option>
                {accountTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                className={formSelectClassName}
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                {accountStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="w-full min-w-0 overflow-x-auto">
            <DataTable<LedgerAccount>
              data={accounts}
              columns={columns}
              emptyMessage="No ledger accounts matched this filter."
            />
          </div>
        </Card>
      </div>

      {isFormOpen ? (
        <Modal
          open={isFormOpen}
          onClose={closeFormModal}
          size="lg"
          title={editingAccountId ? 'Edit account' : 'Create account'}
          description="Add manual accounts to extend the system chart for operational or reporting needs."
          footer={
            <>
              <Button
                type="button"
                className="btn-outline-secondary bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                onClick={() => {
                  if (selectedAccount) {
                    setFormError(null);
                    setForm(accountFormFromRecord(selectedAccount));
                    return;
                  }
                  setFormError(null);
                  setForm(createEmptyAccountForm(defaultInstitutionId));
                }}
              >
                {selectedAccount ? 'Reset form' : 'Clear form'}
              </Button>
              <Button
                type="button"
                className="btn-outline-secondary bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                onClick={closeFormModal}
              >
                Cancel
              </Button>
              <Button form={formId} type="submit" disabled={isSaving}>
                {isSaving
                  ? 'Saving...'
                  : editingAccountId
                    ? 'Save changes'
                    : 'Create account'}
              </Button>
            </>
          }
        >
          <form
            id={formId}
            className="grid gap-4"
            onSubmit={async (event) => {
              event.preventDefault();
              setIsSaving(true);
              setFormError(null);

              try {
                const payload = {
                  institution: selectedInstitutionId || defaultInstitutionId,
                  code: form.code.trim(),
                  name: form.name.trim(),
                  type: form.type,
                  description: form.description.trim(),
                  is_active: form.is_active,
                  allow_manual_entries: form.allow_manual_entries,
                };

                await (editingAccountId
                  ? accountingApi.accounts.update(editingAccountId, payload)
                  : accountingApi.accounts.create(payload));

                toast.success(
                  editingAccountId
                    ? 'Ledger account updated'
                    : 'Ledger account created',
                );
                closeFormModal();
                setEditingAccountId(null);
                setForm(createEmptyAccountForm(defaultInstitutionId));
                await reload();
              } catch (saveError) {
                const message = getProblemMessage(saveError);
                setFormError(message);
                toast.error(message);
              } finally {
                setIsSaving(false);
              }
            }}
          >
            <Field label="Institution">
              <select
                className={formSelectClassName}
                value={selectedInstitutionId}
                disabled={!canChooseInstitution}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    institution: event.target.value,
                  }))
                }
              >
                {!canChooseInstitution && defaultInstitutionId ? null : (
                  <option value="">Select an institution</option>
                )}
                {institutions.map((institution) => (
                  <option key={institution.id} value={String(institution.id)}>
                    {institution.name}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Code">
                <Input
                  value={form.code}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, code: event.target.value }))
                  }
                  placeholder="5100"
                  required
                />
              </Field>
              <Field label="Type">
                <select
                  className={formSelectClassName}
                  value={form.type}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, type: event.target.value }))
                  }
                >
                  {accountTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Name">
              <Input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Office supplies expense"
                required
              />
            </Field>

            <Field label="Description">
              <Input
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Optional notes for the ledger account"
              />
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Status">
                <select
                  className={formSelectClassName}
                  value={form.is_active ? 'true' : 'false'}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      is_active: event.target.value === 'true',
                    }))
                  }
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </Field>
              <Field label="Manual journals">
                <select
                  className={formSelectClassName}
                  value={form.allow_manual_entries ? 'true' : 'false'}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      allow_manual_entries: event.target.value === 'true',
                    }))
                  }
                >
                  <option value="true">Allowed</option>
                  <option value="false">Restricted</option>
                </select>
              </Field>
            </div>

            {formError ? <div className="alert alert-danger">{formError}</div> : null}
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
