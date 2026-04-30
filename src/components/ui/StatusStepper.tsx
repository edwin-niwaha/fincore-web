import { AlertCircle, Check } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export type StatusStepperStep = {
  key: string;
  label: string;
};

export type StatusStepperDates = Record<string, string | null | undefined>;

export type StatusStepperTerminalState = {
  label: string;
  date?: string | null;
  description?: string;
  tone?: 'danger' | 'neutral';
};

type StatusStepperProps = {
  steps: StatusStepperStep[];
  currentStatus?: string | null;
  stepDates?: StatusStepperDates;
  aliases?: Record<string, string>;
  terminalState?: StatusStepperTerminalState | null;
  title?: string;
  className?: string;
  emptyDateLabel?: string;
};

function normalizeStatusKey(value?: string | null) {
  return (value ?? '').trim().toLowerCase().replaceAll(' ', '_');
}

function formatStatusDate(value?: string | null, emptyDateLabel = '-') {
  if (!value) return emptyDateLabel;

  try {
    return new Intl.DateTimeFormat('en-UG', {
      dateStyle: 'medium',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function terminalToneClassName(tone: StatusStepperTerminalState['tone']) {
  if (tone === 'neutral') {
    return 'border-slate-200 bg-slate-100 text-slate-700';
  }

  return 'border-rose-200 bg-rose-50 text-rose-900';
}

export function StatusStepper({
  steps,
  currentStatus,
  stepDates,
  aliases,
  terminalState,
  title,
  className,
  emptyDateLabel = '-',
}: StatusStepperProps) {
  const resolvedAliases = Object.fromEntries(
    Object.entries(aliases ?? {}).map(([key, value]) => [
      normalizeStatusKey(key),
      normalizeStatusKey(value),
    ]),
  );
  const resolvedStepDates = Object.fromEntries(
    Object.entries(stepDates ?? {}).map(([key, value]) => [
      normalizeStatusKey(key),
      value,
    ]),
  );
  const stepIndexByKey = new Map(
    steps.map((step, index) => [normalizeStatusKey(step.key), index]),
  );
  const normalizedCurrentStatus = normalizeStatusKey(currentStatus);
  const resolvedCurrentStatus =
    resolvedAliases[normalizedCurrentStatus] ?? normalizedCurrentStatus;
  const currentIndex = stepIndexByKey.get(resolvedCurrentStatus) ?? -1;
  const lastCompletedIndex = steps.reduce((latestIndex, step, index) => {
    const stepDate = resolvedStepDates[normalizeStatusKey(step.key)];
    return stepDate ? index : latestIndex;
  }, -1);
  const completedConnectorIndex =
    currentIndex >= 0 ? currentIndex : lastCompletedIndex;

  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4',
        className,
      )}
    >
      {title ? (
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
          {title}
        </p>
      ) : null}

      <div className={cn('overflow-x-auto pb-2', title ? 'mt-4' : '')}>
        <div className="flex min-w-max items-start">
          {steps.map((step, index) => {
            const normalizedStepKey = normalizeStatusKey(step.key);
            const isCurrent = index === currentIndex;
            const isCompleted =
              currentIndex >= 0
                ? index < currentIndex
                : index <= lastCompletedIndex;
            const stepDate = resolvedStepDates[normalizedStepKey];
            const circleClassName = isCurrent
              ? 'border-[#127D61] bg-emerald-50 text-[#127D61] ring-4 ring-emerald-100'
              : isCompleted
                ? 'border-[#127D61] bg-[#127D61] text-white'
                : 'border-slate-300 bg-white text-slate-400';
            const labelClassName = isCurrent
              ? 'text-slate-900'
              : isCompleted
                ? 'text-slate-800'
                : 'text-slate-500';

            return (
              <div className="flex items-start" key={step.key}>
                <div className="flex w-28 flex-col items-center text-center sm:w-32">
                  <span
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold transition',
                      circleClassName,
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <p
                    className={cn('mt-3 text-sm font-semibold', labelClassName)}
                  >
                    {step.label}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatStatusDate(stepDate, emptyDateLabel)}
                  </p>
                </div>

                {index < steps.length - 1 ? (
                  <div className="mt-5 h-px w-6 flex-none bg-slate-200 sm:w-8 lg:w-10">
                    <div
                      className={cn(
                        'h-full bg-[#127D61] transition-all',
                        index < completedConnectorIndex ? 'w-full' : 'w-0',
                      )}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {terminalState ? (
        <div
          className={cn(
            'mt-4 rounded-2xl border px-4 py-3 text-sm',
            terminalToneClassName(terminalState.tone),
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 font-bold">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              {terminalState.label}
            </p>
            <span className="text-xs font-semibold uppercase tracking-[0.14em]">
              {formatStatusDate(terminalState.date, emptyDateLabel)}
            </span>
          </div>
          {terminalState.description ? (
            <p className="mt-1">{terminalState.description}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
