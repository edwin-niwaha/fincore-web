import type { Role } from '@/types/roles';

export function dashboardPathForRole(role: Role | string) {
  if (role === 'super_admin' || role === 'institution_admin') return '/admin';
  if (role === 'client') return '/client';
  return '/staff';
}

export function canAccessDashboard(role: Role | string, section: 'admin' | 'staff' | 'client') {
  if (section === 'admin') return role === 'super_admin' || role === 'institution_admin';
  if (section === 'client') return role === 'client';
  return role !== 'client';
}
