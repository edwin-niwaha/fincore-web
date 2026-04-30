import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';

export function StateView({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description?: string | null;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="grid min-h-[240px] place-items-center p-4">
      <Card className="max-w-lg text-center">
        <CardTitle>{title}</CardTitle>

        {description ? (
          <p className="mt-2 text-sm text-slate-600">
            {String(description)}
          </p>
        ) : null}

        {actionLabel && onAction ? (
          <Button type="button" className="mt-4" onClick={onAction}>
            {actionLabel}
          </Button>
        ) : null}
      </Card>
    </div>
  );
}
