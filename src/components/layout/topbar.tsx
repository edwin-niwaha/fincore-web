'use client';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/auth-provider';

export function Topbar() {
  const { user, logout } = useAuth();
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
      <div>
        <p className="text-sm font-semibold">{user?.first_name || user?.email}</p>
        <p className="text-xs text-slate-500">{String(user?.role ?? '').replaceAll('_', ' ')}</p>
      </div>
      <Button onClick={() => void logout()}>Logout</Button>
    </header>
  );
}
