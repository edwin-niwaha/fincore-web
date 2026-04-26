import { ApiContractTodo } from '@/components/features/api-contract-todo';

export default function Page() {
  return <ApiContractTodo title="Settings" description="Backend endpoint contract is documented here; no fake data is rendered." endpoint="/settings/" contract="{ results: [] } or paginated DRF response." />;
}
