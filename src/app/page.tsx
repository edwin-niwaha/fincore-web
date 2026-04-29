'use client';

import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Mail, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
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
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden bg-[#0B3B2F] px-10 py-10 text-white lg:flex lg:flex-col">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(247,148,32,0.26),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(18,125,97,0.65),transparent_42%)]" />

          <div className="relative z-10 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/images/logo.png"
                alt="FinCore"
                width={36}
                height={36}
                className="h-9 w-9 object-contain"
                priority
              />
              <span className="text-xl font-black text-[#127D61] tracking-tight">
                FinCore
              </span>
            </Link>

            <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-wide text-emerald-50 ring-1 ring-white/15">
              Secure Access
            </span>
          </div>

          <div className="relative z-10 flex flex-1 flex-col items-center justify-center">
            <div className="w-full max-w-xl">
              <svg
                viewBox="0 0 620 520"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full drop-shadow-2xl"
              >
                <circle cx="310" cy="260" r="210" fill="white" opacity="0.06" />
                <circle cx="310" cy="260" r="150" fill="white" opacity="0.05" />

                <rect
                  x="100"
                  y="90"
                  width="420"
                  height="300"
                  rx="28"
                  fill="white"
                  opacity="0.98"
                />
                <rect
                  x="100"
                  y="90"
                  width="420"
                  height="72"
                  rx="28"
                  fill="#127D61"
                />
                <rect x="100" y="130" width="420" height="34" fill="#127D61" />

                <circle cx="145" cy="126" r="10" fill="#F79420" />
                <circle cx="178" cy="126" r="10" fill="white" opacity="0.7" />
                <circle cx="211" cy="126" r="10" fill="white" opacity="0.45" />

                <rect
                  x="130"
                  y="190"
                  width="130"
                  height="20"
                  rx="10"
                  fill="#CBD5E1"
                />
                <rect
                  x="130"
                  y="225"
                  width="92"
                  height="16"
                  rx="8"
                  fill="#E2E8F0"
                />

                <rect
                  x="340"
                  y="188"
                  width="130"
                  height="46"
                  rx="14"
                  fill="#ECFDF5"
                />
                <rect
                  x="360"
                  y="204"
                  width="88"
                  height="14"
                  rx="7"
                  fill="#127D61"
                />

                <path
                  d="M135 315 L210 268 L282 298 L362 225 L455 256"
                  stroke="#127D61"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {[
                  [135, 315],
                  [210, 268],
                  [282, 298],
                  [362, 225],
                  [455, 256],
                ].map(([x, y], index) => (
                  <circle
                    key={index}
                    cx={x}
                    cy={y}
                    r="11"
                    fill="#F79420"
                    stroke="white"
                    strokeWidth="5"
                  />
                ))}

                <rect
                  x="130"
                  y="345"
                  width="95"
                  height="18"
                  rx="9"
                  fill="#E2E8F0"
                />
                <rect
                  x="250"
                  y="345"
                  width="95"
                  height="18"
                  rx="9"
                  fill="#E2E8F0"
                />
                <rect
                  x="370"
                  y="345"
                  width="95"
                  height="18"
                  rx="9"
                  fill="#E2E8F0"
                />

                <rect
                  x="390"
                  y="295"
                  width="128"
                  height="105"
                  rx="24"
                  fill="#F79420"
                />
                <rect
                  x="415"
                  y="326"
                  width="78"
                  height="12"
                  rx="6"
                  fill="white"
                />
                <rect
                  x="415"
                  y="352"
                  width="52"
                  height="12"
                  rx="6"
                  fill="white"
                  opacity="0.75"
                />

                <circle cx="440" cy="62" r="22" fill="#F79420" opacity="0.9" />
                <circle cx="535" cy="220" r="14" fill="white" opacity="0.35" />
                <circle cx="82" cy="275" r="18" fill="white" opacity="0.28" />
              </svg>
            </div>

            <p className="mt-8 max-w-md text-center text-lg font-semibold leading-7 text-emerald-50/90">
              Smart financial operations. One secure platform.
            </p>
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center justify-between lg:hidden">
              <Link href="/" className="text-2xl font-black text-[#127D61]">
                FinCore
              </Link>

              <Link
                href="/"
                className="text-sm font-bold text-slate-500 hover:text-slate-900"
              >
                Home
              </Link>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-200/80 sm:p-8">
              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-[#127D61]">
                  <ShieldCheck className="h-6 w-6" />
                </div>

                <h2 className="text-2xl font-black tracking-tight text-slate-950">
                  Welcome back
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Sign in with your email and password.
                </p>
              </div>

              <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
                <Field label="Email address" error={errors.email?.message}>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      autoComplete="email"
                      type="email"
                      placeholder="you@example.com"
                      className="h-12 rounded-xl pl-10"
                      {...register('email')}
                    />
                  </div>
                </Field>

                <Field label="Password" error={errors.password?.message}>
                  <Input
                    autoComplete="current-password"
                    type="password"
                    placeholder="••••••••"
                    className="h-12 rounded-xl"
                    {...register('password')}
                  />
                </Field>

                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="text-slate-500">Protected access</span>

                  <Link
                    href="/forgot-password"
                    className="font-bold text-[#127D61] hover:text-emerald-700"
                  >
                    Forgot password?
                  </Link>
                </div>

                <Button
                  disabled={disabled}
                  className="h-12 w-full rounded-xl bg-[#127D61] font-bold text-white shadow-lg shadow-emerald-900/10 hover:bg-emerald-700"
                >
                  {isSubmitting ? 'Signing in...' : 'Sign in securely'}
                </Button>
              </form>

              <div className="mt-6">
                <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <span className="h-px flex-1 bg-slate-200" />
                  or continue with
                  <span className="h-px flex-1 bg-slate-200" />
                </div>

                <div className="mt-4">
                  <GoogleLoginButton
                    onToken={handleGoogleToken}
                    disabled={disabled}
                  />
                </div>
              </div>

              <p className="mt-6 text-center text-sm text-slate-600">
                New to FinCore?{' '}
                <Link
                  href="/register"
                  className="font-bold text-[#127D61] hover:text-emerald-700"
                >
                  Create an account
                </Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
