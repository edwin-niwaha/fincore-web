'use client';

import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { AuthCard } from '@/components/auth/auth-card';
import { GoogleLoginButton } from '@/components/auth/google-login-button';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { useAuth } from '@/features/auth/auth-provider';
import { dashboardPathForRole } from '@/features/auth/role-routing';

const schema = z
  .object({
    email: z.string().email(),
    username: z.string().min(3, 'Username must be at least 3 characters'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    password_confirm: z.string().min(8, 'Confirm your password'),
  })
  .refine((data) => data.password === data.password_confirm, {
    path: ['password_confirm'],
    message: 'Passwords do not match',
  });

type RegisterForm = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const { register: createAccount, loginWithGoogle, isLoading } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({ resolver: zodResolver(schema) });

  async function onSubmit(values: RegisterForm) {
    await createAccount(values);
    router.replace('/verify-email');
  }

  const handleGoogleToken = useCallback(
    async (accessToken: string) => {
      const user = await loginWithGoogle(accessToken);
      router.replace(
        user.is_email_verified
          ? dashboardPathForRole(user.role)
          : '/verify-email',
      );
    },
    [loginWithGoogle, router],
  );

  return (
    <AuthCard
      title="Create your account"
      subtitle="Register as a client user. Admin and staff accounts can be managed by authorized users."
    >
      <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
        <Field label="Email address" error={errors.email?.message}>
          <Input
            autoComplete="email"
            type="email"
            placeholder="you@example.com"
            {...register('email')}
          />
        </Field>
        <Field label="Username" error={errors.username?.message}>
          <Input
            autoComplete="username"
            placeholder="edwin"
            {...register('username')}
          />
        </Field>
        <Field label="Password" error={errors.password?.message}>
          <Input
            autoComplete="new-password"
            type="password"
            placeholder="At least 8 characters"
            {...register('password')}
          />
        </Field>
        <Field
          label="Confirm password"
          error={errors.password_confirm?.message}
        >
          <Input
            autoComplete="new-password"
            type="password"
            placeholder="Repeat password"
            {...register('password_confirm')}
          />
        </Field>
        <Button disabled={isSubmitting || isLoading} className="w-full py-3">
          {isSubmitting ? 'Creating account...' : 'Create account'}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs font-bold uppercase tracking-wide text-slate-400">
        <span className="h-px flex-1 bg-slate-200" /> or{' '}
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <GoogleLoginButton
        onToken={handleGoogleToken}
        disabled={isSubmitting || isLoading}
      />

      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link className="font-bold text-[#127D61]" href="/login">
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
