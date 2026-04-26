'use client';

import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

import { FinCoreLogo } from '@/components/brand/fincore-logo';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils/cn';

export function AuthCard({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-50 px-4 text-slate-950">
      

      {/* Centered Card */}
      <Card
        className={cn(
          'w-full max-w-md border border-slate-200 bg-white p-8 shadow-xl',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <FinCoreLogo dark={false} />

          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
            <ShieldCheck className="h-4 w-4" />
            Secure
          </div>
        </div>

        {/* Title */}
        <h2 className="mt-8 text-3xl font-black tracking-tight">
          {title}
        </h2>

        {/* Subtitle */}
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {subtitle}
        </p>

        {/* Form */}
        <div className="mt-6">{children}</div>

        {/* Footer */}
        <div className="mt-8 border-t border-slate-200 pt-4 text-center text-xs text-slate-500">
          Protected by FinCore security standards
        </div>
      </Card>
    </div>
  );
}