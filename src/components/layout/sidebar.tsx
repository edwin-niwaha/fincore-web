'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowDownCircle,
  ArrowRightLeft,
  ArrowUpCircle,
  BarChart3,
  Bell,
  BadgePercent,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CirclePlus,
  FileText,
  Home,
  Landmark,
  LayoutDashboard,
  ListChecks,
  LogOut,
  ReceiptText,
  Settings,
  ShieldCheck,
  Users,
  WalletCards,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { FinCoreLogo } from '@/components/brand/fincore-logo';
import {
  findNavMatch,
  visibleNavGroupsForRole,
} from '@/components/layout/nav-config';
import { useAuth } from '@/features/auth/auth-provider';
import { cn } from '@/lib/utils/cn';
import type { Role } from '@/types/api';

const iconMap: Record<string, LucideIcon> = {
  '/dashboard': Home,
  '/admin': ShieldCheck,
  '/staff': LayoutDashboard,
  '/client': Home,
  '/self-service': Home,
  '/self-service/profile': Users,
  '/self-service/savings': WalletCards,
  '/self-service/loan-applications': ClipboardList,
  '/self-service/loans': Building2,
  '/self-service/repayments': ListChecks,
  '/self-service/transactions': ReceiptText,
  '/self-service/notifications': Bell,
  '/clients': Users,
  '/institutions': Landmark,
  '/branches': Building2,
  '/savings': WalletCards,
  '/shares': WalletCards,
  '/shares/dashboard': LayoutDashboard,
  '/shares/products': Building2,
  '/shares/accounts': WalletCards,
  '/shares/transactions': ReceiptText,
  '/shares/purchase': ArrowUpCircle,
  '/shares/additional': CirclePlus,
  '/shares/transfers': ArrowRightLeft,
  '/shares/redemption': ArrowDownCircle,
  '/shares/dividends': BadgePercent,
  '/shares/certificates': FileText,
  '/shares/reports': BarChart3,
  '/shares/approvals': ListChecks,
  '/shares/settings': Settings,
  '/loans/products': Building2,
  '/loans/applications': ClipboardList,
  '/loans/repayments': ListChecks,
  '/notifications': Bell,
  '/transactions': ReceiptText,
  '/accounting/chart-of-accounts': Landmark,
  '/accounting/journal-entries': ReceiptText,
  '/reports': BarChart3,
  '/reports/loan-portfolio': BarChart3,
  '/reports/loan-disbursements': ClipboardList,
  '/reports/loan-collections': ListChecks,
  '/reports/loan-arrears-aging': FileText,
  '/reports/trial-balance': BarChart3,
  '/reports/profit-and-loss': BarChart3,
  '/reports/general-ledger': FileText,
  '/reports/cashflow-statement': ReceiptText,
  '/reports/balance-sheet': Landmark,
  '/users': Users,
  '/audit-logs': FileText,
  '/settings': Settings,
};

export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const role: Role | null = user?.role ?? null;

  const visibleGroups = useMemo(() => visibleNavGroupsForRole(role), [role]);

  const activeHref = useMemo(() => {
    return findNavMatch(pathname, role)?.item.href ?? null;
  }, [pathname, role]);

  const defaultOpenGroups = useMemo(
    () =>
      visibleGroups
        .filter((group) =>
          group.items.some((item) => item.href === activeHref),
        )
        .map((group) => group.label),
    [activeHref, visibleGroups],
  );

  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);

  function toggleGroup(label: string) {
    setCollapsedGroups((current) =>
      current.includes(label)
        ? current.filter((item) => item !== label)
        : [...current, label],
    );
  }

  return (
    <aside
      className={cn(
        'hidden min-h-screen border-r border-slate-200 bg-white/95 shadow-sm backdrop-blur-xl transition-all duration-300 lg:flex lg:flex-col',
        collapsed ? 'lg:w-[92px]' : 'lg:w-[280px]',
      )}
    >
      <div className="flex h-20 items-center justify-between border-b border-slate-200 px-4">
        {collapsed ? (
          <Link
            href="/"
            className="grid h-11 w-11 place-items-center rounded-2xl bg-[#127D61] text-white shadow-sm"
            aria-label="FinCore home"
          >
            <Landmark className="h-5 w-5" />
          </Link>
        ) : (
          <FinCoreLogo dark={false} />
        )}

        <button
          type="button"
          onClick={onToggle}
          className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-[#e8f5f1] hover:text-[#127D61]"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <div className="space-y-6">
          {visibleGroups.map((group) => {
            const isCollapsible = Boolean(group.collapsible) && !collapsed;
            const isOpen =
              !group.collapsible ||
              collapsed ||
              defaultOpenGroups.includes(group.label) ||
              !collapsedGroups.includes(group.label);

            return (
              <section key={group.label} className="space-y-2">
                {!collapsed ? (
                  isCollapsible ? (
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.label)}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400 transition hover:bg-slate-50 hover:text-[#127D61]"
                    >
                      <span>{group.label}</span>
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 transition-transform',
                          isOpen && 'rotate-180',
                        )}
                      />
                    </button>
                  ) : (
                    <p className="px-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                      {group.label}
                    </p>
                  )
                ) : null}

                {isOpen ? (
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const Icon = iconMap[item.href] ?? LayoutDashboard;
                      const active = activeHref === item.href;

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          title={
                            collapsed
                              ? `${group.label} - ${item.label}`
                              : undefined
                          }
                          className={cn(
                            'group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold transition',
                            collapsed && 'justify-center px-0',
                            group.collapsible &&
                              !collapsed &&
                              'ml-3 border-l border-slate-200 pl-4',
                            active
                              ? 'bg-[#127D61] text-white shadow-sm shadow-emerald-900/10'
                              : 'text-slate-600 hover:bg-[#e8f5f1] hover:text-[#127D61]',
                          )}
                        >
                          <Icon className="h-5 w-5 shrink-0" />
                          {!collapsed ? (
                            <span className="truncate">{item.label}</span>
                          ) : null}
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-slate-200 p-3">
        <div className={cn('rounded-2xl bg-slate-50 p-3', collapsed && 'px-2')}>
          {!collapsed ? (
            <div className="mb-3">
              <p className="truncate text-sm font-black text-slate-900">
                {user?.first_name || user?.username || 'FinCore user'}
              </p>
              <p className="truncate text-xs font-semibold capitalize text-slate-500">
                {String(user?.role ?? '').replaceAll('_', ' ')}
              </p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => void logout()}
            className={cn(
              'flex w-full items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-sm font-bold text-slate-700 ring-1 ring-slate-200 transition hover:text-[#127D61]',
              collapsed && 'justify-center px-0',
            )}
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed ? 'Logout' : null}
          </button>
        </div>
      </div>
    </aside>
  );
}
