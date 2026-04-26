'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navItems } from '@/components/layout/nav-config';
import { useAuth } from '@/features/auth/auth-provider';
import { cn } from '@/lib/utils/cn';
import type { Role } from '@/types/api';

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const role: Role | null = user?.role ?? null;

  return (
    <aside className="hidden border-r border-slate-200 bg-white p-4 md:block">
      <div className="mb-8 text-2xl font-black text-[#127D61]">FinCore</div>

      <nav className="grid gap-1">
        {navItems
          .filter((item) => {
            if (!item.roles) return true;
            if (!role) return false;

            return item.roles.includes(role);
          })
          .map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-[#e8f5f1] hover:text-[#127D61]',
                pathname === item.href &&
                  'bg-[#127D61] text-white hover:bg-[#127D61] hover:text-white'
              )}
            >
              {item.label}
            </Link>
          ))}
      </nav>
    </aside>
  );
}