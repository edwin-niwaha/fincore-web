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
} from "@/features/admin/shared";
import { useAuth } from "@/features/auth/auth-provider";
import {
  genderOptions,
  getProblemMessage,
  kycStatusOptions,
  memberStatusOptions,
  membershipTypeOptions,
} from "@/features/clients/shared";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useApiResource } from "@/hooks/use-api-resource";
import { isPaginatedResponse, listCount, unwrapList } from "@/lib/api/format";
import { adminApi, clientsApi } from "@/lib/api/services";
import type {
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
  passport_number: string;
  registration_number: string;
  gender: string;
  date_of_birth: string;
  joining_date: string;
  membership_type: string;
  address: string;
  occupation: string;
  employer: string;
  next_of_kin_name: string;
  next_of_kin_phone: string;
  next_of_kin_relationship: string;
};

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
    passport_number: "",
    registration_number: "",
    gender: "",
    date_of_birth: "",
    joining_date: "",
    membership_type: "individual",
    address: "",
    occupation: "",
    employer: "",
    next_of_kin_name: "",
    next_of_kin_phone: "",
    next_of_kin_relationship: "",
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
    passport_number: client.passport_number ?? "",
    registration_number: client.registration_number ?? "",
    gender: client.gender ?? "",
    date_of_birth: client.date_of_birth ?? "",
    joining_date: client.joining_date ?? "",
    membership_type: client.membership_type ?? "individual",
    address: client.address ?? "",
    occupation: client.occupation ?? "",
    employer: client.employer ?? "",
    next_of_kin_name: client.next_of_kin_name ?? "",
    next_of_kin_phone: client.next_of_kin_phone ?? "",
    next_of_kin_relationship: client.next_of_kin_relationship ?? "",
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
    passport_number: string;
    registration_number: string;
    gender: string;
    address: string;
    occupation: string;
    employer: string;
    next_of_kin_name: string;
    next_of_kin_phone: string;
    next_of_kin_relationship: string;
    date_of_birth?: string;
    joining_date?: string;
    membership_type?: string;
  } = {
    user: form.user.trim() || null,
    institution: institutionId,
    branch: branchId,
    first_name: form.first_name.trim(),
    last_name: form.last_name.trim(),
    phone: form.phone.trim(),
    email: form.email.trim(),
    national_id: form.national_id.trim(),
    passport_number: form.passport_number.trim(),
    registration_number: form.registration_number.trim(),
    gender: form.gender,
    address: form.address.trim(),
    occupation: form.occupation.trim(),
    employer: form.employer.trim(),
    next_of_kin_name: form.next_of_kin_name.trim(),
    next_of_kin_phone: form.next_of_kin_phone.trim(),
    next_of_kin_relationship: form.next_of_kin_relationship.trim(),
    membership_type: form.membership_type,
  };

  if (form.date_of_birth.trim()) {
    payload.date_of_birth = form.date_of_birth.trim();
  }

  if (form.joining_date.trim()) {
    payload.joining_date = form.joining_date.trim();
  }

  return payload;
}

function fullName(client: Client) {
  return (
    client.full_name ||
    `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim() ||
    "Unnamed member"
  );
}

function clientIdentityLine(client: Client) {
  if (client.national_id) return `National ID ${client.national_id}`;
  if (client.passport_number) return `Passport ${client.passport_number}`;
  if (client.registration_number) {
    return `Registration ${client.registration_number}`;
  }
  return "No identity document on file";
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
  const [kycFilter, setKycFilter] = useState("all");
  const [membershipTypeFilter, setMembershipTypeFilter] = useState("all");
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
        kyc_status: kycFilter === "all" ? undefined : kycFilter,
        membership_type:
          membershipTypeFilter === "all" ? undefined : membershipTypeFilter,
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
      kycFilter,
      membershipTypeFilter,
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
  const pendingClients = clients.filter(
    (candidate) => candidate.status === "pending",
  ).length;
  const verifiedKycClients = clients.filter(
    (candidate) => candidate.kyc_status === "verified",
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
            {clientIdentityLine(client)}
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
      header: "Membership",
      accessor: (client) => (
        <div>
          <p className="font-bold text-slate-900">
            {client.membership_type_display || "Individual"}
          </p>
          <p className="text-xs text-slate-500">
            Joined {formatDate(client.joining_date ?? client.created_at)}
          </p>
        </div>
      ),
    },
    {
      header: "KYC",
      accessor: (client) => (
        <div className="grid gap-1">
          <StatusBadge
            status={client.kyc_status}
            label={`KYC ${client.kyc_status_display || "Pending"}`}
          />
          <p className="text-xs text-slate-500">
            {client.risk_rating_display
              ? `${client.risk_rating_display} risk`
              : "Risk not rated"}
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
            title="View member"
            href={`/clients/${client.id}`}
            tone="text-emerald-700 hover:bg-emerald-50"
          >
            <Eye className="h-4 w-4" />
          </IconActionButton>

          <IconActionButton
            title="Edit member"
            onClick={() => openEditModal(client)}
            tone="text-blue-700 hover:bg-blue-50"
          >
            <Edit3 className="h-4 w-4" />
          </IconActionButton>

          <IconActionButton
            title="Delete member"
            disabled={isDeletingClientId === String(client.id)}
            onClick={async () => {
              if (!window.confirm(`Delete ${fullName(client)}?`)) return;

              setIsDeletingClientId(String(client.id));
              try {
                await clientsApi.remove(client.id);
                toast.success("Member deleted");
                if (editingClientId === String(client.id)) {
                  resetForm();
                }
                await reload();
              } catch (deleteError) {
                toast.error(
                  getProblemMessage(deleteError, "Unable to delete member."),
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
      setFormError("Select an institution before saving the member.");
      return;
    }

    if (!branchId) {
      setFormError("Select a branch before saving the member.");
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      const payload = buildClientPayload(form, institutionId, branchId);

      if (editingClientId) {
        await clientsApi.update(editingClientId, payload);
        toast.success("Member updated");
      } else {
        await clientsApi.create(payload);
        toast.success("Member created");
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
        title="Member management is not available"
        description="Only staff users can create, edit, and review member records."
      />
    );
  }

  if (
    (institutionsLoading || branchesLoading) &&
    (actorRole === "super_admin" || actorRole === "institution_admin") &&
    (!institutionsData || !branchesData)
  ) {
    return <StateView title="Loading member form options..." />;
  }

  if (institutionsError || branchesError) {
    return (
      <StateView
        title="Could not load member form options"
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
      title="Members"
      description="Manage member registration, lifecycle, and KYC-ready records from one responsive workspace."
      headerAction={
        <Button type="button" onClick={openCreateModal}>
          Add member
        </Button>
      }
      metrics={[
        {
          label: "Visible members",
          value: clients.length,
          hint: "Matching the current search and filters.",
        },
        {
          label: "Pending approval",
          value: pendingClients,
          hint: `${activeClients} active members in the current view.`,
        },
        {
          label: "KYC verified",
          value: verifiedKycClients,
          hint: `${selfServiceClients} linked portal users across ${visibleBranches || 0} branches.`,
          accent: "slate",
        },
      ]}
      filterPanel={
        <Card className="grid gap-4">
          <CardTitle>Search and filters</CardTitle>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
            <Field label="Search">
              <Input
                placeholder="Member number, name, phone, ID, passport, or registration"
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
                {memberStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="KYC">
              <select
                className={formSelectClassName}
                value={kycFilter}
                onChange={(event) => {
                  setKycFilter(event.target.value);
                  setPage(1);
                }}
              >
                {kycStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Membership type">
              <select
                className={formSelectClassName}
                value={membershipTypeFilter}
                onChange={(event) => {
                  setMembershipTypeFilter(event.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All member types</option>
                {membershipTypeOptions.map((option) => (
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
        title="Member register"
        description="A clean register with quick access to member profiles, KYC state, and registration details."
        action={
          <Button type="button" onClick={openCreateModal}>
            Register member
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
              title="Could not load members"
              description={error}
              actionLabel="Retry"
              onAction={reload}
            />
          ) : (
            <DataTable<Client>
              data={clients}
              columns={clientColumns}
              loading={isLoading}
              emptyTitle="No members found"
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
                      <p className="mt-1 text-xs text-slate-500">
                        {client.membership_type_display || "Individual"} member
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <IconActionButton
                        title="View member"
                        href={`/clients/${client.id}`}
                        tone="text-emerald-700 hover:bg-emerald-50"
                      >
                        <Eye className="h-4 w-4" />
                      </IconActionButton>
                      <IconActionButton
                        title="Edit member"
                        onClick={() => openEditModal(client)}
                        tone="text-blue-700 hover:bg-blue-50"
                      >
                        <Edit3 className="h-4 w-4" />
                      </IconActionButton>
                      <IconActionButton
                        title="Delete member"
                        disabled={isDeletingClientId === String(client.id)}
                        onClick={async () => {
                          if (!window.confirm(`Delete ${fullName(client)}?`)) {
                            return;
                          }

                          setIsDeletingClientId(String(client.id));
                          try {
                            await clientsApi.remove(client.id);
                            toast.success("Member deleted");
                            if (editingClientId === String(client.id)) {
                              resetForm();
                            }
                            await reload();
                          } catch (deleteError) {
                            toast.error(
                              getProblemMessage(
                                deleteError,
                                "Unable to delete member.",
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
                    <div className="mt-2 flex flex-wrap gap-2">
                      <StatusBadge
                        status={client.kyc_status}
                        label={`KYC ${client.kyc_status_display || "Pending"}`}
                      />
                    </div>
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
          title={editingClientId ? "Edit member" : "Register member"}
          description="Capture identity, branch ownership, and membership details. Lifecycle and KYC approval continue from the member profile."
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
                    ? "Update member"
                    : "Create member"}
              </Button>
            </>
          }
        >
          <form className="grid gap-4" id={formId} onSubmit={handleSubmit}>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              New members default to <span className="font-bold text-slate-900">pending</span>.
              Use the member profile to complete KYC verification, approval, suspension, or closure.
            </div>

            <div className="grid gap-2">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                Identity and membership
              </p>

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

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Field label="Membership type">
                  <select
                    className={formSelectClassName}
                    value={form.membership_type}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        membership_type: event.target.value,
                      }))
                    }
                  >
                    {membershipTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Gender">
                  <select
                    className={formSelectClassName}
                    value={form.gender}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        gender: event.target.value,
                      }))
                    }
                  >
                    {genderOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
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
                <Field label="Joining date">
                  <Input
                    type="date"
                    value={form.joining_date}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        joining_date: event.target.value,
                      }))
                    }
                  />
                </Field>
              </div>
            </div>

            <div className="grid gap-2">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                Contact and ownership
              </p>

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
                        ? ` - ${selectedLinkedUser.branch_name}`
                        : ""}
                    </p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                      {selectedLinkedUser.is_email_verified
                        ? "Email verified"
                        : "Email pending verification"}
                    </p>
                  </div>
                ) : null}
            </div>

            <div className="grid gap-2">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                Identification and occupation
              </p>

              <div className="grid gap-4 md:grid-cols-3">
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
                <Field label="Passport number">
                  <Input
                    value={form.passport_number}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        passport_number: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="Registration number">
                  <Input
                    value={form.registration_number}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        registration_number: event.target.value,
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
                <Field label="Employer">
                  <Input
                    value={form.employer}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        employer: event.target.value,
                      }))
                    }
                  />
                </Field>
              </div>
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

            <div className="grid gap-2">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                Next of kin
              </p>

              <div className="grid gap-4 md:grid-cols-3">
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
                <Field label="Relationship">
                  <Input
                    value={form.next_of_kin_relationship}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        next_of_kin_relationship: event.target.value,
                      }))
                    }
                  />
                </Field>
              </div>
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
