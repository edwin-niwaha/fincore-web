'use client';

import { useCallback, useState } from 'react';
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

  const [statusFilter, setStatusFilter] = useState('all');
  const [editingInstitutionId, setEditingInstitutionId] = useState<
    string | null
  >(null);
  const [form, setForm] = useState<InstitutionFormState>(emptyInstitutionForm);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingInstitutionId, setDeletingInstitutionId] = useState<
    string | null
  >(null);

  const loadInstitutions = useCallback(
    () =>
      adminApi.institutions.list({
        status: statusFilter === 'all' ? undefined : statusFilter,
      }),
    [statusFilter],
  );

  const { data, error, isLoading, reload } = useApiResource(loadInstitutions);

  const institutions = unwrapList(data);
  const activeInstitutions = institutions.filter(
    (institution) => institution.status === 'active',
  ).length;
  const totalActiveBranches = institutions.reduce(
    (sum, institution) => sum + Number(institution.active_branch_count ?? 0),
    0,
  );

  const selectedInstitution =
    institutions.find(
      (institution) => String(institution.id) === editingInstitutionId,
    ) ?? null;

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
      accessor: (institution) => (
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusPillClassName(
            institution.status,
          )}`}
        >
          {statusLabel(institution.status)}
        </span>
      ),
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
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
            onClick={() => {
              setEditingInstitutionId(String(institution.id));
              setForm(institutionFormFromRecord(institution));
            }}
          >
            Edit
          </Button>
          {canDeleteInstitutions ? (
            <Button
              type="button"
              className="bg-red-50 text-red-700 hover:bg-red-100"
              disabled={deletingInstitutionId === String(institution.id)}
              onClick={async () => {
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
                  }
                  await reload();
                } catch (deleteError) {
                  toast.error(getErrorMessage(deleteError));
                } finally {
                  setDeletingInstitutionId(null);
                }
              }}
            >
              Delete
            </Button>
          ) : null}
        </div>
      ),
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
    <div className="grid gap-6">
      <PageHeader
        title="Institutions"
        description="Manage institution setup, status, contact details, and branch visibility."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm font-semibold text-slate-500">
            Institutions in scope
          </p>
          <p className="mt-2 text-3xl font-black text-slate-950">
            {institutions.length}
          </p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-slate-500">
            Active institutions
          </p>
          <p className="mt-2 text-3xl font-black text-slate-950">
            {activeInstitutions}
          </p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-slate-500">
            Active branches
          </p>
          <p className="mt-2 text-3xl font-black text-slate-950">
            {totalActiveBranches}
          </p>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <Card className="grid gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Institution directory</CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                {canCreateInstitutions
                  ? 'Super admins can create, update, and delete institutions.'
                  : 'Institution admins can review and update only their own institution.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
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
              {canCreateInstitutions ? (
                <Button
                  type="button"
                  className="whitespace-nowrap"
                  onClick={() => {
                    setEditingInstitutionId(null);
                    setForm(emptyInstitutionForm);
                  }}
                >
                  New institution
                </Button>
              ) : null}
            </div>
          </div>

          <DataTable
            data={institutions}
            columns={columns}
            emptyMessage="No institutions matched this filter."
          />
        </Card>

        <Card>
          <CardTitle>
            {editingInstitutionId
              ? 'Edit institution'
              : canCreateInstitutions
                ? 'Create institution'
                : 'Institution details'}
          </CardTitle>
          <p className="mt-2 text-sm text-slate-500">
            {editingInstitutionId
              ? 'Update the selected institution and save your changes.'
              : canCreateInstitutions
                ? 'Add a new institution profile for onboarding and branch setup.'
                : 'Select your institution from the table to edit its details.'}
          </p>

          {!canCreateInstitutions && !editingInstitutionId ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
              Your role is scoped to updating an existing institution record.
            </div>
          ) : (
            <form
              className="mt-4 grid gap-4"
              onSubmit={async (event) => {
                event.preventDefault();
                setIsSaving(true);

                try {
                  const payload = {
                    name: form.name.trim(),
                    code: form.code.trim(),
                    email: form.email.trim(),
                    phone: form.phone.trim(),
                    currency: form.currency.trim() || 'UGX',
                    status: form.status,
                  };

                  const savedInstitution = editingInstitutionId
                    ? await adminApi.institutions.update(
                        editingInstitutionId,
                        payload,
                      )
                    : await adminApi.institutions.create(payload);

                  toast.success(
                    editingInstitutionId
                      ? 'Institution updated'
                      : 'Institution created',
                  );
                  setEditingInstitutionId(String(savedInstitution.id));
                  setForm(institutionFormFromRecord(savedInstitution));
                  await reload();
                } catch (saveError) {
                  toast.error(getErrorMessage(saveError));
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

              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={isSaving}>
                  {isSaving
                    ? 'Saving...'
                    : editingInstitutionId
                      ? 'Save changes'
                      : 'Create institution'}
                </Button>
                <Button
                  type="button"
                  className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                  onClick={() => {
                    if (selectedInstitution) {
                      setForm(institutionFormFromRecord(selectedInstitution));
                      return;
                    }
                    setEditingInstitutionId(null);
                    setForm(emptyInstitutionForm);
                  }}
                >
                  {selectedInstitution ? 'Reset form' : 'Clear form'}
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
