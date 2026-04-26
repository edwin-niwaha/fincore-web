import Link from 'next/link';
import { Landmark } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export function FinCoreLogo({ className, dark = true }: { className?: string; dark?: boolean }) {
  return (
    <Link href="/" className={cn('group inline-flex items-center gap-3', className)} aria-label="FinCore home">
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#127D61] shadow-sm ring-1 ring-[#127D61]/10"><Landmark className="h-5 w-5 text-white" /></span>
      <span className="leading-tight"><span className={cn('block text-xl font-black tracking-tight', dark ? 'text-white' : 'text-slate-950')}>FinCore</span><span className={cn('block text-[11px] font-bold uppercase tracking-[0.24em]', dark ? 'text-slate-300' : 'text-slate-500')}>Secure & Scalable.
        </span></span>
    </Link>
  );
}
