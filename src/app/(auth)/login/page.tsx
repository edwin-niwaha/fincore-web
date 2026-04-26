'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/input';
import { useAuth } from '@/features/auth/auth-provider';
import { dashboardPathForRole } from '@/features/auth/role-routing';

const schema = z.object({ email: z.string().email(), password: z.string().min(6) });
type LoginForm = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuth();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({ resolver: zodResolver(schema) });

  async function onSubmit(values: LoginForm) {
    const user = await login(values.email, values.password);
    router.replace(dashboardPathForRole(user.role));
  }

  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-br from-[#e8f5f1] to-[#fff2df] p-4">
      <Card className="w-full max-w-md">
        <p className="text-3xl font-black text-[#127D61]">FinCore</p>
        <h1 className="mt-4 text-2xl font-bold">Sign in</h1>
        <p className="mb-6 text-sm text-slate-500">Use your staff or client account.</p>

        <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
          <Field label="Email" error={errors.email?.message}><Input autoComplete="email" type="email" {...register('email')} /></Field>
          <Field label="Password" error={errors.password?.message}><Input autoComplete="current-password" type="password" {...register('password')} /></Field>
          <Button disabled={isSubmitting || isLoading}>{isSubmitting ? 'Signing in...' : 'Login'}</Button>
        </form>

        <a className="mt-4 block text-center text-sm font-semibold text-[#127D61]" href="/forgot-password">Forgot password?</a>
      </Card>
    </main>
  );
}
