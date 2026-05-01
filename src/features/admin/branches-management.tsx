'use client';

import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { RecordsListPanel } from '@/components/records/records-list-panel';
import { RecordsPageLayout } from '@/components/records/records-page-layout';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import type { Column } from '@/components/ui/data-table';
import { DataTable } from '@/components/ui/data-table';
import { Field, Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { RowActions } from '@/components/ui/row-actions';
import { StateView } from '@/components/ui/state-view';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  formSelectClassName,
  formatDate,
  organizationStatusOptions,
} from '@/features/admin/shared';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
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
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [institutionFilter, setInstitutionFilter] = useState('all');
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingBranchId, setDeletingBranchId] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search.trim(), 300);

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
  const filteredBranches = useMemo(
    () =>
      branches.filter((branch) => {
        if (!debouncedSearch) return true;

        return [
          branch.name,
          branch.code,
          branch.address,
          branch.institution_name,
          branch.institution_code,
          branch.status,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(debouncedSearch.toLowerCase());
      }),
    [branches, debouncedSearch],
  );
  const activeBranches = filteredBranches.filter(
    (branch) => branch.status === 'active',
  ).length;
  const institutionsRepresented = new Set(
    filteredBranches.map(
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
  const formId = 'branch-form';

  function openCreateModal() {
    setEditingBranchId(null);
    setFormError(null);
    setForm(createEmptyBranchForm(defaultInstitutionId));
    setIsFormOpen(true);
  }

  function openEditModal(branch: Branch) {
    setEditingBranchId(String(branch.id));
    setFormError(null);
    setForm(branchFormFromRecord(branch));
    setIsFormOpen(true);
  }

  function closeFormModal() {
    setIsFormOpen(false);
    setFormError(null);
  }

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
      accessor: (branch) => <StatusBadge status={branch.status} />,
    },
    {
      header: 'Updated',
      accessor: (branch) => formatDate(branch.updated_at),
    },
    {
      header: 'Actions',
      accessor: (branch) => (
        <RowActions
          actions={[
            {
              key: 'edit',
              label: 'Edit',
              onClick: () => openEditModal(branch),
            },
            {
              key: 'delete',
              label: 'Delete',
              disabled: deletingBranchId === String(branch.id),
              tone: 'danger',
              onClick: async () => {
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
                    setIsFormOpen(false);
                  }
                  await reloadBranches();
                } catch (deleteError) {
                  toast.error(getErrorMessage(deleteError));
                } finally {
                  setDeletingBranchId(null);
                }
              },
            },
          ]}
          align="end"
        />
      ),
      align: 'right',
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
    <RecordsPageLayout
      title="Branches"
      description="Manage branch setup, visibility, and institution assignment within your admin scope."
      metrics={[
        {
          label: 'Branches in scope',
          value: filteredBranches.length,
          hint: 'Matching the current filters and search.',
          accent: 'slate',
        },
        {
          label: 'Active branches',
          value: activeBranches,
          hint: 'Currently marked active in this view.',
        },
        {
          label: 'Institutions represented',
          value: institutionsRepresented,
          hint: 'Distinct institutions in the current results.',
          accent: 'amber',
        },
      ]}
      filterPanel={
        <Card className="grid gap-4">
          <CardTitle>Search and filters</CardTitle>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Search">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Branch name, code, address, or institution"
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
                  {availableInstitutions.map((institution) => (
                    <option key={institution.id} value={String(institution.id)}>
                      {institution.name}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}

            <Field label="Status">
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
            </Field>
          </div>
        </Card>
      }
    >
<div className="w-full">
  <RecordsListPanel
    title="Branch directory"
    description="Branch actions are automatically scoped by your admin role."
    action={
      <Button
        type="button"
        className="w-full sm:w-auto whitespace-nowrap"
        onClick={openCreateModal}
      >
        New branch
      </Button>
    }
  >
    <div className="w-full overflow-hidden">
      <div className="w-full overflow-x-auto p-3 sm:p-4 lg:p-5">
        <div className="min-w-[850px]">
          <DataTable
            data={filteredBranches}
            columns={columns}
            emptyTitle="No branches found"
            emptyMessage="Try widening the current filters or search terms."
          />
        </div>
      </div>
    </div>
  </RecordsListPanel>
</div>

      {!availableInstitutions.length ? (
        <Card>
          <CardTitle>Branch setup needs an active institution</CardTitle>
          <p className="mt-2 text-sm text-slate-600">
            Create or reactivate an institution before adding new branches in this
            workspace.
          </p>
        </Card>
      ) : null}

      {isFormOpen ? (
        <Modal
          open={isFormOpen}
          onClose={closeFormModal}
          size="lg"
          title={editingBranchId ? 'Edit branch' : 'Create branch'}
          description={
            editingBranchId
              ? 'Update the selected branch and save your changes.'
              : 'Add a branch within an institution you are allowed to manage.'
          }
          footer={
            <>
              <Button
                type="button"
                className="btn-outline-secondary bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                onClick={() => {
                  if (selectedBranch) {
                    setFormError(null);
                    setForm(branchFormFromRecord(selectedBranch));
                    return;
                  }
                  setFormError(null);
                  setForm(createEmptyBranchForm(defaultInstitutionId));
                }}
              >
                {selectedBranch ? 'Reset form' : 'Clear form'}
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
                  : editingBranchId
                    ? 'Save changes'
                    : 'Create branch'}
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
                  institution: form.institution || defaultInstitutionId,
                  name: form.name.trim(),
                  code: form.code.trim(),
                  address: form.address.trim(),
                  status: form.status,
                };

                await (editingBranchId
                  ? adminApi.branches.update(editingBranchId, payload)
                  : adminApi.branches.create(payload));

                toast.success(editingBranchId ? 'Branch updated' : 'Branch created');
                closeFormModal();
                setEditingBranchId(null);
                setForm(createEmptyBranchForm(defaultInstitutionId));
                await reloadBranches();
                await reloadInstitutions();
              } catch (saveError) {
                const message = getErrorMessage(saveError);
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

            {formError ? <div className="alert alert-danger">{formError}</div> : null}
          </form>
        </Modal>
      ) : null}
    </RecordsPageLayout>
  );
}
