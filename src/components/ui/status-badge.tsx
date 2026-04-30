import { cn } from '@/lib/utils/cn';
import { statusLabel, statusPillClassName } from '@/features/admin/shared';

export function StatusBadge({
  status,
  label,
  className,
}: {
  status?: string | null;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'badge inline-flex items-center rounded-full px-3 py-1 text-xs font-bold',
        statusPillClassName(status ?? undefined),
        className,
      )}
    >
      {label ?? statusLabel(status ?? undefined)}
    </span>
  );
}
