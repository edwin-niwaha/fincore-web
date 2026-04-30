'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { MetricCard } from '@/components/dashboard/metric-card';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Field, Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { StateView } from '@/components/ui/state-view';
import { formatDate } from '@/features/admin/shared';
import { useApiResource } from '@/hooks/use-api-resource';
import { clientName, money } from '@/lib/api/format';
import { clientsApi, dashboardApi } from '@/lib/api/services';
import type {
  ApiProblem,
  ClientDashboardSummary,
  ClientProfile,
  Transaction,
} from '@/types/api';

type ClientProfileFormState = {
  phone: string;
  email: string;
  date_of_birth: string;
  address: string;
  occupation: string;
  next_of_kin_name: string;
  next_of_kin_phone: string;
};

function flattenErrorList(value: unknown): string | null {
  if (Array.isArray(value)) return value.map(String).join(' ');
  if (typeof value === 'string') return value;
  return null;
}

function getProblemMessage(
  error: unknown,
  fallback = 'Unable to update your profile.',
) {
  const problem = error as ApiProblem;
  if (problem?.message) return problem.message;

  if (problem?.errors && typeof problem.errors === 'object') {
    const first = Object.values(problem.errors)
      .map(flattenErrorList)
      .find(Boolean);
    if (first) return first;
  }

  return fallback;
}

function profileFormFromRecord(
  profile?: ClientProfile | null,
): ClientProfileFormState {
  return {
    phone: profile?.phone ?? '',
    email: profile?.email ?? '',
    date_of_birth: profile?.date_of_birth ?? '',
    address: profile?.address ?? '',
    occupation: profile?.occupation ?? '',
    next_of_kin_name: profile?.next_of_kin_name ?? '',
    next_of_kin_phone: profile?.next_of_kin_phone ?? '',
  };
}

function ClientProfileFormCard({
  profile,
  onSaved,
  onCancel,
}: {
  profile?: ClientProfile | null;
  onSaved: () => Promise<void>;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState<ClientProfileFormState>(() =>
    profileFormFromRecord(profile),
  );
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    try {
      await clientsApi.updateMe({
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
      });
      toast.success('Profile updated');
      await onSaved();
    } catch (error) {
      toast.error(getProblemMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <div>
        <CardTitle>Edit contact details</CardTitle>
        <p className="mt-2 text-sm text-slate-500">
          Keep your phone number, address, and next-of-kin details current for branch service and loan processing.
        </p>
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

        <div className="flex flex-wrap gap-2">
          {onCancel ? (
            <Button
              type="button"
              className="btn-outline-secondary bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
              onClick={onCancel}
            >
              Cancel
            </Button>
          ) : null}
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save profile changes'}
          </Button>
          <Button
            type="button"
            className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
            onClick={() => {
              setForm(profileFormFromRecord(profile));
            }}
          >
            Reset form
          </Button>
        </div>
      </form>
  );
}

export default function ClientDashboardPage() {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const {
    data: dashboardData,
    error: dashboardError,
    isLoading: dashboardLoading,
    reload: reloadDashboard,
  } = useApiResource<ClientDashboardSummary>(dashboardApi.client);
  const {
    data: profileData,
    error: profileError,
    isLoading: profileLoading,
    reload: reloadProfile,
  } = useApiResource<ClientProfile>(clientsApi.me);

  if ((dashboardLoading && !dashboardData) || (profileLoading && !profileData)) {
    return <StateView title="Loading client dashboard..." />;
  }

  if (dashboardError && !dashboardData) {
    return (
      <StateView
        title="Could not load client dashboard"
        description={dashboardError}
        actionLabel="Retry"
        onAction={() => {
          void reloadDashboard();
        }}
      />
    );
  }

  if (profileError && !profileData) {
    return (
      <StateView
        title="Could not load your client profile"
        description={profileError}
        actionLabel="Retry"
        onAction={() => {
          void reloadProfile();
        }}
      />
    );
  }

  const rows = dashboardData?.recent_transactions ?? [];

  return (
    <div className="grid gap-6">
      <PageHeader
        title={clientName(profileData)}
        description={`Member ${profileData?.member_number ?? '-'} • ${profileData?.branch_name ?? 'Branch not assigned'}`}
      />

      {(dashboardError && dashboardData) || (profileError && profileData) ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Some client dashboard data could not be refreshed.
          <button
            type="button"
            className="ml-2 font-bold underline underline-offset-2"
            onClick={() => {
              void reloadDashboard();
              void reloadProfile();
            }}
          >
            Retry
          </button>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Savings balance"
          value={money(dashboardData?.total_savings_balance)}
        />
        <MetricCard
          label="Active loan balance"
          value={money(dashboardData?.active_loan_balance)}
        />
        <MetricCard
          label="Open applications"
          value={String(profileData?.loans_summary?.open_application_count ?? 0)}
        />
        <MetricCard
          label="Notifications"
          value={String(dashboardData?.notifications?.length ?? 0)}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Profile overview</CardTitle>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
              {profileData?.status ?? 'active'}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Contact
              </p>
              <p className="mt-1 font-semibold text-slate-900">
                {profileData?.phone || '-'}
              </p>
              <p className="text-sm text-slate-500">
                {profileData?.email || 'No email on profile'}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Assignment
              </p>
              <p className="mt-1 font-semibold text-slate-900">
                {profileData?.institution_name || '-'}
              </p>
              <p className="text-sm text-slate-500">
                {profileData?.branch_name || 'Branch not assigned'}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:col-span-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Next of kin
              </p>
              <p className="mt-1 font-semibold text-slate-900">
                {profileData?.next_of_kin_name || 'Not provided'}
              </p>
              <p className="text-sm text-slate-500">
                {profileData?.next_of_kin_phone || 'No next-of-kin phone on file'}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:col-span-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Profile metadata
              </p>
              <p className="mt-1 text-sm text-slate-700">
                Date of birth: {formatDate(profileData?.date_of_birth || undefined)}
              </p>
              <p className="text-sm text-slate-700">
                Occupation: {profileData?.occupation || '-'}
              </p>
              <p className="text-sm text-slate-700">
                Updated: {formatDate(profileData?.updated_at ?? profileData?.created_at)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="grid gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Profile actions</CardTitle>
              <p className="mt-2 text-sm text-slate-500">
                Update your contact details, address, and next-of-kin information from a dedicated modal form.
              </p>
            </div>
            <Button type="button" onClick={() => setIsProfileModalOpen(true)}>
              Edit profile
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Current phone
              </p>
              <p className="mt-1 font-semibold text-slate-900">
                {profileData?.phone || '-'}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Address
              </p>
              <p className="mt-1 font-semibold text-slate-900">
                {profileData?.address || 'No address on file'}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:col-span-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Next of kin
              </p>
              <p className="mt-1 font-semibold text-slate-900">
                {profileData?.next_of_kin_name || 'Not provided'}
              </p>
              <p className="text-sm text-slate-500">
                {profileData?.next_of_kin_phone || 'No next-of-kin phone on file'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="grid gap-4">
        <CardTitle>Recent transactions</CardTitle>
        <DataTable<Transaction>
          data={rows}
          emptyMessage="No recent transactions are available for your client account yet."
          columns={[
            { header: 'Reference', accessor: (row) => row.reference ?? row.id },
            {
              header: 'Type',
              accessor: (row) => row.category ?? row.type ?? 'Transaction',
            },
            { header: 'Amount', accessor: (row) => money(row.amount) },
            { header: 'Status', accessor: (row) => row.status ?? '-' },
          ]}
        />
      </Card>

      {isProfileModalOpen ? (
        <Modal
          open={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          size="lg"
          title="Update profile"
          description="Edit the client self-service contact and next-of-kin details."
        >
          <ClientProfileFormCard
            key={`${profileData?.id ?? 'client'}:${profileData?.updated_at ?? 'new'}`}
            profile={profileData}
            onSaved={async () => {
              await reloadProfile();
              setIsProfileModalOpen(false);
            }}
            onCancel={() => setIsProfileModalOpen(false)}
          />
        </Modal>
      ) : null}
    </div>
  );
}
