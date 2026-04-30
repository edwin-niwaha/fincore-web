'use client';

import { Button } from '@/components/ui/button';

export function RecordsPagination({
  count,
  page,
  rowsOnPage,
  hasNext,
  hasPrevious,
  onPageChange,
}: {
  count: number;
  page: number;
  rowsOnPage: number;
  hasNext: boolean;
  hasPrevious: boolean;
  onPageChange: (page: number) => void;
}) {
  const start =
    count === 0 || rowsOnPage === 0 ? 0 : (page - 1) * rowsOnPage + 1;
  const end = count === 0 || rowsOnPage === 0 ? 0 : start + rowsOnPage - 1;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-500">
        Showing {start}-{Math.min(end, count)} of {count} records.
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          className="btn-outline-secondary bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
          disabled={!hasPrevious}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <span className="text-sm font-semibold text-slate-600">Page {page}</span>
        <Button
          type="button"
          className="btn-outline-secondary bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
          disabled={!hasNext}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
