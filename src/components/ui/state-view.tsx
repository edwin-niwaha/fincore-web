'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function StateView({ title, description, actionLabel, onAction }: { title: string; description?: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <div className="grid min-h-[240px] place-items-center p-4">
      <Card className="max-w-lg text-center">
        <h2 className="text-lg font-bold">{title}</h2>
        {description ? <p className="mt-2 text-sm text-slate-600">{description}</p> : null}
        {actionLabel && onAction ? <Button className="mt-4" onClick={onAction}>{actionLabel}</Button> : null}
      </Card>
    </div>
  );
}
