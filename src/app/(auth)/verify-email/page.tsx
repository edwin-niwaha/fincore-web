'use client';

import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { AuthCard } from '@/components/auth/auth-card';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { useAuth } from '@/features/auth/auth-provider';
import { dashboardPathForRole } from '@/features/auth/role-routing';

const schema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
});
type VerifyForm = z.infer<typeof schema>;

export default function VerifyEmailPage() {
  const router = useRouter();
  const { user, verifyEmail, resendEmailVerification, logout } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<VerifyForm>({ resolver: zodResolver(schema) });

  async function onSubmit(values: VerifyForm) {
    const verifiedUser = await verifyEmail(values.code);
    router.replace(dashboardPathForRole(verifiedUser.role));
  }

  return (
    <AuthCard
      title="Verify your email"
      subtitle={`Enter the OTP code sent to ${user?.email ?? 'your email address'}.`}
    >
      <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
        <Field label="6-digit OTP code" error={errors.code?.message}>
          <Input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="123456"
            {...register('code')}
          />
        </Field>
        <Button disabled={isSubmitting} className="w-full py-3">
          {isSubmitting ? 'Verifying...' : 'Verify email'}
        </Button>
      </form>

      <div className="mt-5 grid gap-3 text-center text-sm">
        <button
          type="button"
          onClick={() => void resendEmailVerification()}
          className="font-bold text-[#127D61]"
        >
          Resend verification code
        </button>
        <button
          type="button"
          onClick={() => void logout()}
          className="font-semibold text-slate-500"
        >
          Use a different account
        </button>
        <Link className="font-semibold text-slate-500" href="/login">
          Back to login
        </Link>
      </div>
    </AuthCard>
  );
}
