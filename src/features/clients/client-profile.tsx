'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  ArrowLeft,
  Banknote,
  BriefcaseBusiness,
  Landmark,
  ShieldCheck,
  UserRoundCog,
  WalletCards,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import type { Column } from '@/components/ui/data-table';
import { DataTable } from '@/components/ui/data-table';
import { Field } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { StateView } from '@/components/ui/state-view';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  formatDate,
  statusLabel,
} from '@/features/admin/shared';
import {
  clientTextareaClassName,
  getProblemMessage,
  kycLevelOptions,
  kycStatusOptions,
  riskRatingOptions,
} from '@/features/clients/shared';
import { useApiResource } from '@/hooks/use-api-resource';
import { clientName, money } from '@/lib/api/format';
import { clientsApi } from '@/lib/api/services';
import type {
  ClientLoanSnapshot,
  ClientProfile,
  ClientSavingsActivity,
  ClientStatusHistory,
  Transaction,
} from '@/types/api';

type SummaryTone = 'green' | 'slate' | 'amber' | 'blue';
type LifecycleActionKind = 'deactivate' | 'suspend' | 'reject' | 'close';

type LifecycleModalState = {
  action: LifecycleActionKind;
  reason: string;
};

type KycFormState = {
  kyc_status: string;
  kyc_level: string;
  risk_rating: string;
  is_watchlist_flagged: boolean;
  verification_comments: string;
};

const emptyKycForm: KycFormState = {
  kyc_status: 'pending',
  kyc_level: '',
  risk_rating: 'low',
  is_watchlist_flagged: false,
  verification_comments: '',
};

function DetailItem({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2">
      <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </dt>
      <dd className="mt-1 min-w-0 break-words text-sm font-semibold text-slate-900">
        {value || '-'}
      </dd>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  icon,
  tone = 'green',
}: {
  label: string;
  value: string;
  hint: string;
  icon: ReactNode;
  tone?: SummaryTone;
}) {
  const toneClassName: Record<SummaryTone, string> = {
    green: 'bg-emerald-50 text-[#127D61] ring-emerald-100',
    slate: 'bg-slate-100 text-slate-700 ring-slate-200',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
  };

  return (
    <Card className="min-w-0 overflow-hidden p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-bold uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-1 min-w-0 truncate text-sm font-semibold text-slate-900 tabular-nums">
            {value}
          </p>
        </div>

        <span
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${toneClassName[tone]}`}
        >
          {icon}
        </span>
      </div>

      <p className="mt-1 truncate text-xs text-slate-500">{hint}</p>
    </Card>
  );
}

function SnapshotBox({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 break-words text-lg font-black text-slate-900 tabular-nums">
        {value}
      </p>
      <p className="mt-1 break-words text-sm text-slate-500">{hint}</p>
    </div>
  );
}

function historyLabel(historyRow: ClientStatusHistory) {
  if (!historyRow.from_status) {
    return `Created as ${statusLabel(historyRow.to_status)}`;
  }
  return `${statusLabel(historyRow.from_status)} to ${statusLabel(historyRow.to_status)}`;
}

function lifecycleActionTitle(action: LifecycleActionKind) {
  if (action === 'deactivate') return 'Deactivate member';
  if (action === 'suspend') return 'Suspend member';
  if (action === 'reject') return 'Reject member';
  return 'Close member';
}

function lifecycleActionVerb(action: LifecycleActionKind) {
  if (action === 'deactivate') return 'Deactivate';
  if (action === 'suspend') return 'Suspend';
  if (action === 'reject') return 'Reject';
  return 'Close';
}

function lifecycleActionPastTense(action: LifecycleActionKind) {
  if (action === 'deactivate') return 'Deactivated';
  if (action === 'suspend') return 'Suspended';
  if (action === 'reject') return 'Rejected';
  return 'Closed';
}

export function ClientProfileView({ id }: { id: string }) {
  const loadClient = useCallback(() => clientsApi.getProfile(id), [id]);
  const { data, error, isLoading, reload } = useApiResource<ClientProfile>(loadClient);

  const [isActivating, setIsActivating] = useState(false);
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [kycForm, setKycForm] = useState<KycFormState>(emptyKycForm);
  const [kycError, setKycError] = useState<string | null>(null);
  const [isSubmittingKyc, setIsSubmittingKyc] = useState(false);
  const [lifecycleModal, setLifecycleModal] = useState<LifecycleModalState | null>(null);
  const [lifecycleError, setLifecycleError] = useState<string | null>(null);
  const [isSubmittingLifecycle, setIsSubmittingLifecycle] = useState(false);

  const statusHistory = data?.status_history ?? [];
  const clientStatus = data?.status ?? '';
  const canActivate =
    data?.kyc_status === 'verified' &&
    !['active', 'closed', 'rejected', 'blacklisted'].includes(clientStatus);
  const canDeactivate = clientStatus === 'active';
  const canSuspend = ['active', 'inactive', 'pending'].includes(clientStatus);
  const canReject = clientStatus === 'pending';
  const canClose = !['closed', 'rejected'].includes(clientStatus);
  const canVerifyKyc = clientStatus !== 'closed';

  const recentSavingsColumns: Column<ClientSavingsActivity>[] = [
    {
      header: 'Savings activity',
      accessor: (row) => (
        <div className="min-w-[150px]">
          <p className="font-bold capitalize text-slate-900">
            {(row.type ?? 'transaction').replaceAll('_', ' ')}
          </p>
          <p className="break-words text-xs text-slate-500">
            {row.account_number || row.reference || 'No reference'}
          </p>
        </div>
      ),
    },
    {
      header: 'Amount',
      accessor: (row) => (
        <span className="whitespace-nowrap font-bold tabular-nums">
          {money(row.amount)}
        </span>
      ),
      align: 'right',
    },
    {
      header: 'Balance after',
      accessor: (row) => (
        <span className="whitespace-nowrap font-bold tabular-nums text-[#127D61]">
          {money(row.balance_after)}
        </span>
      ),
      align: 'right',
    },
    {
      header: 'Date',
      accessor: (row) => <span className="whitespace-nowrap">{formatDate(row.created_at)}</span>,
    },
  ];

  const recentLoanColumns: Column<ClientLoanSnapshot>[] = [
    {
      header: 'Loan',
      accessor: (row) => (
        <div className="min-w-[150px]">
          <p className="font-bold text-slate-900">{row.product_name || 'Loan'}</p>
          <p className="text-xs text-slate-500">
            {row.term_months ? `${row.term_months} months` : 'Term not set'}
          </p>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Amount',
      accessor: (row) => <span className="whitespace-nowrap tabular-nums">{money(row.amount)}</span>,
      align: 'right',
    },
    {
      header: 'Outstanding',
      accessor: (row) => (
        <span className="whitespace-nowrap font-bold tabular-nums">
          {money(row.principal_balance)}
        </span>
      ),
      align: 'right',
    },
    {
      header: 'Date',
      accessor: (row) => (
        <span className="whitespace-nowrap">
          {formatDate(row.disbursed_at ?? row.created_at)}
        </span>
      ),
    },
  ];

  const recentTransactionColumns: Column<Transaction>[] = [
    {
      header: 'Transaction',
      accessor: (row) => (
        <div className="min-w-[150px]">
          <p className="break-words font-bold text-slate-900">{row.reference || 'Reference'}</p>
          <p className="text-xs text-slate-500">{row.category || 'General'}</p>
        </div>
      ),
    },
    {
      header: 'Direction',
      accessor: (row) => (
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
            row.direction === 'credit'
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-amber-100 text-amber-800'
          }`}
        >
          {statusLabel(row.direction)}
        </span>
      ),
    },
    {
      header: 'Amount',
      accessor: (row) => <span className="whitespace-nowrap font-bold tabular-nums">{money(row.amount)}</span>,
      align: 'right',
    },
    {
      header: 'Date',
      accessor: (row) => <span className="whitespace-nowrap">{formatDate(row.created_at ?? row.date)}</span>,
    },
  ];

  const lifecycleDescription = useMemo(() => {
    if (!lifecycleModal) {
      return '';
    }
    if (lifecycleModal.action === 'close') {
      return 'Closing checks open loans and savings before the member record can move to closed.';
    }
    if (lifecycleModal.action === 'reject') {
      return 'Use rejection for applications or registrations that should not proceed to activation.';
    }
    return 'Add a short reason so the lifecycle history remains clear for staff and audit review.';
  }, [lifecycleModal]);

  function openKycModal() {
    setKycError(null);
    setKycForm({
      kyc_status: data?.kyc_status || 'pending',
      kyc_level: data?.kyc_level || '',
      risk_rating: data?.risk_rating || 'low',
      is_watchlist_flagged: Boolean(data?.is_watchlist_flagged),
      verification_comments: data?.verification_comments || '',
    });
    setIsKycModalOpen(true);
  }

  function closeKycModal() {
    setIsKycModalOpen(false);
    setKycError(null);
    setKycForm(emptyKycForm);
  }

  function openLifecycleModal(action: LifecycleActionKind) {
    setLifecycleError(null);
    setLifecycleModal({
      action,
      reason: '',
    });
  }

  function closeLifecycleModal() {
    setLifecycleModal(null);
    setLifecycleError(null);
  }

  async function handleActivate() {
    if (!data?.id) return;
    setIsActivating(true);
    try {
      await clientsApi.activate(data.id);
      toast.success('Member activated');
      await reload();
    } catch (activateError) {
      toast.error(getProblemMessage(activateError, 'Unable to activate member.'));
    } finally {
      setIsActivating(false);
    }
  }

  async function submitLifecycleAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data?.id || !lifecycleModal) return;

    setIsSubmittingLifecycle(true);
    setLifecycleError(null);

    try {
      const payload = { reason: lifecycleModal.reason.trim() };
      if (lifecycleModal.action === 'deactivate') {
        await clientsApi.deactivate(data.id, payload);
      } else if (lifecycleModal.action === 'suspend') {
        await clientsApi.suspend(data.id, payload);
      } else if (lifecycleModal.action === 'reject') {
        await clientsApi.reject(data.id, payload);
      } else {
        await clientsApi.close(data.id, payload);
      }

      toast.success(`${lifecycleActionPastTense(lifecycleModal.action)} member`);
      closeLifecycleModal();
      await reload();
    } catch (lifecycleSubmitError) {
      const message = getProblemMessage(
        lifecycleSubmitError,
        `Unable to ${lifecycleModal.action} member.`,
      );
      setLifecycleError(message);
      toast.error(message);
    } finally {
      setIsSubmittingLifecycle(false);
    }
  }

  async function submitKyc(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data?.id) return;

    setIsSubmittingKyc(true);
    setKycError(null);

    try {
      await clientsApi.verifyKyc(data.id, {
        kyc_status: kycForm.kyc_status,
        kyc_level: kycForm.kyc_status === 'verified' ? kycForm.kyc_level : '',
        risk_rating: kycForm.risk_rating,
        is_watchlist_flagged: kycForm.is_watchlist_flagged,
        verification_comments: kycForm.verification_comments.trim(),
      });
      toast.success('KYC review updated');
      closeKycModal();
      await reload();
    } catch (kycSubmitError) {
      const message = getProblemMessage(kycSubmitError, 'Unable to update KYC review.');
      setKycError(message);
      toast.error(message);
    } finally {
      setIsSubmittingKyc(false);
    }
  }

  if (isLoading) return <StateView title="Loading member profile..." />;

  if (error) {
    return (
      <StateView
        title="Could not load member profile"
        description={error}
        actionLabel="Retry"
        onAction={reload}
      />
    );
  }

  return (
    <div className="grid min-w-0 gap-4 sm:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title={clientName(data)}
          description={`Member number ${data?.member_number ?? data?.id ?? '-'}`}
        />
        <Link
          href="/clients"
          className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to members
        </Link>
      </div>

      <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Savings balance"
          value={money(data?.savings_summary?.total_balance)}
          hint={`${data?.savings_summary?.active_account_count ?? 0} active accounts`}
          icon={<WalletCards className="h-5 w-5" />}
        />
        <SummaryCard
          label="Outstanding principal"
          value={money(data?.loans_summary?.outstanding_principal_balance)}
          hint={`${data?.loans_summary?.open_application_count ?? 0} open applications`}
          icon={<Landmark className="h-5 w-5" />}
          tone="blue"
        />
        <SummaryCard
          label="Net transaction flow"
          value={money(data?.transactions_summary?.net_flow)}
          hint={`${data?.transactions_summary?.count ?? 0} ledger entries`}
          icon={<Banknote className="h-5 w-5" />}
          tone="slate"
        />
        <SummaryCard
          label="Interest outstanding"
          value={money(data?.loans_summary?.outstanding_interest_balance)}
          hint={`${data?.loans_summary?.disbursed_loan_count ?? 0} disbursed loans`}
          icon={<BriefcaseBusiness className="h-5 w-5" />}
          tone="amber"
        />
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
        <Card className="grid min-w-0 gap-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Member profile</CardTitle>
            <StatusBadge status={data?.status} />
          </div>

          <dl className="grid min-w-0 gap-3 md:grid-cols-2">
            <DetailItem label="Institution" value={data?.institution_name || data?.institution_code || null} />
            <DetailItem label="Branch" value={data?.branch_name || null} />
            <DetailItem label="Membership type" value={data?.membership_type_display || null} />
            <DetailItem label="Joining date" value={formatDate(data?.joining_date || undefined)} />
            <DetailItem label="Phone" value={data?.phone || null} />
            <DetailItem label="Email" value={data?.email || null} />
            <DetailItem label="National ID" value={data?.national_id || null} />
            <DetailItem label="Passport" value={data?.passport_number || null} />
            <DetailItem label="Registration number" value={data?.registration_number || null} />
            <DetailItem label="Gender" value={data?.gender_display || null} />
            <DetailItem label="Date of birth" value={formatDate(data?.date_of_birth || undefined)} />
            <DetailItem label="Occupation" value={data?.occupation || null} />
            <DetailItem label="Employer" value={data?.employer || null} />
            <DetailItem label="Address" value={data?.address || null} />
            <DetailItem
              label="Next of kin"
              value={
                data?.next_of_kin_name
                  ? `${data.next_of_kin_name}${
                      data.next_of_kin_phone ? ` (${data.next_of_kin_phone})` : ''
                    }`
                  : data?.next_of_kin_phone || null
              }
            />
            <DetailItem label="Relationship" value={data?.next_of_kin_relationship || null} />
            <DetailItem
              label="Portal access"
              value={
                data?.user
                  ? data?.user_full_name && data?.user_email
                    ? `${data.user_full_name} (${data.user_email})`
                    : data?.user_full_name || data?.user_email || 'Linked user'
                  : 'Not linked'
              }
            />
            <DetailItem label="Created by" value={data?.created_by_email || 'System'} />
            <DetailItem label="Last updated by" value={data?.updated_by_email || 'System'} />
            <DetailItem label="Profile updated" value={formatDate(data?.updated_at ?? data?.created_at)} />
          </dl>
        </Card>

        <div className="grid min-w-0 gap-4">
          <Card className="grid min-w-0 gap-4 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <CardTitle>KYC and lifecycle</CardTitle>
              <ShieldCheck className="h-5 w-5 text-[#127D61]" />
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusBadge
                status={data?.kyc_status}
                label={`KYC ${data?.kyc_status_display || statusLabel(data?.kyc_status)}`}
              />
              {data?.risk_rating_display ? (
                <StatusBadge
                  status={data.risk_rating}
                  label={`${data.risk_rating_display} risk`}
                />
              ) : null}
              {data?.is_watchlist_flagged ? (
                <StatusBadge status="blacklisted" label="Watchlist flagged" />
              ) : null}
            </div>

            <dl className="grid min-w-0 gap-3">
              <DetailItem label="KYC level" value={data?.kyc_level_display || null} />
              <DetailItem label="Verified by" value={data?.verified_by_email || null} />
              <DetailItem label="Verification date" value={formatDate(data?.verified_at || undefined)} />
              <DetailItem label="Verification notes" value={data?.verification_comments || null} />
            </dl>

            <div className="flex flex-wrap gap-2">
              {canVerifyKyc ? (
                <Button type="button" onClick={openKycModal}>
                  Review KYC
                </Button>
              ) : null}
              {canActivate ? (
                <Button type="button" onClick={() => void handleActivate()} disabled={isActivating}>
                  {isActivating ? 'Activating...' : 'Activate'}
                </Button>
              ) : null}
              {canDeactivate ? (
                <Button
                  type="button"
                  className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                  onClick={() => openLifecycleModal('deactivate')}
                >
                  Deactivate
                </Button>
              ) : null}
              {canSuspend ? (
                <Button
                  type="button"
                  className="bg-amber-600 hover:bg-amber-700"
                  onClick={() => openLifecycleModal('suspend')}
                >
                  Suspend
                </Button>
              ) : null}
              {canReject ? (
                <Button
                  type="button"
                  className="bg-rose-600 hover:bg-rose-700"
                  onClick={() => openLifecycleModal('reject')}
                >
                  Reject
                </Button>
              ) : null}
              {canClose ? (
                <Button
                  type="button"
                  className="bg-slate-900 hover:bg-slate-800"
                  onClick={() => openLifecycleModal('close')}
                >
                  Close member
                </Button>
              ) : null}
            </div>
          </Card>

          <Card className="grid min-w-0 gap-4 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Financial snapshot</CardTitle>
              <UserRoundCog className="h-5 w-5 text-slate-500" />
            </div>
            <div className="grid min-w-0 gap-3">
              <SnapshotBox
                label="Savings activity"
                value={`${data?.savings_summary?.transaction_count ?? 0} transactions`}
                hint={`Total balance ${money(data?.savings_summary?.total_balance)}`}
              />
              <SnapshotBox
                label="Loan portfolio"
                value={`${data?.loans_summary?.application_count ?? 0} applications`}
                hint={`Requested ${money(data?.loans_summary?.total_requested_amount)}`}
              />
              <SnapshotBox
                label="Transaction mix"
                value={`Credits ${money(data?.transactions_summary?.total_credits)}`}
                hint={`Debits ${money(data?.transactions_summary?.total_debits)}`}
              />
            </div>
          </Card>
        </div>
      </div>

      <Card className="grid min-w-0 gap-4 p-4 sm:p-5">
        <CardTitle>Lifecycle history</CardTitle>
        {statusHistory.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {statusHistory.map((historyRow) => (
              <article
                key={historyRow.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold text-slate-900">{historyLabel(historyRow)}</p>
                  <StatusBadge status={historyRow.to_status} />
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {historyRow.reason || 'No reason recorded.'}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {historyRow.changed_by_email || 'System'} on {formatDate(historyRow.created_at)}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <StateView
            title="No lifecycle history yet"
            description="Status transitions will appear here once the member moves through review and approval actions."
          />
        )}
      </Card>

      <Card className="grid min-w-0 gap-4 p-4 sm:p-5">
        <CardTitle>Recent savings</CardTitle>
        <div className="min-w-0 overflow-x-auto">
          <DataTable<ClientSavingsActivity>
            data={data?.recent_savings_transactions ?? []}
            columns={recentSavingsColumns}
            emptyMessage="No savings activity has been recorded for this member."
          />
        </div>
      </Card>

      <Card className="grid min-w-0 gap-4 p-4 sm:p-5">
        <CardTitle>Recent loans</CardTitle>
        <div className="min-w-0 overflow-x-auto">
          <DataTable<ClientLoanSnapshot>
            data={data?.recent_loans ?? []}
            columns={recentLoanColumns}
            emptyMessage="No loan applications have been recorded for this member."
          />
        </div>
      </Card>

      <Card className="grid min-w-0 gap-4 p-4 sm:p-5">
        <CardTitle>Recent transactions</CardTitle>
        <div className="min-w-0 overflow-x-auto">
          <DataTable<Transaction>
            data={data?.recent_transactions ?? []}
            columns={recentTransactionColumns}
            emptyMessage="No transactions have been recorded for this member."
          />
        </div>
      </Card>

      <Modal
        open={isKycModalOpen}
        onClose={closeKycModal}
        title="Review KYC"
        description="Capture the current KYC decision, rating, and watchlist status for this member."
        footer={
          <>
            <Button
              type="button"
              className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
              onClick={closeKycModal}
            >
              Cancel
            </Button>
            <Button form="member-kyc-form" type="submit" disabled={isSubmittingKyc}>
              {isSubmittingKyc ? 'Saving...' : 'Save KYC review'}
            </Button>
          </>
        }
      >
        <form className="grid gap-4" id="member-kyc-form" onSubmit={submitKyc}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="KYC status">
              <select
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-950 shadow-sm outline-none transition focus:border-[#127D61] focus:ring-4 focus:ring-emerald-100"
                value={kycForm.kyc_status}
                onChange={(event) =>
                  setKycForm((current) => ({
                    ...current,
                    kyc_status: event.target.value,
                    kyc_level: event.target.value === 'verified' ? current.kyc_level : '',
                  }))
                }
              >
                {kycStatusOptions
                  .filter((option) => option.value !== 'all')
                  .map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
              </select>
            </Field>

            <Field label="Risk rating">
              <select
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-950 shadow-sm outline-none transition focus:border-[#127D61] focus:ring-4 focus:ring-emerald-100"
                value={kycForm.risk_rating}
                onChange={(event) =>
                  setKycForm((current) => ({
                    ...current,
                    risk_rating: event.target.value,
                  }))
                }
              >
                {riskRatingOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="KYC level">
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-950 shadow-sm outline-none transition focus:border-[#127D61] focus:ring-4 focus:ring-emerald-100"
              value={kycForm.kyc_level}
              onChange={(event) =>
                setKycForm((current) => ({
                  ...current,
                  kyc_level: event.target.value,
                }))
              }
              disabled={kycForm.kyc_status !== 'verified'}
            >
              {kycLevelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={kycForm.is_watchlist_flagged}
              onChange={(event) =>
                setKycForm((current) => ({
                  ...current,
                  is_watchlist_flagged: event.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-slate-300 text-[#127D61] focus:ring-[#127D61]"
            />
            Flag this member on the watchlist
          </label>

          <Field label="Verification comments">
            <textarea
              className={clientTextareaClassName}
              value={kycForm.verification_comments}
              onChange={(event) =>
                setKycForm((current) => ({
                  ...current,
                  verification_comments: event.target.value,
                }))
              }
              placeholder="Add notes for the KYC review, expiry follow-up, or rejection reasons."
            />
          </Field>

          {kycError ? <div className="alert alert-danger">{kycError}</div> : null}
        </form>
      </Modal>

      <Modal
        open={Boolean(lifecycleModal)}
        onClose={closeLifecycleModal}
        title={lifecycleModal ? lifecycleActionTitle(lifecycleModal.action) : 'Update member'}
        description={lifecycleDescription}
        footer={
          <>
            <Button
              type="button"
              className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
              onClick={closeLifecycleModal}
            >
              Cancel
            </Button>
            <Button
              form="member-lifecycle-form"
              type="submit"
              disabled={isSubmittingLifecycle}
            >
              {isSubmittingLifecycle
                ? 'Saving...'
                : lifecycleModal
                  ? lifecycleActionVerb(lifecycleModal.action)
                  : 'Save'}
            </Button>
          </>
        }
      >
        <form className="grid gap-4" id="member-lifecycle-form" onSubmit={submitLifecycleAction}>
          <Field label="Reason">
            <textarea
              className={clientTextareaClassName}
              value={lifecycleModal?.reason ?? ''}
              onChange={(event) =>
                setLifecycleModal((current) =>
                  current
                    ? {
                        ...current,
                        reason: event.target.value,
                      }
                    : current,
                )
              }
              placeholder="Add a brief reason for this lifecycle change."
            />
          </Field>

          {lifecycleError ? (
            <div className="alert alert-danger">{lifecycleError}</div>
          ) : null}
        </form>
      </Modal>
    </div>
  );
}
