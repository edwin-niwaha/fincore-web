import { ProtectedRoute } from '@/components/auth/protected-route';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="grid min-h-screen md:grid-cols-[260px_1fr]">
        <Sidebar />
        <div>
          <Topbar />
          <main className="p-4 md:p-8">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
