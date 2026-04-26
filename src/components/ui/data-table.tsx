import type { ReactNode } from 'react';

export type Column<T> = { header: string; accessor: (row: T) => ReactNode };

type RowWithId = { id?: string | number };

export function DataTable<T extends RowWithId>({ data, columns, emptyMessage = 'No records found.' }: { data: T[]; columns: Column<T>[]; emptyMessage?: string }) {
  if (!data.length) return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">{emptyMessage}</div>;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="overflow-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>{columns.map((column) => <th className="px-4 py-3" key={column.header}>{column.header}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row, index) => (
              <tr key={row.id ?? index} className="hover:bg-slate-50">
                {columns.map((column) => <td className="px-4 py-3" key={column.header}>{column.accessor(row)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
