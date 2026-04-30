'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { navItems } from '@/components/layout/nav-config';
import { useAuth } from '@/features/auth/auth-provider';
import { cn } from '@/lib/utils/cn';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 text-slate-950">
        <div
          className={cn(
            'grid min-h-screen transition-[grid-template-columns] duration-300',
            collapsed ? 'lg:grid-cols-[92px_1fr]' : 'lg:grid-cols-[280px_1fr]',
          )}
        >
          <Sidebar
            collapsed={collapsed}
            onToggle={() => setCollapsed((value) => !value)}
          />
          <div className="min-w-0">
            <Topbar
              mobileOpen={mobileOpen}
              onMobileOpenChange={setMobileOpen}
            />
            {mobileOpen ? (
              <div className="border-b border-slate-200 bg-white px-4 py-4 shadow-sm lg:hidden">
                <MobileDashboardNav onNavigate={() => setMobileOpen(false)} />
              </div>
            ) : null}
            <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
              {children}
            </main>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

function MobileDashboardNav({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const role = user?.role ?? null;

  return (
    <nav className="grid gap-2">
      {navItems
        .filter(
          (item) =>
            item.showInNavigation !== false &&
            (!item.roles || (role ? item.roles.includes(role) : false)),
        )
        .map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'rounded-2xl px-4 py-3 text-sm font-bold transition',
                active
                  ? 'bg-[#127D61] text-white'
                  : 'bg-slate-50 text-slate-700 hover:bg-[#e8f5f1] hover:text-[#127D61]',
              )}
            >
              {item.label}
            </Link>
          );
        })}
    </nav>
  );
}
