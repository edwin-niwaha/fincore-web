import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export type Column<T> = {
  header: string;
  accessor: (row: T) => ReactNode;
  cellClassName?: string;
  mobileLabel?: string;
  hideOnMobile?: boolean;
  align?: 'left' | 'center' | 'right';
};

type RowWithId = { id?: string | number };

export function DataTable<T extends RowWithId>({
  data,
  columns,
  emptyMessage = 'No records found.',
  emptyTitle = 'Nothing to show yet',
  loading = false,
  loadingRows = 5,
  renderMobileCard,
  tableFooter,
}: {
  data: T[];
  columns: Column<T>[];
  emptyMessage?: string;
  emptyTitle?: string;
  loading?: boolean;
  loadingRows?: number;
  renderMobileCard?: (row: T, index: number) => ReactNode;
  tableFooter?: ReactNode;
}) {
  if (loading && !data.length)
    return (
      <div className="card overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="table-responsive hidden md:block">
          <table className="table table-hover min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {columns.map((column) => (
                  <th className="px-4 py-3" key={column.header}>
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Array.from({ length: loadingRows }).map((_, index) => (
                <tr key={index}>
                  {columns.map((column) => (
                    <td className="px-4 py-4" key={column.header}>
                      <div className="h-4 animate-pulse rounded-full bg-slate-100" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid gap-3 p-4 md:hidden">
          {Array.from({ length: Math.min(loadingRows, 3) }).map((_, index) => (
            <div
              className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
              key={index}
            >
              <div className="h-5 w-1/2 animate-pulse rounded-full bg-slate-200" />
              <div className="mt-4 grid gap-3">
                <div className="h-4 animate-pulse rounded-full bg-slate-200" />
                <div className="h-4 animate-pulse rounded-full bg-slate-200" />
                <div className="h-4 w-2/3 animate-pulse rounded-full bg-slate-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );

  if (!data.length)
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-base font-bold text-slate-900">{emptyTitle}</p>
        <p className="mt-2 text-sm text-slate-500">{emptyMessage}</p>
      </div>
    );

  return (
    <div className="card overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="table-responsive hidden md:block">
        <table className="table table-hover min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {columns.map((column) => (
                <th
                  className={cn(
                    'px-4 py-3',
                    column.align === 'center'
                      ? 'text-center'
                      : column.align === 'right'
                        ? 'text-right'
                        : 'text-left',
                  )}
                  key={column.header}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row, index) => (
              <tr key={row.id ?? index} className="hover:bg-slate-50">
                {columns.map((column) => (
                  <td
                    className={cn(
                      'px-4 py-3 align-top',
                      column.align === 'center'
                        ? 'text-center'
                        : column.align === 'right'
                          ? 'text-right'
                          : 'text-left',
                      column.cellClassName,
                    )}
                    key={column.header}
                  >
                    {column.accessor(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {tableFooter}
        </table>
      </div>

      <div className="grid gap-3 p-4 md:hidden">
        {data.map((row, index) =>
          renderMobileCard ? (
            <div key={row.id ?? index}>{renderMobileCard(row, index)}</div>
          ) : (
            <article
              className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 shadow-sm"
              key={row.id ?? index}
            >
              <div className="min-w-0">
                {columns[0] ? columns[0].accessor(row) : null}
              </div>
              <dl className="mt-4 grid gap-3">
                {columns.slice(1).map((column) =>
                  column.hideOnMobile ? null : (
                    <div
                      className="grid gap-1 border-t border-slate-200 pt-3"
                      key={column.header}
                    >
                      <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                        {column.mobileLabel ?? column.header}
                      </dt>
                      <dd className={cn('text-sm text-slate-700', column.cellClassName)}>
                        {column.accessor(row)}
                      </dd>
                    </div>
                  ),
                )}
              </dl>
            </article>
          ),
        )}
      </div>
    </div>
  );
}
