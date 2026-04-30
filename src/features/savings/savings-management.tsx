'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { RecordsListPanel } from '@/components/records/records-list-panel';
import { RecordsPageLayout } from '@/components/records/records-page-layout';
import { RecordsPagination } from '@/components/records/records-pagination';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import type { Column } from '@/components/ui/data-table';
import { DataTable } from '@/components/ui/data-table';
import { Field, Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { RowActions } from '@/components/ui/row-actions';
import { StateView } from '@/components/ui/state-view';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  formSelectClassName,
  formatDate,
  statusLabel,
} from '@/features/admin/shared';
import { useAuth } from '@/features/auth/auth-provider';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useApiResource } from '@/hooks/use-api-resource';
import {
  clientName,
  isPaginatedResponse,
  listCount,
  money,
  unwrapList,
} from '@/lib/api/format';
import { clientsApi, savingsApi } from '@/lib/api/services';
import type {
  ApiProblem,
  Client,
  SavingsAccount,
  SavingsTransaction,
} from '@/types/api';
import type { Role } from '@/types/roles';

type SavingsAccountFormState = {
  client: string;
  status: string;
};

type SavingsOperationFormState = {
  amount: string;
  reference: string;
  notes: string;
};

type SavingsOperationMode = 'deposit' | 'withdrawal' | null;

const cashRoles: Role[] = [
  'super_admin',
  'institution_admin',
  'branch_manager',
  'accountant',
  'teller',
];

const savingsStatusOptions = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
  { value: 'closed', label: 'Closed' },
] as const;

const transactionTypeOptions = [
  { value: 'all', label: 'All transaction types' },
  { value: 'deposit', label: 'Deposits' },
  { value: 'withdrawal', label: 'Withdrawals' },
] as const;

const transactionDateOptions = [
  { value: 'all', label: 'All dates' },
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
] as const;

function createEmptyAccountForm(): SavingsAccountFormState {
  return {
    client: '',
    status: 'active',
  };
}

function createEmptyOperationForm(): SavingsOperationFormState {
  return {
    amount: '',
    reference: '',
    notes: '',
  };
}

function flattenErrorList(value: unknown): string | null {
  if (Array.isArray(value)) return value.map(String).join(' ');
  if (typeof value === 'string') return value;
  return null;
}

function getProblemMessage(
  error: unknown,
  fallback = 'Unable to save savings changes.',
) {
  const problem = error as ApiProblem;
  if (problem?.message) return problem.message;

  if (problem?.errors && typeof problem.errors === 'object') {
    const first = Object.values(problem.errors)
      .map(flattenErrorList)
      .find(Boolean);
    if (first) return first;
  }

  return fallback;
}

function buildDateFilter(dateFilter: string) {
  if (dateFilter === 'all') {
    return {};
  }

  const today = new Date();
  let start = new Date(today);

  if (dateFilter === '7d') {
    start.setDate(today.getDate() - 6);
  } else if (dateFilter === '30d') {
    start.setDate(today.getDate() - 29);
  }

  const yyyy = start.getFullYear();
  const mm = String(start.getMonth() + 1).padStart(2, '0');
  const dd = String(start.getDate()).padStart(2, '0');

  return {
    created_at__date__gte: `${yyyy}-${mm}-${dd}`,
  };
}

function operationLabel(mode: SavingsOperationMode) {
  return mode === 'withdrawal' ? 'Withdrawal' : 'Deposit';
}

function operationSubmitLabel(mode: SavingsOperationMode) {
  return mode === 'withdrawal' ? 'Record withdrawal' : 'Record deposit';
}

function clientOptionLabel(client: Client) {
  return `${client.full_name || clientName(client)} (${client.member_number || client.id})`;
}

function transactionTypeBadge(transaction: SavingsTransaction) {
  const isDeposit = transaction.type === 'deposit';

  return (
    <StatusBadge
      status={isDeposit ? 'active' : 'pending'}
      label={transaction.type_label || statusLabel(transaction.type)}
    />
  );
}

export function SavingsManagementPage() {
  const { user } = useAuth();
  const actorRole = user?.role ?? null;
  const isClient = actorRole === 'client';
  const canManageCash = Boolean(actorRole && cashRoles.includes(actorRole));

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const [transactionTypeFilter, setTransactionTypeFilter] = useState('all');
  const [transactionDateFilter, setTransactionDateFilter] = useState('all');
  const [transactionPage, setTransactionPage] = useState(1);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [accountForm, setAccountForm] = useState<SavingsAccountFormState>(
    createEmptyAccountForm,
  );
  const [accountFormError, setAccountFormError] = useState<string | null>(null);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  const [operationMode, setOperationMode] = useState<SavingsOperationMode>(null);
  const [operationAccountId, setOperationAccountId] = useState<string | null>(null);
  const [operationForm, setOperationForm] = useState<SavingsOperationFormState>(
    createEmptyOperationForm,
  );
  const [operationError, setOperationError] = useState<string | null>(null);
  const [isSubmittingOperation, setIsSubmittingOperation] = useState(false);

  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const debouncedClientSearch = useDebouncedValue(clientSearch.trim(), 300);

  const loadAccounts = useCallback(
    () =>
      savingsApi.accounts.list({
        search: debouncedSearch || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        page,
      }),
    [debouncedSearch, page, statusFilter],
  );

  const { data, error, isLoading, reload } = useApiResource(loadAccounts);
  const accounts = unwrapList(data);
  const selectedAccount =
    accounts.find((candidate) => String(candidate.id) === selectedAccountId) ??
    accounts[0] ??
    null;
  const activeAccountId = selectedAccount ? String(selectedAccount.id) : null;

  const loadTransactions = useCallback(() => {
    if (!activeAccountId) {
      return Promise.resolve([] as SavingsTransaction[]);
    }

    return savingsApi.accounts.transactions(activeAccountId, {
      page: transactionPage,
      type: transactionTypeFilter === 'all' ? undefined : transactionTypeFilter,
      ...buildDateFilter(transactionDateFilter),
    });
  }, [activeAccountId, transactionDateFilter, transactionPage, transactionTypeFilter]);

  const {
    data: transactionsData,
    error: transactionsError,
    isLoading: transactionsLoading,
    reload: reloadTransactions,
  } = useApiResource(loadTransactions);
  const transactions = unwrapList(transactionsData);

  const loadClientOptions = useCallback(() => {
    if (!isCreateOpen) {
      return Promise.resolve([] as Client[]);
    }

    return clientsApi.list({
      search: debouncedClientSearch || undefined,
      status: 'active',
      page_size: 50,
    });
  }, [debouncedClientSearch, isCreateOpen]);

  const {
    data: clientOptionsData,
    error: clientOptionsError,
    isLoading: clientOptionsLoading,
    reload: reloadClientOptions,
  } = useApiResource(loadClientOptions);
  const clientOptions = unwrapList(clientOptionsData);
  const selectedClient =
    clientOptions.find((candidate) => String(candidate.id) === accountForm.client) ??
    null;

  const pagination = isPaginatedResponse(data)
    ? {
        count: listCount(data),
        hasNext: Boolean(data.next),
        hasPrevious: Boolean(data.previous),
      }
    : null;

  const transactionPagination = isPaginatedResponse(transactionsData)
    ? {
        count: listCount(transactionsData),
        hasNext: Boolean(transactionsData.next),
        hasPrevious: Boolean(transactionsData.previous),
      }
    : null;
  const createAccountFormId = 'create-savings-account-form';
  const operationFormId = 'savings-operation-form';

  const totalBalance = accounts.reduce(
    (sum, account) => sum + Number(account.balance ?? 0),
    0,
  );

  const accountColumns: Column<SavingsAccount>[] = [
    {
      header: 'Account',
      accessor: (account) => (
        <div>
          <p className="font-bold text-slate-900">
            {account.account_number ?? account.account_no ?? account.id}
          </p>
          <p className="text-xs text-slate-500">
            {account.client_member_number
              ? `Member ${account.client_member_number}`
              : 'Savings member account'}
          </p>
        </div>
      ),
    },
    {
      header: 'Client',
      accessor: (account) => (
        <div>
          <p className="font-semibold text-slate-900">
            {account.client_name ?? clientName(account.client)}
          </p>
          <p className="text-xs text-slate-500">
            {account.client_phone || 'No phone on file'}
          </p>
        </div>
      ),
    },
    {
      header: 'Assignment',
      accessor: (account) => (
        <div>
          <p className="font-medium text-slate-800">
            {account.branch_name ?? 'No branch'}
          </p>
          <p className="text-xs text-slate-500">
            {account.institution_name ?? 'No institution'}
          </p>
        </div>
      ),
    },
    {
      header: 'Balance',
      accessor: (account) => money(account.balance),
      align: 'right',
    },
    {
      header: 'Status',
      accessor: (account) => <StatusBadge status={account.status} />,
    },
    {
      header: 'Activity',
      accessor: (account) => (
        <div>
          <p className="font-medium text-slate-800">
            {account.transaction_count ?? 0} transactions
          </p>
          <p className="text-xs text-slate-500">
            {formatDate(account.last_transaction_at || undefined)}
          </p>
        </div>
      ),
    },
    {
      header: 'Actions',
      accessor: (account) => (
        <RowActions
          actions={[
            {
              key: 'view',
              label: 'View',
              onClick: () => {
                setSelectedAccountId(String(account.id));
                setTransactionPage(1);
              },
              tone: 'success',
            },
            {
              key: 'deposit',
              label: 'Deposit',
              hidden: !canManageCash,
              onClick: () => {
                setSelectedAccountId(String(account.id));
                setTransactionPage(1);
                setOperationMode('deposit');
                setOperationAccountId(String(account.id));
                setOperationForm(createEmptyOperationForm());
                setOperationError(null);
              },
            },
            {
              key: 'withdraw',
              label: 'Withdraw',
              hidden: !canManageCash,
              onClick: () => {
                setSelectedAccountId(String(account.id));
                setTransactionPage(1);
                setOperationMode('withdrawal');
                setOperationAccountId(String(account.id));
                setOperationForm(createEmptyOperationForm());
                setOperationError(null);
              },
            },
          ]}
          align="end"
        />
      ),
      align: 'right',
    },
  ];

  const transactionColumns: Column<SavingsTransaction>[] = [
    {
      header: 'Date',
      accessor: (row) => formatDate(row.created_at),
    },
    {
      header: 'Reference',
      accessor: (row) => (
        <div>
          <p className="font-bold text-slate-900">{row.reference ?? row.id}</p>
          <p className="text-xs text-slate-500">
            {row.performed_by_email || 'Recorded by system'}
          </p>
        </div>
      ),
    },
    {
      header: 'Type',
      accessor: (row) => transactionTypeBadge(row),
    },
    {
      header: 'Amount',
      accessor: (row) => money(row.amount),
      align: 'right',
    },
    {
      header: 'Balance after',
      accessor: (row) => money(row.balance_after),
      align: 'right',
    },
    {
      header: 'Status',
      accessor: (row) => (
        <StatusBadge status={row.status || 'posted'} label="Posted" />
      ),
    },
  ];

  const operationTargetAccount =
    accounts.find((candidate) => String(candidate.id) === operationAccountId) ??
    selectedAccount;

  function openCreateAccountModal() {
    setAccountForm(createEmptyAccountForm());
    setAccountFormError(null);
    setClientSearch('');
    setIsCreateOpen(true);
  }

  function closeCreateAccountModal() {
    setIsCreateOpen(false);
    setAccountForm(createEmptyAccountForm());
    setAccountFormError(null);
    setClientSearch('');
  }

  function closeOperationModal() {
    setOperationMode(null);
    setOperationAccountId(null);
    setOperationForm(createEmptyOperationForm());
    setOperationError(null);
  }

  async function handleCreateAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreatingAccount(true);
    setAccountFormError(null);

    try {
      const createdAccount = await savingsApi.accounts.create({
        client: accountForm.client,
        status: accountForm.status,
      });
      setSelectedAccountId(String(createdAccount.id));
      closeCreateAccountModal();
      toast.success('Savings account created');
      await reload();
    } catch (saveError) {
      const message = getProblemMessage(saveError, 'Unable to create savings account.');
      setAccountFormError(message);
      toast.error(message);
    } finally {
      setIsCreatingAccount(false);
    }
  }

  async function handleSubmitOperation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!operationMode || !operationTargetAccount) {
      setOperationError('Select a savings account before recording a transaction.');
      return;
    }

    setIsSubmittingOperation(true);
    setOperationError(null);

    try {
      const payload = {
        amount: operationForm.amount.trim(),
        reference: operationForm.reference.trim(),
        notes: operationForm.notes.trim(),
      };

      if (operationMode === 'withdrawal') {
        await savingsApi.accounts.withdraw(operationTargetAccount.id, payload);
        toast.success('Withdrawal recorded');
      } else {
        await savingsApi.accounts.deposit(operationTargetAccount.id, payload);
        toast.success('Deposit recorded');
      }

      closeOperationModal();
      await reload();
      await reloadTransactions();
    } catch (saveError) {
      const message = getProblemMessage(
        saveError,
        `Unable to record the ${operationLabel(operationMode).toLowerCase()}.`,
      );
      setOperationError(message);
      toast.error(message);
    } finally {
      setIsSubmittingOperation(false);
    }
  }

  if (!actorRole) {
    return <StateView title="Loading savings workspace..." />;
  }

  const title = isClient ? 'My savings' : 'Savings';
  const description = isClient
    ? 'Review your own savings balances and transaction history from the live SACCO ledger.'
    : 'Create savings accounts, post deposits and withdrawals, and review member cash activity.';

  return (
    <RecordsPageLayout
      title={title}
      description={description}
      headerAction={
        canManageCash ? (
          <Button type="button" onClick={openCreateAccountModal}>
            Create savings account
          </Button>
        ) : undefined
      }
      metrics={[
        {
          label: isClient ? 'My accounts' : 'Visible accounts',
          value: accounts.length,
          hint: isClient
            ? 'Savings accounts currently linked to your client profile.'
            : 'Accounts matching the current search and status filter.',
        },
        {
          label: isClient ? 'My balance' : 'Total balance',
          value: money(totalBalance),
          hint: isClient
            ? 'Combined balance across your accessible savings accounts.'
            : 'Combined balance across the loaded account list.',
        },
        {
          label: 'Selected account',
          value: selectedAccount ? money(selectedAccount.balance) : 'UGX 0',
          hint: selectedAccount
            ? `${selectedAccount.account_number ?? selectedAccount.id} - ${
                selectedAccount.transaction_count ?? 0
              } transactions`
            : 'Select an account to review its activity.',
          accent: 'slate',
        },
      ]}
      filterPanel={
        <Card className="grid gap-4">
          <CardTitle>Search and filters</CardTitle>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Search">
              <Input
                placeholder="Account number, member number, client name, or phone"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </Field>

            <Field label="Account status">
              <select
                className={formSelectClassName}
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPage(1);
                }}
              >
                {savingsStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Transaction date window">
              <select
                className={formSelectClassName}
                value={transactionDateFilter}
                onChange={(event) => {
                  setTransactionDateFilter(event.target.value);
                  setTransactionPage(1);
                }}
              >
                {transactionDateOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Card>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <RecordsListPanel
          title={isClient ? 'Savings accounts' : 'Savings account directory'}
          description={
            isClient
              ? 'Your accessible savings accounts and balances.'
              : 'Create and manage client savings accounts from the same workspace used by tellers and branch staff.'
          }
          action={
            canManageCash ? (
              <Button type="button" onClick={openCreateAccountModal}>
                Add account
              </Button>
            ) : undefined
          }
          footer={
            pagination ? (
              <RecordsPagination
                count={pagination.count}
                page={page}
                rowsOnPage={accounts.length}
                hasNext={pagination.hasNext}
                hasPrevious={pagination.hasPrevious}
                onPageChange={setPage}
              />
            ) : undefined
          }
        >
          <div className="grid gap-4 p-5">
            {error && data ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                The savings list refresh failed, but your latest loaded records are still visible.
                <button
                  type="button"
                  className="ml-2 font-bold underline underline-offset-2"
                  onClick={() => {
                    void reload();
                  }}
                >
                  Retry
                </button>
              </div>
            ) : null}

            {error && !data ? (
              <StateView
                title="Could not load savings accounts"
                description={error}
                actionLabel="Retry"
                onAction={reload}
              />
            ) : (
              <DataTable<SavingsAccount>
                data={accounts}
                columns={accountColumns}
                loading={isLoading}
                emptyTitle={isClient ? 'No savings accounts yet' : 'No savings accounts found'}
                emptyMessage={
                  isClient
                    ? 'No savings accounts are linked to your profile yet. Contact your branch staff for assistance.'
                    : 'Try widening the current search or status filter.'
                }
                renderMobileCard={(account) => (
                  <article className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-base font-bold text-slate-900">
                            {account.account_number ?? account.account_no ?? account.id}
                          </p>
                          <StatusBadge status={account.status} />
                        </div>
                        <p className="mt-1 text-sm font-semibold text-slate-600">
                          {account.client_name ?? clientName(account.client)}
                        </p>
                      </div>
                      <RowActions
                        actions={[
                          {
                            key: 'view',
                            label: 'View',
                            tone: 'success',
                            onClick: () => {
                              setSelectedAccountId(String(account.id));
                              setTransactionPage(1);
                            },
                          },
                          {
                            key: 'deposit',
                            label: 'Deposit',
                            hidden: !canManageCash,
                            onClick: () => {
                              setSelectedAccountId(String(account.id));
                              setTransactionPage(1);
                              setOperationMode('deposit');
                              setOperationAccountId(String(account.id));
                              setOperationForm(createEmptyOperationForm());
                              setOperationError(null);
                            },
                          },
                          {
                            key: 'withdraw',
                            label: 'Withdraw',
                            hidden: !canManageCash,
                            onClick: () => {
                              setSelectedAccountId(String(account.id));
                              setTransactionPage(1);
                              setOperationMode('withdrawal');
                              setOperationAccountId(String(account.id));
                              setOperationForm(createEmptyOperationForm());
                              setOperationError(null);
                            },
                          },
                        ]}
                        align="end"
                      />
                    </div>

                    <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                          Balance
                        </p>
                        <p className="mt-1 font-medium text-slate-800">
                          {money(account.balance)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {account.transaction_count ?? 0} transactions
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                          Assignment
                        </p>
                        <p className="mt-1 font-medium text-slate-800">
                          {account.branch_name ?? 'No branch'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {account.institution_name ?? 'No institution'}
                        </p>
                      </div>
                    </div>
                  </article>
                )}
              />
            )}
          </div>
        </RecordsListPanel>

        <div className="grid gap-6">
          <Card className="grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>
                  {selectedAccount
                    ? selectedAccount.account_number ?? 'Selected account'
                    : isClient
                      ? 'My account summary'
                      : 'Select a savings account'}
                </CardTitle>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedAccount
                    ? `${selectedAccount.client_name ?? clientName(selectedAccount.client)} - ${
                        selectedAccount.branch_name ?? 'No branch'
                      }`
                    : 'Choose an account from the list to view balances and transaction history.'}
                </p>
              </div>
              {selectedAccount ? (
                <StatusBadge status={selectedAccount.status} />
              ) : null}
            </div>

            {selectedAccount ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                      Current balance
                    </p>
                    <p className="mt-2 text-2xl font-black text-[#127D61]">
                      {money(selectedAccount.balance)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {selectedAccount.transaction_count ?? 0} total transactions
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                      Client contact
                    </p>
                    <p className="mt-2 font-semibold text-slate-900">
                      {selectedAccount.client_name ?? clientName(selectedAccount.client)}
                    </p>
                    <p className="text-sm text-slate-500">
                      {selectedAccount.client_phone || 'No phone on file'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Last activity {formatDate(selectedAccount.last_transaction_at || undefined)}
                    </p>
                  </div>
                </div>

                {canManageCash ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      onClick={() => {
                        setOperationMode('deposit');
                        setOperationAccountId(String(selectedAccount.id));
                        setOperationForm(createEmptyOperationForm());
                        setOperationError(null);
                      }}
                    >
                      Record deposit
                    </Button>
                    <Button
                      type="button"
                      className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                      onClick={() => {
                        setOperationMode('withdrawal');
                        setOperationAccountId(String(selectedAccount.id));
                        setOperationForm(createEmptyOperationForm());
                        setOperationError(null);
                      }}
                    >
                      Record withdrawal
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Savings records are read-only in self-service. Contact your branch staff for deposits, withdrawals, or account changes.
                  </div>
                )}
              </>
            ) : (
              <StateView
                title="No savings account selected"
                description={
                  accounts.length
                    ? 'Select any savings account from the list to inspect its transaction history.'
                    : isClient
                      ? 'No savings accounts are linked to your profile yet.'
                      : 'Create a savings account to begin recording member deposits and withdrawals.'
                }
              />
            )}
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 bg-slate-50/70 px-5 py-4">
              <div className="max-w-2xl">
                <CardTitle>
                  {isClient ? 'My savings transactions' : 'Transaction history'}
                </CardTitle>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedAccount
                    ? `Review deposits and withdrawals for ${selectedAccount.account_number ?? selectedAccount.id}.`
                    : 'Transaction history appears after you select a savings account.'}
                </p>
              </div>
            </div>

            <div className="grid gap-4 p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Transaction type">
                  <select
                    className={formSelectClassName}
                    value={transactionTypeFilter}
                    onChange={(event) => {
                      setTransactionTypeFilter(event.target.value);
                      setTransactionPage(1);
                    }}
                    disabled={!selectedAccount}
                  >
                    {transactionTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Date window">
                  <select
                    className={formSelectClassName}
                    value={transactionDateFilter}
                    onChange={(event) => {
                      setTransactionDateFilter(event.target.value);
                      setTransactionPage(1);
                    }}
                    disabled={!selectedAccount}
                  >
                    {transactionDateOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              {!selectedAccount ? (
                <StateView
                  title="Choose an account first"
                  description="Transaction history will appear here once you select a savings account from the list."
                />
              ) : transactionsError && !transactionsData ? (
                <StateView
                  title="Could not load savings transactions"
                  description={transactionsError}
                  actionLabel="Retry"
                  onAction={reloadTransactions}
                />
              ) : (
                <>
                  <DataTable<SavingsTransaction>
                    data={transactions}
                    columns={transactionColumns}
                    loading={transactionsLoading}
                    emptyTitle="No transactions found"
                    emptyMessage="No deposits or withdrawals match the current filters for this savings account."
                    renderMobileCard={(row) => (
                      <article className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-base font-bold text-slate-900">
                              {row.reference ?? row.id}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              {formatDate(row.created_at)}
                            </p>
                          </div>
                          {transactionTypeBadge(row)}
                        </div>

                        <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                          <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
                            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                              Amount
                            </p>
                            <p className="mt-1 font-medium text-slate-800">
                              {money(row.amount)}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
                            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                              Balance after
                            </p>
                            <p className="mt-1 font-medium text-slate-800">
                              {money(row.balance_after)}
                            </p>
                          </div>
                        </div>
                      </article>
                    )}
                  />

                  {transactionPagination ? (
                    <RecordsPagination
                      count={transactionPagination.count}
                      page={transactionPage}
                      rowsOnPage={transactions.length}
                      hasNext={transactionPagination.hasNext}
                      hasPrevious={transactionPagination.hasPrevious}
                      onPageChange={setTransactionPage}
                    />
                  ) : null}
                </>
              )}
            </div>
          </Card>
        </div>
      </div>

      {isCreateOpen ? (
        <Modal
          open={isCreateOpen}
          onClose={closeCreateAccountModal}
          size="lg"
          title="Create savings account"
          description="Assign a savings account to an active client within your allowed branch and institution scope."
          footer={
            <>
              <Button
                type="button"
                className="btn-outline-secondary bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                onClick={closeCreateAccountModal}
              >
                Cancel
              </Button>
              <Button
                form={createAccountFormId}
                type="submit"
                disabled={isCreatingAccount}
              >
                {isCreatingAccount ? 'Creating...' : 'Create savings account'}
              </Button>
            </>
          }
        >
              <form
                className="grid gap-4"
                id={createAccountFormId}
                onSubmit={handleCreateAccount}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Search clients">
                    <Input
                      value={clientSearch}
                      onChange={(event) => setClientSearch(event.target.value)}
                      placeholder="Member number, name, or phone"
                    />
                  </Field>

                  <Field label="Account status">
                    <select
                      className={formSelectClassName}
                      value={accountForm.status}
                      onChange={(event) =>
                        setAccountForm((current) => ({
                          ...current,
                          status: event.target.value,
                        }))
                      }
                    >
                      {savingsStatusOptions
                        .filter((option) => option.value !== 'all')
                        .map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                    </select>
                  </Field>
                </div>

                <Field label="Client">
                  <select
                    className={formSelectClassName}
                    value={accountForm.client}
                    onChange={(event) =>
                      setAccountForm((current) => ({
                        ...current,
                        client: event.target.value,
                      }))
                    }
                    disabled={clientOptionsLoading && !clientOptionsData}
                    required
                  >
                    <option value="">Select a client</option>
                    {clientOptions.map((client) => (
                      <option key={client.id} value={String(client.id)}>
                        {clientOptionLabel(client)}
                      </option>
                    ))}
                  </select>
                </Field>

                {clientOptionsError ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    Could not load clients for savings account creation.
                    <button
                      type="button"
                      className="ml-2 font-bold underline underline-offset-2"
                      onClick={() => {
                        void reloadClientOptions();
                      }}
                    >
                      Retry
                    </button>
                  </div>
                ) : null}

                {!clientOptionsLoading &&
                isCreateOpen &&
                !clientOptions.length &&
                !clientOptionsError ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    No active clients matched this search. Create or activate the client first from the Clients page.
                  </div>
                ) : null}

                {selectedClient ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                    <p className="font-bold">
                      {selectedClient.full_name || clientName(selectedClient)}
                    </p>
                    <p className="mt-1">
                      {selectedClient.member_number || selectedClient.id}
                      {selectedClient.branch_name ? ` - ${selectedClient.branch_name}` : ''}
                    </p>
                    <p className="mt-1 text-xs text-emerald-700">
                      {selectedClient.phone || 'No phone on file'}
                    </p>
                  </div>
                ) : null}

                {accountFormError ? (
                  <div className="alert alert-danger">
                    {accountFormError}
                  </div>
                ) : null}
              </form>
        </Modal>
      ) : null}

      {operationMode ? (
        <Modal
          open={Boolean(operationMode)}
          onClose={closeOperationModal}
          size="md"
          title={operationSubmitLabel(operationMode)}
          description={
            operationTargetAccount
              ? `${operationLabel(operationMode)} for ${
                  operationTargetAccount.account_number ?? operationTargetAccount.id
                }`
              : 'Select a savings account and record the cash movement.'
          }
          footer={
            operationTargetAccount ? (
              <>
                <Button
                  type="button"
                  className="btn-outline-secondary bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                  onClick={closeOperationModal}
                >
                  Cancel
                </Button>
                <Button
                  form={operationFormId}
                  type="submit"
                  disabled={isSubmittingOperation}
                >
                  {isSubmittingOperation
                    ? `${operationLabel(operationMode)}...`
                    : operationSubmitLabel(operationMode)}
                </Button>
              </>
            ) : (
              <Button
                type="button"
                className="btn-outline-secondary bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                onClick={closeOperationModal}
              >
                Close
              </Button>
            )
          }
        >
              {operationTargetAccount ? (
                <form
                  className="grid gap-4"
                  id={operationFormId}
                  onSubmit={handleSubmitOperation}
                >
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <p className="font-bold text-slate-900">
                      {operationTargetAccount.client_name ??
                        clientName(operationTargetAccount.client)}
                    </p>
                    <p className="mt-1">
                      {operationTargetAccount.account_number ?? operationTargetAccount.id}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Current balance {money(operationTargetAccount.balance)}
                    </p>
                  </div>

                  <Field label="Amount">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={operationForm.amount}
                      onChange={(event) =>
                        setOperationForm((current) => ({
                          ...current,
                          amount: event.target.value,
                        }))
                      }
                      required
                    />
                  </Field>

                  <Field label="Reference">
                    <Input
                      value={operationForm.reference}
                      onChange={(event) =>
                        setOperationForm((current) => ({
                          ...current,
                          reference: event.target.value,
                        }))
                      }
                      placeholder="Cash receipt or voucher reference"
                      required
                    />
                  </Field>

                  <Field label="Notes">
                    <Input
                      value={operationForm.notes}
                      onChange={(event) =>
                        setOperationForm((current) => ({
                          ...current,
                          notes: event.target.value,
                        }))
                      }
                      placeholder="Optional notes for the teller or branch record"
                    />
                  </Field>

                  {operationError ? (
                    <div className="alert alert-danger">
                      {operationError}
                    </div>
                  ) : null}
                </form>
              ) : (
                <StateView
                  title="Savings account not found"
                  description="Choose a valid savings account before recording a cash transaction."
                />
              )}
        </Modal>
      ) : null}
    </RecordsPageLayout>
  );
}
