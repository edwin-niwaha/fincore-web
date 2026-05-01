'use client';

import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Mail, ShieldCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { AuthCard } from '@/components/auth/auth-card';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { getFriendlyError } from '@/features/auth/auth-provider';
import { authApi } from '@/lib/api/services';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
});

type ForgotForm = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotForm>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(values: ForgotForm) {
    try {
      const response = await authApi.forgotPassword(values.email);

      toast.success(response.detail || 'Reset code sent if that account exists.');

      router.push(`/reset-password?email=${encodeURIComponent(values.email)}`);
    } catch (error) {
      toast.error(getFriendlyError(error));
    }
  }

  return (
    <AuthCard
      title="Reset your password"
      subtitle="Enter your email address and we’ll send you a secure OTP reset code."
    >
      <div className="mb-5 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="shrink-0 rounded-xl bg-white p-2 text-[#127D61] shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </div>

          <div>
            <p className="text-sm font-bold text-slate-900">
              Secure password recovery
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              For your safety, we’ll verify your email before allowing a new
              password.
            </p>
          </div>
        </div>
      </div>

      <form className="grid gap-5" onSubmit={handleSubmit(onSubmit)}>
        <Field label="Email address" error={errors.email?.message}>
          <div className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-[#127D61] focus-within:ring-2 focus-within:ring-[#127D61]/20">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[#127D61]">
              <Mail className="h-4 w-4" />
            </div>

            <Input
              autoComplete="email"
              type="email"
              placeholder="you@example.com"
              className="h-full flex-1 border-0 bg-transparent p-0 text-slate-900 shadow-none focus:outline-none focus:ring-0"
              {...register('email')}
            />
          </div>
        </Field>

        <Button
          disabled={isSubmitting}
          className="h-12 w-full rounded-xl bg-[#127D61] text-base font-bold text-white shadow-lg shadow-emerald-900/10 transition hover:bg-[#0f6b53]"
        >
          {isSubmitting ? 'Sending code...' : 'Send reset code'}
        </Button>
      </form>

      <Link
        className="mt-6 flex items-center justify-center gap-2 text-sm font-bold text-[#127D61] transition hover:text-[#0f6b53] hover:underline"
        href="/login"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to login
      </Link>
    </AuthCard>
  );
}