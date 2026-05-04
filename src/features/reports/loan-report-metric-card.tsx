'use client';

import { Card } from '@/components/ui/card';

export function LoanReportMetricCard({
  label,
  value,
  helper,
  tone = 'text-[#127D61]',
}: {
  label: string;
  value: string;
  helper: string;
  tone?: string;
}) {
  return (
    <Card className="min-w-0 p-4">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className={`mt-3 break-words text-2xl font-black ${tone}`}>{value}</p>
      <p className="mt-2 text-sm text-slate-500">{helper}</p>
    </Card>
  );
}
