"use client";

import Link from "next/link";
import { useCallback, useDeferredValue, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { StateView } from "@/components/ui/state-view";
import {
  formSelectClassName,
  formatDate,
  organizationStatusOptions,
  statusLabel,
  statusPillClassName,
} from "@/features/admin/shared";
import { useAuth } from "@/features/auth/auth-provider";
import { useApiResource } from "@/hooks/use-api-resource";
import { unwrapList } from "@/lib/api/format";
import { adminApi, clientsApi } from "@/lib/api/services";
import type { ApiProblem, Branch, Client, Institution } from "@/types/api";

type ClientFormState = {
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
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingClientId, setIsDeletingClientId] = useState<string | null>(
    null,
  );
  const [form, setForm] = useState<ClientFormState>(() =>
    createEmptyClientForm(fixedInstitutionId, fixedBranchId),
  );

  const searchQuery = useDeferredValue(search.trim());

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
      }),
    [
      actorRole,
      branchFilter,
      institutionFilter,
      ordering,
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

  function resetForm() {
    setEditingClientId(null);
    setFormError(null);
    setForm(createEmptyClientForm(defaultInstitutionId, defaultBranchId));
    setIsFormOpen(false);
  }

  function openCreateModal() {
    setEditingClientId(null);
    setFormError(null);
    setForm(createEmptyClientForm(defaultInstitutionId, defaultBranchId));
    setIsFormOpen(true);
  }

  function openEditModal(client: Client) {
    setEditingClientId(String(client.id));
    setFormError(null);
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

  if (isLoading && !data) {
    return <StateView title="Loading clients..." />;
  }

  if (
    (institutionsLoading || branchesLoading) &&
    (actorRole === "super_admin" || actorRole === "institution_admin") &&
    (!institutionsData || !branchesData)
  ) {
    return <StateView title="Loading client form options..." />;
  }

  if (error && !data) {
    return (
      <StateView
        title="Could not load clients"
        description={error}
        actionLabel="Retry"
        onAction={reload}
      />
    );
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
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Clients"
          description="Manage member records, branch assignment, and contact details from the live API."
        />
        <Button type="button" onClick={openCreateModal}>
          Add client
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm font-semibold text-slate-500">
            Visible clients
          </p>
          <p className="mt-2 text-3xl font-black text-[#127D61]">
            {clients.length}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Matching the current search and filters.
          </p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-slate-500">Active clients</p>
          <p className="mt-2 text-3xl font-black text-[#127D61]">
            {activeClients}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Currently marked active in this view.
          </p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-slate-500">Self-service</p>
          <p className="mt-2 text-3xl font-black text-[#127D61]">
            {selfServiceClients}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Linked portal users across {visibleBranches || 0} branches.
          </p>
        </Card>
      </div>

      <Card className="grid gap-4">
        <CardTitle>Filters</CardTitle>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Field label="Search">
            <Input
              placeholder="Member number, name, phone, ID..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
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

          {actorRole === "super_admin" ? (
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
              onChange={(event) => setOrdering(event.target.value)}
            >
              <option value="member_number">Member number</option>
              <option value="-updated_at">Recently updated</option>
              <option value="first_name">First name</option>
              <option value="last_name">Last name</option>
            </select>
          </Field>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <CardTitle>Client list</CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              Bootstrap-style table view.
            </p>
          </div>
          <Button type="button" onClick={openCreateModal}>
            Register client
          </Button>
        </div>

        {clients.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-bold">#</th>
                  <th className="px-4 py-3 font-bold">Member no.</th>
                  <th className="px-4 py-3 font-bold">Client name</th>
                  <th className="px-4 py-3 font-bold">Phone</th>
                  <th className="px-4 py-3 font-bold">Email</th>
                  <th className="px-4 py-3 font-bold">Branch</th>
                  <th className="px-4 py-3 font-bold">Institution</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-4 py-3 font-bold">Updated</th>
                  <th className="px-4 py-3 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client, index) => (
                  <tr
                    key={client.id ?? index}
                    className="border-b border-slate-100 transition hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 text-slate-500">{index + 1}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {client.member_number ?? client.member_no ?? client.id}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-900">
                        {fullName(client)}
                      </p>
                      <p className="text-xs text-slate-500">
                        National ID: {client.national_id || "-"}
                      </p>
                    </td>
                    <td className="px-4 py-3">{client.phone ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {client.email || "-"}
                    </td>
                    <td className="px-4 py-3">{client.branch_name ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {client.institution_name ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusPillClassName(
                          client.status,
                        )}`}
                      >
                        {statusLabel(client.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(client.updated_at ?? client.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/clients/${client.id}`}
                          className="inline-flex items-center justify-center rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
                        >
                          View
                        </Link>
                        <Button
                          type="button"
                          className="rounded-lg bg-white px-3 py-2 text-xs text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                          onClick={() => openEditModal(client)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 hover:bg-red-100"
                          disabled={isDeletingClientId === String(client.id)}
                          onClick={async () => {
                            if (!window.confirm(`Delete ${fullName(client)}?`))
                              return;

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
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-slate-500">
            No clients match the current filters.
          </div>
        )}
      </Card>

      {isFormOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <CardTitle>
                  {editingClientId ? "Edit client" : "Register client"}
                </CardTitle>
                <p className="mt-1 text-sm text-slate-500">
                  Capture identity, branch ownership, and next-of-kin details.
                </p>
              </div>
              <Button
                type="button"
                className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                onClick={resetForm}
              >
                Close
              </Button>
            </div>
            <div className="max-h-[75vh] overflow-y-auto p-5">
              <form className="grid gap-4" onSubmit={handleSubmit}>
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
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {formError}
                  </div>
                ) : null}

                <Button type="submit" disabled={isSaving}>
                  {isSaving
                    ? "Saving..."
                    : editingClientId
                      ? "Update client"
                      : "Create client"}
                </Button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
