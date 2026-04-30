'use client';

import Link from 'next/link';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

type ActionTone = 'default' | 'danger' | 'success';

type RowAction = {
  key: string;
  label: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  hidden?: boolean;
  tone?: ActionTone;
};

function actionClassName(tone: ActionTone = 'default') {
  if (tone === 'danger') {
    return 'bg-red-50 text-red-700 hover:bg-red-100';
  }

  if (tone === 'success') {
    return 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100';
  }

  return 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100';
}

function ActionButton({
  action,
  menuItem = false,
}: {
  action: RowAction;
  menuItem?: boolean;
}) {
  if (action.hidden) return null;

  const className = cn(
    menuItem
      ? 'btn inline-flex w-full items-center justify-start rounded-xl px-3 py-2 text-sm font-semibold transition'
      : 'btn inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold transition',
    actionClassName(action.tone),
  );

  if (action.href) {
    return (
      <Link className={className} href={action.href}>
        {action.label}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={className}
      disabled={action.disabled}
      onClick={action.onClick}
    >
      {action.label}
    </button>
  );
}

export function RowActions({
  actions,
  align = 'start',
}: {
  actions: RowAction[];
  align?: 'start' | 'end';
}) {
  const visibleActions = actions.filter((action) => !action.hidden);

  if (!visibleActions.length) {
    return null;
  }

  return (
    <>
      <div
        className={cn(
          'hidden flex-wrap gap-2 md:flex',
          align === 'end' ? 'justify-end' : 'justify-start',
        )}
      >
        {visibleActions.map((action) => (
          <ActionButton action={action} key={action.key} />
        ))}
      </div>

      <details className="relative md:hidden">
        <summary className="ml-auto flex list-none items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition hover:bg-slate-50">
          <span className="sr-only">Open row actions</span>
          <MoreHorizontal className="h-4 w-4" />
        </summary>
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-20 grid min-w-40 gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
          {visibleActions.map((action) => (
            <ActionButton action={action} key={action.key} menuItem />
          ))}
        </div>
      </details>
    </>
  );
}
