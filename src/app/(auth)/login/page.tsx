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

const schema = z.object({ email: z.string().email(), password: z.string().min(8, 'Password must be at least 8 characters') });
type LoginForm = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, loginWithGoogle, isLoading } = useAuth();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({ resolver: zodResolver(schema) });

  async function redirectAfterAuth(user: Awaited<ReturnType<typeof login>>) {
    if (!user.is_email_verified) {
      router.replace('/verify-email');
      return;
    }
    router.replace(dashboardPathForRole(user.role));
  }

  async function onSubmit(values: LoginForm) {
    const user = await login(values.email, values.password);
    await redirectAfterAuth(user);
  }

  const handleGoogleToken = useCallback(async (accessToken: string) => {
    const user = await loginWithGoogle(accessToken);
    await redirectAfterAuth(user);
  }, [loginWithGoogle]);

  return (
    <AuthCard title="Welcome back" subtitle="Sign in to continue to your FinCore workspace.">
      <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
        <Field label="Email address" error={errors.email?.message}>
          <Input autoComplete="email" type="email" placeholder="you@example.com" {...register('email')} />
        </Field>
        <Field label="Password" error={errors.password?.message}>
          <Input autoComplete="current-password" type="password" placeholder="••••••••" {...register('password')} />
        </Field>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Secure staff and client access</span>
          <Link className="font-bold text-[#127D61]" href="/forgot-password">Forgot password?</Link>
        </div>
        <Button disabled={isSubmitting || isLoading} className="w-full py-3">
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs font-bold uppercase tracking-wide text-slate-400">
        <span className="h-px flex-1 bg-slate-200" /> or <span className="h-px flex-1 bg-slate-200" />
      </div>

      <GoogleLoginButton onToken={handleGoogleToken} disabled={isSubmitting || isLoading} />

      <p className="mt-6 text-center text-sm text-slate-600">
        New to FinCore? <Link className="font-bold text-[#127D61]" href="/register">Create an account</Link>
      </p>
    </AuthCard>
  );
}
