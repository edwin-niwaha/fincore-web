import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export function Button({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        'rounded-xl bg-[#127D61] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f6c54] disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    />
  );
}
