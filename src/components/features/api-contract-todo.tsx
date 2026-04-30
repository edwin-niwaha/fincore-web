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
      <Card className="overflow-hidden p-0">
        <div className="card-header">
          <div>
            <CardTitle>API contract TODO</CardTitle>
            <p className="mt-1 text-sm text-slate-600">
              This page does not use mock production data. Connect it after the
              backend endpoint is available.
            </p>
          </div>
        </div>
        <div className="card-body">
          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            The frontend is waiting for a live API contract before this workspace
            can be completed safely.
          </p>
          <pre className="mt-4 overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-white">{`${method} ${endpoint}\n\n${contract}`}</pre>
        </div>
      </Card>
    </div>
  );
}
