'use client';

import { useCallback } from 'react';
import { useAuth } from '@/features/auth/auth-provider';
import { useApiResource } from '@/hooks/use-api-resource';
import { unwrapList } from '@/lib/api/format';
import { adminApi } from '@/lib/api/services';
import type { Branch, Institution } from '@/types/api';
import type { Role } from '@/types/roles';

export function canAccessAccountingReports(role?: Role | null) {
  return Boolean(
    role &&
      ['super_admin', 'institution_admin', 'branch_manager', 'accountant'].includes(
        role,
      ),
  );
}

function institutionPlaceholder(user: {
  institution?: string | number | null;
  institution_name?: string | null;
  institution_code?: string | null;
}) {
  if (!user.institution) return [];

  return [
    {
      id: user.institution,
      name: user.institution_name || 'Assigned institution',
      code: user.institution_code || '',
      status: 'active',
    },
  ] as Institution[];
}

function branchPlaceholder(user: {
  branch?: string | number | null;
  branch_name?: string | null;
  branch_code?: string | null;
  institution?: string | number | null;
  institution_name?: string | null;
  institution_code?: string | null;
}) {
  if (!user.branch) return [];

  return [
    {
      id: user.branch,
      institution: user.institution ?? undefined,
      institution_name: user.institution_name ?? undefined,
      institution_code: user.institution_code ?? undefined,
      name: user.branch_name || 'Assigned branch',
      code: user.branch_code || '',
      status: 'active',
    },
  ] as Branch[];
}

export function branchInstitutionId(branch: Branch) {
  if (typeof branch.institution === 'object') {
    return branch.institution?.id ? String(branch.institution.id) : '';
  }
  return branch.institution ? String(branch.institution) : '';
}

export function useReportScope(selectedInstitutionFilter: string) {
  const { user } = useAuth();
  const actorRole = user?.role ?? null;
  const fixedInstitutionId = user?.institution ? String(user.institution) : '';
  const fixedBranchId = user?.branch ? String(user.branch) : '';
  const canChooseInstitution = actorRole === 'super_admin';
  const canChooseBranch =
    actorRole === 'super_admin' || actorRole === 'institution_admin';

  const loadInstitutions = useCallback(() => {
    if (actorRole === 'super_admin' || actorRole === 'institution_admin') {
      return adminApi.institutions.list({ status: 'active' });
    }
    return Promise.resolve([] as Institution[]);
  }, [actorRole]);

  const loadBranches = useCallback(() => {
    if (actorRole === 'super_admin' || actorRole === 'institution_admin') {
      return adminApi.branches.list({
        status: 'active',
        institution:
          actorRole === 'institution_admin' ? fixedInstitutionId : undefined,
      });
    }
    return Promise.resolve([] as Branch[]);
  }, [actorRole, fixedInstitutionId]);

  const {
    data: institutionsData,
    error: institutionsError,
    isLoading: institutionsLoading,
    reload: reloadInstitutions,
  } = useApiResource(loadInstitutions);
  const {
    data: branchesData,
    error: branchesError,
    isLoading: branchesLoading,
    reload: reloadBranches,
  } = useApiResource(loadBranches);

  const loadedInstitutions = unwrapList(institutionsData);
  const loadedBranches = unwrapList(branchesData);

  const institutions =
    actorRole === 'super_admin' || actorRole === 'institution_admin'
      ? loadedInstitutions
      : institutionPlaceholder({
          institution: user?.institution,
          institution_name: user?.institution_name,
          institution_code: user?.institution_code,
        });

  const branches =
    actorRole === 'super_admin' || actorRole === 'institution_admin'
      ? loadedBranches
      : branchPlaceholder({
          branch: user?.branch,
          branch_name: user?.branch_name,
          branch_code: user?.branch_code,
          institution: user?.institution,
          institution_name: user?.institution_name,
          institution_code: user?.institution_code,
        });

  const availableBranches = branches.filter((branch) => {
    const selectedInstitution =
      selectedInstitutionFilter === 'all'
        ? fixedInstitutionId
        : selectedInstitutionFilter;

    if (!selectedInstitution) return true;
    return branchInstitutionId(branch) === selectedInstitution;
  });

  return {
    actorRole,
    fixedInstitutionId,
    fixedBranchId,
    canChooseInstitution,
    canChooseBranch,
    institutions,
    branches,
    availableBranches,
    institutionsError,
    branchesError,
    institutionsLoading,
    branchesLoading,
    reloadInstitutions,
    reloadBranches,
  };
}
