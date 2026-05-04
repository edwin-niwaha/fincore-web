import type { ReactNode } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils/cn';

export type RecordsMetric = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  accent?: 'brand' | 'slate' | 'amber';
};

function valueClassName(accent: RecordsMetric['accent']) {
  if (accent === 'amber') {
    return 'text-amber-600';
  }

  if (accent === 'slate') {
    return 'text-slate-950';
  }

  return 'text-[#127D61]';
}

export function RecordsPageLayout({
  title,
  description,
  headerAction,
  metrics,
  filterPanel,
  children,
  className,
}: {
  title: string;
  description?: string;
  headerAction?: ReactNode;
  metrics?: RecordsMetric[];
  filterPanel?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('container-fluid grid min-w-0 gap-6', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title={title} description={description} />
        {headerAction}
      </div>

      {metrics?.length ? (
        <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {metrics.map((metric) => (
            <Card
              className="relative min-w-0 overflow-hidden bg-white/95"
              key={metric.label}
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#127D61] via-emerald-400 to-transparent" />
              <p className="text-sm font-semibold text-slate-500">
                {metric.label}
              </p>
              <p
                className={cn(
                  'mt-3 text-3xl font-black tracking-tight',
                  valueClassName(metric.accent),
                )}
              >
                {metric.value}
              </p>
              {metric.hint ? (
                <p className="mt-2 text-sm text-slate-500">{metric.hint}</p>
              ) : null}
            </Card>
          ))}
        </div>
      ) : null}

      {filterPanel}

      {children}
    </div>
  );
}
