'use client';

import { useCallback, useMemo, useState } from 'react';
import { Activity, Clock3, RefreshCcw, SearchCheck, ShieldCheck } from 'lucide-react';
import { RecordsListPanel } from '@/components/records/records-list-panel';
import { RecordsPageLayout } from '@/components/records/records-page-layout';
import { RecordsPagination } from '@/components/records/records-pagination';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import type { Column } from '@/components/ui/data-table';
import { DataTable } from '@/components/ui/data-table';
import { Field, Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { RowActions } from '@/components/ui/row-actions';
import { StateView } from '@/components/ui/state-view';
import {
  formSelectClassName,
  formatDate,
  roleLabel,
  statusLabel,
} from '@/features/admin/shared';
import { useAuth } from '@/features/auth/auth-provider';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useApiResource } from '@/hooks/use-api-resource';
import { isPaginatedResponse, listCount, unwrapList } from '@/lib/api/format';
import { adminApi, auditApi } from '@/lib/api/services';
import type { AuditLog, AuditLogSummary, Branch, Institution } from '@/types/api';

function auditSegmentLabel(value?: string | null) {
  if (!value) return 'Unknown';
  return statusLabel(value);
}

function actorName(row: AuditLog) {
  return row.user_full_name || row.user_email || 'System';
}

function actorSubtitle(row: AuditLog) {
  const parts = [
    row.user_email && row.user_full_name ? row.user_email : null,
    row.user_role ? roleLabel(row.user_role) : null,
  ].filter(Boolean);

  return parts.join(' • ') || 'Automated or system action';
}

function scopeLabel(row: AuditLog) {
  const parts = [
    row.institution_name || row.institution_code,
    row.branch_name || row.branch_code,
  ].filter(Boolean);

  return parts.join(' • ') || 'Global/system scope';
}

function metadataPreview(row: AuditLog) {
  const keys = Object.keys(row.metadata ?? {});
  if (!keys.length) return 'No metadata recorded';
  return keys.slice(0, 3).join(', ');
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';

  try {
    return new Intl.DateTimeFormat('en-UG', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function AuditLogsPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [eventFilter, setEventFilter] = useState('all');
  const [institutionFilter, setInstitutionFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const searchQuery = useDebouncedValue(search.trim(), 300);

  const auditQuery = useMemo(
    () => ({
      search: searchQuery || undefined,
      module: moduleFilter === 'all' ? undefined : moduleFilter,
      event: eventFilter === 'all' ? undefined : eventFilter,
      institution:
        institutionFilter === 'all'
          ? undefined
          : institutionFilter,
      branch: branchFilter === 'all' ? undefined : branchFilter,
      created_at__date__gte: dateFrom || undefined,
      created_at__date__lte: dateTo || undefined,
      ordering: '-created_at',
    }),
    [
      branchFilter,
      dateFrom,
      dateTo,
      eventFilter,
      institutionFilter,
      moduleFilter,
      searchQuery,
    ],
  );

  const loadLogs = useCallback(
    () => auditApi.logs.list({ ...auditQuery, page, page_size: 25 }),
    [auditQuery, page],
  );

  const loadSummary = useCallback(
    () => auditApi.logs.summary(auditQuery),
    [auditQuery],
  );

  const loadInstitutions = useCallback(() => {
    if (!isSuperAdmin) return Promise.resolve([] as Institution[]);
    return adminApi.institutions.list({ page_size: 200 });
  }, [isSuperAdmin]);
  const scopedUserInstitutionId = user?.institution
    ? String(user.institution)
    : '';

  const activeInstitutionFilter =
    institutionFilter === 'all'
      ? scopedUserInstitutionId || undefined
      : institutionFilter;

  const loadBranches = useCallback(() => {
    if (isSuperAdmin) {
      return adminApi.branches.list({
        institution: activeInstitutionFilter || undefined,
        page_size: 200,
      });
    }

    if (scopedUserInstitutionId) {
      return adminApi.branches.list({
        institution: scopedUserInstitutionId,
        page_size: 200,
      });
    }

    return Promise.resolve([] as Branch[]);
  }, [activeInstitutionFilter, isSuperAdmin, scopedUserInstitutionId]);

  const {
    data,
    error,
    isLoading,
    reload,
  } = useApiResource(loadLogs);
  const {
    data: summaryData,
    error: summaryError,
    isLoading: summaryLoading,
    reload: reloadSummary,
  } = useApiResource<AuditLogSummary>(loadSummary);
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

  const logs = unwrapList(data);
  const institutions = unwrapList(institutionsData);
  const branches = unwrapList(branchesData);

  const pagination = isPaginatedResponse(data)
    ? {
        count: listCount(data),
        hasNext: Boolean(data.next),
        hasPrevious: Boolean(data.previous),
        rowsOnPage: logs.length,
      }
    : {
        count: logs.length,
        hasNext: false,
        hasPrevious: false,
        rowsOnPage: logs.length,
      };

  const moduleOptions = useMemo(() => {
    const dynamicModules = (summaryData?.module_breakdown ?? [])
      .map((row) => row.module)
      .filter(Boolean) as string[];
    const values = Array.from(
      new Set([
        'auth',
        'users',
        'institutions',
        'branches',
        'clients',
        'savings',
        'loans',
        'shares',
        ...dynamicModules,
      ]),
    );
    return values;
  }, [summaryData?.module_breakdown]);

  const eventOptions = useMemo(() => {
    const dynamicEvents = (summaryData?.event_breakdown ?? [])
      .map((row) => row.event)
      .filter(Boolean) as string[];
    return Array.from(
      new Set([
        'create',
        'update',
        'delete',
        'change',
        'success',
        ...dynamicEvents,
      ]),
    );
  }, [summaryData?.event_breakdown]);

  const visibleBranches = useMemo(() => {
    if (!activeInstitutionFilter) return branches;
    return branches.filter(
      (branch) =>
        String(
          typeof branch.institution === 'object'
            ? branch.institution?.id
            : branch.institution,
        ) === String(activeInstitutionFilter),
    );
  }, [activeInstitutionFilter, branches]);

  const columns: Column<AuditLog>[] = [
    {
      header: 'Event',
      accessor: (row) => (
        <div className="min-w-[200px]">
          <p className="font-bold text-slate-900">
            {auditSegmentLabel(row.module)} / {auditSegmentLabel(row.event || row.resource)}
          </p>
          <p className="break-words text-xs text-slate-500">{row.action}</p>
        </div>
      ),
    },
    {
      header: 'Actor',
      accessor: (row) => (
        <div className="min-w-[180px]">
          <p className="font-semibold text-slate-900">{actorName(row)}</p>
          <p className="break-words text-xs text-slate-500">
            {actorSubtitle(row)}
          </p>
        </div>
      ),
    },
    {
      header: 'Scope',
      accessor: (row) => (
        <div className="min-w-[170px]">
          <p className="font-medium text-slate-900">{scopeLabel(row)}</p>
          <p className="break-words text-xs text-slate-500">
            {row.request_path || row.target || 'No path recorded'}
          </p>
        </div>
      ),
    },
    {
      header: 'Metadata',
      accessor: (row) => (
        <div className="min-w-[160px]">
          <p className="font-medium text-slate-900">
            {row.metadata_size ?? 0} fields
          </p>
          <p className="break-words text-xs text-slate-500">
            {metadataPreview(row)}
          </p>
        </div>
      ),
    },
    {
      header: 'Time',
      accessor: (row) => (
        <div>
          <p className="whitespace-nowrap font-medium text-slate-900">
            {formatDateTime(row.created_at)}
          </p>
          <p className="text-xs text-slate-500">{formatDate(row.created_at)}</p>
        </div>
      ),
    },
    {
      header: 'Actions',
      accessor: (row) => (
        <RowActions
          actions={[
            {
              key: 'view',
              label: 'View details',
              onClick: () => setSelectedLog(row),
            },
          ]}
          align="end"
        />
      ),
      align: 'right',
    },
  ];

  if (isLoading && !data) {
    return <StateView title="Loading audit logs..." />;
  }

  if (error && !data) {
    return (
      <StateView
        title="Could not load audit logs"
        description={error}
        actionLabel="Retry"
        onAction={reload}
      />
    );
  }

  if (institutionsError && isSuperAdmin && !institutionsData) {
    return (
      <StateView
        title="Could not load institutions"
        description={institutionsError}
        actionLabel="Retry"
        onAction={reloadInstitutions}
      />
    );
  }

  if (branchesError && !branchesData) {
    return (
      <StateView
        title="Could not load branches"
        description={branchesError}
        actionLabel="Retry"
        onAction={reloadBranches}
      />
    );
  }

  return (
    <RecordsPageLayout
      title="Audit logs"
      description="Review system activity across operations, administration, and security workflows using live scope-aware audit records."
      headerAction={
        <Button
          type="button"
          className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
          onClick={() => {
            void reload();
            void reloadSummary();
          }}
        >
          <RefreshCcw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      }
      metrics={[
        {
          label: 'Filtered logs',
          value: summaryLoading ? '...' : String(summaryData?.total_logs ?? 0),
          hint: 'Records matching the current filters.',
          accent: 'slate',
        },
        {
          label: 'Today',
          value: summaryLoading ? '...' : String(summaryData?.today_logs ?? 0),
          hint: 'Events written today in your current scope.',
        },
        {
          label: 'Actors / modules',
          value: summaryLoading
            ? '...'
            : `${summaryData?.actors ?? 0} / ${summaryData?.modules ?? 0}`,
          hint: summaryData?.latest_activity_at
            ? `Latest activity ${formatDateTime(summaryData.latest_activity_at)}`
            : 'No activity captured for these filters yet.',
          accent: 'amber',
        },
      ]}
      filterPanel={
        <Card className="grid gap-4 p-4 sm:p-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Search and filters</CardTitle>
            <p className="text-xs text-slate-500">
              Narrow by actor, action, module, scope, or date range.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            <Field label="Search">
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Action, actor, target, path, institution, or branch"
              />
            </Field>

            <Field label="Module">
              <select
                className={formSelectClassName}
                value={moduleFilter}
                onChange={(event) => {
                  setModuleFilter(event.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All modules</option>
                {moduleOptions.map((option) => (
                  <option key={option} value={option}>
                    {auditSegmentLabel(option)}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Event">
              <select
                className={formSelectClassName}
                value={eventFilter}
                onChange={(event) => {
                  setEventFilter(event.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All events</option>
                {eventOptions.map((option) => (
                  <option key={option} value={option}>
                    {auditSegmentLabel(option)}
                  </option>
                ))}
              </select>
            </Field>

            {isSuperAdmin ? (
              <Field label="Institution">
                <select
                  className={formSelectClassName}
                  value={institutionFilter}
                  onChange={(event) => {
                    setInstitutionFilter(event.target.value);
                    setBranchFilter('all');
                    setPage(1);
                  }}
                  disabled={institutionsLoading}
                >
                  <option value="all">All institutions</option>
                  {institutions.map((institution) => (
                    <option key={institution.id} value={String(institution.id)}>
                      {institution.name}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}

            <Field label="Branch">
              <select
                className={formSelectClassName}
                value={branchFilter}
                onChange={(event) => {
                  setBranchFilter(event.target.value);
                  setPage(1);
                }}
                disabled={branchesLoading}
              >
                <option value="all">All branches</option>
                {visibleBranches.map((branch) => (
                  <option key={branch.id} value={String(branch.id)}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="From date">
              <Input
                type="date"
                value={dateFrom}
                onChange={(event) => {
                  setDateFrom(event.target.value);
                  setPage(1);
                }}
              />
            </Field>

            <Field label="To date">
              <Input
                type="date"
                value={dateTo}
                onChange={(event) => {
                  setDateTo(event.target.value);
                  setPage(1);
                }}
              />
            </Field>
          </div>

          {summaryError ? (
            <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {summaryError}
            </p>
          ) : null}
        </Card>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
        <RecordsListPanel
          title="Audit event stream"
          description="All visible events are permission-scoped by the backend and ordered newest first."
          footer={
            <RecordsPagination
              count={pagination.count}
              page={page}
              rowsOnPage={pagination.rowsOnPage}
              hasNext={pagination.hasNext}
              hasPrevious={pagination.hasPrevious}
              onPageChange={setPage}
            />
          }
        >
          <div className="w-full overflow-hidden">
            <div className="w-full overflow-x-auto p-3 sm:p-4 lg:p-5">
              <div className="min-w-[980px]">
                <DataTable
                  data={logs}
                  columns={columns}
                  loading={isLoading}
                  emptyTitle="No audit activity found"
                  emptyMessage="Try widening the current filters or date range."
                />
              </div>
            </div>
          </div>
        </RecordsListPanel>

        <Card className="grid gap-4 p-5">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-[#127D61] ring-1 ring-emerald-100">
              <Activity className="h-5 w-5" />
            </span>
            <div>
              <CardTitle>Activity breakdown</CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                The current filters are applied to these breakdowns.
              </p>
            </div>
          </div>

          <section className="grid gap-2">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
              Modules
            </p>
            {(summaryData?.module_breakdown ?? []).length ? (
              <div className="grid gap-2">
                {(summaryData?.module_breakdown ?? []).map((row, index) => (
                  <div
                    key={`${row.module ?? 'unknown'}-${index}`}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <span className="font-semibold text-slate-900">
                      {auditSegmentLabel(row.module)}
                    </span>
                    <span className="text-sm font-black text-[#127D61]">
                      {row.count}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                No module breakdown is available for these filters.
              </p>
            )}
          </section>

          <section className="grid gap-2">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
              Events
            </p>
            {(summaryData?.event_breakdown ?? []).length ? (
              <div className="grid gap-2">
                {(summaryData?.event_breakdown ?? []).map((row, index) => (
                  <div
                    key={`${row.event ?? 'unknown'}-${index}`}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <span className="font-semibold text-slate-900">
                      {auditSegmentLabel(row.event)}
                    </span>
                    <span className="text-sm font-black text-slate-900">
                      {row.count}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                No event breakdown is available for these filters.
              </p>
            )}
          </section>

          <section className="grid gap-3">
            <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#127D61]" />
              <p className="text-sm text-slate-600">
                Settings, user management, password changes, and core operational actions now flow into the same audit stream.
              </p>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <SearchCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#127D61]" />
              <p className="text-sm text-slate-600">
                Search uses the backend filter layer, so results remain permission-aware even when actor names or targets overlap.
              </p>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-[#127D61]" />
              <p className="text-sm text-slate-600">
                Results are ordered newest first and can be narrowed by exact module or date range for investigations.
              </p>
            </div>
          </section>
        </Card>
      </div>

      <Modal
        open={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        size="xl"
        title={selectedLog ? `${auditSegmentLabel(selectedLog.module)} audit event` : 'Audit event'}
        description={
          selectedLog
            ? `${selectedLog.action} recorded ${formatDateTime(selectedLog.created_at)}`
            : undefined
        }
      >
        {selectedLog ? (
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-2">
              <AuditDetail label="Actor" value={actorName(selectedLog)} />
              <AuditDetail label="Role" value={selectedLog.user_role ? roleLabel(selectedLog.user_role) : 'System'} />
              <AuditDetail label="Action" value={selectedLog.action} />
              <AuditDetail label="Target" value={selectedLog.target || '-'} />
              <AuditDetail label="Institution" value={selectedLog.institution_name || selectedLog.institution_code || '-'} />
              <AuditDetail label="Branch" value={selectedLog.branch_name || selectedLog.branch_code || '-'} />
              <AuditDetail label="Request path" value={selectedLog.request_path || '-'} />
              <AuditDetail label="IP address" value={selectedLog.ip_address || '-'} />
              <AuditDetail label="Created" value={formatDateTime(selectedLog.created_at)} />
              <AuditDetail label="Updated" value={formatDateTime(selectedLog.updated_at)} />
            </div>

            <div className="grid gap-2">
              <p className="text-sm font-bold text-slate-900">Metadata</p>
              <pre className="max-h-[340px] overflow-auto rounded-2xl border border-slate-200 bg-slate-950 p-4 text-xs text-slate-100">
                {JSON.stringify(selectedLog.metadata ?? {}, null, 2)}
              </pre>
            </div>
          </div>
        ) : null}
      </Modal>
    </RecordsPageLayout>
  );
}

function AuditDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-900">
        {value}
      </p>
    </div>
  );
}
