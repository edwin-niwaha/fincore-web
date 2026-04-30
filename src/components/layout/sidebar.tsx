'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Bell,
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
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
import { navItems } from '@/components/layout/nav-config';
import { FinCoreLogo } from '@/components/brand/fincore-logo';
import { useAuth } from '@/features/auth/auth-provider';
import { cn } from '@/lib/utils/cn';
import type { Role } from '@/types/api';

const iconMap: Record<string, LucideIcon> = {
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
  '/loans/applications': ClipboardList,
  '/loans/repayments': ListChecks,
  '/notifications': Bell,
  '/transactions': ReceiptText,
  '/reports': BarChart3,
  '/reports/trial-balance': BarChart3,
  '/reports/general-ledger': BarChart3,
  '/reports/cashflow-statement': BarChart3,
  '/reports/balance-sheet': BarChart3,
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

  const visibleItems = navItems.filter((item) => {
    if (!item.roles) return true;
    if (!role) return false;
    return item.roles.includes(role) && item.showInNavigation !== false;
  });

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

      <nav className="flex-1 space-y-1 px-3 py-5">
        {visibleItems.map((item) => {
          const Icon = iconMap[item.href] ?? LayoutDashboard;
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                'group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold transition',
                collapsed && 'justify-center px-0',
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
      </nav>

      <div className="border-t border-slate-200 p-3">
        <div className={cn('rounded-2xl bg-slate-50 p-3', collapsed && 'px-2')}>
          {!collapsed ? (
            <div className="mb-3">
              <p className="truncate text-sm font-black text-slate-900">
                {user?.first_name || user?.username || 'FinCore user'}
              </p>
              <p className="truncate text-xs font-semibold text-slate-500">
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
