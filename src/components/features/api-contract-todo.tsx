import { PageHeader } from '@/components/layout/page-header';
import { Card, CardTitle } from '@/components/ui/card';

export function ApiContractTodo({
  title,
  description,
  endpoint,
  method = 'GET',
  contract,
}: {
  title: string;
  description: string;
  endpoint: string;
  method?: string;
  contract: string;
}) {
  return (
    <div className="grid gap-6">
      <PageHeader title={title} description={description} />
      <Card>
        <CardTitle>API contract TODO</CardTitle>
        <p className="mt-2 text-sm text-slate-600">
          This page does not use mock production data. Connect it after the
          backend endpoint is available.
        </p>
        <pre className="mt-4 overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-white">{`${method} ${endpoint}\n\n${contract}`}</pre>
      </Card>
    </div>
  );
}
