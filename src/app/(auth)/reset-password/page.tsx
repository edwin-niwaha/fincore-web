'use client';

import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { AuthCard } from '@/components/auth/auth-card';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { getFriendlyError } from '@/features/auth/auth-provider';
import { authApi } from '@/lib/api/services';

const schema = z
  .object({
    email: z.string().email(),
    code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    password_confirm: z.string().min(8, 'Confirm your password'),
  })
  .refine((data) => data.password === data.password_confirm, {
    path: ['password_confirm'],
    message: 'Passwords do not match',
  });

type ResetForm = z.infer<typeof schema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: searchParams.get('email') ?? '' },
  });

  async function onSubmit(values: ResetForm) {
    try {
      const response = await authApi.resetPassword(values);
      toast.success(response.detail || 'Password reset successful.');
      router.replace('/login');
    } catch (error) {
      toast.error(getFriendlyError(error));
    }
  }

  return (
    <AuthCard
      title="Set a new password"
      subtitle="Use your reset OTP code and choose a strong new password."
    >
      <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
        <Field label="Email address" error={errors.email?.message}>
          <Input autoComplete="email" type="email" {...register('email')} />
        </Field>
        <Field label="Reset OTP code" error={errors.code?.message}>
          <Input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="123456"
            {...register('code')}
          />
        </Field>
        <Field label="New password" error={errors.password?.message}>
          <Input
            autoComplete="new-password"
            type="password"
            placeholder="At least 8 characters"
            {...register('password')}
          />
        </Field>
        <Field
          label="Confirm new password"
          error={errors.password_confirm?.message}
        >
          <Input
            autoComplete="new-password"
            type="password"
            placeholder="Repeat password"
            {...register('password_confirm')}
          />
        </Field>
        <Button disabled={isSubmitting} className="w-full py-3">
          {isSubmitting ? 'Resetting password...' : 'Reset password'}
        </Button>
      </form>
      <Link
        className="mt-6 block text-center text-sm font-bold text-[#127D61]"
        href="/login"
      >
        Back to login
      </Link>
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
