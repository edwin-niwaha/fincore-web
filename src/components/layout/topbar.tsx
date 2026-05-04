'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  Building2,
  ChevronRight,
  MapPin,
  Menu,
  ShieldCheck,
  X,
} from 'lucide-react';
import { findNavMatch } from '@/components/layout/nav-config';
import { HeaderSearch } from '@/components/layout/header-search';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/auth-provider';

export function Topbar({
  mobileOpen,
  onMobileOpenChange,
}: {
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const role = String(user?.role ?? '').replaceAll('_', ' ');
  const notificationsPath =
    user?.role === 'client' ? '/self-service/notifications' : '/notifications';
  const initials =
    `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.trim() ||
    user?.email?.slice(0, 2)?.toUpperCase() ||
    'FC';
  const navMatch = findNavMatch(pathname, user?.role ?? null);
  const currentSection = navMatch?.group.label ?? 'Workspace';
  const currentPage = navMatch?.item.label ?? 'Dashboard';
  const scopeLabel =
    user?.role === 'client'
      ? user?.linked_client_member_number || 'Self service'
      : user?.institution_name || 'Institution scope';
  const branchLabel = user?.branch_name || null;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
          <button
            type="button"
            onClick={() => onMobileOpenChange(!mobileOpen)}
            className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 lg:hidden"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>

            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                <span className="truncate">{currentSection}</span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate text-slate-500">{currentPage}</span>
              </div>
              <p className="mt-1 truncate text-lg font-black text-slate-950 sm:text-xl">
                {user?.first_name || user?.full_name || user?.email}
              </p>
              <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                <span className="capitalize">{role || 'workspace user'}</span>
                <span className="hidden text-slate-300 sm:inline">•</span>
                <span className="inline-flex min-w-0 items-center gap-1">
                  <Building2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{scopeLabel}</span>
                </span>
                {branchLabel ? (
                  <>
                    <span className="hidden text-slate-300 sm:inline">•</span>
                    <span className="inline-flex min-w-0 items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{branchLabel}</span>
                    </span>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <div className="hidden min-w-0 max-w-xl flex-1 px-3 md:block">
            <HeaderSearch />
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden items-center gap-2 rounded-full bg-[#e8f5f1] px-3 py-2 text-xs font-black text-[#127D61] xl:inline-flex">
              <ShieldCheck className="h-4 w-4" /> Secure
            </span>
            <Link
              href={notificationsPath}
              className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-600"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
            </Link>
            <div className="hidden items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 lg:flex">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-[#127D61] text-sm font-black text-white">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900">
                  {user?.email}
                </p>
                <p className="truncate text-xs font-semibold capitalize text-slate-500">
                  {role || 'workspace user'}
                </p>
              </div>
            </div>
            <Button
              onClick={() => void logout()}
              className="bg-[#127D61] text-white hover:bg-[#0f6b53]"
            >
              Logout
            </Button>
          </div>
        </div>

        <div className="md:hidden">
          <HeaderSearch />
        </div>
      </div>
    </header>
  );
}
