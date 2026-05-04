'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowDownCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { StateView } from '@/components/ui/state-view';
import { formatDate } from '@/features/admin/shared';
import { useApiResource } from '@/hooks/use-api-resource';
import { money } from '@/lib/api/format';
import { sharesApi } from '@/lib/api/services';
import type { ShareAccount, ShareTransaction } from '@/types/api';
import {
  SharesFeatureGate,
  SharesSectionCard,
  SharesWorkspaceHeader,
  getProblemMessage,
  shareCashRoles,
  shareTextareaClassName,
} from '@/features/shares/shared';

type RedemptionFormState = {
  accountId: string;
  shares: string;
  reference: string;
  notes: string;
};

export function ShareRedemptionPage() {
  const searchParams = useSearchParams();
  const initialAccountId = searchParams.get('account') || '';

  const [form, setForm] = useState<RedemptionFormState>({
    accountId: initialAccountId,
    shares: '',
    reference: '',
    notes: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadAccounts = useCallback(
    () => sharesApi.accounts.listAll({ status: 'active', ordering: 'account_number' }),
    [],
  );

  const loadRecentRedemptions = useCallback(
    () => sharesApi.transactions.list({ type: 'redeem', ordering: '-created_at', page: 1 }),
    [],
  );

  const { data: accountsData, error: accountsError, isLoading: accountsLoading, reload } =
    useApiResource(loadAccounts);
  const { data: recentData, error: recentError } = useApiResource(loadRecentRedemptions);

  const accounts = useMemo(
    () => (Array.isArray(accountsData) ? accountsData : []),
    [accountsData],
  ) as ShareAccount[];
  const recentRedemptions = useMemo(
    () =>
      Array.isArray(recentData)
        ? recentData
        : (recentData?.results ?? []),
    [recentData],
  ) as ShareTransaction[];

  const selectedAccount =
    accounts.find((account) => String(account.id) === form.accountId) ?? null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.accountId) {
      setFormError('Select an active share account before posting the redemption.');
      return;
    }

    setFormError(null);
    setIsSaving(true);

    try {
      await sharesApi.accounts.redeem(form.accountId, {
        shares: Number(form.shares),
        reference: form.reference.trim(),
        notes: form.notes.trim(),
      });

      toast.success('Share redemption posted');
      setForm({
        accountId: form.accountId,
        shares: '',
        reference: '',
        notes: '',
      });
      await reload();
    } catch (saveError) {
      const message = getProblemMessage(saveError, 'Unable to post share redemption.');
      setFormError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SharesFeatureGate
      roles={shareCashRoles}
      unavailableTitle="Share redemption is not available"
      unavailableDescription="Only cash and operations roles can post share redemptions."
    >
      <div className="grid gap-6">
        <SharesWorkspaceHeader
          title="Share redemption"
          description="Request or post share redemptions against active share accounts."
          actions={
            <Link href="/shares/accounts">
              <Button
                type="button"
                className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to accounts
              </Button>
            </Link>
          }
        />

        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Approval routing for redemptions is not implemented yet. Posting from this page creates a live redemption entry immediately for authorized staff.
        </div>

        {accountsLoading && !accounts.length ? (
          <StateView title="Loading active share accounts..." />
        ) : null}

        {accountsError ? (
          <StateView
            title="Could not load share accounts"
            description={accountsError}
            actionLabel="Retry"
            onAction={reload}
          />
        ) : null}

        {!accountsError ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
            <SharesSectionCard
              title="Redemption form"
              description="Select an active share account, then post the redeemed shares and reference."
            >
              <form className="grid gap-4" onSubmit={handleSubmit}>
                <Field label="Share account">
                  <select
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-950 shadow-sm outline-none transition focus:border-[#127D61] focus:ring-4 focus:ring-emerald-100"
                    value={form.accountId}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        accountId: event.target.value,
                      }))
                    }
                    required
                  >
                    <option value="">Select active share account</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={String(account.id)}>
                        {account.account_number} - {account.client_name} - {account.product_name}
                      </option>
                    ))}
                  </select>
                </Field>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Shares">
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      value={form.shares}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          shares: event.target.value,
                        }))
                      }
                      required
                    />
                  </Field>

                  <Field label="Reference">
                    <Input
                      value={form.reference}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          reference: event.target.value,
                        }))
                      }
                      placeholder="Redemption voucher or request number"
                      required
                    />
                  </Field>
                </div>

                <Field label="Narration">
                  <textarea
                    className={shareTextareaClassName}
                    value={form.notes}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                    placeholder="Optional redemption narration."
                  />
                </Field>

                {formError ? <div className="alert alert-danger">{formError}</div> : null}

                <Button type="submit" disabled={isSaving}>
                  <ArrowDownCircle className="mr-2 h-4 w-4" />
                  {isSaving ? 'Posting...' : 'Post redemption'}
                </Button>
              </form>
            </SharesSectionCard>

            <div className="grid gap-4">
              <SharesSectionCard
                title="Selected account"
                description="Confirm the holdings available for redemption."
              >
                {selectedAccount ? (
                  <div className="grid gap-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                        Member
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {selectedAccount.client_name}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                        Shares available
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {Number(selectedAccount.shares ?? 0).toLocaleString('en-UG')} shares
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                        Current value
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {money(selectedAccount.total_value)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <StateView
                    title="No account selected"
                    description="Choose an active share account to confirm available holdings before posting the redemption."
                  />
                )}
              </SharesSectionCard>

              <SharesSectionCard
                title="Recent redemptions"
                description="Latest posted redemptions from the share ledger."
              >
                {recentError ? (
                  <p className="text-sm text-rose-700">{recentError}</p>
                ) : recentRedemptions.length ? (
                  <div className="grid gap-3">
                    {recentRedemptions.slice(0, 5).map((row) => (
                      <div
                        key={row.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-bold text-slate-900">{row.client_name || 'Member'}</p>
                          <p className="text-sm font-semibold text-slate-900">
                            {money(row.amount)}
                          </p>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {Number(row.shares ?? 0).toLocaleString('en-UG')} shares on{' '}
                          {formatDate(row.created_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <StateView
                    title="No redemptions posted yet"
                    description="Completed redemptions will appear here after they are recorded."
                  />
                )}
              </SharesSectionCard>
            </div>
          </div>
        ) : null}
      </div>
    </SharesFeatureGate>
  );
}
