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
import { useAuth } from '@/features/auth/auth-provider';
import {
  formSelectClassName,
  formatDate,
  organizationStatusOptions,
} from '@/features/admin/shared';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useApiResource } from '@/hooks/use-api-resource';
import { adminApi } from '@/lib/api/services';
import { unwrapList } from '@/lib/api/format';
import type { ApiProblem, Institution } from '@/types/api';

type InstitutionFormState = {
  name: string;
  code: string;
  email: string;
  phone: string;
  currency: string;
  status: string;
};

const emptyInstitutionForm: InstitutionFormState = {
  name: '',
  code: '',
  email: '',
  phone: '',
  currency: 'UGX',
  status: 'active',
};

function institutionFormFromRecord(
  institution: Institution,
): InstitutionFormState {
  return {
    name: institution.name,
    code: institution.code,
    email: institution.email ?? '',
    phone: institution.phone ?? '',
    currency: institution.currency ?? 'UGX',
    status: institution.status ?? 'active',
  };
}

function getErrorMessage(error: unknown) {
  return (
    (error as ApiProblem)?.message ?? 'Unable to save institution changes.'
  );
}

export function InstitutionsManagementPage() {
  const { user } = useAuth();
  const canCreateInstitutions = user?.role === 'super_admin';
  const canDeleteInstitutions = user?.role === 'super_admin';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingInstitutionId, setEditingInstitutionId] = useState<
    string | null
  >(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<InstitutionFormState>(emptyInstitutionForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingInstitutionId, setDeletingInstitutionId] = useState<
    string | null
  >(null);
  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  const loadInstitutions = useCallback(
    () =>
      adminApi.institutions.list({
        status: statusFilter === 'all' ? undefined : statusFilter,
      }),
    [statusFilter],
  );

  const { data, error, isLoading, reload } = useApiResource(loadInstitutions);

  const institutions = unwrapList(data);
  const filteredInstitutions = useMemo(
    () =>
      institutions.filter((institution) => {
        if (!debouncedSearch) return true;

        return [
          institution.name,
          institution.code,
          institution.email,
          institution.phone,
          institution.currency,
          institution.status,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(debouncedSearch.toLowerCase());
      }),
    [debouncedSearch, institutions],
  );
  const activeInstitutions = filteredInstitutions.filter(
    (institution) => institution.status === 'active',
  ).length;
  const totalActiveBranches = filteredInstitutions.reduce(
    (sum, institution) => sum + Number(institution.active_branch_count ?? 0),
    0,
  );

  const selectedInstitution =
    institutions.find(
      (institution) => String(institution.id) === editingInstitutionId,
    ) ?? null;
  const formId = 'institution-form';

  function openCreateModal() {
    setEditingInstitutionId(null);
    setFormError(null);
    setForm(emptyInstitutionForm);
    setIsFormOpen(true);
  }

  function openEditModal(institution: Institution) {
    setEditingInstitutionId(String(institution.id));
    setFormError(null);
    setForm(institutionFormFromRecord(institution));
    setIsFormOpen(true);
  }

  function closeFormModal() {
    setIsFormOpen(false);
    setFormError(null);
  }

  const columns: Column<Institution>[] = [
    {
      header: 'Institution',
      accessor: (institution) => (
        <div>
          <p className="font-bold text-slate-900">{institution.name}</p>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {institution.code}
          </p>
        </div>
      ),
    },
    {
      header: 'Contact',
      accessor: (institution) => (
        <div>
          <p>{institution.email || '-'}</p>
          <p className="text-xs text-slate-500">{institution.phone || '-'}</p>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: (institution) => <StatusBadge status={institution.status} />,
    },
    {
      header: 'Branches',
      accessor: (institution) => (
        <div>
          <p className="font-semibold text-slate-900">
            {institution.branch_count ?? 0}
          </p>
          <p className="text-xs text-slate-500">
            {institution.active_branch_count ?? 0} active
          </p>
        </div>
      ),
    },
    {
      header: 'Updated',
      accessor: (institution) => formatDate(institution.updated_at),
    },
    {
      header: 'Actions',
      accessor: (institution) => (
        <RowActions
          actions={[
            {
              key: 'edit',
              label: 'Edit',
              onClick: () => openEditModal(institution),
            },
            {
              key: 'delete',
              label: 'Delete',
              hidden: !canDeleteInstitutions,
              disabled: deletingInstitutionId === String(institution.id),
              tone: 'danger',
              onClick: async () => {
                if (
                  !window.confirm(
                    `Delete ${institution.name}? This cannot be undone.`,
                  )
                ) {
                  return;
                }

                setDeletingInstitutionId(String(institution.id));

                try {
                  await adminApi.institutions.remove(institution.id);
                  toast.success('Institution deleted');
                  if (editingInstitutionId === String(institution.id)) {
                    setEditingInstitutionId(null);
                    setForm(emptyInstitutionForm);
                    setIsFormOpen(false);
                  }
                  await reload();
                } catch (deleteError) {
                  toast.error(getErrorMessage(deleteError));
                } finally {
                  setDeletingInstitutionId(null);
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

  if (isLoading && !data) {
    return <StateView title="Loading institutions..." />;
  }

  if (error && !data) {
    return (
      <StateView
        title="Could not load institutions"
        description={error}
        actionLabel="Retry"
        onAction={reload}
      />
    );
  }

  return (
    <RecordsPageLayout
      title="Institutions"
      description="Manage institution setup, status, contact details, and branch visibility."
      metrics={[
        {
          label: 'Institutions in scope',
          value: filteredInstitutions.length,
          hint: 'Matching the current filters and search.',
          accent: 'slate',
        },
        {
          label: 'Active institutions',
          value: activeInstitutions,
          hint: 'Currently marked active in this view.',
        },
        {
          label: 'Active branches',
          value: totalActiveBranches,
          hint: 'Summed branch activity across the visible institutions.',
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
                placeholder="Institution name, code, contact, or currency"
              />
            </Field>
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
          title="Institution directory"
          description={
            canCreateInstitutions
              ? 'Super admins can create, update, and delete institutions.'
              : 'Institution admins can review and update only their own institution.'
          }
          action={
            canCreateInstitutions ? (
              <Button type="button" className="whitespace-nowrap" onClick={openCreateModal}>
                New institution
              </Button>
            ) : undefined
          }
        >
          <div className="p-5">
            <DataTable
              data={filteredInstitutions}
              columns={columns}
              emptyTitle="No institutions found"
              emptyMessage="Try widening the current search or status filter."
            />
          </div>
        </RecordsListPanel>
      </div>

      {isFormOpen ? (
        <Modal
          open={isFormOpen}
          onClose={closeFormModal}
          size="lg"
          title={
            editingInstitutionId
              ? 'Edit institution'
              : canCreateInstitutions
                ? 'Create institution'
                : 'Institution details'
          }
          description={
            editingInstitutionId
              ? 'Update the selected institution and save your changes.'
              : 'Add a new institution profile for onboarding and branch setup.'
          }
          footer={
            <>
              <Button
                type="button"
                className="btn-outline-secondary bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                onClick={() => {
                  if (selectedInstitution) {
                    setFormError(null);
                    setForm(institutionFormFromRecord(selectedInstitution));
                    return;
                  }
                  setFormError(null);
                  setForm(emptyInstitutionForm);
                }}
              >
                {selectedInstitution ? 'Reset form' : 'Clear form'}
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
                  : editingInstitutionId
                    ? 'Save changes'
                    : 'Create institution'}
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
                  name: form.name.trim(),
                  code: form.code.trim(),
                  email: form.email.trim(),
                  phone: form.phone.trim(),
                  currency: form.currency.trim() || 'UGX',
                  status: form.status,
                };

                await (editingInstitutionId
                  ? adminApi.institutions.update(editingInstitutionId, payload)
                  : adminApi.institutions.create(payload));

                toast.success(
                  editingInstitutionId
                    ? 'Institution updated'
                    : 'Institution created',
                );
                closeFormModal();
                setEditingInstitutionId(null);
                setForm(emptyInstitutionForm);
                await reload();
              } catch (saveError) {
                const message = getErrorMessage(saveError);
                setFormError(message);
                toast.error(message);
              } finally {
                setIsSaving(false);
              }
            }}
          >
            <Field label="Institution name">
              <Input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="FinCore SACCO"
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
                placeholder="fincore-sacco"
                required
              />
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Email">
                <Input
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  placeholder="ops@example.com"
                  type="email"
                />
              </Field>
              <Field label="Phone">
                <Input
                  value={form.phone}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                  placeholder="0700000000"
                />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Currency">
                <Input
                  value={form.currency}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      currency: event.target.value,
                    }))
                  }
                  placeholder="UGX"
                  required
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
            </div>

            {formError ? (
              <div className="alert alert-danger">{formError}</div>
            ) : null}
          </form>
        </Modal>
      ) : null}
    </RecordsPageLayout>
  );
}
