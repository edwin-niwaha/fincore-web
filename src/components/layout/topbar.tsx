'use client';

import { Bell, Menu, Search, ShieldCheck, X } from 'lucide-react';
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
  const role = String(user?.role ?? '').replaceAll('_', ' ');

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => onMobileOpenChange(!mobileOpen)}
            className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 lg:hidden"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div className="min-w-0">
            <p className="truncate text-sm font-black text-slate-950">{user?.first_name || user?.email}</p>
            <p className="truncate text-xs font-bold capitalize text-slate-500">{role || 'workspace user'}</p>
          </div>
        </div>

        <div className="hidden max-w-md flex-1 items-center rounded-2xl border border-slate-200 bg-slate-50 px-3 md:flex">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            className="h-11 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-slate-400"
            placeholder="Search clients, accounts, loans..."
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-2 rounded-full bg-[#e8f5f1] px-3 py-2 text-xs font-black text-[#127D61] sm:inline-flex">
            <ShieldCheck className="h-4 w-4" /> Secure
          </span>
          <button className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-600" aria-label="Notifications">
            <Bell className="h-5 w-5" />
          </button>
          <Button onClick={() => void logout()} className="bg-[#127D61] text-white hover:bg-[#0f6b53]">Logout</Button>
        </div>
      </div>
    </header>
  );
}
