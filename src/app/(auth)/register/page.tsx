'use client';

import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { z } from 'zod';

import { AuthCard } from '@/components/auth/auth-card';
import { GoogleLoginButton } from '@/components/auth/google-login-button';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { useAuth } from '@/features/auth/auth-provider';
import { dashboardPathForRole } from '@/features/auth/role-routing';

const schema = z
  .object({
    email: z.string().email('Enter a valid email address'),
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

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(schema),
  });

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

  const disabled = isSubmitting || isLoading;

  return (
    <AuthCard
      title="Create your account"
      subtitle="Register as a client user. Staff accounts are managed by authorized users."
    >
      <form className="grid gap-5" onSubmit={handleSubmit(onSubmit)}>

        {/* EMAIL */}
        <Field label="Email address" error={errors.email?.message}>
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 h-12 focus-within:ring-2 focus-within:ring-[#127D61]/20 focus-within:border-[#127D61]">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-[#127D61] shrink-0">
              <Mail className="h-4 w-4" />
            </div>

            <Input
              autoComplete="email"
              type="email"
              placeholder="you@example.com"
              className="h-full flex-1 border-0 bg-transparent p-0 focus:ring-0 focus:outline-none"
              {...register('email')}
            />
          </div>
        </Field>

        {/* USERNAME */}
        <Field label="Username" error={errors.username?.message}>
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 h-12 focus-within:ring-2 focus-within:ring-[#127D61]/20 focus-within:border-[#127D61]">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-[#127D61] shrink-0">
              <UserRound className="h-4 w-4" />
            </div>

            <Input
              autoComplete="username"
              placeholder="edwin"
              className="h-full flex-1 border-0 bg-transparent p-0 focus:ring-0 focus:outline-none"
              {...register('username')}
            />
          </div>
        </Field>

        {/* PASSWORD */}
        <Field label="Password" error={errors.password?.message}>
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 h-12 focus-within:ring-2 focus-within:ring-[#127D61]/20 focus-within:border-[#127D61]">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-[#127D61] shrink-0">
              <LockKeyhole className="h-4 w-4" />
            </div>

            <Input
              autoComplete="new-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="At least 8 characters"
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

        {/* CONFIRM PASSWORD */}
        <Field
          label="Confirm password"
          error={errors.password_confirm?.message}
        >
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 h-12 focus-within:ring-2 focus-within:ring-[#127D61]/20 focus-within:border-[#127D61]">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-[#127D61] shrink-0">
              <LockKeyhole className="h-4 w-4" />
            </div>

            <Input
              autoComplete="new-password"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Repeat password"
              className="h-full flex-1 border-0 bg-transparent p-0 focus:ring-0 focus:outline-none"
              {...register('password_confirm')}
            />

            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="text-slate-400 hover:text-slate-700"
            >
              {showConfirmPassword ? (
                <EyeOff size={18} />
              ) : (
                <Eye size={18} />
              )}
            </button>
          </div>
        </Field>

        {/* BUTTON */}
        <Button
          disabled={disabled}
          className="h-12 w-full rounded-xl bg-[#127D61] text-base font-bold text-white shadow-lg shadow-emerald-900/10 transition hover:bg-[#0f6b53]"
        >
          {disabled ? 'Creating account...' : 'Create account'}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs font-bold uppercase tracking-wide text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        <span>or</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <GoogleLoginButton onToken={handleGoogleToken} disabled={disabled} />

      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link
          className="font-bold text-[#127D61] hover:text-[#0f6b53] hover:underline"
          href="/login"
        >
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}