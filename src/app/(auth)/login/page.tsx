'use client';

import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import { z } from 'zod';

import { AuthCard } from '@/components/auth/auth-card';
import { GoogleLoginButton } from '@/components/auth/google-login-button';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { useAuth } from '@/features/auth/auth-provider';
import { dashboardPathForRole } from '@/features/auth/role-routing';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginForm = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, loginWithGoogle, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(schema),
  });

  const redirectAfterAuth = useCallback(
    async (user: Awaited<ReturnType<typeof login>>) => {
      if (!user.is_email_verified) {
        router.replace('/verify-email');
        return;
      }

      router.replace(dashboardPathForRole(user.role));
    },
    [router],
  );

  async function onSubmit(values: LoginForm) {
    const user = await login(values.email, values.password);
    await redirectAfterAuth(user);
  }

  const handleGoogleToken = useCallback(
    async (accessToken: string) => {
      const user = await loginWithGoogle(accessToken);
      await redirectAfterAuth(user);
    },
    [loginWithGoogle, redirectAfterAuth],
  );

  const disabled = isSubmitting || isLoading;

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in securely to continue to your FinCore workspace."
    >
      <form className="grid gap-5" onSubmit={handleSubmit(onSubmit)}>
          <Field label="Email address" error={errors.email?.message}>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 h-12 focus-within:ring-2 focus-within:ring-[#127D61]/20 focus-within:border-[#127D61]">
              
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-[#127D61] shrink-0">
                <Mail className="h-4 w-4" />
              </div>

              <Input
                autoComplete="email"
                type="email"
                placeholder="you@example.com"
                className="h-full border-0 bg-transparent p-0 focus:ring-0 focus:outline-none"
                {...register('email')}
              />
            </div>
          </Field>

          <Field label="Password" error={errors.password?.message}>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 h-12 focus-within:ring-2 focus-within:ring-[#127D61]/20 focus-within:border-[#127D61]">

              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-[#127D61] shrink-0">
                <LockKeyhole className="h-4 w-4" />
              </div>

              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="h-full flex-1 border-0 bg-transparent p-0 focus:ring-0 focus:outline-none"
                {...register('password')}
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-400 hover:text-slate-700"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </Field>
        <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span className="text-slate-500">
            Secure staff and client access
          </span>

          <Link
            className="font-semibold text-[#127D61] transition hover:text-[#0f6b53] hover:underline"
            href="/forgot-password"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          disabled={disabled}
          className="h-12 w-full rounded-xl bg-[#127D61] text-base font-bold text-white shadow-lg shadow-emerald-900/10 transition hover:bg-[#0f6b53]"
        >
          {disabled ? 'Signing in...' : 'Sign in securely'}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs font-bold uppercase tracking-wide text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        <span>or</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <GoogleLoginButton onToken={handleGoogleToken} disabled={disabled} />

      <p className="mt-6 text-center text-sm text-slate-600">
        New to FinCore?{' '}
        <Link
          className="font-bold text-[#127D61] transition hover:text-[#0f6b53] hover:underline"
          href="/register"
        >
          Create an account
        </Link>
      </p>
    </AuthCard>
  );
}