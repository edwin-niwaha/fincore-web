'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Loader2, Search } from 'lucide-react';
import {
  visibleNavGroupsForRole,
  type NavGroup,
  type NavItem,
} from '@/components/layout/nav-config';
import { formatDate, statusLabel } from '@/features/admin/shared';
import { useAuth } from '@/features/auth/auth-provider';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { money, unwrapList } from '@/lib/api/format';
import {
  clientsApi,
  loanApi,
  savingsApi,
  selfServiceApi,
  sharesApi,
} from '@/lib/api/services';
import { cn } from '@/lib/utils/cn';
import type {
  Client,
  LoanApplication,
  SavingsAccount,
  ShareAccount,
  Transaction,
} from '@/types/api';
import type { Role } from '@/types/roles';

type SearchItem = {
  key: string;
  title: string;
  subtitle: string;
  href: string;
  meta?: string;
};

type SearchSection = {
  key: string;
  title: string;
  items: SearchItem[];
};

function searchPlaceholder(role?: Role | null) {
  if (role === 'client') {
    return 'Search your workspace, loans, and savings...';
  }

  if (role === 'super_admin' || role === 'institution_admin') {
    return 'Search members, savings, loans, shares, and settings...';
  }

  return 'Search members, accounts, loans, and workspaces...';
}

function matchesNavItem(item: NavItem, group: NavGroup, query: string) {
  const text = [
    item.label,
    item.description,
    group.label,
    item.href,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return text.includes(query.toLowerCase());
}

function navSectionsForRole(role?: Role | null, query?: string) {
  const groups = visibleNavGroupsForRole(role);
  const normalizedQuery = query?.trim().toLowerCase() ?? '';

  const items = groups.flatMap((group) =>
    group.items
      .filter((item) =>
        normalizedQuery ? matchesNavItem(item, group, normalizedQuery) : true,
      )
      .map<SearchItem>((item) => ({
        key: `nav-${item.href}`,
        title: item.label,
        subtitle: item.description || `${group.label} workspace`,
        href: item.href,
        meta: group.label,
      })),
  );

  return items.slice(0, normalizedQuery ? 8 : 6);
}

function buildClientSearchSections(
  savingsRows: SavingsAccount[],
  applicationRows: LoanApplication[],
  loanRows: LoanApplication[],
  transactionRows: Transaction[],
) {
  const sections: SearchSection[] = [];

  const savingsItems = savingsRows.slice(0, 4).map<SearchItem>((row) => ({
    key: `client-savings-${row.id}`,
    title: row.account_number || 'Savings account',
    subtitle: `${row.status ? statusLabel(row.status) : 'Savings'} balance ${money(row.balance)}`,
    href: '/self-service/savings',
    meta: row.last_transaction_at
      ? `Updated ${formatDate(row.last_transaction_at)}`
      : undefined,
  }));

  if (savingsItems.length) {
    sections.push({
      key: 'client-savings',
      title: 'My savings',
      items: savingsItems,
    });
  }

  const applicationItems = applicationRows.slice(0, 4).map<SearchItem>((row) => ({
    key: `client-application-${row.id}`,
    title: row.product_name || 'Loan application',
    subtitle: `${statusLabel(row.status)} for ${money(row.amount ?? row.requested_amount)}`,
    href: '/self-service/loan-applications',
    meta: row.created_at ? `Requested ${formatDate(row.created_at)}` : undefined,
  }));

  if (applicationItems.length) {
    sections.push({
      key: 'client-applications',
      title: 'Loan applications',
      items: applicationItems,
    });
  }

  const loanItems = loanRows.slice(0, 4).map<SearchItem>((row) => ({
    key: `client-loan-${row.id}`,
    title: row.product_name || 'Loan account',
    subtitle: `${statusLabel(row.status)} outstanding ${money(row.outstanding_balance ?? row.principal_balance)}`,
    href: '/self-service/loans',
    meta: row.disbursed_at ? `Disbursed ${formatDate(row.disbursed_at)}` : undefined,
  }));

  if (loanItems.length) {
    sections.push({
      key: 'client-loans',
      title: 'My loans',
      items: loanItems,
    });
  }

  const transactionItems = transactionRows.slice(0, 4).map<SearchItem>((row) => ({
    key: `client-transaction-${row.id}`,
    title: row.reference || row.type_label || 'Transaction',
    subtitle: `${row.direction_label || statusLabel(row.direction)} ${money(row.amount)}`,
    href: '/self-service/transactions',
    meta: formatDate(row.created_at ?? row.date),
  }));

  if (transactionItems.length) {
    sections.push({
      key: 'client-transactions',
      title: 'Transactions',
      items: transactionItems,
    });
  }

  return sections;
}

function buildStaffSearchSections(
  clientRows: Client[],
  savingsRows: SavingsAccount[],
  loanRows: LoanApplication[],
  shareRows: ShareAccount[],
) {
  const sections: SearchSection[] = [];

  const memberItems = clientRows.slice(0, 4).map<SearchItem>((row) => ({
    key: `member-${row.id}`,
    title: row.full_name || `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim() || 'Member',
    subtitle: [
      row.member_number || row.client_number || row.member_no,
      row.phone,
      row.branch_name,
    ]
      .filter(Boolean)
      .join(' • ') || 'Member profile',
    href: `/clients/${row.id}`,
    meta: row.status ? statusLabel(row.status) : undefined,
  }));

  if (memberItems.length) {
    sections.push({
      key: 'members',
      title: 'Members',
      items: memberItems,
    });
  }

  const savingsItems = savingsRows.slice(0, 4).map<SearchItem>((row) => ({
    key: `savings-${row.id}`,
    title: row.account_number || 'Savings account',
    subtitle: [
      row.client_name,
      row.client_member_number,
      `Balance ${money(row.balance)}`,
    ]
      .filter(Boolean)
      .join(' • '),
    href: `/savings?account=${row.id}${
      row.account_number
        ? `&search=${encodeURIComponent(row.account_number)}`
        : ''
    }`,
    meta: row.status ? statusLabel(row.status) : undefined,
  }));

  if (savingsItems.length) {
    sections.push({
      key: 'savings',
      title: 'Savings accounts',
      items: savingsItems,
    });
  }

  const loanItems = loanRows.slice(0, 4).map<SearchItem>((row) => ({
    key: `loan-${row.id}`,
    title: row.product_name || 'Loan application',
    subtitle: [
      row.client_name,
      row.client_member_number,
      money(row.amount ?? row.requested_amount),
    ]
      .filter(Boolean)
      .join(' • '),
    href: `/loans/applications?loan=${row.id}`,
    meta: row.status ? statusLabel(row.status) : undefined,
  }));

  if (loanItems.length) {
    sections.push({
      key: 'loans',
      title: 'Loan pipeline',
      items: loanItems,
    });
  }

  const shareItems = shareRows.slice(0, 4).map<SearchItem>((row) => ({
    key: `share-${row.id}`,
    title: row.account_number || row.product_name || 'Share account',
    subtitle: [
      row.client_name,
      row.client_member_number,
      `${row.shares ?? 0} shares`,
    ]
      .filter(Boolean)
      .join(' • '),
    href: `/shares/accounts/${row.id}`,
    meta: row.status ? statusLabel(row.status) : undefined,
  }));

  if (shareItems.length) {
    sections.push({
      key: 'shares',
      title: 'Share accounts',
      items: shareItems,
    });
  }

  return sections;
}

export function HeaderSearch({ className }: { className?: string }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const role = user?.role ?? null;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const requestIdRef = useRef(0);

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [sections, setSections] = useState<SearchSection[]>([]);

  const debouncedQuery = useDebouncedValue(query.trim(), 250);

  const quickLinks = useMemo(
    () => navSectionsForRole(role, debouncedQuery),
    [debouncedQuery, role],
  );

  useEffect(() => {
    queueMicrotask(() => {
      setOpen(false);
    });
  }, [pathname]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    if (!open || debouncedQuery.length < 2) {
      requestIdRef.current += 1;
      queueMicrotask(() => {
        setSections([]);
        setIsSearching(false);
        setSearchError(null);
      });
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    queueMicrotask(() => {
      setIsSearching(true);
      setSearchError(null);
    });

    async function loadSearch() {
      try {
        if (role === 'client') {
          const [savingsResult, applicationResult, loanResult, transactionResult] =
            await Promise.allSettled([
              selfServiceApi.savings.list({ search: debouncedQuery, page: 1 }),
              selfServiceApi.loanApplications.list({
                search: debouncedQuery,
                page: 1,
              }),
              selfServiceApi.loans.list({ search: debouncedQuery, page: 1 }),
              selfServiceApi.transactions.list({
                search: debouncedQuery,
                page: 1,
              }),
            ]);

          if (requestId !== requestIdRef.current) return;

          const nextSections = buildClientSearchSections(
            savingsResult.status === 'fulfilled'
              ? unwrapList(savingsResult.value)
              : [],
            applicationResult.status === 'fulfilled'
              ? unwrapList(applicationResult.value)
              : [],
            loanResult.status === 'fulfilled' ? unwrapList(loanResult.value) : [],
            transactionResult.status === 'fulfilled'
              ? unwrapList(transactionResult.value)
              : [],
          );

          setSections(nextSections);

          if (
            savingsResult.status === 'rejected' &&
            applicationResult.status === 'rejected' &&
            loanResult.status === 'rejected' &&
            transactionResult.status === 'rejected'
          ) {
            setSearchError('Search is temporarily unavailable.');
          }

          return;
        }

        const [clientsResult, savingsResult, loansResult, sharesResult] =
          await Promise.allSettled([
            clientsApi.list({ search: debouncedQuery, page: 1 }),
            savingsApi.accounts.list({ search: debouncedQuery, page: 1 }),
            loanApi.applications.list({ search: debouncedQuery, page: 1 }),
            sharesApi.accounts.list({ search: debouncedQuery, page: 1 }),
          ]);

        if (requestId !== requestIdRef.current) return;

        const nextSections = buildStaffSearchSections(
          clientsResult.status === 'fulfilled'
            ? unwrapList(clientsResult.value)
            : [],
          savingsResult.status === 'fulfilled'
            ? unwrapList(savingsResult.value)
            : [],
          loansResult.status === 'fulfilled'
            ? unwrapList(loansResult.value)
            : [],
          sharesResult.status === 'fulfilled'
            ? unwrapList(sharesResult.value)
            : [],
        );

        setSections(nextSections);

        if (
          clientsResult.status === 'rejected' &&
          savingsResult.status === 'rejected' &&
          loansResult.status === 'rejected' &&
          sharesResult.status === 'rejected'
        ) {
          setSearchError('Search is temporarily unavailable.');
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setIsSearching(false);
        }
      }
    }

    void loadSearch();
  }, [debouncedQuery, open, role]);

  return (
    <div ref={containerRef} className={cn('relative min-w-0', className)}>
      <div
        className={cn(
          'flex min-w-0 items-center rounded-2xl border border-slate-200 bg-slate-50 px-3 shadow-sm transition',
          open && 'border-[#127D61] bg-white ring-4 ring-emerald-100',
        )}
      >
        <Search className="h-4 w-4 shrink-0 text-slate-400" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setOpen(true)}
          className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
          placeholder={searchPlaceholder(role)}
        />
        <span className="hidden rounded-full bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-400 md:inline-flex">
          {role === 'client' ? 'My scope' : 'Scoped'}
        </span>
      </div>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.75rem)] z-40 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10">
          <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
              {debouncedQuery.length >= 2
                ? 'Role-based search'
                : 'Quick access'}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {debouncedQuery.length >= 2
                ? role === 'client'
                  ? 'Results are limited to your own accounts, applications, and transactions.'
                  : 'Results follow your current role and backend permission scope.'
                : 'Jump into the workspaces available to your current role.'}
            </p>
          </div>

          <div className="max-h-[70vh] overflow-y-auto px-3 py-3">
            {isSearching ? (
              <div className="flex items-center gap-2 rounded-2xl px-3 py-3 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching your permitted workspaces...
              </div>
            ) : null}

            {searchError ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {searchError}
              </div>
            ) : null}

            {!isSearching && debouncedQuery.length < 2 ? (
              <SearchSectionBlock title="Suggested workspaces" items={quickLinks} />
            ) : null}

            {!isSearching && debouncedQuery.length >= 2 ? (
              <div className="grid gap-4">
                {quickLinks.length ? (
                  <SearchSectionBlock title="Workspaces" items={quickLinks} />
                ) : null}

                {sections.map((section) => (
                  <SearchSectionBlock
                    key={section.key}
                    title={section.title}
                    items={section.items}
                  />
                ))}

                {!quickLinks.length && !sections.length && !searchError ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                    No matches found in your visible workspaces. Try another
                    name, member number, account number, or reference.
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SearchSectionBlock({
  title,
  items,
}: {
  title: string;
  items: SearchItem[];
}) {
  if (!items.length) return null;

  return (
    <section className="grid gap-2">
      <p className="px-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
        {title}
      </p>
      <div className="grid gap-1">
        {items.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className="flex items-start justify-between gap-3 rounded-2xl px-3 py-3 transition hover:bg-[#e8f5f1]"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">
                {item.title}
              </p>
              <p className="mt-1 break-words text-sm text-slate-500">
                {item.subtitle}
              </p>
              {item.meta ? (
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {item.meta}
                </p>
              ) : null}
            </div>
            <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
          </Link>
        ))}
      </div>
    </section>
  );
}
