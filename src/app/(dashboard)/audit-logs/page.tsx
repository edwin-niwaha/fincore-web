import { ApiContractTodo } from '@/components/features/api-contract-todo';

export default function Page() {
  return (
    <ApiContractTodo
      title="Audit logs"
      description="Backend endpoint contract is documented here; no fake data is rendered."
      endpoint="/audit-logs/"
      contract="{ results: [] } or paginated DRF response."
    />
  );
}
