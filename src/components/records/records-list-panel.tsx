import type { ReactNode } from 'react';
import { Card, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils/cn';

export function RecordsListPanel({
  title,
  description,
  action,
  children,
  footer,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('overflow-hidden p-0', className)}>
      <div className="card-header flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 bg-slate-50/70 px-5 py-4">
        <div className="max-w-2xl">
          <CardTitle>{title}</CardTitle>
          {description ? (
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          ) : null}
        </div>
        {action}
      </div>

      {children}

      {footer ? (
        <div className="card-footer border-t border-slate-200 px-5 py-4">{footer}</div>
      ) : null}
    </Card>
  );
}
