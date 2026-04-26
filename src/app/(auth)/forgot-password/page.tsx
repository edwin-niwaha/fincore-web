import { Card } from '@/components/ui/card';

export default function ForgotPasswordPage() {
  return (
    <main className="grid min-h-screen place-items-center p-4">
      <Card className="max-w-md">
        <h1 className="text-2xl font-bold">Forgot password</h1>
        <p className="mt-2 text-sm text-slate-600">TODO: connect to POST /auth/password-reset/ when the backend endpoint is enabled.</p>
        <a className="mt-4 block font-semibold text-[#127D61]" href="/login">Back to login</a>
      </Card>
    </main>
  );
}
