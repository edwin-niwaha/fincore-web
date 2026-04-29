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
import { useAuth } from '@/features/auth/auth-provider';
import {
  formSelectClassName,
  formatDate,
  organizationStatusOptions,
  statusLabel,
  statusPillClassName,
} from '@/features/admin/shared';
import { useApiResource } from '@/hooks/use-api-resource';
import { unwrapList } from '@/lib/api/format';
import { adminApi } from '@/lib/api/services';
import type { ApiProblem, Branch, Institution } from '@/types/api';

type BranchFormState = {
  institution: string;
  name: string;
  code: string;
  address: string;
  status: string;
};

function createEmptyBranchForm(institutionId = ''): BranchFormState {
  return {
    institution: institutionId,
    name: '',
    code: '',
    address: '',
    status: 'active',
  };
}

function branchFormFromRecord(branch: Branch): BranchFormState {
  return {
    institution: String(
      typeof branch.institution === 'object'
        ? branch.institution.id
        : (branch.institution ?? ''),
    ),
    name: branch.name,
    code: branch.code,
    address: branch.address ?? '',
    status: branch.status ?? 'active',
  };
}

function getErrorMessage(error: unknown) {
  return (error as ApiProblem)?.message ?? 'Unable to save branch changes.';
}

export function BranchesManagementPage() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState('all');
  const [institutionFilter, setInstitutionFilter] = useState('all');
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingBranchId, setDeletingBranchId] = useState<string | null>(null);

  const loadInstitutions = useCallback(() => adminApi.institutions.list(), []);
  const {
    data: institutionsData,
    error: institutionsError,
    isLoading: institutionsLoading,
    reload: reloadInstitutions,
  } = useApiResource(loadInstitutions);

  const institutions = unwrapList(institutionsData);
  const defaultInstitutionId =
    institutions.length === 1 ? String(institutions[0].id) : '';

  const [form, setForm] = useState<BranchFormState>(() =>
    createEmptyBranchForm(),
  );

  const loadBranches = useCallback(
    () =>
      adminApi.branches.list({
        status: statusFilter === 'all' ? undefined : statusFilter,
        institution:
          institutionFilter === 'all' ? undefined : institutionFilter,
      }),
    [institutionFilter, statusFilter],
  );
  const {
    data: branchesData,
    error: branchesError,
    isLoading: branchesLoading,
    reload: reloadBranches,
  } = useApiResource(loadBranches);

  const branches = unwrapList(branchesData);
  const activeBranches = branches.filter(
    (branch) => branch.status === 'active',
  ).length;
  const institutionsRepresented = new Set(
    branches.map(
      (branch) => branch.institution_name || branch.institution_code,
    ),
  ).size;
  const selectedBranch =
    branches.find((branch) => String(branch.id) === editingBranchId) ?? null;

  const availableInstitutions = useMemo(
    () => institutions.filter((institution) => institution.status !== 'closed'),
    [institutions],
  );

  const canChooseInstitution = availableInstitutions.length > 1;

  const columns: Column<Branch>[] = [
    {
      header: 'Branch',
      accessor: (branch) => (
        <div>
          <p className="font-bold text-slate-900">{branch.name}</p>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {branch.code}
          </p>
        </div>
      ),
    },
    {
      header: 'Institution',
      accessor: (branch) => (
        <div>
          <p className="font-semibold text-slate-900">
            {branch.institution_name || '-'}
          </p>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            {branch.institution_code || '-'}
          </p>
        </div>
      ),
    },
    {
      header: 'Address',
      accessor: (branch) => branch.address || '-',
    },
    {
      header: 'Status',
      accessor: (branch) => (
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusPillClassName(
            branch.status,
          )}`}
        >
          {statusLabel(branch.status)}
        </span>
      ),
    },
    {
      header: 'Updated',
      accessor: (branch) => formatDate(branch.updated_at),
    },
    {
      header: 'Actions',
      accessor: (branch) => (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
            onClick={() => {
              setEditingBranchId(String(branch.id));
              setForm(branchFormFromRecord(branch));
            }}
          >
            Edit
          </Button>
          <Button
            type="button"
            className="bg-red-50 text-red-700 hover:bg-red-100"
            disabled={deletingBranchId === String(branch.id)}
            onClick={async () => {
              if (
                !window.confirm(`Delete ${branch.name}? This cannot be undone.`)
              ) {
                return;
              }

              setDeletingBranchId(String(branch.id));

              try {
                await adminApi.branches.remove(branch.id);
                toast.success('Branch deleted');
                if (editingBranchId === String(branch.id)) {
                  setEditingBranchId(null);
                  setForm(createEmptyBranchForm(defaultInstitutionId));
                }
                await reloadBranches();
              } catch (deleteError) {
                toast.error(getErrorMessage(deleteError));
              } finally {
                setDeletingBranchId(null);
              }
            }}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  if (
    (institutionsLoading || branchesLoading) &&
    !institutionsData &&
    !branchesData
  ) {
    return <StateView title="Loading branches..." />;
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

  if (branchesError && !branchesData) {
    return (
      <StateView
        title="Could not load branches"
        description={branchesError}
        actionLabel="Retry"
        onAction={reloadBranches}
      />
    );
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Branches"
        description="Manage branch setup, visibility, and institution assignment within your admin scope."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm font-semibold text-slate-500">
            Branches in scope
          </p>
          <p className="mt-2 text-3xl font-black text-slate-950">
            {branches.length}
          </p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-slate-500">
            Active branches
          </p>
          <p className="mt-2 text-3xl font-black text-slate-950">
            {activeBranches}
          </p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-slate-500">
            Institutions represented
          </p>
          <p className="mt-2 text-3xl font-black text-slate-950">
            {institutionsRepresented}
          </p>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <Card className="grid gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Branch directory</CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                Branch actions are automatically scoped by your admin role.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canChooseInstitution ? (
                <select
                  className={formSelectClassName}
                  value={institutionFilter}
                  onChange={(event) => setInstitutionFilter(event.target.value)}
                >
                  <option value="all">All institutions</option>
                  {availableInstitutions.map((institution) => (
                    <option key={institution.id} value={String(institution.id)}>
                      {institution.name}
                    </option>
                  ))}
                </select>
              ) : null}
              <select
                className={formSelectClassName}
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                {organizationStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                className="whitespace-nowrap"
                onClick={() => {
                  setEditingBranchId(null);
                  setForm(createEmptyBranchForm(defaultInstitutionId));
                }}
              >
                New branch
              </Button>
            </div>
          </div>

          <DataTable
            data={branches}
            columns={columns}
            emptyMessage="No branches matched this filter."
          />
        </Card>

        <Card>
          <CardTitle>
            {editingBranchId ? 'Edit branch' : 'Create branch'}
          </CardTitle>
          <p className="mt-2 text-sm text-slate-500">
            {editingBranchId
              ? 'Update the selected branch and save your changes.'
              : 'Add a branch within an institution you are allowed to manage.'}
          </p>

          {!availableInstitutions.length ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
              No institutions are currently available in your scope. Create or
              activate an institution first.
            </div>
          ) : (
            <form
              className="mt-4 grid gap-4"
              onSubmit={async (event) => {
                event.preventDefault();
                setIsSaving(true);

                try {
                  const payload = {
                    institution: form.institution || defaultInstitutionId,
                    name: form.name.trim(),
                    code: form.code.trim(),
                    address: form.address.trim(),
                    status: form.status,
                  };

                  const savedBranch = editingBranchId
                    ? await adminApi.branches.update(editingBranchId, payload)
                    : await adminApi.branches.create(payload);

                  toast.success(
                    editingBranchId ? 'Branch updated' : 'Branch created',
                  );
                  setEditingBranchId(String(savedBranch.id));
                  setForm(branchFormFromRecord(savedBranch));
                  await reloadBranches();
                  await reloadInstitutions();
                } catch (saveError) {
                  toast.error(getErrorMessage(saveError));
                } finally {
                  setIsSaving(false);
                }
              }}
            >
              <Field label="Institution">
                <select
                  className={formSelectClassName}
                  value={form.institution || defaultInstitutionId}
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
                  {availableInstitutions.map((institution) => (
                    <option key={institution.id} value={String(institution.id)}>
                      {institution.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Branch name">
                <Input
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Main Branch"
                  required
                />
              </Field>

              <Field label="Code">
                <Input
                  value={form.code}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      code: event.target.value,
                    }))
                  }
                  placeholder="main-branch"
                  required
                />
              </Field>

              <Field label="Address">
                <Input
                  value={form.address}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      address: event.target.value,
                    }))
                  }
                  placeholder="Plot 1 Kampala Road"
                />
              </Field>

              <Field label="Status">
                <select
                  className={formSelectClassName}
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }
                >
                  {organizationStatusOptions
                    .filter((option) => option.value !== 'all')
                    .map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                </select>
              </Field>

              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={isSaving}>
                  {isSaving
                    ? 'Saving...'
                    : editingBranchId
                      ? 'Save changes'
                      : 'Create branch'}
                </Button>
                <Button
                  type="button"
                  className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                  onClick={() => {
                    if (selectedBranch) {
                      setForm(branchFormFromRecord(selectedBranch));
                      return;
                    }
                    setEditingBranchId(null);
                    setForm(createEmptyBranchForm(defaultInstitutionId));
                  }}
                >
                  {selectedBranch ? 'Reset form' : 'Clear form'}
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
