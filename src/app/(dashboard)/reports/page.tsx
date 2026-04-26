import { ApiContractTodo } from '@/components/features/api-contract-todo';

export default function Page() {
  return <ApiContractTodo title="Reports" description="Backend endpoint contract is documented here; no fake data is rendered." endpoint="/reports/" contract="{ results: [] } or paginated DRF response." />;
}
