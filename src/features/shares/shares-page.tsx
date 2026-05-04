'use client';

import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useState,
} from 'react';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Eye,
  Pencil,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { RecordsListPanel } from '@/components/records/records-list-panel';
import { RecordsPageLayout } from '@/components/records/records-page-layout';
import { RecordsPagination } from '@/components/records/records-pagination';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Column } from '@/components/ui/data-table';
import { DataTable } from '@/components/ui/data-table';
import { Field, Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
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
  moneyPrecise,
  unwrapList,
} from '@/lib/api/format';
import { adminApi, clientsApi, sharesApi } from '@/lib/api/services';
import type {
  ApiProblem,
  Client,
  Institution,
  ShareAccount,
  ShareProduct,
  ShareTransaction,
} from '@/types/api';
import type { Role } from '@/types/roles';

type ShareProductFormState = {
  institution: string;
  name: string;
  code: string;
  nominal_price: string;
  minimum_shares: string;
  maximum_shares: string;
  allow_dividends: boolean;
  status: string;
  description: string;
};

type ShareAccountFormState = {
  client: string;
  product: string;
  status: string;
};

type ShareAccountStatusFormState = {
  status: string;
};

type ShareOperationFormState = {
  shares: string;
  reference: string;
  notes: string;
};

type ProductModalMode = 'create' | 'edit' | null;
type OperationMode = 'purchase' | 'redeem' | null;

const cashRoles: Role[] = [
  'super_admin',
  'institution_admin',
  'branch_manager',
  'accountant',
  'teller',
];

const productManageRoles: Role[] = [
  'super_admin',
  'institution_admin',
  'branch_manager',
  'accountant',
];

const shareStatusOptions = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
  { value: 'closed', label: 'Closed' },
] as const;

const assignableStatusOptions = shareStatusOptions.filter(
  (option) => option.value !== 'all' && option.value !== 'closed',
);

const manageableStatusOptions = shareStatusOptions.filter(
  (option) => option.value !== 'all',
);

const transactionTypeOptions = [
  { value: 'all', label: 'All transaction types' },
  { value: 'purchase', label: 'Purchases' },
  { value: 'redeem', label: 'Redemptions' },
] as const;

function createEmptyProductForm(institution = ''): ShareProductFormState {
  return {
    institution,
    name: '',
    code: '',
    nominal_price: '',
    minimum_shares: '1',
    maximum_shares: '',
    allow_dividends: true,
    status: 'active',
    description: '',
  };
}

function createProductFormFromProduct(product: ShareProduct): ShareProductFormState {
  return {
    institution: String(product.institution),
    name: product.name ?? '',
    code: product.code ?? '',
    nominal_price: String(product.nominal_price ?? ''),
    minimum_shares: String(product.minimum_shares ?? 1),
    maximum_shares:
      product.maximum_shares == null ? '' : String(product.maximum_shares),
    allow_dividends: Boolean(product.allow_dividends),
    status: product.status ?? 'active',
    description: product.description ?? '',
  };
}

function createEmptyAccountForm(): ShareAccountFormState {
  return {
    client: '',
    product: '',
    status: 'active',
  };
}

function createAccountStatusForm(
  account?: ShareAccount | null,
): ShareAccountStatusFormState {
  return {
    status: account?.status ?? 'active',
  };
}

function createEmptyOperationForm(): ShareOperationFormState {
  return {
    shares: '',
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
  fallback = 'Unable to save share changes.',
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

function clientOptionLabel(client: Client) {
  return `${client.full_name || clientName(client)} (${client.member_number || client.id})`;
}

function productOptionLabel(product: ShareProduct) {
  return `${product.code} - ${product.name}`;
}

function canTransact(account: ShareAccount | null | undefined) {
  return account?.status === 'active';
}

function operationLabel(mode: OperationMode) {
  return mode === 'redeem' ? 'Redemption' : 'Purchase';
}

function operationSubmitLabel(mode: OperationMode) {
  return mode === 'redeem' ? 'Record redemption' : 'Record purchase';
}

function IconActionButton({
  title,
  onClick,
  children,
  tone = 'text-slate-700 hover:bg-slate-100',
  disabled = false,
}: {
  title: string;
  onClick: () => void;
  children: ReactNode;
  tone?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl transition ${
        disabled ? 'cursor-not-allowed text-slate-300' : tone
      }`}
    >
      {children}
    </button>
  );
}

export function SharesPage() {
  const { user } = useAuth();
  const actorRole = user?.role ?? null;
  const canManageCash = Boolean(actorRole && cashRoles.includes(actorRole));
  const canManageProducts = Boolean(
    actorRole && productManageRoles.includes(actorRole),
  );
  const canChooseProductInstitution = actorRole === 'super_admin';

  const [accountSearch, setAccountSearch] = useState('');
  const [accountStatusFilter, setAccountStatusFilter] = useState('all');
  const [accountPage, setAccountPage] = useState(1);

  const [productSearch, setProductSearch] = useState('');
  const [productStatusFilter, setProductStatusFilter] = useState('all');
  const [productPage, setProductPage] = useState(1);

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );
  const [transactionSearch, setTransactionSearch] = useState('');
  const [transactionTypeFilter, setTransactionTypeFilter] = useState('all');
  const [transactionFromDate, setTransactionFromDate] = useState('');
  const [transactionToDate, setTransactionToDate] = useState('');
  const [transactionPage, setTransactionPage] = useState(1);

  const [productModalMode, setProductModalMode] =
    useState<ProductModalMode>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState<ShareProductFormState>(() =>
    createEmptyProductForm(String(user?.institution ?? '')),
  );
  const [productFormError, setProductFormError] = useState<string | null>(null);
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  const [isCreateAccountOpen, setIsCreateAccountOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [accountProductSearch, setAccountProductSearch] = useState('');
  const [accountForm, setAccountForm] = useState<ShareAccountFormState>(
    createEmptyAccountForm,
  );
  const [accountFormError, setAccountFormError] = useState<string | null>(null);
  const [isSavingAccount, setIsSavingAccount] = useState(false);

  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [accountStatusForm, setAccountStatusForm] =
    useState<ShareAccountStatusFormState>(createAccountStatusForm);
  const [accountStatusError, setAccountStatusError] = useState<string | null>(
    null,
  );
  const [isUpdatingAccountStatus, setIsUpdatingAccountStatus] = useState(false);

  const [operationMode, setOperationMode] = useState<OperationMode>(null);
  const [operationAccountId, setOperationAccountId] = useState<string | null>(
    null,
  );
  const [operationForm, setOperationForm] = useState<ShareOperationFormState>(
    createEmptyOperationForm,
  );
  const [operationError, setOperationError] = useState<string | null>(null);
  const [isSubmittingOperation, setIsSubmittingOperation] = useState(false);

  const debouncedAccountSearch = useDebouncedValue(accountSearch.trim(), 300);
  const debouncedProductSearch = useDebouncedValue(productSearch.trim(), 300);
  const debouncedClientSearch = useDebouncedValue(clientSearch.trim(), 300);
  const debouncedAccountProductSearch = useDebouncedValue(
    accountProductSearch.trim(),
    300,
  );
  const debouncedTransactionSearch = useDebouncedValue(
    transactionSearch.trim(),
    300,
  );

  const loadAccounts = useCallback(
    () =>
      sharesApi.accounts.list({
        search: debouncedAccountSearch || undefined,
        status: accountStatusFilter === 'all' ? undefined : accountStatusFilter,
        page: accountPage,
      }),
    [accountPage, accountStatusFilter, debouncedAccountSearch],
  );

  const loadProducts = useCallback(
    () =>
      sharesApi.products.list({
        search: debouncedProductSearch || undefined,
        status: productStatusFilter === 'all' ? undefined : productStatusFilter,
        page: productPage,
      }),
    [debouncedProductSearch, productPage, productStatusFilter],
  );

  const loadSelectedAccount = useCallback(() => {
    if (!selectedAccountId) {
      return Promise.resolve(null);
    }

    return sharesApi.accounts.get(selectedAccountId);
  }, [selectedAccountId]);

  const loadTransactions = useCallback(() => {
    if (!selectedAccountId) {
      return Promise.resolve([] as ShareTransaction[]);
    }

    return sharesApi.accounts.transactions(selectedAccountId, {
      page: transactionPage,
      type:
        transactionTypeFilter === 'all' ? undefined : transactionTypeFilter,
      search: debouncedTransactionSearch || undefined,
      created_at__date__gte: transactionFromDate || undefined,
      created_at__date__lte: transactionToDate || undefined,
    });
  }, [
    debouncedTransactionSearch,
    selectedAccountId,
    transactionFromDate,
    transactionPage,
    transactionToDate,
    transactionTypeFilter,
  ]);

  const loadClientOptions = useCallback(() => {
    if (!isCreateAccountOpen) {
      return Promise.resolve([] as Client[]);
    }

    return clientsApi.list({
      search: debouncedClientSearch || undefined,
      status: 'active',
      page_size: 50,
    });
  }, [debouncedClientSearch, isCreateAccountOpen]);

  const loadProductOptions = useCallback(() => {
    if (!isCreateAccountOpen) {
      return Promise.resolve([] as ShareProduct[]);
    }

    return sharesApi.products.list({
      search: debouncedAccountProductSearch || undefined,
      status: 'active',
      page_size: 100,
    });
  }, [debouncedAccountProductSearch, isCreateAccountOpen]);

  const loadInstitutionOptions = useCallback(() => {
    if (!(productModalMode === 'create' && canChooseProductInstitution)) {
      return Promise.resolve([] as Institution[]);
    }

    return adminApi.institutions.list({
      status: 'active',
      page_size: 100,
    });
  }, [canChooseProductInstitution, productModalMode]);

  const {
    data: accountsData,
    error: accountsError,
    isLoading: accountsLoading,
    reload: reloadAccounts,
  } = useApiResource(loadAccounts);
  const {
    data: productsData,
    error: productsError,
    isLoading: productsLoading,
    reload: reloadProducts,
  } = useApiResource(loadProducts);
  const {
    data: selectedAccountData,
    error: selectedAccountError,
    isLoading: selectedAccountLoading,
    reload: reloadSelectedAccount,
  } = useApiResource(loadSelectedAccount);
  const {
    data: transactionsData,
    error: transactionsError,
    isLoading: transactionsLoading,
    reload: reloadTransactions,
  } = useApiResource(loadTransactions);
  const {
    data: clientOptionsData,
    error: clientOptionsError,
    isLoading: clientOptionsLoading,
    reload: reloadClientOptions,
  } = useApiResource(loadClientOptions);
  const {
    data: productOptionsData,
    error: productOptionsError,
    isLoading: productOptionsLoading,
    reload: reloadProductOptions,
  } = useApiResource(loadProductOptions);
  const { data: institutionOptionsData, isLoading: institutionOptionsLoading } =
    useApiResource(loadInstitutionOptions);

  const accounts = unwrapList(accountsData);
  const products = unwrapList(productsData);
  const transactions = unwrapList(transactionsData);
  const clientOptions = unwrapList(clientOptionsData);
  const productOptions = unwrapList(productOptionsData);
  const institutionOptions = unwrapList(institutionOptionsData);

  const selectedAccount =
    selectedAccountData ??
    accounts.find((account) => String(account.id) === selectedAccountId) ??
    null;

  const selectedClient =
    clientOptions.find((client) => String(client.id) === accountForm.client) ??
    null;
  const selectedCreateProduct =
    productOptions.find(
      (product) => String(product.id) === accountForm.product,
    ) ?? null;
  const editingAccount =
    accounts.find((account) => String(account.id) === editingAccountId) ??
    (selectedAccount && String(selectedAccount.id) === editingAccountId
      ? selectedAccount
      : null);
  const operationTargetAccount =
    accounts.find((account) => String(account.id) === operationAccountId) ??
    (selectedAccount && String(selectedAccount.id) === operationAccountId
      ? selectedAccount
      : null);
  const effectiveProductInstitution =
    productForm.institution ||
    (productModalMode === 'create' && canChooseProductInstitution
      ? String(institutionOptions[0]?.id ?? '')
      : '');

  const accountPagination = isPaginatedResponse(accountsData)
    ? {
        count: listCount(accountsData),
        hasNext: Boolean(accountsData.next),
        hasPrevious: Boolean(accountsData.previous),
      }
    : null;

  const productPagination = isPaginatedResponse(productsData)
    ? {
        count: listCount(productsData),
        hasNext: Boolean(productsData.next),
        hasPrevious: Boolean(productsData.previous),
      }
    : null;

  const transactionPagination = isPaginatedResponse(transactionsData)
    ? {
        count: listCount(transactionsData),
        hasNext: Boolean(transactionsData.next),
        hasPrevious: Boolean(transactionsData.previous),
      }
    : null;

  const totalShares = accounts.reduce(
    (sum, account) => sum + Number(account.shares ?? 0),
    0,
  );
  const totalValue = accounts.reduce(
    (sum, account) => sum + Number(account.total_value ?? 0),
    0,
  );

  const productFormId = 'share-product-form';
  const accountFormId = 'share-account-form';
  const accountStatusFormId = 'share-account-status-form';
  const operationFormId = 'share-operation-form';

  const productColumns: Column<ShareProduct>[] = [
    {
      header: 'Product',
      accessor: (product) => (
        <div className="min-w-[180px]">
          <p className="font-bold text-slate-900">{product.name}</p>
          <p className="text-xs text-slate-500">
            {product.code}
            {product.institution_name ? ` - ${product.institution_name}` : ''}
          </p>
        </div>
      ),
    },
    {
      header: 'Nominal price',
      accessor: (product) => (
        <span className="whitespace-nowrap font-bold tabular-nums">
          {moneyPrecise(product.nominal_price)}
        </span>
      ),
      align: 'right',
    },
    {
      header: 'Share limits',
      accessor: (product) => (
        <div className="min-w-[150px]">
          <p className="font-medium text-slate-900">
            Min {product.minimum_shares ?? 1}
          </p>
          <p className="text-xs text-slate-500">
            Max{' '}
            {product.maximum_shares == null
              ? 'No limit'
              : product.maximum_shares}
          </p>
        </div>
      ),
    },
    {
      header: 'Dividends',
      accessor: (product) =>
        product.allow_dividends ? (
          <StatusBadge status="active" label="Enabled" />
        ) : (
          <StatusBadge status="inactive" label="Disabled" />
        ),
    },
    {
      header: 'Status',
      accessor: (product) => <StatusBadge status={product.status} />,
    },
    {
      header: 'Actions',
      accessor: (product) => (
        <div className="flex items-center justify-end gap-1">
          {canManageProducts ? (
            <IconActionButton
              title="Edit product"
              tone="text-slate-700 hover:bg-slate-100"
              onClick={() => openEditProductModal(product)}
            >
              <Pencil className="h-4 w-4" />
            </IconActionButton>
          ) : (
            <span className="text-xs text-slate-400">View only</span>
          )}
        </div>
      ),
      align: 'right',
    },
  ];

  const accountColumns: Column<ShareAccount>[] = [
    {
      header: 'Account',
      accessor: (account) => (
        <div className="min-w-[150px]">
          <p className="font-bold text-slate-900">
            {account.account_number ?? account.id}
          </p>
          <p className="text-xs text-slate-500">
            {account.branch_name || 'No branch assigned'}
          </p>
        </div>
      ),
    },
    {
      header: 'Client',
      accessor: (account) => (
        <div className="min-w-[160px]">
          <p className="font-semibold text-slate-900">
            {account.client_name ?? clientName(account.client)}
          </p>
          <p className="text-xs text-slate-500">
            {account.client_member_number || 'No member number'}
          </p>
        </div>
      ),
    },
    {
      header: 'Product',
      accessor: (account) => (
        <div className="min-w-[160px]">
          <p className="font-semibold text-slate-900">
            {account.product_name || 'Share product'}
          </p>
          <p className="text-xs text-slate-500">
            {account.product_code || 'No product code'}
          </p>
        </div>
      ),
    },
    {
      header: 'Shares',
      accessor: (account) => (
        <span className="whitespace-nowrap font-bold tabular-nums">
          {Number(account.shares ?? 0).toLocaleString('en-UG')}
        </span>
      ),
      align: 'right',
    },
    {
      header: 'Value',
      accessor: (account) => (
        <span className="whitespace-nowrap font-bold tabular-nums">
          {money(account.total_value)}
        </span>
      ),
      align: 'right',
    },
    {
      header: 'Activity',
      accessor: (account) => (
        <div className="min-w-[130px]">
          <p className="font-medium text-slate-900">
            {account.transaction_count ?? 0} transactions
          </p>
          <p className="text-xs text-slate-500">
            {formatDate(account.last_transaction_at)}
          </p>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: (account) => <StatusBadge status={account.status} />,
    },
    {
      header: 'Actions',
      accessor: (account) => (
        <div className="flex items-center justify-end gap-1">
          <IconActionButton
            title="View history"
            tone="text-emerald-700 hover:bg-emerald-50"
            onClick={() => openAccountHistory(account)}
          >
            <Eye className="h-4 w-4" />
          </IconActionButton>

          {canManageCash ? (
            <>
              <IconActionButton
                title={
                  canTransact(account)
                    ? 'Purchase shares'
                    : 'Only active share accounts can accept purchases'
                }
                tone="text-blue-700 hover:bg-blue-50"
                disabled={!canTransact(account)}
                onClick={() => openOperationModal(account, 'purchase')}
              >
                <ArrowDownCircle className="h-4 w-4" />
              </IconActionButton>

              <IconActionButton
                title={
                  canTransact(account)
                    ? 'Redeem shares'
                    : 'Only active share accounts can accept redemptions'
                }
                tone="text-rose-700 hover:bg-rose-50"
                disabled={!canTransact(account)}
                onClick={() => openOperationModal(account, 'redeem')}
              >
                <ArrowUpCircle className="h-4 w-4" />
              </IconActionButton>

              <IconActionButton
                title="Update account status"
                tone="text-slate-700 hover:bg-slate-100"
                onClick={() => openEditAccountModal(account)}
              >
                <Pencil className="h-4 w-4" />
              </IconActionButton>
            </>
          ) : null}
        </div>
      ),
      align: 'right',
    },
  ];

  const transactionColumns: Column<ShareTransaction>[] = [
    {
      header: 'Date',
      accessor: (row) => (
        <span className="whitespace-nowrap text-sm">
          {formatDate(row.created_at)}
        </span>
      ),
    },
    {
      header: 'Reference',
      accessor: (row) => (
        <div className="min-w-[150px]">
          <p className="font-bold text-slate-900">{row.reference}</p>
          <p className="text-xs text-slate-500">
            {row.recorded_by_email || row.performed_by_email || 'Recorded by system'}
          </p>
        </div>
      ),
    },
    {
      header: 'Type',
      accessor: (row) => (
        <StatusBadge
          status={row.type === 'purchase' ? 'active' : 'closed'}
          label={row.type_label || statusLabel(row.type)}
        />
      ),
    },
    {
      header: 'Shares',
      accessor: (row) => (
        <span className="whitespace-nowrap font-bold tabular-nums">
          {Number(row.shares ?? 0).toLocaleString('en-UG')}
        </span>
      ),
      align: 'right',
    },
    {
      header: 'Amount',
      accessor: (row) => (
        <span
          className={`whitespace-nowrap font-bold tabular-nums ${
            row.type === 'purchase' ? 'text-emerald-700' : 'text-rose-700'
          }`}
        >
          {money(row.amount)}
        </span>
      ),
      align: 'right',
    },
    {
      header: 'Balance',
      accessor: (row) => (
        <span className="whitespace-nowrap font-bold tabular-nums">
          {Number(row.balance_after ?? 0).toLocaleString('en-UG')}
        </span>
      ),
      align: 'right',
    },
    {
      header: 'Status',
      accessor: (row) => (
        <StatusBadge status={row.status || 'posted'} label="Posted" />
      ),
    },
  ];

  function openCreateProductModal() {
    const fallbackInstitution =
      String(user?.institution ?? '') || String(products[0]?.institution ?? '');
    setProductModalMode('create');
    setEditingProductId(null);
    setProductForm(createEmptyProductForm(fallbackInstitution));
    setProductFormError(null);
  }

  function openEditProductModal(product: ShareProduct) {
    setProductModalMode('edit');
    setEditingProductId(String(product.id));
    setProductForm(createProductFormFromProduct(product));
    setProductFormError(null);
  }

  function closeProductModal() {
    setProductModalMode(null);
    setEditingProductId(null);
    setProductForm(createEmptyProductForm(String(user?.institution ?? '')));
    setProductFormError(null);
  }

  function openCreateAccountModal() {
    setIsCreateAccountOpen(true);
    setClientSearch('');
    setAccountProductSearch('');
    setAccountForm(createEmptyAccountForm());
    setAccountFormError(null);
  }

  function closeCreateAccountModal() {
    setIsCreateAccountOpen(false);
    setClientSearch('');
    setAccountProductSearch('');
    setAccountForm(createEmptyAccountForm());
    setAccountFormError(null);
  }

  function openEditAccountModal(account: ShareAccount) {
    setEditingAccountId(String(account.id));
    setAccountStatusForm(createAccountStatusForm(account));
    setAccountStatusError(null);
  }

  function closeEditAccountModal() {
    setEditingAccountId(null);
    setAccountStatusForm(createAccountStatusForm());
    setAccountStatusError(null);
  }

  function openAccountHistory(account: ShareAccount) {
    setSelectedAccountId(String(account.id));
    setTransactionPage(1);
  }

  function openOperationModal(
    account: ShareAccount,
    mode: Exclude<OperationMode, null>,
  ) {
    if (!canTransact(account)) {
      toast.error('Only active share accounts can transact.');
      return;
    }

    setOperationMode(mode);
    setOperationAccountId(String(account.id));
    setOperationForm(createEmptyOperationForm());
    setOperationError(null);
  }

  function closeOperationModal() {
    setOperationMode(null);
    setOperationAccountId(null);
    setOperationForm(createEmptyOperationForm());
    setOperationError(null);
  }

  async function handleSaveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProductFormError(null);

    const institution =
      effectiveProductInstitution.trim() ||
      String(user?.institution ?? '') ||
      String(products[0]?.institution ?? '');
    const name = productForm.name.trim();
    const code = productForm.code.trim();
    const nominalPrice = Number(productForm.nominal_price);
    const minimumShares = Number(productForm.minimum_shares);
    const maximumShares = productForm.maximum_shares.trim()
      ? Number(productForm.maximum_shares)
      : null;

    if (!institution) {
      setProductFormError('Choose the institution that owns this share product.');
      return;
    }
    if (!name) {
      setProductFormError('Share product name is required.');
      return;
    }
    if (!code) {
      setProductFormError('Share product code is required.');
      return;
    }
    if (!Number.isFinite(nominalPrice) || nominalPrice <= 0) {
      setProductFormError('Nominal price must be greater than zero.');
      return;
    }
    if (!Number.isInteger(minimumShares) || minimumShares < 1) {
      setProductFormError('Minimum shares must be at least 1.');
      return;
    }
    if (
      maximumShares !== null &&
      (!Number.isInteger(maximumShares) || maximumShares < minimumShares)
    ) {
      setProductFormError(
        'Maximum shares must be empty or greater than or equal to minimum shares.',
      );
      return;
    }

    setIsSavingProduct(true);
    try {
      const payload = {
        institution,
        name,
        code,
        nominal_price: productForm.nominal_price,
        minimum_shares: minimumShares,
        maximum_shares: maximumShares,
        allow_dividends: productForm.allow_dividends,
        status: productForm.status,
        description: productForm.description.trim(),
      };

      if (productModalMode === 'edit' && editingProductId) {
        await sharesApi.products.update(editingProductId, payload);
        toast.success('Share product updated.');
      } else {
        await sharesApi.products.create(payload);
        toast.success('Share product created.');
      }

      closeProductModal();
      await Promise.all([reloadProducts(), reloadAccounts()]);
      if (selectedAccountId) {
        await reloadSelectedAccount();
      }
    } catch (error) {
      const message = getProblemMessage(
        error,
        'Unable to save the share product.',
      );
      setProductFormError(message);
      toast.error(message);
    } finally {
      setIsSavingProduct(false);
    }
  }

  async function handleCreateAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAccountFormError(null);

    if (!accountForm.client) {
      setAccountFormError('Select an active client first.');
      return;
    }
    if (!accountForm.product) {
      setAccountFormError('Select an active share product first.');
      return;
    }
    if (accountForm.status === 'closed') {
      setAccountFormError('Share accounts cannot be created in a closed status.');
      return;
    }

    setIsSavingAccount(true);
    try {
      const created = await sharesApi.accounts.create({
        client: accountForm.client,
        product: accountForm.product,
        status: accountForm.status,
      });

      toast.success('Share account created.');
      closeCreateAccountModal();
      setSelectedAccountId(String(created.id));
      setTransactionPage(1);
      await reloadAccounts();
    } catch (error) {
      const message = getProblemMessage(
        error,
        'Unable to create the share account.',
      );
      setAccountFormError(message);
      toast.error(message);
    } finally {
      setIsSavingAccount(false);
    }
  }

  async function handleUpdateAccountStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingAccountId || !editingAccount) {
      setAccountStatusError('Choose a share account to update.');
      return;
    }

    if (
      accountStatusForm.status === 'closed' &&
      Number(editingAccount.shares ?? 0) > 0
    ) {
      setAccountStatusError(
        'Share accounts with a positive share balance cannot be closed.',
      );
      return;
    }

    setIsUpdatingAccountStatus(true);
    setAccountStatusError(null);
    try {
      await sharesApi.accounts.update(editingAccountId, {
        status: accountStatusForm.status,
      });
      toast.success('Share account status updated.');
      closeEditAccountModal();
      await reloadAccounts();

      if (selectedAccountId === editingAccountId) {
        await reloadSelectedAccount();
      }
    } catch (error) {
      const message = getProblemMessage(
        error,
        'Unable to update the share account status.',
      );
      setAccountStatusError(message);
      toast.error(message);
    } finally {
      setIsUpdatingAccountStatus(false);
    }
  }

  async function handleSubmitOperation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!operationMode || !operationAccountId || !operationTargetAccount) {
      setOperationError('Choose a valid share account before posting a transaction.');
      return;
    }

    const shares = Number(operationForm.shares);
    const reference = operationForm.reference.trim();

    if (!Number.isInteger(shares) || shares <= 0) {
      setOperationError('Shares must be a whole number greater than zero.');
      return;
    }
    if (!reference) {
      setOperationError('Reference is required.');
      return;
    }

    setIsSubmittingOperation(true);
    setOperationError(null);
    try {
      if (operationMode === 'redeem') {
        await sharesApi.accounts.redeem(operationAccountId, {
          shares,
          reference,
          notes: operationForm.notes.trim() || undefined,
        });
      } else {
        await sharesApi.accounts.purchase(operationAccountId, {
          shares,
          reference,
          notes: operationForm.notes.trim() || undefined,
        });
      }

      const shouldReloadSelected = selectedAccountId === operationAccountId;
      toast.success(`${operationLabel(operationMode)} recorded.`);
      setSelectedAccountId(operationAccountId);
      if (!shouldReloadSelected) {
        setTransactionPage(1);
      }
      closeOperationModal();
      await reloadAccounts();

      if (shouldReloadSelected) {
        await Promise.all([reloadSelectedAccount(), reloadTransactions()]);
      }
    } catch (error) {
      const message = getProblemMessage(
        error,
        `Unable to record the ${operationLabel(operationMode).toLowerCase()}.`,
      );
      setOperationError(message);
      toast.error(message);
    } finally {
      setIsSubmittingOperation(false);
    }
  }

  return (
    <RecordsPageLayout
      title="Shares"
      description="Manage share products, member share accounts, purchases, redemptions, and transaction history against the live Shares API."
      headerAction={
        <div className="flex flex-wrap items-center gap-2">
          {canManageProducts ? (
            <Button type="button" onClick={openCreateProductModal}>
              <Plus className="mr-2 h-4 w-4" />
              New share product
            </Button>
          ) : null}

          {canManageCash ? (
            <Button
              type="button"
              className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
              onClick={openCreateAccountModal}
            >
              <Plus className="mr-2 h-4 w-4" />
              New share account
            </Button>
          ) : null}
        </div>
      }
      metrics={[
        { label: 'Loaded accounts', value: accounts.length, accent: 'slate' },
        {
          label: 'Loaded products',
          value: products.length,
          accent: 'slate',
        },
        {
          label: 'Total shares',
          value: totalShares.toLocaleString('en-UG'),
          accent: 'amber',
        },
        {
          label: 'Share capital',
          value: money(totalValue),
          accent: 'brand',
        },
      ]}
      filterPanel={
        <Card className="grid gap-4 lg:grid-cols-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <p className="text-sm font-bold text-slate-900">
                Share account filters
              </p>
              <p className="text-sm text-slate-500">
                Narrow the live account list before opening transactions or
                posting share movements.
              </p>
            </div>

            <Field label="Search accounts">
              <Input
                value={accountSearch}
                onChange={(event) => {
                  setAccountSearch(event.target.value);
                  setAccountPage(1);
                }}
                placeholder="Account number, member, client, or product"
              />
            </Field>

            <Field label="Account status">
              <select
                className={formSelectClassName}
                value={accountStatusFilter}
                onChange={(event) => {
                  setAccountStatusFilter(event.target.value);
                  setAccountPage(1);
                }}
              >
                {shareStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <p className="text-sm font-bold text-slate-900">
                Share product filters
              </p>
              <p className="text-sm text-slate-500">
                Review pricing and eligibility rules without leaving the Shares
                workspace.
              </p>
            </div>

            <Field label="Search products">
              <Input
                value={productSearch}
                onChange={(event) => {
                  setProductSearch(event.target.value);
                  setProductPage(1);
                }}
                placeholder="Product name, code, or description"
              />
            </Field>

            <Field label="Product status">
              <select
                className={formSelectClassName}
                value={productStatusFilter}
                onChange={(event) => {
                  setProductStatusFilter(event.target.value);
                  setProductPage(1);
                }}
              >
                {shareStatusOptions.map((option) => (
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
      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <RecordsListPanel
          title="Share accounts"
          description="Active and historical member share balances from /api/v1/shares/accounts/."
          footer={
            accountPagination ? (
              <RecordsPagination
                count={accountPagination.count}
                page={accountPage}
                rowsOnPage={accounts.length}
                hasNext={accountPagination.hasNext}
                hasPrevious={accountPagination.hasPrevious}
                onPageChange={setAccountPage}
              />
            ) : null
          }
        >
          {accountsError && !accountsData ? (
            <StateView
              title="Could not load share accounts"
              description={accountsError}
              actionLabel="Retry"
              onAction={() => void reloadAccounts()}
            />
          ) : (
            <DataTable<ShareAccount>
              data={accounts}
              columns={accountColumns}
              loading={accountsLoading}
              emptyTitle="No share accounts found"
              emptyMessage="Create a share account for an active client to start recording purchases and redemptions."
            />
          )}
        </RecordsListPanel>

        <RecordsListPanel
          title="Share products"
          description="Configured share products, price points, and member holding rules from /api/v1/shares/products/."
          footer={
            productPagination ? (
              <RecordsPagination
                count={productPagination.count}
                page={productPage}
                rowsOnPage={products.length}
                hasNext={productPagination.hasNext}
                hasPrevious={productPagination.hasPrevious}
                onPageChange={setProductPage}
              />
            ) : null
          }
        >
          {productsError && !productsData ? (
            <StateView
              title="Could not load share products"
              description={productsError}
              actionLabel="Retry"
              onAction={() => void reloadProducts()}
            />
          ) : (
            <DataTable<ShareProduct>
              data={products}
              columns={productColumns}
              loading={productsLoading}
              emptyTitle="No share products found"
              emptyMessage="Add a share product before opening member share accounts."
            />
          )}
        </RecordsListPanel>
      </div>

      <RecordsListPanel
        title="Share transaction history"
        description={
          selectedAccount
            ? `Transactions for ${selectedAccount.account_number ?? selectedAccount.id}.`
            : 'Choose a share account to review purchases, redemptions, and balances.'
        }
        action={
          selectedAccount ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <StatusBadge status={selectedAccount.status} />

              {canManageCash ? (
                <>
                  <Button
                    type="button"
                    className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                    onClick={() => openEditAccountModal(selectedAccount)}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Status
                  </Button>

                  <Button
                    type="button"
                    className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                    disabled={!canTransact(selectedAccount)}
                    onClick={() => openOperationModal(selectedAccount, 'purchase')}
                  >
                    <ArrowDownCircle className="mr-2 h-4 w-4" />
                    Purchase
                  </Button>

                  <Button
                    type="button"
                    disabled={!canTransact(selectedAccount)}
                    onClick={() => openOperationModal(selectedAccount, 'redeem')}
                  >
                    <ArrowUpCircle className="mr-2 h-4 w-4" />
                    Redeem
                  </Button>
                </>
              ) : null}
            </div>
          ) : null
        }
      >
        {selectedAccountId ? (
          selectedAccount ? (
            <div className="grid gap-4">
              <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 xl:grid-cols-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    Account
                  </p>
                  <p className="mt-1 font-bold text-slate-900">
                    {selectedAccount.account_number ?? selectedAccount.id}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    Client
                  </p>
                  <p className="mt-1 font-bold text-slate-900">
                    {selectedAccount.client_name ??
                      clientName(selectedAccount.client)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {selectedAccount.client_member_number || 'No member number'}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    Product
                  </p>
                  <p className="mt-1 font-bold text-slate-900">
                    {selectedAccount.product_name || 'Share product'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {selectedAccount.product_code || 'No product code'}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    Balance
                  </p>
                  <p className="mt-1 font-bold text-slate-900 tabular-nums">
                    {Number(selectedAccount.shares ?? 0).toLocaleString('en-UG')}{' '}
                    shares
                  </p>
                  <p className="text-xs text-slate-500">
                    {money(selectedAccount.total_value)} current value
                  </p>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-4">
                <Field label="Search references">
                  <Input
                    value={transactionSearch}
                    onChange={(event) => {
                      setTransactionSearch(event.target.value);
                      setTransactionPage(1);
                    }}
                    placeholder="Reference search"
                  />
                </Field>

                <Field label="Transaction type">
                  <select
                    className={formSelectClassName}
                    value={transactionTypeFilter}
                    onChange={(event) => {
                      setTransactionTypeFilter(event.target.value);
                      setTransactionPage(1);
                    }}
                  >
                    {transactionTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="From date">
                  <Input
                    type="date"
                    value={transactionFromDate}
                    onChange={(event) => {
                      setTransactionFromDate(event.target.value);
                      setTransactionPage(1);
                    }}
                  />
                </Field>

                <Field label="To date">
                  <Input
                    type="date"
                    value={transactionToDate}
                    onChange={(event) => {
                      setTransactionToDate(event.target.value);
                      setTransactionPage(1);
                    }}
                  />
                </Field>
              </div>

              {selectedAccount.status !== 'active' ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  This share account is {statusLabel(selectedAccount.status)}.
                  Purchases and redemptions are blocked until the account returns
                  to Active status.
                </div>
              ) : null}

              {transactionsError && !transactionsData ? (
                <StateView
                  title="Could not load share transactions"
                  description={transactionsError}
                  actionLabel="Retry"
                  onAction={() => void reloadTransactions()}
                />
              ) : (
                <>
                  <DataTable<ShareTransaction>
                    data={transactions}
                    columns={transactionColumns}
                    loading={transactionsLoading || selectedAccountLoading}
                    emptyTitle="No share transactions found"
                    emptyMessage="No purchases or redemptions match the current filters for this account."
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
          ) : (
            <StateView
              title="Could not load the selected share account"
              description={
                selectedAccountError ||
                'The account may no longer be available in your scope.'
              }
              actionLabel="Refresh accounts"
              onAction={() => void reloadAccounts()}
            />
          )
        ) : (
          <StateView
            title="No share account selected"
            description="Choose an account from the table above to inspect its transaction history and post share movements."
          />
        )}
      </RecordsListPanel>

      {productModalMode ? (
        <Modal
          open={Boolean(productModalMode)}
          onClose={closeProductModal}
          size="lg"
          title={
            productModalMode === 'edit'
              ? 'Edit share product'
              : 'Create share product'
          }
          description="Configure pricing, share limits, dividend eligibility, and lifecycle status for this share product."
          footer={
            <>
              <Button
                type="button"
                className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                onClick={closeProductModal}
              >
                Cancel
              </Button>
              <Button form={productFormId} type="submit" disabled={isSavingProduct}>
                {isSavingProduct
                  ? productModalMode === 'edit'
                    ? 'Saving...'
                    : 'Creating...'
                  : productModalMode === 'edit'
                    ? 'Save product'
                    : 'Create product'}
              </Button>
            </>
          }
        >
          <form
            className="grid gap-4"
            id={productFormId}
            onSubmit={handleSaveProduct}
          >
            <div className="grid gap-4 md:grid-cols-2">
              {canChooseProductInstitution ? (
                <Field label="Institution">
                  <select
                    className={formSelectClassName}
                    value={effectiveProductInstitution}
                    onChange={(event) =>
                      setProductForm((current) => ({
                        ...current,
                        institution: event.target.value,
                      }))
                    }
                    disabled={
                      productModalMode === 'edit' || institutionOptionsLoading
                    }
                    required
                  >
                    <option value="">Select an institution</option>
                    {institutionOptions.map((institution) => (
                      <option key={institution.id} value={String(institution.id)}>
                        {institution.name}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : (
                <Field label="Institution">
                  <Input
                    value={
                      products.find(
                        (product) =>
                          String(product.institution) === productForm.institution,
                      )?.institution_name || 'Current institution scope'
                    }
                    disabled
                  />
                </Field>
              )}

              <Field label="Status">
                <select
                  className={formSelectClassName}
                  value={productForm.status}
                  onChange={(event) =>
                    setProductForm((current) => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }
                >
                  {manageableStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Product name">
                <Input
                  value={productForm.name}
                  onChange={(event) =>
                    setProductForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Member Share Capital"
                  required
                />
              </Field>

              <Field label="Product code">
                <Input
                  value={productForm.code}
                  onChange={(event) =>
                    setProductForm((current) => ({
                      ...current,
                      code: event.target.value,
                    }))
                  }
                  placeholder="share-capital"
                  required
                />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Nominal price">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={productForm.nominal_price}
                  onChange={(event) =>
                    setProductForm((current) => ({
                      ...current,
                      nominal_price: event.target.value,
                    }))
                  }
                  required
                />
              </Field>

              <Field label="Minimum shares">
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={productForm.minimum_shares}
                  onChange={(event) =>
                    setProductForm((current) => ({
                      ...current,
                      minimum_shares: event.target.value,
                    }))
                  }
                  required
                />
              </Field>

              <Field label="Maximum shares">
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={productForm.maximum_shares}
                  onChange={(event) =>
                    setProductForm((current) => ({
                      ...current,
                      maximum_shares: event.target.value,
                    }))
                  }
                  placeholder="Leave blank for no cap"
                />
              </Field>
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={productForm.allow_dividends}
                onChange={(event) =>
                  setProductForm((current) => ({
                    ...current,
                    allow_dividends: event.target.checked,
                  }))
                }
              />
              Allow dividend processing for this share product
            </label>

            <label className="grid gap-1.5 text-sm">
              <span className="font-bold text-slate-700">Description</span>
              <textarea
                className="min-h-[120px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#127D61] focus:ring-4 focus:ring-emerald-100"
                value={productForm.description}
                onChange={(event) =>
                  setProductForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Optional notes about eligibility, pricing, or governance."
              />
            </label>

            {productFormError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                {productFormError}
              </div>
            ) : null}
          </form>
        </Modal>
      ) : null}

      {isCreateAccountOpen ? (
        <Modal
          open={isCreateAccountOpen}
          onClose={closeCreateAccountModal}
          size="lg"
          title="Create share account"
          description="Open a share account for an active client using an active share product within your current scope."
          footer={
            <>
              <Button
                type="button"
                className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                onClick={closeCreateAccountModal}
              >
                Cancel
              </Button>
              <Button form={accountFormId} type="submit" disabled={isSavingAccount}>
                {isSavingAccount ? 'Creating...' : 'Create share account'}
              </Button>
            </>
          }
        >
          <form
            className="grid gap-4"
            id={accountFormId}
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

              <Field label="Search share products">
                <Input
                  value={accountProductSearch}
                  onChange={(event) =>
                    setAccountProductSearch(event.target.value)
                  }
                  placeholder="Product name, code, or description"
                />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
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

              <Field label="Share product">
                <select
                  className={formSelectClassName}
                  value={accountForm.product}
                  onChange={(event) =>
                    setAccountForm((current) => ({
                      ...current,
                      product: event.target.value,
                    }))
                  }
                  disabled={productOptionsLoading && !productOptionsData}
                  required
                >
                  <option value="">Select a share product</option>
                  {productOptions.map((product) => (
                    <option key={product.id} value={String(product.id)}>
                      {productOptionLabel(product)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

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
                {assignableStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            {clientOptionsError ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Could not load eligible clients for share account creation.
                <button
                  type="button"
                  className="ml-2 font-bold underline underline-offset-2"
                  onClick={() => void reloadClientOptions()}
                >
                  Retry
                </button>
              </div>
            ) : null}

            {productOptionsError ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Could not load active share products for account creation.
                <button
                  type="button"
                  className="ml-2 font-bold underline underline-offset-2"
                  onClick={() => void reloadProductOptions()}
                >
                  Retry
                </button>
              </div>
            ) : null}

            {selectedClient ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                <p className="font-bold">
                  {selectedClient.full_name || clientName(selectedClient)}
                </p>
                <p className="mt-1">
                  {selectedClient.member_number || selectedClient.id}
                  {selectedClient.branch_name
                    ? ` - ${selectedClient.branch_name}`
                    : ''}
                </p>
              </div>
            ) : null}

            {selectedCreateProduct ? (
              <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                <p className="font-bold">
                  {selectedCreateProduct.name} ({selectedCreateProduct.code})
                </p>
                <p className="mt-1">
                  Nominal price {moneyPrecise(selectedCreateProduct.nominal_price)}
                </p>
                <p className="mt-1 text-xs text-sky-700">
                  Minimum shares {selectedCreateProduct.minimum_shares ?? 1}
                  {selectedCreateProduct.maximum_shares == null
                    ? ' with no maximum cap'
                    : ` and maximum shares ${selectedCreateProduct.maximum_shares}`}
                </p>
              </div>
            ) : null}

            {accountFormError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                {accountFormError}
              </div>
            ) : null}
          </form>
        </Modal>
      ) : null}

      {editingAccountId ? (
        <Modal
          open={Boolean(editingAccountId)}
          onClose={closeEditAccountModal}
          size="md"
          title="Update share account status"
          description="Keep account lifecycle states aligned with backend rules before posting more share activity."
          footer={
            editingAccount ? (
              <>
                <Button
                  type="button"
                  className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                  onClick={closeEditAccountModal}
                >
                  Cancel
                </Button>
                <Button
                  form={accountStatusFormId}
                  type="submit"
                  disabled={isUpdatingAccountStatus}
                >
                  {isUpdatingAccountStatus ? 'Saving...' : 'Save status'}
                </Button>
              </>
            ) : (
              <Button
                type="button"
                className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                onClick={closeEditAccountModal}
              >
                Close
              </Button>
            )
          }
        >
          {editingAccount ? (
            <form
              className="grid gap-4"
              id={accountStatusFormId}
              onSubmit={handleUpdateAccountStatus}
            >
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <p className="font-bold text-slate-900">
                  {editingAccount.account_number ?? editingAccount.id}
                </p>
                <p className="mt-1">
                  {editingAccount.client_name ??
                    clientName(editingAccount.client)}{' '}
                  - {editingAccount.product_name || 'Share product'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {Number(editingAccount.shares ?? 0).toLocaleString('en-UG')}{' '}
                  shares worth {money(editingAccount.total_value)}
                </p>
              </div>

              <Field label="Account status">
                <select
                  className={formSelectClassName}
                  value={accountStatusForm.status}
                  onChange={(event) =>
                    setAccountStatusForm({ status: event.target.value })
                  }
                >
                  {manageableStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>

              {accountStatusForm.status === 'closed' &&
              Number(editingAccount.shares ?? 0) > 0 ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  This account still has an outstanding share balance. Fully
                  redeem it before switching the status to Closed.
                </div>
              ) : null}

              {accountStatusError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                  {accountStatusError}
                </div>
              ) : null}
            </form>
          ) : (
            <StateView
              title="Share account not found"
              description="Refresh the page and select the account again."
            />
          )}
        </Modal>
      ) : null}

      {operationMode ? (
        <Modal
          open={Boolean(operationMode)}
          onClose={closeOperationModal}
          size="md"
          title={operationSubmitLabel(operationMode)}
          description="Record a share purchase or redemption against the selected account using the live backend validation rules."
          footer={
            operationTargetAccount ? (
              <>
                <Button
                  type="button"
                  className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
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
                className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
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
                  {operationTargetAccount.account_number ?? operationTargetAccount.id}
                </p>
                <p className="mt-1">
                  {operationTargetAccount.client_name ??
                    clientName(operationTargetAccount.client)}{' '}
                  - {operationTargetAccount.product_name || 'Share product'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Current holding{' '}
                  {Number(operationTargetAccount.shares ?? 0).toLocaleString(
                    'en-UG',
                  )}{' '}
                  shares worth {money(operationTargetAccount.total_value)}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Product minimums, maximums, active status checks, and duplicate
                  reference protection are enforced by the backend.
                </p>
              </div>

              <Field label="Shares">
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={operationForm.shares}
                  onChange={(event) =>
                    setOperationForm((current) => ({
                      ...current,
                      shares: event.target.value,
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
                  placeholder="Voucher or receipt reference"
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
                  placeholder="Optional notes for audit and support follow-up"
                />
              </Field>

              {operationError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                  {operationError}
                </div>
              ) : null}
            </form>
          ) : (
            <StateView
              title="Share account not found"
              description="Choose a valid share account before posting a purchase or redemption."
            />
          )}
        </Modal>
      ) : null}
    </RecordsPageLayout>
  );
}
