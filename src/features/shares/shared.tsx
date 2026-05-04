'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { BarChart3, FileText, Settings2, WalletCards } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { StateView } from '@/components/ui/state-view';
import { useAuth } from '@/features/auth/auth-provider';
import { formSelectClassName } from '@/features/admin/shared';
import type { ApiProblem } from '@/types/api';
import type { Role } from '@/types/roles';

export const shareViewerRoles: Role[] = [
  'super_admin',
  'institution_admin',
  'branch_manager',
  'loan_officer',
  'accountant',
  'teller',
];

export const shareTransactionRoles: Role[] = [
  'super_admin',
  'institution_admin',
  'branch_manager',
  'accountant',
  'teller',
];

export const shareCashRoles: Role[] = [...shareTransactionRoles];

export const shareProductManagerRoles: Role[] = [
  'super_admin',
  'institution_admin',
  'branch_manager',
  'accountant',
];

export const shareApprovalRoles: Role[] = [
  'super_admin',
  'institution_admin',
  'branch_manager',
  'accountant',
];

export const shareSettingsRoles: Role[] = [
  'super_admin',
  'institution_admin',
  'branch_manager',
];

export const shareStatusOptions = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
  { value: 'closed', label: 'Closed' },
] as const;

export const shareProductStatusOptions = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
] as const;

export const shareTransactionTypeOptions = [
  { value: 'all', label: 'All transaction types' },
  { value: 'purchase', label: 'Purchases' },
  { value: 'redeem', label: 'Redemptions' },
  { value: 'transfer_in', label: 'Transfer in' },
  { value: 'transfer_out', label: 'Transfer out' },
  { value: 'dividend', label: 'Dividends' },
] as const;

export const shareTextareaClassName =
  'min-h-[120px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[#127D61] focus:ring-4 focus:ring-emerald-100';

export const shareQuickLinks = [
  { href: '/shares/dashboard', label: 'Dashboard' },
  { href: '/shares/products', label: 'Share products' },
  { href: '/shares/accounts', label: 'Share accounts' },
  { href: '/shares/transactions', label: 'Share transactions' },
  { href: '/shares/purchase', label: 'Purchase shares' },
  { href: '/shares/redemption', label: 'Share redemption' },
] as const;

export function canAccessShareFeature(
  role: Role | null | undefined,
  allowedRoles: Role[],
) {
  return Boolean(role && allowedRoles.includes(role));
}

function flattenErrorList(value: unknown): string | null {
  if (Array.isArray(value)) {
    return value.map(String).join(' ');
  }
  if (typeof value === 'string') {
    return value;
  }
  return null;
}

export function getProblemMessage(
  error: unknown,
  fallback = 'Unable to save shares changes.',
) {
  const problem = error as ApiProblem;
  if (problem?.message) {
    return problem.message;
  }

  if (problem?.errors && typeof problem.errors === 'object') {
    const first = Object.values(problem.errors)
      .map(flattenErrorList)
      .find(Boolean);
    if (first) {
      return first;
    }
  }

  return fallback;
}

export function SharesFeatureUnavailable({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return <StateView title={title} description={description} />;
}

export function SharesPlaceholderPage({
  title,
  description,
  eyebrow = 'Shares workflow',
  summary,
  liveRoutes = [],
  backlog = [],
}: {
  title: string;
  description: string;
  eyebrow?: string;
  summary: string;
  liveRoutes?: Array<{ href: string; label: string }>;
  backlog?: string[];
}) {
  const activeLinks = liveRoutes.length ? liveRoutes : [...shareQuickLinks];

  return (
    <div className="grid gap-6">
      <PageHeader title={title} description={description} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <Card className="grid gap-4 p-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
              {eyebrow}
            </p>
            <h2 className="mt-2 text-xl font-black text-slate-900">
              Backend workflow still in progress
            </h2>
            <p className="mt-2 text-sm text-slate-600">{summary}</p>
          </div>

          {backlog.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {backlog.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                >
                  {item}
                </div>
              ))}
            </div>
          ) : null}
        </Card>

        <div className="grid gap-4">
          <Card className="grid gap-3 p-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-[#127D61]">
                <WalletCards className="h-5 w-5" />
              </span>
              <div>
                <CardTitle>Live now</CardTitle>
                <p className="text-sm text-slate-500">
                  Use the active shares pages while this workflow is completed.
                </p>
              </div>
            </div>

            <div className="grid gap-2">
              {activeLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-[#127D61]"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </Card>

          <Card className="grid gap-3 p-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
                <BarChart3 className="h-5 w-5" />
              </span>
              <div>
                <CardTitle>Recommended next step</CardTitle>
                <p className="text-sm text-slate-500">
                  Complete the supporting backend workflow and replace this placeholder with a live queue or transaction page.
                </p>
              </div>
            </div>
            <Button
              type="button"
              className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              Review current scope
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function SharesFeatureGate({
  roles = shareViewerRoles,
  unavailableTitle,
  unavailableDescription,
  children,
}: {
  roles?: Role[];
  unavailableTitle: string;
  unavailableDescription: string;
  children: ReactNode;
}) {
  const { user } = useAuth();
  const role = user?.role ?? null;

  if (!role || role === 'client') {
    return (
      <SharesFeatureUnavailable
        title={unavailableTitle}
        description="Only staff roles can access the shares workspace."
      />
    );
  }

  if (!canAccessShareFeature(role, roles)) {
    return (
      <SharesFeatureUnavailable
        title={unavailableTitle}
        description={unavailableDescription}
      />
    );
  }

  return <>{children}</>;
}

export function SharesWorkspaceHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <PageHeader title={title} description={description} />
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function SharesRouteLinks() {
  return (
    <div className="flex flex-wrap gap-2">
      {shareQuickLinks.map((link) => (
        <Link key={link.href} href={link.href}>
          <Button
            type="button"
            className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
          >
            {link.label}
          </Button>
        </Link>
      ))}
    </div>
  );
}

export function SharesMiniStat({
  label,
  value,
  hint,
  icon = <FileText className="h-5 w-5" />,
  tone = 'emerald',
}: {
  label: string;
  value: string;
  hint: string;
  icon?: ReactNode;
  tone?: 'emerald' | 'sky' | 'amber' | 'slate';
}) {
  const toneClassName: Record<typeof tone, string> = {
    emerald: 'bg-emerald-50 text-[#127D61]',
    sky: 'bg-sky-50 text-sky-700',
    amber: 'bg-amber-50 text-amber-700',
    slate: 'bg-slate-100 text-slate-700',
  };

  return (
    <Card className="grid gap-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
            {label}
          </p>
          <p className="mt-2 text-lg font-black text-slate-900">{value}</p>
        </div>
        <span
          className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${toneClassName[tone]}`}
        >
          {icon}
        </span>
      </div>
      <p className="text-sm text-slate-500">{hint}</p>
    </Card>
  );
}

export function SharesSectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card className="grid gap-4 p-5">
      <div>
        <CardTitle>{title}</CardTitle>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      {children}
    </Card>
  );
}

export function SharesSettingsNote() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
      Approval thresholds, dividend rules, and GL mappings are not yet wired to dedicated shares settings endpoints.
    </div>
  );
}

export const shareSettingsIcon = <Settings2 className="h-5 w-5" />;
export const shareSelectClassName = formSelectClassName;
