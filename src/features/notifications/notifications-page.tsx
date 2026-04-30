'use client';

import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { RecordsPageLayout } from '@/components/records/records-page-layout';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import type { Column } from '@/components/ui/data-table';
import { DataTable } from '@/components/ui/data-table';
import { Field, Input } from '@/components/ui/input';
import { StateView } from '@/components/ui/state-view';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDate, statusLabel } from '@/features/admin/shared';
import { useApiResource } from '@/hooks/use-api-resource';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { unwrapList } from '@/lib/api/format';
import type { ApiProblem, ListResponse, Notification } from '@/types/api';

type Query = Record<string, string | number | boolean | undefined>;

type NotificationService = {
  list: (query?: Query) => Promise<ListResponse<Notification>>;
  markRead: (id: string | number) => Promise<Notification>;
  markAllRead: () => Promise<{ detail: string; updated?: number }>;
};

type ReadFilter = 'all' | 'unread' | 'read';

function getProblemMessage(
  error: unknown,
  fallback = 'Unable to update notifications.',
) {
  const problem = error as ApiProblem;
  return problem?.message || fallback;
}

export function NotificationsPage({
  title,
  description,
  service,
}: {
  title: string;
  description: string;
  service: NotificationService;
}) {
  const [search, setSearch] = useState('');
  const [readFilter, setReadFilter] = useState<ReadFilter>('all');
  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  const loadNotifications = useCallback(
    () =>
      service.list({
        search: debouncedSearch || undefined,
        is_read:
          readFilter === 'all' ? undefined : String(readFilter === 'read'),
        page_size: 100,
      }),
    [debouncedSearch, readFilter, service],
  );

  const { data, error, isLoading, reload } = useApiResource(loadNotifications);
  const notifications = useMemo(() => unwrapList(data), [data]);

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read,
  ).length;
  const readCount = notifications.length - unreadCount;

  async function handleMarkRead(id: string | number) {
    try {
      await service.markRead(id);
      toast.success('Notification marked as read');
      await reload();
    } catch (errorValue) {
      toast.error(getProblemMessage(errorValue));
    }
  }

  async function handleMarkAllRead() {
    try {
      const result = await service.markAllRead();
      toast.success(result.detail || 'Notifications marked as read');
      await reload();
    } catch (errorValue) {
      toast.error(getProblemMessage(errorValue));
    }
  }

  const columns: Column<Notification>[] = [
    {
      header: 'Message',
      accessor: (notification) => (
        <div>
          <p className="font-bold text-slate-900">{notification.title}</p>
          <p className="mt-1 text-sm text-slate-600">
            {notification.message}
          </p>
        </div>
      ),
    },
    {
      header: 'Category',
      accessor: (notification) => statusLabel(notification.category),
    },
    {
      header: 'Status',
      accessor: (notification) => (
        <StatusBadge
          status={notification.is_read ? 'active' : 'pending'}
          label={notification.is_read ? 'Read' : 'Unread'}
        />
      ),
    },
    {
      header: 'Date',
      accessor: (notification) => formatDate(notification.created_at),
    },
    {
      header: 'Action',
      accessor: (notification) =>
        notification.is_read ? (
          <span className="text-sm font-semibold text-slate-400">Up to date</span>
        ) : (
          <Button type="button" onClick={() => void handleMarkRead(notification.id)}>
            Mark read
          </Button>
        ),
      align: 'right',
    },
  ];

  return (
    <RecordsPageLayout
      title={title}
      description={description}
      headerAction={
        <Button
          type="button"
          className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
          disabled={!unreadCount}
          onClick={() => {
            void handleMarkAllRead();
          }}
        >
          Mark all as read
        </Button>
      }
      metrics={[
        {
          label: 'Total notifications',
          value: notifications.length,
          hint: 'Messages currently loaded into the list.',
        },
        {
          label: 'Unread',
          value: unreadCount,
          hint: 'Unread client or staff alerts that still need attention.',
        },
        {
          label: 'Read',
          value: readCount,
          hint: 'Messages already acknowledged.',
          accent: 'slate',
        },
      ]}
      filterPanel={
        <Card className="grid gap-4">
          <CardTitle>Search and filters</CardTitle>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Search">
              <Input
                placeholder="Search title, message, or category"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </Field>

            <Field label="Read status">
              <select
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-950 shadow-sm outline-none transition focus:border-[#127D61] focus:ring-4 focus:ring-emerald-100"
                value={readFilter}
                onChange={(event) =>
                  setReadFilter(event.target.value as ReadFilter)
                }
              >
                <option value="all">All notifications</option>
                <option value="unread">Unread only</option>
                <option value="read">Read only</option>
              </select>
            </Field>
          </div>
        </Card>
      }
    >
      <Card className="grid gap-4">
        <CardTitle>Notifications</CardTitle>

        {error && data ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Notification refresh failed.
            <button
              type="button"
              className="ml-2 font-bold underline underline-offset-2"
              onClick={() => {
                void reload();
              }}
            >
              Retry
            </button>
          </div>
        ) : null}

        {error && !data ? (
          <StateView
            title="Could not load notifications"
            description={error}
            actionLabel="Retry"
            onAction={() => {
              void reload();
            }}
          />
        ) : (
          <DataTable<Notification>
            data={notifications}
            columns={columns}
            loading={isLoading}
            emptyTitle="No notifications found"
            emptyMessage="Friendly savings, loan, and repayment updates will appear here once activity is recorded."
          />
        )}
      </Card>
    </RecordsPageLayout>
  );
}
