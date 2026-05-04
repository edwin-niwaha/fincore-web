'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowUpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
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

type PurchaseFormState = {
  accountId: string;
  shares: string;
  reference: string;
  notes: string;
};

export function SharePurchasePage() {
  const searchParams = useSearchParams();
  const initialAccountId = searchParams.get('account') || '';

  const [form, setForm] = useState<PurchaseFormState>({
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

  const loadRecentPurchases = useCallback(
    () => sharesApi.transactions.list({ type: 'purchase', ordering: '-created_at', page: 1 }),
    [],
  );

  const { data: accountsData, error: accountsError, isLoading: accountsLoading, reload } =
    useApiResource(loadAccounts);
  const { data: recentData, error: recentError } = useApiResource(loadRecentPurchases);

  const accounts = useMemo(
    () => (Array.isArray(accountsData) ? accountsData : []),
    [accountsData],
  ) as ShareAccount[];
  const recentPurchases = useMemo(
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
      setFormError('Select an active share account before posting the purchase.');
      return;
    }

    setFormError(null);
    setIsSaving(true);

    try {
      await sharesApi.accounts.purchase(form.accountId, {
        shares: Number(form.shares),
        reference: form.reference.trim(),
        notes: form.notes.trim(),
      });

      toast.success('Share purchase posted');
      setForm({
        accountId: form.accountId,
        shares: '',
        reference: '',
        notes: '',
      });
      await reload();
    } catch (saveError) {
      const message = getProblemMessage(saveError, 'Unable to post share purchase.');
      setFormError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SharesFeatureGate
      roles={shareCashRoles}
      unavailableTitle="Share purchases are not available"
      unavailableDescription="Only cash and operations roles can post share purchases."
    >
      <div className="grid gap-6">
        <SharesWorkspaceHeader
          title="Purchase shares"
          description="Post new share purchases directly into active share accounts."
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
              title="Purchase form"
              description="Select an active share account, then post the purchased shares and reference."
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
                      placeholder="Receipt or voucher number"
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
                    placeholder="Optional purchase narration."
                  />
                </Field>

                {formError ? <div className="alert alert-danger">{formError}</div> : null}

                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={isSaving}>
                    <ArrowUpCircle className="mr-2 h-4 w-4" />
                    {isSaving ? 'Posting...' : 'Post purchase'}
                  </Button>
                  {selectedAccount ? (
                    <Link href={`/shares/accounts/${selectedAccount.id}`}>
                      <Button
                        type="button"
                        className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                      >
                        Open account
                      </Button>
                    </Link>
                  ) : null}
                </div>
              </form>
            </SharesSectionCard>

            <div className="grid gap-4">
              <SharesSectionCard
                title="Selected account"
                description="Confirm the account before posting the transaction."
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
                        Current holdings
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {Number(selectedAccount.shares ?? 0).toLocaleString('en-UG')} shares worth{' '}
                        {money(selectedAccount.total_value)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                        Product
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {selectedAccount.product_name || '-'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <StateView
                    title="No account selected"
                    description="Choose an active share account to preview its holdings before posting the purchase."
                  />
                )}
              </SharesSectionCard>

              <SharesSectionCard
                title="Recent purchases"
                description="Latest posted share purchase entries."
              >
                {recentError ? (
                  <p className="text-sm text-rose-700">{recentError}</p>
                ) : recentPurchases.length ? (
                  <div className="grid gap-3">
                    {recentPurchases.slice(0, 5).map((row) => (
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
                    title="No purchases posted yet"
                    description="Completed share purchases will appear here after they are recorded."
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
