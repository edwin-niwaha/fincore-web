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
  activityFilterOptions,
  formSelectClassName,
  formatDate,
  roleLabel,
  roleOptionsForActor,
  roleRequiresBranch,
  roleRequiresInstitution,
} from '@/features/admin/shared';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useApiResource } from '@/hooks/use-api-resource';
import { unwrapList } from '@/lib/api/format';
import { adminApi } from '@/lib/api/services';
import type { ApiProblem, Branch, Institution, User } from '@/types/api';
import type { Role } from '@/types/roles';

type UserFormState = {
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: Role;
  institution: string;
  branch: string;
  password: string;
  is_active: boolean;
};

function flattenErrorList(value: unknown): string | null {
  if (Array.isArray(value)) return value.map(String).join(' ');
  if (typeof value === 'string') return value;
  return null;
}

function getProblemMessage(error: unknown, fallback = 'Unable to save user changes.') {
  const problem = error as ApiProblem;

  if (problem?.message) return problem.message;

  if (problem?.errors && typeof problem.errors === 'object') {
    const first = Object.values(problem.errors).map(flattenErrorList).find(Boolean);
    if (first) return first;
  }

  return fallback;
}

function createEmptyUserForm(
  role: Role,
  institutionId = '',
  branchId = '',
): UserFormState {
  return {
    email: '',
    username: '',
    first_name: '',
    last_name: '',
    phone: '',
    role,
    institution: institutionId,
    branch: branchId,
    password: '',
    is_active: true,
  };
}

function userFormFromRecord(user: User): UserFormState {
  return {
    email: user.email,
    username: user.username ?? '',
    first_name: user.first_name ?? '',
    last_name: user.last_name ?? '',
    phone: user.phone ?? '',
    role: user.role,
    institution: user.institution ? String(user.institution) : '',
    branch: user.branch ? String(user.branch) : '',
    password: '',
    is_active: user.is_active ?? true,
  };
}

function branchInstitutionId(branch: Branch) {
  if (typeof branch.institution === 'object') {
    return branch.institution?.id ? String(branch.institution.id) : '';
  }

  return branch.institution ? String(branch.institution) : '';
}

function institutionPlaceholder(user: User | null): Institution[] {
  if (!user?.institution) return [];

  return [
    {
      id: user.institution,
      name: user.institution_name || 'Assigned institution',
      code: user.institution_code || '',
      status: 'active',
    },
  ];
}

function branchPlaceholder(user: User | null): Branch[] {
  if (!user?.branch) return [];

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
  ];
}

function statusText(isActive?: boolean) {
  return isActive ? 'Active' : 'Inactive';
}

function statusClassName(isActive?: boolean) {
  return isActive ? 'active' : 'inactive';
}

export function UsersManagementPage() {
  const { user } = useAuth();

  const actorRole = user?.role ?? null;
  const allowedRoleOptions = roleOptionsForActor(actorRole);
  const defaultRole = allowedRoleOptions[0]?.value ?? 'client';

  const fixedInstitutionId = user?.institution ? String(user.institution) : '';
  const fixedBranchId = user?.branch ? String(user.branch) : '';

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState('all');
  const [institutionFilter, setInstitutionFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTogglingUserId, setIsTogglingUserId] = useState<string | null>(null);

  const [form, setForm] = useState<UserFormState>(() =>
    createEmptyUserForm(defaultRole, fixedInstitutionId, fixedBranchId),
  );

  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  const loadUsers = useCallback(
    () =>
      adminApi.users.list({
        role: roleFilter === 'all' ? undefined : roleFilter,
        is_active: activeFilter === 'all' ? undefined : activeFilter === 'active',
        institution: institutionFilter === 'all' ? undefined : institutionFilter,
        branch: branchFilter === 'all' ? undefined : branchFilter,
      }),
    [activeFilter, branchFilter, institutionFilter, roleFilter],
  );

  const loadInstitutions = useCallback(() => {
    if (actorRole === 'super_admin' || actorRole === 'institution_admin') {
      return adminApi.institutions.list({ status: 'active' });
    }

    return Promise.resolve([] as Institution[]);
  }, [actorRole]);

  const loadBranches = useCallback(() => {
    if (actorRole === 'super_admin' || actorRole === 'institution_admin') {
      return adminApi.branches.list({ status: 'active' });
    }

    return Promise.resolve([] as Branch[]);
  }, [actorRole]);

  const { data, error, isLoading, reload } = useApiResource(loadUsers);

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

  const users = unwrapList(data);
  const loadedInstitutions = unwrapList(institutionsData);
  const loadedBranches = unwrapList(branchesData);

  const institutions =
    actorRole === 'branch_manager' ? institutionPlaceholder(user) : loadedInstitutions;

  const branches = actorRole === 'branch_manager' ? branchPlaceholder(user) : loadedBranches;

  const filteredUsers = useMemo(
    () =>
      users.filter((candidate) => {
        if (!debouncedSearch) return true;

        return [
          candidate.full_name,
          candidate.username,
          candidate.email,
          candidate.phone,
          candidate.role,
          candidate.role_display,
          candidate.institution_name,
          candidate.branch_name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(debouncedSearch.toLowerCase());
      }),
    [debouncedSearch, users],
  );

  const selectedUser =
    users.find((candidate) => String(candidate.id) === editingUserId) ?? null;

  const defaultInstitutionId =
    actorRole === 'super_admin'
      ? institutions.length === 1
        ? String(institutions[0].id)
        : ''
      : fixedInstitutionId;

  const resolvedInstitutionId = form.institution || defaultInstitutionId;

  const availableBranches = branches.filter((branch) => {
    if (!resolvedInstitutionId) return true;
    return branchInstitutionId(branch) === resolvedInstitutionId;
  });

  const defaultBranchId =
    actorRole === 'branch_manager'
      ? fixedBranchId
      : availableBranches.length === 1
        ? String(availableBranches[0].id)
        : '';

  const canChooseInstitution =
    actorRole === 'super_admin' || actorRole === 'institution_admin';

  const canChooseBranch =
    actorRole === 'super_admin' || actorRole === 'institution_admin';

  const formId = 'user-form';

  const activeUsers = filteredUsers.filter(
    (candidate) => candidate.is_active !== false,
  ).length;

  const verifiedUsers = filteredUsers.filter(
    (candidate) => candidate.is_email_verified,
  ).length;

  const staffUsers = filteredUsers.filter((candidate) => candidate.role !== 'client').length;

  function canEditRecord(target: User) {
    return Boolean(user && target.id !== user.id);
  }

  function resetForm() {
    setEditingUserId(null);
    setFormError(null);
    setForm(createEmptyUserForm(defaultRole, defaultInstitutionId, defaultBranchId));
  }

  function openCreateModal() {
    resetForm();
    setIsFormOpen(true);
  }

  function openEditModal(targetUser: User) {
    setEditingUserId(String(targetUser.id));
    setFormError(null);
    setForm(userFormFromRecord(targetUser));
    setIsFormOpen(true);
  }

  function closeFormModal() {
    setIsFormOpen(false);
    setFormError(null);
  }

  const columns: Column<User>[] = [
    {
      header: 'User',
      accessor: (row) => (
        <div className="min-w-0">
          <p className="truncate font-bold text-slate-900">
            {row.full_name || row.username || row.email}
          </p>
          <p className="truncate text-xs text-slate-500">{row.email}</p>
        </div>
      ),
    },
    {
      header: 'Role',
      accessor: (row) => (
        <div>
          <p className="font-semibold text-slate-900">
            {row.role_display || roleLabel(row.role)}
          </p>
          <p className="text-xs text-slate-500">
            {row.is_email_verified ? 'Email verified' : 'Email pending'}
          </p>
        </div>
      ),
    },
    {
      header: 'Assignment',
      accessor: (row) => (
        <div>
          <p className="font-medium text-slate-800">{row.institution_name || '-'}</p>
          <p className="text-xs text-slate-500">{row.branch_name || 'No branch'}</p>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: (row) => (
        <StatusBadge
          status={statusClassName(row.is_active)}
          label={statusText(row.is_active)}
        />
      ),
    },
    {
      header: 'Updated',
      accessor: (row) => formatDate(row.updated_at ?? row.created_at),
    },
    {
      header: 'Actions',
      accessor: (row) =>
        canEditRecord(row) ? (
          <RowActions
            actions={[
              {
                key: 'edit',
                label: 'Edit',
                onClick: () => openEditModal(row),
              },
              {
                key: 'toggle',
                label: row.is_active === false ? 'Activate' : 'Deactivate',
                tone: row.is_active === false ? 'success' : 'danger',
                disabled: isTogglingUserId === String(row.id),
                onClick: async () => {
                  const nextIsActive = row.is_active === false;
                  setIsTogglingUserId(String(row.id));

                  try {
                    await adminApi.users.update(row.id, {
                      is_active: nextIsActive,
                    });

                    toast.success(
                      nextIsActive ? 'User activated' : 'User deactivated',
                    );

                    await reload();
                  } catch (toggleError) {
                    toast.error(
                      getProblemMessage(
                        toggleError,
                        'Unable to update user status.',
                      ),
                    );
                  } finally {
                    setIsTogglingUserId(null);
                  }
                },
              },
            ]}
            align="end"
          />
        ) : (
          <span className="text-xs font-semibold text-slate-400">Self</span>
        ),
      align: 'right',
    },
  ];

  if (!allowedRoleOptions.length) {
    return (
      <StateView
        title="User management is not available"
        description="Your role does not have access to manage users."
      />
    );
  }

  if (isLoading && !data) {
    return <StateView title="Loading users..." />;
  }

  if ((institutionsLoading || branchesLoading) && actorRole !== 'branch_manager') {
    if (!institutionsData || !branchesData) {
      return <StateView title="Loading user management options..." />;
    }
  }

  if (error && !data) {
    return (
      <StateView
        title="Could not load users"
        description={error}
        actionLabel="Retry"
        onAction={reload}
      />
    );
  }

  if (institutionsError && actorRole !== 'branch_manager' && !institutionsData) {
    return (
      <StateView
        title="Could not load institutions"
        description={institutionsError}
        actionLabel="Retry"
        onAction={reloadInstitutions}
      />
    );
  }

  if (branchesError && actorRole !== 'branch_manager' && !branchesData) {
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
      title="Users and roles"
      description="Manage staff and client accounts within your allowed institution and branch scope."
      metrics={[
        {
          label: 'Users in scope',
          value: filteredUsers.length,
          hint: 'Matching the current filters and search.',
          accent: 'slate',
        },
        {
          label: 'Active users',
          value: activeUsers,
          hint: 'Currently enabled in this view.',
        },
        {
          label: 'Verified and staff',
          value: `${verifiedUsers} / ${staffUsers}`,
          hint: 'Verified accounts compared with non-client users.',
          accent: 'amber',
        },
      ]}
      filterPanel={
        <Card className="grid gap-4 p-4 sm:p-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Search and filters</CardTitle>
            <p className="text-xs text-slate-500">
              Narrow users by role, status, institution, or branch.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <Field label="Search">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name, email, username, role, or branch"
              />
            </Field>

            <Field label="Role">
              <select
                className={formSelectClassName}
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
              >
                <option value="all">All roles</option>
                {allowedRoleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Status">
              <select
                className={formSelectClassName}
                value={activeFilter}
                onChange={(event) => setActiveFilter(event.target.value)}
              >
                {activityFilterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            {canChooseInstitution && institutions.length > 1 ? (
              <Field label="Institution">
                <select
                  className={formSelectClassName}
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

            {branches.length > 1 ? (
              <Field label="Branch">
                <select
                  className={formSelectClassName}
                  value={branchFilter}
                  onChange={(event) => setBranchFilter(event.target.value)}
                >
                  <option value="all">All branches</option>
                  {branches
                    .filter((branch) => {
                      if (institutionFilter === 'all' || !canChooseInstitution) {
                        return true;
                      }

                      return branchInstitutionId(branch) === institutionFilter;
                    })
                    .map((branch) => (
                      <option key={branch.id} value={String(branch.id)}>
                        {branch.name}
                      </option>
                    ))}
                </select>
              </Field>
            ) : null}
          </div>
        </Card>
      }
    >
      <RecordsListPanel
        title="User directory"
        description="Super admins manage everything, institution admins manage their institution, and branch managers manage only their branch teams."
        action={
          <Button type="button" onClick={openCreateModal}>
            New user
          </Button>
        }
      >
        <div className="w-full overflow-hidden">
          <div className="w-full overflow-x-auto p-3 sm:p-4 lg:p-5">
            <div className="min-w-[900px]">
              <DataTable
                data={filteredUsers}
                columns={columns}
                emptyTitle="No users found"
                emptyMessage="Try widening the current search or account filters."
              />
            </div>
          </div>
        </div>
      </RecordsListPanel>

      {isFormOpen ? (
        <Modal
          open={isFormOpen}
          onClose={closeFormModal}
          size="xl"
          title={editingUserId ? 'Edit user' : 'Create user'}
          description={
            editingUserId
              ? 'Update account details, role assignment, or activation status.'
              : 'Create a staff or client account within your management scope.'
          }
          footer={
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                className="btn-outline-secondary bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                onClick={() => {
                  if (selectedUser) {
                    setFormError(null);
                    setForm(userFormFromRecord(selectedUser));
                    return;
                  }

                  resetForm();
                }}
              >
                {selectedUser ? 'Reset form' : 'Clear form'}
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
                  : editingUserId
                    ? 'Save changes'
                    : 'Create user'}
              </Button>
            </div>
          }
        >
          <form
            id={formId}
            className="grid max-h-[70vh] gap-4 overflow-y-auto pr-1"
            onSubmit={async (event) => {
              event.preventDefault();

              setIsSaving(true);
              setFormError(null);

              const chosenBranch = availableBranches.find(
                (branch) => String(branch.id) === (form.branch || defaultBranchId),
              );

              const chosenInstitutionId =
                form.institution ||
                defaultInstitutionId ||
                (chosenBranch ? branchInstitutionId(chosenBranch) : '');

              const chosenBranchId =
                form.branch || (roleRequiresBranch(form.role) ? defaultBranchId : '');

              const payload = {
                email: form.email.trim(),
                username: form.username.trim(),
                first_name: form.first_name.trim(),
                last_name: form.last_name.trim(),
                phone: form.phone.trim(),
                role: form.role,
                institution: roleRequiresInstitution(form.role)
                  ? chosenInstitutionId || null
                  : null,
                branch:
                  form.role === 'super_admin' || form.role === 'institution_admin'
                    ? null
                    : chosenBranchId || null,
                is_active: form.is_active,
                password: form.password.trim() || undefined,
              };

              try {
                await (editingUserId
                  ? adminApi.users.update(editingUserId, payload)
                  : adminApi.users.create(payload));

                toast.success(editingUserId ? 'User updated' : 'User created');

                closeFormModal();
                resetForm();
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
            {formError ? (
              <div className="alert alert-danger rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {formError}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Email address">
                <Input
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  placeholder="staff@example.com"
                  type="email"
                  required
                />
              </Field>

              <Field label="Username">
                <Input
                  value={form.username}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      username: event.target.value,
                    }))
                  }
                  placeholder="staff-user"
                  required
                />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="First name">
                <Input
                  value={form.first_name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      first_name: event.target.value,
                    }))
                  }
                  placeholder="Jane"
                />
              </Field>

              <Field label="Last name">
                <Input
                  value={form.last_name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      last_name: event.target.value,
                    }))
                  }
                  placeholder="Doe"
                />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
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

              <Field label="Role">
                <select
                  className={formSelectClassName}
                  value={form.role}
                  onChange={(event) =>
                    setForm((current) => {
                      const nextRole = event.target.value as Role;

                      const nextInstitution =
                        nextRole === 'super_admin'
                          ? ''
                          : current.institution || defaultInstitutionId;

                      const nextBranch = roleRequiresBranch(nextRole)
                        ? current.branch || defaultBranchId
                        : nextRole === 'client'
                          ? current.branch
                          : '';

                      return {
                        ...current,
                        role: nextRole,
                        institution: nextInstitution,
                        branch: nextBranch,
                      };
                    })
                  }
                >
                  {allowedRoleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {roleRequiresInstitution(form.role) ? (
              <Field label="Institution">
                <select
                  className={formSelectClassName}
                  value={form.institution || defaultInstitutionId}
                  disabled={!canChooseInstitution}
                  onChange={(event) =>
                    setForm((current) => {
                      const nextInstitutionId = event.target.value;

                      const nextBranches = branches.filter((branch) => {
                        if (!nextInstitutionId) return true;
                        return branchInstitutionId(branch) === nextInstitutionId;
                      });

                      return {
                        ...current,
                        institution: nextInstitutionId,
                        branch:
                          current.branch &&
                          nextBranches.some(
                            (branch) => String(branch.id) === current.branch,
                          )
                            ? current.branch
                            : '',
                      };
                    })
                  }
                >
                  {canChooseInstitution ? (
                    <option value="">Select an institution</option>
                  ) : null}

                  {institutions.map((institution) => (
                    <option key={institution.id} value={String(institution.id)}>
                      {institution.name}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}

            {form.role !== 'institution_admin' ? (
              <Field
                label={roleRequiresBranch(form.role) ? 'Branch' : 'Branch (optional)'}
              >
                <select
                  className={formSelectClassName}
                  value={form.branch || defaultBranchId}
                  disabled={!canChooseBranch && actorRole !== 'branch_manager'}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      branch: event.target.value,
                    }))
                  }
                >
                  <option value="">
                    {roleRequiresBranch(form.role)
                      ? 'Select a branch'
                      : 'No branch assignment'}
                  </option>

                  {availableBranches.map((branch) => (
                    <option key={branch.id} value={String(branch.id)}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <Field label={editingUserId ? 'New password (optional)' : 'Password'}>
                <Input
                  value={form.password}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  placeholder={
                    editingUserId
                      ? 'Leave blank to keep current password'
                      : 'At least 8 characters'
                  }
                  type="password"
                  required={!editingUserId}
                />
              </Field>

              <Field label="Status">
                <select
                  className={formSelectClassName}
                  value={form.is_active ? 'active' : 'inactive'}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      is_active: event.target.value === 'active',
                    }))
                  }
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </Field>
            </div>
          </form>
        </Modal>
      ) : null}
    </RecordsPageLayout>
  );
}