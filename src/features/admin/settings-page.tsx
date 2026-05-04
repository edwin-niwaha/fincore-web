'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  BadgeCheck,
  Building2,
  Globe,
  Landmark,
  LockKeyhole,
  Mail,
  MapPin,
  ShieldCheck,
  WalletCards,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/input';
import { StateView } from '@/components/ui/state-view';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  formSelectClassName,
  formatDate,
  organizationStatusOptions,
  roleLabel,
} from '@/features/admin/shared';
import { useAuth } from '@/features/auth/auth-provider';
import { useApiResource } from '@/hooks/use-api-resource';
import { moneyPrecise, unwrapList } from '@/lib/api/format';
import { adminApi, authApi, savingsApi } from '@/lib/api/services';
import type { ApiProblem, Institution, SavingsPolicy } from '@/types/api';

type InstitutionSettingsFormState = {
  name: string;
  code: string;
  email: string;
  phone: string;
  currency: string;
  status: string;
  postal_address: string;
  physical_address: string;
  website: string;
  statement_title: string;
};

type SavingsPolicyFormState = {
  minimum_balance: string;
  withdrawal_charge: string;
};

type PasswordFormState = {
  current_password: string;
  new_password: string;
  new_password_confirm: string;
};

const textareaClassName =
  'min-h-[120px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#127D61] focus:ring-4 focus:ring-emerald-100';

const emptyInstitutionForm: InstitutionSettingsFormState = {
  name: '',
  code: '',
  email: '',
  phone: '',
  currency: 'UGX',
  status: 'active',
  postal_address: '',
  physical_address: '',
  website: '',
  statement_title: 'ACCOUNT STATEMENT',
};

const emptyPolicyForm: SavingsPolicyFormState = {
  minimum_balance: '0.00',
  withdrawal_charge: '0.00',
};

const emptyPasswordForm: PasswordFormState = {
  current_password: '',
  new_password: '',
  new_password_confirm: '',
};

function getProblemMessage(error: unknown, fallback: string) {
  return (error as ApiProblem)?.message ?? fallback;
}

function institutionFormFromRecord(
  institution: Institution,
): InstitutionSettingsFormState {
  return {
    name: institution.name,
    code: institution.code,
    email: institution.email ?? '',
    phone: institution.phone ?? '',
    currency: institution.currency ?? 'UGX',
    status: institution.status ?? 'active',
    postal_address: institution.postal_address ?? '',
    physical_address: institution.physical_address ?? '',
    website: institution.website ?? '',
    statement_title: institution.statement_title ?? 'ACCOUNT STATEMENT',
  };
}

function policyFormFromRecord(policy: SavingsPolicy | null | undefined) {
  if (!policy) return emptyPolicyForm;
  return {
    minimum_balance: String(policy.minimum_balance ?? '0.00'),
    withdrawal_charge: String(policy.withdrawal_charge ?? '0.00'),
  };
}

function MetricCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="min-w-0 overflow-hidden p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
            {label}
          </p>
          <p className="mt-2 truncate text-lg font-black text-slate-950">
            {value}
          </p>
          <p className="mt-1 text-sm text-slate-500">{hint}</p>
        </div>
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-[#127D61] ring-1 ring-emerald-100">
          {icon}
        </span>
      </div>
    </Card>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-900">
        {value || '-'}
      </p>
    </div>
  );
}

export function SettingsPage() {
  const { user } = useAuth();
  const canManageSettings =
    user?.role === 'super_admin' || user?.role === 'institution_admin';
  const isSuperAdmin = user?.role === 'super_admin';

  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>(
    user?.institution ? String(user.institution) : '',
  );
  const [institutionForm, setInstitutionForm] = useState<InstitutionSettingsFormState>(
    emptyInstitutionForm,
  );
  const [policyForm, setPolicyForm] = useState<SavingsPolicyFormState>(
    emptyPolicyForm,
  );
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>(
    emptyPasswordForm,
  );
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [institutionError, setInstitutionError] = useState<string | null>(null);
  const [policyError, setPolicyError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSavingInstitution, setIsSavingInstitution] = useState(false);
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const loadInstitutions = useCallback(
    () => adminApi.institutions.list({ page_size: 200 }),
    [],
  );
  const {
    data: institutionsData,
    error: institutionsError,
    isLoading: institutionsLoading,
    reload: reloadInstitutions,
  } = useApiResource(loadInstitutions);

  const institutions = unwrapList(institutionsData);
  const resolvedSelectedInstitutionId =
    selectedInstitutionId ||
    (user?.institution ? String(user.institution) : '') ||
    (institutions[0] ? String(institutions[0].id) : '');

  const selectedInstitution =
    institutions.find(
      (institution) => String(institution.id) === resolvedSelectedInstitutionId,
    ) ?? null;

  const loadPolicy = useCallback(() => {
    if (!resolvedSelectedInstitutionId) {
      return Promise.resolve(null as SavingsPolicy | null);
    }

    return savingsApi.policy.get(
      isSuperAdmin ? { institution: resolvedSelectedInstitutionId } : undefined,
    );
  }, [isSuperAdmin, resolvedSelectedInstitutionId]);

  const {
    data: policyData,
    error: savingsPolicyError,
    isLoading: policyLoading,
    reload: reloadPolicy,
  } = useApiResource(loadPolicy);

  useEffect(() => {
    if (!selectedInstitution) return;
    queueMicrotask(() => {
      setInstitutionForm(institutionFormFromRecord(selectedInstitution));
      setInstitutionError(null);
      setLogoFile(null);
    });
  }, [selectedInstitution]);

  useEffect(() => {
    queueMicrotask(() => {
      setPolicyForm(policyFormFromRecord(policyData));
      setPolicyError(null);
    });
  }, [policyData]);

  const institutionPreview = !selectedInstitution
    ? null
    : {
        displayName: institutionForm.name.trim() || selectedInstitution.name,
        currency:
          institutionForm.currency.trim() ||
          selectedInstitution.currency ||
          'UGX',
        statementTitle:
          institutionForm.statement_title.trim() ||
          selectedInstitution.statement_title ||
          'ACCOUNT STATEMENT',
        postalAddress:
          institutionForm.postal_address.trim() ||
          selectedInstitution.postal_address ||
          '',
        physicalAddress:
          institutionForm.physical_address.trim() ||
          selectedInstitution.physical_address ||
          '',
        email: institutionForm.email.trim() || selectedInstitution.email || '',
        phone: institutionForm.phone.trim() || selectedInstitution.phone || '',
        website:
          institutionForm.website.trim() || selectedInstitution.website || '',
      };

  if (!canManageSettings) {
    return (
      <StateView
        title="Settings are not available"
        description="Only super admins and institution admins can access the settings workspace."
      />
    );
  }

  if (institutionsLoading && !institutionsData) {
    return <StateView title="Loading settings..." />;
  }

  if (institutionsError && !institutionsData) {
    return (
      <StateView
        title="Could not load settings"
        description={institutionsError}
        actionLabel="Retry"
        onAction={reloadInstitutions}
      />
    );
  }

  if (!selectedInstitution) {
    return (
      <StateView
        title="No institution in scope"
        description="Settings become available once your account is linked to an institution."
      />
    );
  }

  async function saveInstitutionSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingInstitution(true);
    setInstitutionError(null);

    try {
      if (!selectedInstitution) return;

      const formData = new FormData();
      formData.set('name', institutionForm.name.trim());
      formData.set('code', institutionForm.code.trim());
      formData.set('email', institutionForm.email.trim());
      formData.set('phone', institutionForm.phone.trim());
      formData.set('currency', institutionForm.currency.trim() || 'UGX');
      formData.set('status', institutionForm.status);
      formData.set('postal_address', institutionForm.postal_address.trim());
      formData.set('physical_address', institutionForm.physical_address.trim());
      formData.set('website', institutionForm.website.trim());
      formData.set('statement_title', institutionForm.statement_title.trim());
      if (logoFile) {
        formData.set('logo', logoFile);
      }

      await adminApi.institutions.update(selectedInstitution.id, formData);
      toast.success('Institution settings updated');
      await reloadInstitutions();
    } catch (error) {
      const message = getProblemMessage(
        error,
        'Unable to update institution settings.',
      );
      setInstitutionError(message);
      toast.error(message);
    } finally {
      setIsSavingInstitution(false);
    }
  }

  async function saveSavingsPolicy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingPolicy(true);
    setPolicyError(null);

    try {
      await savingsApi.policy.update(
        {
          minimum_balance: policyForm.minimum_balance.trim(),
          withdrawal_charge: policyForm.withdrawal_charge.trim(),
        },
        isSuperAdmin ? { institution: resolvedSelectedInstitutionId } : undefined,
      );
      toast.success('Savings policy updated');
      await reloadPolicy();
    } catch (error) {
      const message = getProblemMessage(
        error,
        'Unable to update the savings policy.',
      );
      setPolicyError(message);
      toast.error(message);
    } finally {
      setIsSavingPolicy(false);
    }
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingPassword(true);
    setPasswordError(null);

    try {
      if (passwordForm.new_password !== passwordForm.new_password_confirm) {
        throw {
          message: 'The new password and confirmation do not match.',
        } satisfies ApiProblem;
      }

      await authApi.changePassword(passwordForm);
      toast.success('Password updated');
      setPasswordForm(emptyPasswordForm);
    } catch (error) {
      const message = getProblemMessage(
        error,
        'Unable to update your password.',
      );
      setPasswordError(message);
      toast.error(message);
    } finally {
      setIsSavingPassword(false);
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Settings"
        description="Manage institution branding, statement profile, withdrawal policy, and administrator security in one workspace."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Institution"
          value={selectedInstitution.name}
          hint={selectedInstitution.code.toUpperCase()}
          icon={<Building2 className="h-5 w-5" />}
        />
        <MetricCard
          label="Active branches"
          value={String(selectedInstitution.active_branch_count ?? 0)}
          hint={`${selectedInstitution.branch_count ?? 0} branches in total`}
          icon={<MapPin className="h-5 w-5" />}
        />
        <MetricCard
          label="Minimum savings balance"
          value={moneyPrecise(policyData?.minimum_balance)}
          hint="Current withdrawal floor enforced by the savings policy."
          icon={<WalletCards className="h-5 w-5" />}
        />
        <MetricCard
          label="Withdrawal charge"
          value={moneyPrecise(policyData?.withdrawal_charge)}
          hint="Posted automatically on qualifying withdrawals."
          icon={<Landmark className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
        <div className="grid gap-6">
          <Card className="grid gap-5 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Institution profile and statement branding</CardTitle>
                <p className="mt-1 text-sm text-slate-500">
                  Update the core SACCO details that appear across statements, notices, and the shared workspace.
                </p>
              </div>
              <StatusBadge status={selectedInstitution.status} />
            </div>

            <form className="grid gap-5" onSubmit={saveInstitutionSettings}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Institution name">
                  <Input
                    value={institutionForm.name}
                    onChange={(event) =>
                      setInstitutionForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    required
                  />
                </Field>
                <Field label="Institution code">
                  <Input
                    value={institutionForm.code}
                    onChange={(event) =>
                      setInstitutionForm((current) => ({
                        ...current,
                        code: event.target.value,
                      }))
                    }
                    disabled={!isSuperAdmin}
                    required
                  />
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Email">
                  <Input
                    type="email"
                    value={institutionForm.email}
                    onChange={(event) =>
                      setInstitutionForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="Phone">
                  <Input
                    value={institutionForm.phone}
                    onChange={(event) =>
                      setInstitutionForm((current) => ({
                        ...current,
                        phone: event.target.value,
                      }))
                    }
                  />
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Currency">
                  <Input
                    value={institutionForm.currency}
                    onChange={(event) =>
                      setInstitutionForm((current) => ({
                        ...current,
                        currency: event.target.value,
                      }))
                    }
                    required
                  />
                </Field>
                <Field label="Status">
                  <select
                    className={formSelectClassName}
                    value={institutionForm.status}
                    disabled={!isSuperAdmin}
                    onChange={(event) =>
                      setInstitutionForm((current) => ({
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

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Statement title">
                  <Input
                    value={institutionForm.statement_title}
                    onChange={(event) =>
                      setInstitutionForm((current) => ({
                        ...current,
                        statement_title: event.target.value,
                      }))
                    }
                    placeholder="ACCOUNT STATEMENT"
                  />
                </Field>
                <Field label="Brand logo">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(event) =>
                      setLogoFile(event.target.files?.[0] ?? null)
                    }
                  />
                </Field>
              </div>

              <Field label="Postal address">
                <textarea
                  className={textareaClassName}
                  value={institutionForm.postal_address}
                  onChange={(event) =>
                    setInstitutionForm((current) => ({
                      ...current,
                      postal_address: event.target.value,
                    }))
                  }
                  placeholder="P.O. Box..."
                />
              </Field>

              <Field label="Physical address">
                <textarea
                  className={textareaClassName}
                  value={institutionForm.physical_address}
                  onChange={(event) =>
                    setInstitutionForm((current) => ({
                      ...current,
                      physical_address: event.target.value,
                    }))
                  }
                  placeholder="Branch building, street, district..."
                />
              </Field>

              <Field label="Website">
                <Input
                  value={institutionForm.website}
                  onChange={(event) =>
                    setInstitutionForm((current) => ({
                      ...current,
                      website: event.target.value,
                    }))
                  }
                  placeholder="https://example.org"
                />
              </Field>

              {institutionError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                  {institutionError}
                </div>
              ) : null}

              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                  onClick={() => {
                    setInstitutionForm(institutionFormFromRecord(selectedInstitution));
                    setInstitutionError(null);
                    setLogoFile(null);
                  }}
                >
                  Reset changes
                </Button>
                <Button type="submit" disabled={isSavingInstitution}>
                  {isSavingInstitution ? 'Saving...' : 'Save institution settings'}
                </Button>
              </div>
            </form>
          </Card>

          <Card className="grid gap-4 p-5">
            <div>
              <CardTitle>Statement preview</CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                This is the information members and staff will recognize on statements and exported account documents.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
              <div className="grid gap-3">
                <DetailRow label="Institution name" value={institutionPreview?.displayName} />
                <DetailRow label="Statement title" value={institutionPreview?.statementTitle} />
                <DetailRow label="Postal address" value={institutionPreview?.postalAddress} />
                <DetailRow label="Physical address" value={institutionPreview?.physicalAddress} />
              </div>
              <div className="grid gap-3">
                <DetailRow label="Currency" value={institutionPreview?.currency} />
                <DetailRow label="Email" value={institutionPreview?.email} />
                <DetailRow label="Phone" value={institutionPreview?.phone} />
                <DetailRow label="Website" value={institutionPreview?.website} />
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-6">
          <Card className="grid gap-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Administration scope</CardTitle>
                <p className="mt-1 text-sm text-slate-500">
                  Review the institution and role context currently driving your permissions.
                </p>
              </div>
              <ShieldCheck className="h-5 w-5 text-[#127D61]" />
            </div>

            {isSuperAdmin ? (
              <Field label="Institution in focus">
                <select
                  className={formSelectClassName}
                  value={resolvedSelectedInstitutionId}
                  onChange={(event) => setSelectedInstitutionId(event.target.value)}
                >
                  {institutions.map((institution) => (
                    <option key={institution.id} value={String(institution.id)}>
                      {institution.name} ({institution.code.toUpperCase()})
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}

            <div className="grid gap-3">
              <DetailRow label="Role" value={roleLabel(user?.role)} />
              <DetailRow label="Institution" value={selectedInstitution.display_name || selectedInstitution.name} />
              <DetailRow label="Branch scope" value={user?.branch_name || 'Institution-wide'} />
              <DetailRow label="Account email" value={user?.email} />
              <DetailRow
                label="Email verification"
                value={user?.is_email_verified ? 'Verified' : 'Pending'}
              />
              <DetailRow
                label="Last updated"
                value={formatDate(selectedInstitution.updated_at)}
              />
            </div>
          </Card>

          <Card className="grid gap-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Savings policy</CardTitle>
                <p className="mt-1 text-sm text-slate-500">
                  Control the live withdrawal floor and automatic charge used by the savings module.
                </p>
              </div>
              <WalletCards className="h-5 w-5 text-[#127D61]" />
            </div>

            <form className="grid gap-4" onSubmit={saveSavingsPolicy}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Minimum operating balance">
                  <Input
                    value={policyForm.minimum_balance}
                    onChange={(event) =>
                      setPolicyForm((current) => ({
                        ...current,
                        minimum_balance: event.target.value,
                      }))
                    }
                    inputMode="decimal"
                  />
                </Field>
                <Field label="Withdrawal charge">
                  <Input
                    value={policyForm.withdrawal_charge}
                    onChange={(event) =>
                      setPolicyForm((current) => ({
                        ...current,
                        withdrawal_charge: event.target.value,
                      }))
                    }
                    inputMode="decimal"
                  />
                </Field>
              </div>

              {savingsPolicyError ? (
                <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  {savingsPolicyError}
                </p>
              ) : null}

              {policyError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                  {policyError}
                </div>
              ) : null}

              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                  onClick={() => {
                    setPolicyForm(policyFormFromRecord(policyData));
                    setPolicyError(null);
                  }}
                >
                  Reset policy
                </Button>
                <Button type="submit" disabled={isSavingPolicy || policyLoading}>
                  {isSavingPolicy ? 'Saving...' : 'Save savings policy'}
                </Button>
              </div>
            </form>
          </Card>

          <Card className="grid gap-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Security</CardTitle>
                <p className="mt-1 text-sm text-slate-500">
                  Update your administrator password without leaving the workspace.
                </p>
              </div>
              <LockKeyhole className="h-5 w-5 text-[#127D61]" />
            </div>

            <form className="grid gap-4" onSubmit={savePassword}>
              <Field label="Current password">
                <Input
                  type="password"
                  value={passwordForm.current_password}
                  onChange={(event) =>
                    setPasswordForm((current) => ({
                      ...current,
                      current_password: event.target.value,
                    }))
                  }
                  required
                />
              </Field>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="New password">
                  <Input
                    type="password"
                    value={passwordForm.new_password}
                    onChange={(event) =>
                      setPasswordForm((current) => ({
                        ...current,
                        new_password: event.target.value,
                      }))
                    }
                    required
                  />
                </Field>
                <Field label="Confirm new password">
                  <Input
                    type="password"
                    value={passwordForm.new_password_confirm}
                    onChange={(event) =>
                      setPasswordForm((current) => ({
                        ...current,
                        new_password_confirm: event.target.value,
                      }))
                    }
                    required
                  />
                </Field>
              </div>

              {passwordError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                  {passwordError}
                </div>
              ) : null}

              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                  onClick={() => {
                    setPasswordForm(emptyPasswordForm);
                    setPasswordError(null);
                  }}
                >
                  Clear
                </Button>
                <Button type="submit" disabled={isSavingPassword}>
                  {isSavingPassword ? 'Saving...' : 'Update password'}
                </Button>
              </div>
            </form>
          </Card>

          <Card className="grid gap-4 p-5">
            <div>
              <CardTitle>Operational notes</CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                These controls now drive live institution and savings behavior. Statement exports, savings withdrawals, and user access follow the values saved here.
              </p>
            </div>

            <div className="grid gap-3">
              <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#127D61]" />
                <p className="text-sm text-slate-600">
                  Institution admins can update branding, contact, and savings policy settings only for their own institution. Super admins can switch institution context from this page.
                </p>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <Mail className="mt-0.5 h-5 w-5 shrink-0 text-[#127D61]" />
                <p className="text-sm text-slate-600">
                  Statement identity comes directly from the institution profile here, so member-facing exports stay aligned with the current SACCO branding.
                </p>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <Globe className="mt-0.5 h-5 w-5 shrink-0 text-[#127D61]" />
                <p className="text-sm text-slate-600">
                  Withdrawal rules are applied by the backend savings service, which means changes here take effect without needing a separate redeploy.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
