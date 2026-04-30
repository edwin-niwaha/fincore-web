'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { StateView } from '@/components/ui/state-view';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDate } from '@/features/admin/shared';
import { useApiResource } from '@/hooks/use-api-resource';
import { selfServiceApi } from '@/lib/api/services';
import type { ClientProfile } from '@/types/api';
import { SelfServiceProfileEditorCard } from './profile-editor-card';

export function SelfServiceProfilePage() {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const { data, error, isLoading, reload } = useApiResource<ClientProfile>(
    selfServiceApi.profile.get,
  );

  if (isLoading && !data) {
    return <StateView title="Loading your profile..." />;
  }

  if (error && !data) {
    return (
      <StateView
        title="Could not load your profile"
        description={error}
        actionLabel="Retry"
        onAction={() => {
          void reload();
        }}
      />
    );
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="My profile"
          description="Review your self-service member profile and keep your contact details current."
        />
        <Button type="button" onClick={() => setIsEditOpen(true)}>
          Edit profile
        </Button>
      </div>

      {error && data ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Profile refresh failed. The current data is still shown below.
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

      <Card className="grid gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{data?.full_name || 'Client profile'}</CardTitle>
            <p className="mt-2 text-sm text-slate-500">
              Member {data?.member_number ?? data?.client_number ?? '-'}
            </p>
          </div>
          <StatusBadge status={data?.status} />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ProfileBlock
            label="Phone"
            primary={data?.phone || '-'}
            secondary="Safe to update"
          />
          <ProfileBlock
            label="Email"
            primary={data?.email || 'No email on file'}
            secondary="Safe to update"
          />
          <ProfileBlock
            label="Address"
            primary={data?.address || 'No address on file'}
            secondary="Safe to update"
          />
          <ProfileBlock
            label="Gender"
            primary={data?.gender_display || '-'}
            secondary={`Born ${formatDate(data?.date_of_birth ?? undefined)}`}
          />
          <ProfileBlock
            label="Occupation / business"
            primary={data?.occupation || '-'}
            secondary="Read only in self-service"
          />
          <ProfileBlock
            label="Next of kin"
            primary={data?.next_of_kin_name || 'Not provided'}
            secondary={data?.next_of_kin_phone || 'No next-of-kin phone on file'}
          />
          <ProfileBlock
            label="Institution"
            primary={data?.institution_name || '-'}
            secondary={data?.institution_code || 'No institution code'}
          />
          <ProfileBlock
            label="Branch"
            primary={data?.branch_name || '-'}
            secondary={data?.branch_code || 'No branch code'}
          />
          <ProfileBlock
            label="Updated"
            primary={formatDate(data?.updated_at)}
            secondary={`Created ${formatDate(data?.created_at)}`}
          />
        </div>
      </Card>

      {isEditOpen ? (
        <Modal
          open={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          size="lg"
          title="Edit profile"
          description="Only your phone number, email address, and address can be changed from self-service."
        >
          <SelfServiceProfileEditorCard
            profile={data}
            onSaved={async () => {
              await reload();
              setIsEditOpen(false);
            }}
            onCancel={() => setIsEditOpen(false)}
          />
        </Modal>
      ) : null}
    </div>
  );
}

function ProfileBlock({
  label,
  primary,
  secondary,
}: {
  label: string;
  primary: string;
  secondary?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 font-semibold text-slate-900">{primary}</p>
      {secondary ? (
        <p className="text-sm text-slate-500">{secondary}</p>
      ) : null}
    </div>
  );
}
