"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { Edit3, Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { RecordsListPanel } from "@/components/records/records-list-panel";
import { RecordsPageLayout } from "@/components/records/records-page-layout";
import { RecordsPagination } from "@/components/records/records-pagination";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import type { Column } from "@/components/ui/data-table";
import { DataTable } from "@/components/ui/data-table";
import { Field, Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { StateView } from "@/components/ui/state-view";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  formSelectClassName,
  formatDate,
  organizationStatusOptions,
} from "@/features/admin/shared";
import { useAuth } from "@/features/auth/auth-provider";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useApiResource } from "@/hooks/use-api-resource";
import { isPaginatedResponse, listCount, unwrapList } from "@/lib/api/format";
import { adminApi, clientsApi } from "@/lib/api/services";
import type {
  ApiProblem,
  Branch,
  Client,
  ClientLinkableUser,
  Institution,
} from "@/types/api";

type ClientFormState = {
  user: string;
  institution: string;
  branch: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  national_id: string;
  date_of_birth: string;
  address: string;
  occupation: string;
  next_of_kin_name: string;
  next_of_kin_phone: string;
  status: string;
};

function flattenErrorList(value: unknown): string | null {
  if (Array.isArray(value)) return value.map(String).join(" ");
  if (typeof value === "string") return value;
  return null;
}

function getProblemMessage(
  error: unknown,
  fallback = "Unable to save client changes.",
) {
  const problem = error as ApiProblem;
  if (problem?.message) return problem.message;

  if (problem?.errors && typeof problem.errors === "object") {
    const first = Object.values(problem.errors)
      .map(flattenErrorList)
      .find(Boolean);
    if (first) return first;
  }

  return fallback;
}

function createEmptyClientForm(
  institutionId = "",
  branchId = "",
): ClientFormState {
  return {
    user: "",
    institution: institutionId,
    branch: branchId,
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    national_id: "",
    date_of_birth: "",
    address: "",
    occupation: "",
    next_of_kin_name: "",
    next_of_kin_phone: "",
    status: "active",
  };
}

function clientFormFromRecord(client: Client): ClientFormState {
  return {
    user: client.user ? String(client.user) : "",
    institution: client.institution ? String(client.institution) : "",
    branch: client.branch ? String(client.branch) : "",
    first_name: client.first_name ?? "",
    last_name: client.last_name ?? "",
    phone: client.phone ?? "",
    email: client.email ?? "",
    national_id: client.national_id ?? "",
    date_of_birth: client.date_of_birth ?? "",
    address: client.address ?? "",
    occupation: client.occupation ?? "",
    next_of_kin_name: client.next_of_kin_name ?? "",
    next_of_kin_phone: client.next_of_kin_phone ?? "",
    status: client.status ?? "active",
  };
}

function branchInstitutionId(branch: Branch) {
  if (typeof branch.institution === "object") {
    return branch.institution?.id ? String(branch.institution.id) : "";
  }
  return branch.institution ? String(branch.institution) : "";
}

function institutionPlaceholder(userInstitution: {
  institution?: string | number | null;
  institution_name?: string | null;
  institution_code?: string | null;
}) {
  if (!userInstitution.institution) return [];

  return [
    {
      id: userInstitution.institution,
      name: userInstitution.institution_name || "Assigned institution",
      code: userInstitution.institution_code || "",
      status: "active",
    },
  ] as Institution[];
}

function branchPlaceholder(userBranch: {
  branch?: string | number | null;
  branch_name?: string | null;
  branch_code?: string | null;
  institution?: string | number | null;
  institution_name?: string | null;
  institution_code?: string | null;
}) {
  if (!userBranch.branch) return [];

  return [
    {
      id: userBranch.branch,
      institution: userBranch.institution ?? undefined,
      institution_name: userBranch.institution_name ?? undefined,
      institution_code: userBranch.institution_code ?? undefined,
      name: userBranch.branch_name || "Assigned branch",
      code: userBranch.branch_code || "",
      status: "active",
    },
  ] as Branch[];
}

function buildClientPayload(
  form: ClientFormState,
  institutionId: string,
  branchId: string,
) {
  const payload: {
    user: string | null;
    institution: string;
    branch: string;
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
    national_id: string;
    address: string;
    occupation: string;
    next_of_kin_name: string;
    next_of_kin_phone: string;
    status: string;
    date_of_birth?: string;
  } = {
    user: form.user.trim() || null,
    institution: institutionId,
    branch: branchId,
    first_name: form.first_name.trim(),
    last_name: form.last_name.trim(),
    phone: form.phone.trim(),
    email: form.email.trim(),
    national_id: form.national_id.trim(),
    address: form.address.trim(),
    occupation: form.occupation.trim(),
    next_of_kin_name: form.next_of_kin_name.trim(),
    next_of_kin_phone: form.next_of_kin_phone.trim(),
    status: form.status,
  };

  if (form.date_of_birth.trim()) {
    payload.date_of_birth = form.date_of_birth.trim();
  }

  return payload;
}

function fullName(client: Client) {
  return (
    client.full_name ||
    `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim() ||
    "Unnamed client"
  );
}

function clientPortalAccessLabel(client: Client) {
  if (!client.user) return "Branch-managed record";
  return client.user_email || client.user_full_name || client.user_username || "Portal access enabled";
}

function linkableUserLabel(user: ClientLinkableUser) {
  const identity = user.full_name || user.username || user.email;
  const branch = user.branch_name ? ` - ${user.branch_name}` : "";
  return `${identity} (${user.email})${branch}`;
}

function IconActionButton({
  title,
  onClick,
  href,
  disabled,
  children,
  tone = "text-slate-700 hover:bg-slate-100",
}: {
  title: string;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  children: React.ReactNode;
  tone?: string;
}) {
  const className = `inline-flex h-9 w-9 items-center justify-center rounded-xl transition ${tone} ${
    disabled ? "cursor-not-allowed opacity-50" : ""
  }`;

  if (href) {
    return (
      <Link href={href} title={title} aria-label={title} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </button>
  );
}

export function ClientsManagementPage() {
  const { user } = useAuth();
  const actorRole = user?.role ?? null;
  const fixedInstitutionId = user?.institution ? String(user.institution) : "";
  const fixedBranchId = user?.branch ? String(user.branch) : "";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [institutionFilter, setInstitutionFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [ordering, setOrdering] = useState("member_number");
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [portalUserSearch, setPortalUserSearch] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingClientId, setIsDeletingClientId] = useState<string | null>(
    null,
  );
  const [form, setForm] = useState<ClientFormState>(() =>
    createEmptyClientForm(fixedInstitutionId, fixedBranchId),
  );

  const searchQuery = useDebouncedValue(search.trim(), 350);
  const portalUserQuery = useDebouncedValue(portalUserSearch.trim(), 300);
  const [page, setPage] = useState(1);

  const loadClients = useCallback(
    () =>
      clientsApi.list({
        search: searchQuery || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
        institution:
          actorRole === "super_admin" && institutionFilter !== "all"
            ? institutionFilter
            : undefined,
        branch: branchFilter === "all" ? undefined : branchFilter,
        ordering: ordering || undefined,
        page,
      }),
    [
      actorRole,
      branchFilter,
      institutionFilter,
      ordering,
      page,
      searchQuery,
      statusFilter,
    ],
  );

  const loadInstitutions = useCallback(() => {
    if (actorRole === "super_admin" || actorRole === "institution_admin") {
      return adminApi.institutions.list({ status: "active" });
    }
    return Promise.resolve([] as Institution[]);
  }, [actorRole]);

  const loadBranches = useCallback(() => {
    if (actorRole === "super_admin" || actorRole === "institution_admin") {
      return adminApi.branches.list({
        status: "active",
        institution:
          actorRole === "institution_admin" ? fixedInstitutionId : undefined,
      });
    }
    return Promise.resolve([] as Branch[]);
  }, [actorRole, fixedInstitutionId]);

  const { data, error, isLoading, reload } = useApiResource(loadClients);
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

  const clients = unwrapList(data);
  const loadedInstitutions = unwrapList(institutionsData);
  const loadedBranches = unwrapList(branchesData);

  const institutions =
    actorRole === "super_admin" || actorRole === "institution_admin"
      ? loadedInstitutions
      : institutionPlaceholder({
          institution: user?.institution,
          institution_name: user?.institution_name,
          institution_code: user?.institution_code,
        });
  const branches =
    actorRole === "super_admin" || actorRole === "institution_admin"
      ? loadedBranches
      : branchPlaceholder({
          branch: user?.branch,
          branch_name: user?.branch_name,
          branch_code: user?.branch_code,
          institution: user?.institution,
          institution_name: user?.institution_name,
          institution_code: user?.institution_code,
        });

  const canChooseInstitution = actorRole === "super_admin";
  const canChooseBranch =
    actorRole === "super_admin" || actorRole === "institution_admin";

  const defaultInstitutionId =
    canChooseInstitution || actorRole === "institution_admin"
      ? institutions.length === 1
        ? String(institutions[0].id)
        : fixedInstitutionId
      : fixedInstitutionId;
  const selectedInstitutionId = form.institution || defaultInstitutionId;
  const availableBranches = branches.filter((branch) => {
    if (!selectedInstitutionId) return true;
    return branchInstitutionId(branch) === selectedInstitutionId;
  });
  const defaultBranchId = fixedBranchId || "";
  const selectedBranchId =
    form.branch ||
    defaultBranchId ||
    (availableBranches.length === 1 ? String(availableBranches[0].id) : "");

  const loadLinkableUsers = useCallback(() => {
    if (!isFormOpen) {
      return Promise.resolve([] as ClientLinkableUser[]);
    }

    return clientsApi.listLinkableUsers({
      search: portalUserQuery || undefined,
      institution: selectedInstitutionId || undefined,
      branch: selectedBranchId || undefined,
      client: editingClientId || undefined,
      page_size: 100,
    });
  }, [
    editingClientId,
    isFormOpen,
    portalUserQuery,
    selectedBranchId,
    selectedInstitutionId,
  ]);

  const {
    data: linkableUsersData,
    error: linkableUsersError,
    isLoading: linkableUsersLoading,
    reload: reloadLinkableUsers,
  } = useApiResource(loadLinkableUsers);
  const linkableUsers = unwrapList(linkableUsersData);
  const selectedLinkedUser =
    linkableUsers.find((candidate) => String(candidate.id) === form.user) ??
    null;

  const activeClients = clients.filter(
    (candidate) => candidate.status === "active",
  ).length;
  const selfServiceClients = clients.filter(
    (candidate) => candidate.user,
  ).length;
  const visibleBranches = new Set(
    clients
      .map((candidate) => candidate.branch_name || candidate.branch)
      .filter(Boolean),
  ).size;
  const pagination = isPaginatedResponse(data)
    ? {
        count: listCount(data),
        hasNext: Boolean(data.next),
        hasPrevious: Boolean(data.previous),
      }
    : null;
  const formId = "client-form";

  const clientColumns: Column<Client>[] = [
    {
      header: "Member",
      accessor: (client) => (
        <div>
          <p className="font-bold text-slate-900">
            {client.member_number ?? client.member_no ?? client.id}
          </p>
          <p className="text-xs text-slate-500">
            {client.national_id
              ? `National ID ${client.national_id}`
              : "No national ID on file"}
          </p>
        </div>
      ),
    },
    {
      header: "Client",
      accessor: (client) => (
        <div>
          <p className="font-bold text-slate-900">{fullName(client)}</p>
          <p className="text-xs text-slate-500">
            {client.email || "No email address"}
          </p>
        </div>
      ),
    },
    {
      header: "Status",
      accessor: (client) => <StatusBadge status={client.status} />,
    },
    {
      header: "Updated",
      accessor: (client) => formatDate(client.updated_at ?? client.created_at),
    },
    {
      header: "Actions",
      accessor: (client) => (
        <div className="flex items-center justify-end gap-1">
          <IconActionButton
            title="View client"
            href={`/clients/${client.id}`}
            tone="text-emerald-700 hover:bg-emerald-50"
          >
            <Eye className="h-4 w-4" />
          </IconActionButton>

          <IconActionButton
            title="Edit client"
            onClick={() => openEditModal(client)}
            tone="text-blue-700 hover:bg-blue-50"
          >
            <Edit3 className="h-4 w-4" />
          </IconActionButton>

          <IconActionButton
            title="Delete client"
            disabled={isDeletingClientId === String(client.id)}
            onClick={async () => {
              if (!window.confirm(`Delete ${fullName(client)}?`)) return;

              setIsDeletingClientId(String(client.id));
              try {
                await clientsApi.remove(client.id);
                toast.success("Client deleted");
                if (editingClientId === String(client.id)) {
                  resetForm();
                }
                await reload();
              } catch (deleteError) {
                toast.error(
                  getProblemMessage(deleteError, "Unable to delete client."),
                );
              } finally {
                setIsDeletingClientId(null);
              }
            }}
            tone="text-rose-700 hover:bg-rose-50"
          >
            <Trash2 className="h-4 w-4" />
          </IconActionButton>
        </div>
      ),
      align: "right",
    },
  ];

  function resetForm() {
    setEditingClientId(null);
    setFormError(null);
    setPortalUserSearch("");
    setForm(createEmptyClientForm(defaultInstitutionId, defaultBranchId));
    setIsFormOpen(false);
  }

  function openCreateModal() {
    setEditingClientId(null);
    setFormError(null);
    setPortalUserSearch("");
    setForm(createEmptyClientForm(defaultInstitutionId, defaultBranchId));
    setIsFormOpen(true);
  }

  function openEditModal(client: Client) {
    setEditingClientId(String(client.id));
    setFormError(null);
    setPortalUserSearch("");
    setForm(clientFormFromRecord(client));
    setIsFormOpen(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const institutionId = selectedInstitutionId || fixedInstitutionId;
    const branchId = selectedBranchId || fixedBranchId;

    if (!institutionId) {
      setFormError("Select an institution before saving the client.");
      return;
    }

    if (!branchId) {
      setFormError("Select a branch before saving the client.");
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      const payload = buildClientPayload(form, institutionId, branchId);

      if (editingClientId) {
        await clientsApi.update(editingClientId, payload);
        toast.success("Client updated");
      } else {
        await clientsApi.create(payload);
        toast.success("Client created");
      }

      resetForm();
      await reload();
    } catch (saveError) {
      const message = getProblemMessage(saveError);
      setFormError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  if (!actorRole || actorRole === "client") {
    return (
      <StateView
        title="Client management is not available"
        description="Only staff users can create, edit, and review client records."
      />
    );
  }

  if (
    (institutionsLoading || branchesLoading) &&
    (actorRole === "super_admin" || actorRole === "institution_admin") &&
    (!institutionsData || !branchesData)
  ) {
    return <StateView title="Loading client form options..." />;
  }

  if (institutionsError || branchesError) {
    return (
      <StateView
        title="Could not load client form options"
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
    <RecordsPageLayout
      title="Clients"
      description="Manage member records from a clean, responsive client directory."
      headerAction={
        <Button type="button" onClick={openCreateModal}>
          Add client
        </Button>
      }
      metrics={[
        {
          label: "Visible clients",
          value: clients.length,
          hint: "Matching the current search and filters.",
        },
        {
          label: "Active clients",
          value: activeClients,
          hint: "Currently marked active in this view.",
        },
        {
          label: "Self-service",
          value: selfServiceClients,
          hint: `Linked portal users across ${visibleBranches || 0} branches.`,
          accent: "slate",
        },
      ]}
      filterPanel={
        <Card className="grid gap-4">
          <CardTitle>Search and filters</CardTitle>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Field label="Search">
              <Input
                placeholder="Member number, name, phone, or ID"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </Field>

            <Field label="Status">
              <select
                className={formSelectClassName}
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPage(1);
                }}
              >
                {organizationStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            {actorRole === "super_admin" ? (
              <Field label="Institution">
                <select
                  className={formSelectClassName}
                  value={institutionFilter}
                  onChange={(event) => {
                    setInstitutionFilter(event.target.value);
                    setBranchFilter("all");
                    setPage(1);
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
                className={formSelectClassName}
                value={branchFilter}
                onChange={(event) => {
                  setBranchFilter(event.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All branches</option>
                {branches
                  .filter((branch) => {
                    if (institutionFilter === "all") return true;
                    return branchInstitutionId(branch) === institutionFilter;
                  })
                  .map((branch) => (
                    <option key={branch.id} value={String(branch.id)}>
                      {branch.name}
                    </option>
                  ))}
              </select>
            </Field>

            <Field label="Sort by">
              <select
                className={formSelectClassName}
                value={ordering}
                onChange={(event) => {
                  setOrdering(event.target.value);
                  setPage(1);
                }}
              >
                <option value="member_number">Member number</option>
                <option value="-updated_at">Recently updated</option>
                <option value="first_name">First name</option>
                <option value="last_name">Last name</option>
              </select>
            </Field>
          </div>
        </Card>
      }
    >
      <RecordsListPanel
        title="Client directory"
        description="A minimal list with quick icon actions for viewing, editing, and deleting client records."
        action={
          <Button type="button" onClick={openCreateModal}>
            Register client
          </Button>
        }
        footer={
          pagination ? (
            <RecordsPagination
              count={pagination.count}
              page={page}
              rowsOnPage={clients.length}
              hasNext={pagination.hasNext}
              hasPrevious={pagination.hasPrevious}
              onPageChange={setPage}
            />
          ) : undefined
        }
      >
        <div className="grid gap-4 p-5">
          {error && data ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              The latest refresh failed, but your most recent client list is still visible.
              <button
                type="button"
                className="ml-2 font-bold underline underline-offset-2"
                onClick={() => {
                  void reload();
                }}
              >
                Retry
              </button>
            </div>
          ) : null}

          {error && !data ? (
            <StateView
              title="Could not load clients"
              description={error}
              actionLabel="Retry"
              onAction={reload}
            />
          ) : (
            <DataTable<Client>
              data={clients}
              columns={clientColumns}
              loading={isLoading}
              emptyTitle="No clients found"
              emptyMessage="Try widening the current search, branch, or status filter."
              renderMobileCard={(client) => (
                <article className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-base font-bold text-slate-900">
                          {fullName(client)}
                        </p>
                        <StatusBadge status={client.status} />
                      </div>
                      <p className="mt-1 text-sm font-semibold text-slate-600">
                        Member {client.member_number ?? client.member_no ?? client.id}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <IconActionButton
                        title="View client"
                        href={`/clients/${client.id}`}
                        tone="text-emerald-700 hover:bg-emerald-50"
                      >
                        <Eye className="h-4 w-4" />
                      </IconActionButton>
                      <IconActionButton
                        title="Edit client"
                        onClick={() => openEditModal(client)}
                        tone="text-blue-700 hover:bg-blue-50"
                      >
                        <Edit3 className="h-4 w-4" />
                      </IconActionButton>
                      <IconActionButton
                        title="Delete client"
                        disabled={isDeletingClientId === String(client.id)}
                        onClick={async () => {
                          if (!window.confirm(`Delete ${fullName(client)}?`)) {
                            return;
                          }

                          setIsDeletingClientId(String(client.id));
                          try {
                            await clientsApi.remove(client.id);
                            toast.success("Client deleted");
                            if (editingClientId === String(client.id)) {
                              resetForm();
                            }
                            await reload();
                          } catch (deleteError) {
                            toast.error(
                              getProblemMessage(
                                deleteError,
                                "Unable to delete client.",
                              ),
                            );
                          } finally {
                            setIsDeletingClientId(null);
                          }
                        }}
                        tone="text-rose-700 hover:bg-rose-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </IconActionButton>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                      Record
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      {client.user
                        ? `Portal access linked to ${clientPortalAccessLabel(client)}.`
                        : "Staff-managed client record."}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Updated {formatDate(client.updated_at ?? client.created_at)}
                    </p>
                  </div>
                </article>
              )}
            />
          )}
        </div>
      </RecordsListPanel>

      {isFormOpen ? (
        <Modal
          open={isFormOpen}
          onClose={resetForm}
          size="xl"
          title={editingClientId ? "Edit client" : "Register client"}
          description="Capture identity, branch ownership, and next-of-kin details."
          footer={
            <>
              <Button
                type="button"
                className="btn-outline-secondary bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                onClick={resetForm}
              >
                Cancel
              </Button>
              <Button form={formId} type="submit" disabled={isSaving}>
                {isSaving
                  ? "Saving..."
                  : editingClientId
                    ? "Update client"
                    : "Create client"}
              </Button>
            </>
          }
        >
          <form className="grid gap-4" id={formId} onSubmit={handleSubmit}>
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
                      required
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
                      required
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
                      required
                    />
                  </Field>
                  <Field label="Email">
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                    />
                  </Field>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Institution">
                    <select
                      className={formSelectClassName}
                      value={selectedInstitutionId}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          institution: event.target.value,
                          branch: "",
                        }))
                      }
                      disabled={!canChooseInstitution}
                    >
                      <option value="">Select institution</option>
                      {institutions.map((institution) => (
                        <option
                          key={institution.id}
                          value={String(institution.id)}
                        >
                          {institution.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Branch">
                    <select
                      className={formSelectClassName}
                      value={selectedBranchId}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          branch: event.target.value,
                        }))
                      }
                      disabled={!canChooseBranch && Boolean(fixedBranchId)}
                    >
                      <option value="">Select branch</option>
                      {availableBranches.map((branch) => (
                        <option key={branch.id} value={String(branch.id)}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Search portal users">
                    <Input
                      value={portalUserSearch}
                      onChange={(event) =>
                        setPortalUserSearch(event.target.value)
                      }
                      placeholder="Search by email, username, or name"
                    />
                  </Field>
                  <Field label="Linked portal user">
                    <select
                      className={formSelectClassName}
                      value={form.user}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          user: event.target.value,
                        }))
                      }
                      disabled={linkableUsersLoading && !linkableUsersData}
                    >
                      <option value="">No linked portal user</option>
                      {linkableUsers.map((userOption) => (
                        <option
                          key={userOption.id}
                          value={String(userOption.id)}
                        >
                          {linkableUserLabel(userOption)}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                {linkableUsersError ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    Could not load client portal users.
                    <button
                      type="button"
                      className="ml-2 font-bold underline underline-offset-2"
                      onClick={() => {
                        void reloadLinkableUsers();
                      }}
                    >
                      Retry
                    </button>
                  </div>
                ) : null}

                {!linkableUsersLoading &&
                isFormOpen &&
                !linkableUsers.length &&
                !linkableUsersError ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    No available client user accounts matched this search. Create a
                    client-role account from the Users page or search for an existing
                    self-service registration.
                  </div>
                ) : null}

                {selectedLinkedUser ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                    <p className="font-bold">
                      Linked to {selectedLinkedUser.full_name || selectedLinkedUser.email}
                    </p>
                    <p className="mt-1">
                      {selectedLinkedUser.email}
                      {selectedLinkedUser.branch_name
                        ? ` • ${selectedLinkedUser.branch_name}`
                        : ""}
                    </p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                      {selectedLinkedUser.is_email_verified
                        ? "Email verified"
                        : "Email pending verification"}
                    </p>
                  </div>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="National ID">
                    <Input
                      value={form.national_id}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          national_id: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field label="Date of birth">
                    <Input
                      type="date"
                      value={form.date_of_birth}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          date_of_birth: event.target.value,
                        }))
                      }
                    />
                  </Field>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Occupation">
                    <Input
                      value={form.occupation}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          occupation: event.target.value,
                        }))
                      }
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
                        .filter((option) => option.value !== "all")
                        .map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                    </select>
                  </Field>
                </div>

                <Field label="Address">
                  <Input
                    value={form.address}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        address: event.target.value,
                      }))
                    }
                  />
                </Field>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Next of kin name">
                    <Input
                      value={form.next_of_kin_name}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          next_of_kin_name: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field label="Next of kin phone">
                    <Input
                      value={form.next_of_kin_phone}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          next_of_kin_phone: event.target.value,
                        }))
                      }
                    />
                  </Field>
                </div>

                {formError ? (
                  <div className="alert alert-danger">
                    {formError}
                  </div>
                ) : null}

              </form>
        </Modal>
      ) : null}
    </RecordsPageLayout>
  );
}
