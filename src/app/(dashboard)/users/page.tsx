import { ApiContractTodo } from '@/components/features/api-contract-todo';

export default function Page() {
  return <ApiContractTodo title="Users and roles" description="Backend endpoint contract is documented here; no fake data is rendered." endpoint="/users/" contract="{ results: [] } or paginated DRF response." />;
}
