'use client';

import Link from 'next/link';
import Image from 'next/image';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from 'lucide-react';

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

function PremiumFinanceSvg() {
  return (
    <svg
      viewBox="0 0 680 560"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-2xl drop-shadow-2xl"
    >
      <style>{`
        .float-slow { animation: float 6s ease-in-out infinite; }
        .float-fast { animation: float 4s ease-in-out infinite; }
        .pulse-soft { animation: pulse 3s ease-in-out infinite; }
        .draw-line { stroke-dasharray: 520; stroke-dashoffset: 520; animation: draw 2.4s ease forwards infinite alternate; }
        .bar-1 { animation: grow 2.8s ease-in-out infinite; transform-origin: bottom; }
        .bar-2 { animation: grow 3.2s ease-in-out infinite; transform-origin: bottom; }
        .bar-3 { animation: grow 2.5s ease-in-out infinite; transform-origin: bottom; }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-16px); }
        }

        @keyframes pulse {
          0%, 100% { opacity: .45; transform: scale(1); }
          50% { opacity: .9; transform: scale(1.04); }
        }

        @keyframes draw {
          to { stroke-dashoffset: 0; }
        }

        @keyframes grow {
          0%, 100% { transform: scaleY(.72); }
          50% { transform: scaleY(1); }
        }
      `}</style>

      <circle cx="340" cy="280" r="230" fill="white" opacity="0.06" />
      <circle cx="340" cy="280" r="170" fill="white" opacity="0.05" />

      <g className="float-slow">
        <rect x="105" y="95" width="470" height="330" rx="34" fill="white" />
        <rect x="105" y="95" width="470" height="82" rx="34" fill="#127D61" />
        <rect x="105" y="142" width="470" height="38" fill="#127D61" />

        <circle cx="153" cy="136" r="10" fill="#F79420" />
        <circle cx="186" cy="136" r="10" fill="white" opacity="0.72" />
        <circle cx="219" cy="136" r="10" fill="white" opacity="0.45" />

        <rect x="140" y="210" width="150" height="22" rx="11" fill="#CBD5E1" />
        <rect x="140" y="246" width="105" height="16" rx="8" fill="#E2E8F0" />

        <rect x="365" y="205" width="155" height="58" rx="18" fill="#ECFDF5" />
        <rect x="390" y="225" width="102" height="14" rx="7" fill="#127D61" />

        <rect className="bar-1" x="155" y="335" width="48" height="55" rx="14" fill="#D1FAE5" />
        <rect className="bar-2" x="225" y="300" width="48" height="90" rx="14" fill="#99F6E4" />
        <rect className="bar-3" x="295" y="270" width="48" height="120" rx="14" fill="#5EEAD4" />

        <path
          className="draw-line"
          d="M145 315 L220 268 L292 298 L382 228 L495 258"
          stroke="#127D61"
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {[145, 220, 292, 382, 495].map((x, index) => {
          const y = [315, 268, 298, 228, 258][index];

          return (
            <circle
              key={x}
              cx={x}
              cy={y}
              r="12"
              fill="#F79420"
              stroke="white"
              strokeWidth="5"
            />
          );
        })}
      </g>

      <g className="float-fast">
        <rect x="415" y="330" width="150" height="112" rx="28" fill="#F79420" />
        <rect x="445" y="365" width="86" height="13" rx="7" fill="white" />
        <rect x="445" y="392" width="58" height="13" rx="7" fill="white" opacity="0.75" />
      </g>

      <g className="pulse-soft">
        <circle cx="505" cy="82" r="28" fill="#F79420" />
        <path d="M505 68V96M491 82H519" stroke="white" strokeWidth="7" strokeLinecap="round" />
      </g>

      <circle cx="595" cy="235" r="16" fill="white" opacity="0.35" />
      <circle cx="82" cy="292" r="20" fill="white" opacity="0.28" />
      <circle cx="150" cy="455" r="12" fill="#F79420" opacity="0.8" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { user, login, loginWithGoogle, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const dashboardHref = user ? dashboardPathForRole(user.role) : '/login';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(schema),
  });

  const redirectAfterAuth = useCallback(
    async (loggedInUser: Awaited<ReturnType<typeof login>>) => {
      if (!loggedInUser.is_email_verified) {
        router.replace('/verify-email');
        return;
      }

      router.replace(dashboardPathForRole(loggedInUser.role));
    },
    [router],
  );

  async function onSubmit(values: LoginForm) {
    const loggedInUser = await login(values.email, values.password);
    await redirectAfterAuth(loggedInUser);
  }

  const handleGoogleToken = useCallback(
    async (accessToken: string) => {
      const loggedInUser = await loginWithGoogle(accessToken);
      await redirectAfterAuth(loggedInUser);
    },
    [loginWithGoogle, redirectAfterAuth],
  );

  const disabled = isSubmitting || isLoading;

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[1.12fr_0.88fr]">
        <section className="relative hidden overflow-hidden bg-[#062E25] px-10 py-10 text-white lg:flex lg:flex-col">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(247,148,32,0.32),transparent_30%),radial-gradient(circle_at_85%_80%,rgba(18,125,97,0.85),transparent_42%)]" />
          <div className="absolute left-10 top-28 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="absolute bottom-10 right-10 h-80 w-80 rounded-full bg-orange-400/10 blur-3xl" />

          <div className="relative z-10 flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/images/logo.png"
                alt="FinCore"
                width={40}
                height={40}
                className="h-10 w-10 object-contain"
                priority
              />
              <span className="text-2xl font-black tracking-tight text-white">
                FinCore
              </span>
            </Link>

{user ? (
  <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold tracking-wide text-emerald-50 ring-1 ring-white/15">
    Logged in as{' '}
    <span className="font-bold text-white">
      {user.full_name || user.username || user.email}
    </span>
  </span>
) : (
  <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-wide text-emerald-50 ring-1 ring-white/15">
    Secure SACCO Platform
  </span>
)}
          </div>

          <div className="relative z-10 flex flex-1 flex-col items-center justify-center">
            <PremiumFinanceSvg />

            <div className="mt-8 max-w-xl text-center">
              <p className="mt-4 text-base leading-7 text-emerald-50/80">
                A clean, secure and modern platform for SACCO and microfinance teams.
              </p>
            </div>
          </div>
        </section>

        <section className="relative flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 sm:px-6 lg:px-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(18,125,97,0.10),transparent_35%)]" />

          <div className="relative z-10 w-full max-w-md">
            <div className="mb-8 flex items-center justify-between lg:hidden">
              <Link href="/" className="flex items-center gap-2 text-2xl font-black text-[#127D61]">
                FinCore
              </Link>

              {user ? (
                <Link
                  href={dashboardHref}
                  className="rounded-full bg-[#127D61] px-4 py-2 text-sm font-bold text-white shadow-md shadow-emerald-900/20"
                >
                  Dashboard
                </Link>
              ) : (
                <Link
                  href="/"
                  className="text-sm font-bold text-slate-500 hover:text-slate-900"
                >
                  Home
                </Link>
              )}
            </div>

            <div className="rounded-[2rem] border border-white bg-white/90 p-5 shadow-2xl shadow-slate-300/70 backdrop-blur sm:p-8">
              <div className="mb-7 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-[#127D61] ring-8 ring-emerald-50/60">
                  <ShieldCheck className="h-7 w-7" />
                </div>

                <h2 className="text-3xl font-black tracking-tight text-slate-950">
                  Welcome back
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Sign in securely to continue to FinCore.
                </p>

                  {user ? (
                    <Link
                      href={dashboardHref}
                      className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-[#127D61] px-5 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 transition hover:-translate-y-0.5 hover:bg-emerald-700"
                    >
                      Go to Dashboard
                    </Link>
                  ) : null}
              </div>

              <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
                <Field label="Email address" error={errors.email?.message}>
                  <div className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-[#127D61] focus-within:ring-2 focus-within:ring-[#127D61]/20">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[#127D61]">
                      <Mail className="h-4 w-4" />
                    </div>

                    <Input
                      autoComplete="email"
                      type="email"
                      placeholder="you@example.com"
                      className="h-full border-0 bg-transparent p-0 focus:outline-none focus:ring-0"
                      {...register('email')}
                    />
                  </div>
                </Field>

                <Field label="Password" error={errors.password?.message}>
                  <div className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-[#127D61] focus-within:ring-2 focus-within:ring-[#127D61]/20">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[#127D61]">
                      <LockKeyhole className="h-4 w-4" />
                    </div>

                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="h-full flex-1 border-0 bg-transparent p-0 focus:outline-none focus:ring-0"
                      {...register('password')}
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="shrink-0 text-slate-400 hover:text-slate-700"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </Field>

                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-medium text-slate-500">
                    Protected access
                  </span>

                  <Link
                    href="/forgot-password"
                    className="font-bold text-[#127D61] hover:text-emerald-700"
                  >
                    Forgot password?
                  </Link>
                </div>

                <Button
                  disabled={disabled}
                  className="h-12 w-full rounded-xl bg-[#127D61] font-bold text-white shadow-lg shadow-emerald-900/20 transition hover:-translate-y-0.5 hover:bg-emerald-700"
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