'use client';

import { useCallback, useMemo, useState } from 'react';
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
import { StateView } from '@/components/ui/state-view';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  formSelectClassName,
  formatDate,
  statusLabel,
} from '@/features/admin/shared';
import { useAuth } from '@/features/auth/auth-provider';
import { useApiResource } from '@/hooks/use-api-resource';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import {
  isPaginatedResponse,
  listCount,
  money,
  unwrapList,
} from '@/lib/api/format';
import { accountingApi, adminApi, loanApi } from '@/lib/api/services';
import type {
  ApiProblem,
  Institution,
  LedgerAccount,
  LoanProduct,
} from '@/types/api';
import type { Role } from '@/types/roles';

type LoanProductFormState = {
  institution: string;
  name: string;
  code: string;
  description: string;
  min_amount: string;
  max_amount: string;
  annual_interest_rate: string;
  interest_method: string;
  repayment_frequency: string;
  min_term_months: string;
  max_term_months: string;
  default_term_months: string;
  grace_period_days: string;
  penalty_rate: string;
  penalty_flat_amount: string;
  penalty_grace_days: string;
  minimum_savings_balance: string;
  minimum_share_capital: string;
  max_outstanding_loans: string;
  max_amount_to_savings_ratio: string;
  max_amount_to_share_ratio: string;
  debt_to_income_limit: string;
  receivable_account: string;
  funding_account: string;
  interest_income_account: string;
  is_active: boolean;
};

const productManageRoles: Role[] = [
  'super_admin',
  'institution_admin',
  'branch_manager',
  'accountant',
];

const textareaClassName =
  'min-h-[96px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-950 shadow-sm outline-none transition focus:border-[#127D61] focus:ring-4 focus:ring-emerald-100';

function getProblemMessage(
  error: unknown,
  fallback = 'Unable to save loan product changes.',
) {
  const problem = error as ApiProblem;
  if (problem?.message) return problem.message;

  if (problem?.errors && typeof problem.errors === 'object') {
    const firstField = Object.values(problem.errors).find(Boolean);
    if (Array.isArray(firstField)) {
      return firstField.map(String).join(' ');
    }
    if (typeof firstField === 'string') {
      return firstField;
    }
  }

  return fallback;
}

function createEmptyProductForm(institutionId = ''): LoanProductFormState {
  return {
    institution: institutionId,
    name: '',
    code: '',
    description: '',
    min_amount: '',
    max_amount: '',
    annual_interest_rate: '',
    interest_method: 'flat',
    repayment_frequency: 'monthly',
    min_term_months: '1',
    max_term_months: '12',
    default_term_months: '12',
    grace_period_days: '0',
    penalty_rate: '0',
    penalty_flat_amount: '0',
    penalty_grace_days: '0',
    minimum_savings_balance: '0',
    minimum_share_capital: '0',
    max_outstanding_loans: '',
    max_amount_to_savings_ratio: '',
    max_amount_to_share_ratio: '',
    debt_to_income_limit: '',
    receivable_account: '',
    funding_account: '',
    interest_income_account: '',
    is_active: true,
  };
}

function createProductFormFromProduct(product: LoanProduct): LoanProductFormState {
  return {
    institution: product.institution ? String(product.institution) : '',
    name: product.name ?? '',
    code: product.code ?? '',
    description: product.description ?? '',
    min_amount: String(product.min_amount ?? ''),
    max_amount: String(product.max_amount ?? ''),
    annual_interest_rate: String(product.annual_interest_rate ?? ''),
    interest_method: product.interest_method ?? 'flat',
    repayment_frequency: product.repayment_frequency ?? 'monthly',
    min_term_months: String(product.min_term_months ?? 1),
    max_term_months: String(product.max_term_months ?? 12),
    default_term_months:
      product.default_term_months == null
        ? ''
        : String(product.default_term_months),
    grace_period_days: String(product.grace_period_days ?? 0),
    penalty_rate: String(product.penalty_rate ?? 0),
    penalty_flat_amount: String(product.penalty_flat_amount ?? 0),
    penalty_grace_days: String(product.penalty_grace_days ?? 0),
    minimum_savings_balance: String(product.minimum_savings_balance ?? 0),
    minimum_share_capital: String(product.minimum_share_capital ?? 0),
    max_outstanding_loans:
      product.max_outstanding_loans == null
        ? ''
        : String(product.max_outstanding_loans),
    max_amount_to_savings_ratio:
      product.max_amount_to_savings_ratio == null
        ? ''
        : String(product.max_amount_to_savings_ratio),
    max_amount_to_share_ratio:
      product.max_amount_to_share_ratio == null
        ? ''
        : String(product.max_amount_to_share_ratio),
    debt_to_income_limit:
      product.debt_to_income_limit == null
        ? ''
        : String(product.debt_to_income_limit),
    receivable_account: product.receivable_account
      ? String(product.receivable_account)
      : '',
    funding_account: product.funding_account
      ? String(product.funding_account)
      : '',
    interest_income_account: product.interest_income_account
      ? String(product.interest_income_account)
      : '',
    is_active: product.is_active ?? true,
  };
}

function institutionPlaceholder(user: {
  institution?: string | number | null;
  institution_name?: string | null;
  institution_code?: string | null;
}) {
  if (!user.institution) return [];

  return [
    {
      id: user.institution,
      name: user.institution_name || 'Assigned institution',
      code: user.institution_code || '',
      status: 'active',
    },
  ] as Institution[];
}

function loanProductPayload(form: LoanProductFormState) {
  const optionalInteger = (value: string) =>
    value.trim() ? Number(value.trim()) : null;
  const optionalValue = (value: string) => (value.trim() ? value.trim() : null);

  return {
    institution: form.institution,
    name: form.name.trim(),
    code: form.code.trim(),
    description: form.description.trim(),
    min_amount: form.min_amount.trim(),
    max_amount: form.max_amount.trim(),
    annual_interest_rate: form.annual_interest_rate.trim(),
    interest_method: form.interest_method,
    repayment_frequency: form.repayment_frequency,
    min_term_months: Number(form.min_term_months.trim()),
    max_term_months: Number(form.max_term_months.trim()),
    default_term_months: optionalInteger(form.default_term_months),
    grace_period_days: Number(form.grace_period_days.trim() || '0'),
    penalty_rate: form.penalty_rate.trim() || '0',
    penalty_flat_amount: form.penalty_flat_amount.trim() || '0',
    penalty_grace_days: Number(form.penalty_grace_days.trim() || '0'),
    minimum_savings_balance: form.minimum_savings_balance.trim() || '0',
    minimum_share_capital: form.minimum_share_capital.trim() || '0',
    max_outstanding_loans: optionalInteger(form.max_outstanding_loans),
    max_amount_to_savings_ratio: optionalValue(form.max_amount_to_savings_ratio),
    max_amount_to_share_ratio: optionalValue(form.max_amount_to_share_ratio),
    debt_to_income_limit: optionalValue(form.debt_to_income_limit),
    receivable_account: optionalValue(form.receivable_account),
    funding_account: optionalValue(form.funding_account),
    interest_income_account: optionalValue(form.interest_income_account),
    is_active: form.is_active,
  };
}

function ProductConfigurationSummary({ product }: { product: LoanProduct }) {
  return (
    <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
          Lending range
        </p>
        <p className="mt-1 font-semibold text-slate-900">
          {money(product.min_amount)} to {money(product.max_amount)}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {product.annual_interest_rate ?? 0}% {statusLabel(product.interest_method)}
        </p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
          Term and frequency
        </p>
        <p className="mt-1 font-semibold text-slate-900">
          {product.min_term_months} to {product.max_term_months} months
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Default {product.default_term_months ?? '-'} |{' '}
          {statusLabel(product.repayment_frequency)}
        </p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
          Qualification
        </p>
        <p className="mt-1 font-semibold text-slate-900">
          Savings {money(product.minimum_savings_balance)}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Shares {money(product.minimum_share_capital)} | DTI{' '}
          {product.debt_to_income_limit ?? '-'}%
        </p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
          GL mapping
        </p>
        <p className="mt-1 font-semibold text-slate-900">
          {product.receivable_account_name ?? 'Receivable TBD'}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {product.funding_account_name ?? 'Funding TBD'} |{' '}
          {product.interest_income_account_name ?? 'Interest income TBD'}
        </p>
      </div>
    </div>
  );
}

export function LoanProductsPage() {
  const { user } = useAuth();
  const actorRole = user?.role ?? null;
  const canManageProducts = Boolean(
    actorRole && productManageRoles.includes(actorRole),
  );
  const canChooseInstitution = actorRole === 'super_admin';
  const fixedInstitutionId = user?.institution ? String(user.institution) : '';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [institutionFilter, setInstitutionFilter] = useState(
    canChooseInstitution ? 'all' : fixedInstitutionId || 'all',
  );
  const [page, setPage] = useState(1);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<LoanProductFormState>(() =>
    createEmptyProductForm(fixedInstitutionId),
  );

  const searchQuery = useDebouncedValue(search.trim(), 300);
  const selectedInstitutionId =
    form.institution || (canChooseInstitution ? '' : fixedInstitutionId);

  const loadInstitutions = useCallback(() => {
    if (actorRole === 'super_admin') {
      return adminApi.institutions.list({ status: 'active' });
    }
    return Promise.resolve([] as Institution[]);
  }, [actorRole]);

  const loadProducts = useCallback(
    () =>
      loanApi.products.list({
        search: searchQuery || undefined,
        is_active:
          statusFilter === 'all' ? undefined : statusFilter === 'active',
        institution:
          institutionFilter === 'all' ? undefined : institutionFilter,
        page,
      }),
    [institutionFilter, page, searchQuery, statusFilter],
  );

  const loadAccounts = useCallback(() => {
    if (!selectedInstitutionId) {
      return Promise.resolve([] as LedgerAccount[]);
    }

    return accountingApi.accounts.listAll({
      institution: selectedInstitutionId,
      is_active: true,
    });
  }, [selectedInstitutionId]);

  const {
    data: institutionsData,
    error: institutionsError,
    isLoading: institutionsLoading,
    reload: reloadInstitutions,
  } = useApiResource(loadInstitutions);
  const {
    data: productsData,
    error: productsError,
    isLoading: productsLoading,
    reload: reloadProducts,
  } = useApiResource(loadProducts);
  const {
    data: accountsData,
    error: accountsError,
    isLoading: accountsLoading,
    reload: reloadAccounts,
  } = useApiResource(loadAccounts);

  const loadedInstitutions = unwrapList(institutionsData);
  const institutions = canChooseInstitution
    ? loadedInstitutions
    : institutionPlaceholder({
        institution: user?.institution,
        institution_name: user?.institution_name,
        institution_code: user?.institution_code,
      });
  const products = unwrapList(productsData);
  const accounts = unwrapList(accountsData);
  const selectedProduct =
    products.find((product) => String(product.id) === selectedProductId) ?? null;

  const pagination = isPaginatedResponse(productsData)
    ? {
        count: listCount(productsData),
        hasNext: Boolean(productsData.next),
        hasPrevious: Boolean(productsData.previous),
      }
    : null;

  const activeProducts = products.filter((product) => product.is_active !== false);
  const mappedProducts = products.filter(
    (product) =>
      product.receivable_account &&
      product.funding_account &&
      product.interest_income_account,
  ).length;

  const columns: Column<LoanProduct>[] = useMemo(
    () => [
      {
        header: 'Product',
        accessor: (product) => (
          <div>
            <p className="font-bold text-slate-900">{product.name}</p>
            <p className="text-xs text-slate-500">
              {product.code} {product.institution_name ? `- ${product.institution_name}` : ''}
            </p>
          </div>
        ),
      },
      {
        header: 'Range',
        accessor: (product) => (
          <div>
            <p className="font-semibold text-slate-900">
              {money(product.min_amount)} to {money(product.max_amount)}
            </p>
            <p className="text-xs text-slate-500">
              {product.annual_interest_rate ?? 0}% {statusLabel(product.interest_method)}
            </p>
          </div>
        ),
      },
      {
        header: 'Qualification',
        accessor: (product) => (
          <div>
            <p className="font-semibold text-slate-900">
              Savings {money(product.minimum_savings_balance)}
            </p>
            <p className="text-xs text-slate-500">
              Shares {money(product.minimum_share_capital)} | DTI{' '}
              {product.debt_to_income_limit ?? '-'}%
            </p>
          </div>
        ),
      },
      {
        header: 'Accounting',
        accessor: (product) => (
          <div>
            <p className="font-semibold text-slate-900">
              {product.receivable_account_name ?? 'Receivable not mapped'}
            </p>
            <p className="text-xs text-slate-500">
              {product.funding_account_name ?? 'Funding not mapped'}
            </p>
          </div>
        ),
      },
      {
        header: 'Status',
        accessor: (product) => (
          <div>
            <StatusBadge status={product.is_active ? 'active' : 'inactive'} />
            <p className="mt-2 text-xs text-slate-500">
              Updated {formatDate(product.updated_at)}
            </p>
          </div>
        ),
      },
      {
        header: 'Actions',
        accessor: (product) => (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
              onClick={() => {
                setEditingProductId(String(product.id));
                setForm(createProductFormFromProduct(product));
                setFormError(null);
                setIsFormOpen(true);
                setSelectedProductId(String(product.id));
              }}
            >
              Edit
            </Button>
            <Button
              type="button"
              className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
              onClick={async () => {
                try {
                  await loanApi.products.update(product.id, {
                    is_active: !product.is_active,
                  });
                  toast.success(
                    product.is_active
                      ? 'Loan product deactivated'
                      : 'Loan product activated',
                  );
                  await reloadProducts();
                } catch (error) {
                  toast.error(
                    getProblemMessage(
                      error,
                      'Unable to update the loan product status.',
                    ),
                  );
                }
              }}
            >
              {product.is_active ? 'Deactivate' : 'Activate'}
            </Button>
          </div>
        ),
        align: 'right',
      },
    ],
    [reloadProducts],
  );

  function openCreateModal() {
    setEditingProductId(null);
    setForm(createEmptyProductForm(fixedInstitutionId));
    setFormError(null);
    setIsFormOpen(true);
  }

  function closeFormModal() {
    setIsFormOpen(false);
    setFormError(null);
  }

  async function handleProductSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.institution) {
      setFormError('Select an institution before saving this product.');
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      const payload = loanProductPayload(form);
      const saved = editingProductId
        ? await loanApi.products.update(editingProductId, payload)
        : await loanApi.products.create(payload);

      toast.success(
        editingProductId ? 'Loan product updated' : 'Loan product created',
      );
      closeFormModal();
      setSelectedProductId(String(saved.id));
      await reloadProducts();
    } catch (error) {
      const message = getProblemMessage(error);
      setFormError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  if (!canManageProducts) {
    return (
      <StateView
        title="Loan products are not available"
        description="Only loan product managers can configure lending rules and GL mappings."
      />
    );
  }

  if (productsError && !productsData) {
    return (
      <StateView
        title="Could not load loan products"
        description={productsError}
        actionLabel="Retry"
        onAction={reloadProducts}
      />
    );
  }

  return (
    <RecordsPageLayout
      title="Loan products"
      description="Configure loan limits, qualification rules, pricing, penalties, and GL mappings from one production-ready workspace."
      headerAction={
        <Button type="button" onClick={openCreateModal}>
          New loan product
        </Button>
      }
      metrics={[
        {
          label: 'Products in view',
          value: products.length,
          hint: 'Filtered by the current search and institution scope.',
        },
        {
          label: 'Active products',
          value: activeProducts.length,
          hint: 'Products available for origination right now.',
          accent: 'brand',
        },
        {
          label: 'Mapped to GL',
          value: mappedProducts,
          hint: 'Products with receivable, funding, and interest accounts set.',
          accent: 'slate',
        },
      ]}
      filterPanel={
        <Card className="grid gap-4">
          <CardTitle>Search and filters</CardTitle>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Search">
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Product name or code"
              />
            </Field>

            <Field label="Status">
              <select
                className={formSelectClassName}
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>

            {canChooseInstitution ? (
              <Field label="Institution">
                <select
                  className={formSelectClassName}
                  value={institutionFilter}
                  onChange={(event) => {
                    setInstitutionFilter(event.target.value);
                    setPage(1);
                  }}
                  disabled={institutionsLoading && !institutionsData}
                >
                  <option value="all">All institutions</option>
                  {institutions.map((institution) => (
                    <option key={institution.id} value={String(institution.id)}>
                      {institution.name}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}
          </div>

          {institutionsError ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Could not refresh the institution list.
              <button
                type="button"
                className="ml-2 font-bold underline underline-offset-2"
                onClick={() => {
                  void reloadInstitutions();
                }}
              >
                Retry
              </button>
            </div>
          ) : null}
        </Card>
      }
    >
      <div className="grid gap-6">
        {selectedProduct ? <ProductConfigurationSummary product={selectedProduct} /> : null}

        <RecordsListPanel
          title="Configured products"
          description="Review active/inactive loan products and update pricing, qualification, or accounting rules safely."
          footer={
            pagination ? (
              <RecordsPagination
                count={pagination.count}
                page={page}
                rowsOnPage={products.length}
                hasNext={pagination.hasNext}
                hasPrevious={pagination.hasPrevious}
                onPageChange={setPage}
              />
            ) : undefined
          }
        >
          <div className="grid gap-4 p-5">
            <DataTable<LoanProduct>
              data={products}
              columns={columns}
              loading={productsLoading}
              emptyTitle="No loan products found"
              emptyMessage="Create the first product or widen your filters."
              renderMobileCard={(product) => (
                <article className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-bold text-slate-900">
                          {product.name}
                        </p>
                        <StatusBadge status={product.is_active ? 'active' : 'inactive'} />
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{product.code}</p>
                    </div>
                    <Button
                      type="button"
                      className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                      onClick={() => {
                        setSelectedProductId(String(product.id));
                        setEditingProductId(String(product.id));
                        setForm(createProductFormFromProduct(product));
                        setFormError(null);
                        setIsFormOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm text-slate-600">
                    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                        Range
                      </p>
                      <p className="mt-1 font-medium text-slate-800">
                        {money(product.min_amount)} to {money(product.max_amount)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                        GL mapping
                      </p>
                      <p className="mt-1 font-medium text-slate-800">
                        {product.receivable_account_name ?? 'Receivable not mapped'}
                      </p>
                    </div>
                  </div>
                </article>
              )}
            />
          </div>
        </RecordsListPanel>
      </div>

      {isFormOpen ? (
        <Modal
          open={isFormOpen}
          onClose={closeFormModal}
          size="xl"
          title={editingProductId ? 'Edit loan product' : 'Create loan product'}
          description="Define lending limits, eligibility, penalties, and accounting mappings for this product."
          footer={
            <>
              <Button
                type="button"
                className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                onClick={closeFormModal}
              >
                Cancel
              </Button>
              <Button
                form="loan-product-form"
                type="submit"
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : editingProductId ? 'Update product' : 'Create product'}
              </Button>
            </>
          }
        >
          <form
            className="grid gap-5"
            id="loan-product-form"
            onSubmit={handleProductSubmit}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Institution">
                <select
                  className={formSelectClassName}
                  value={form.institution}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      institution: event.target.value,
                      receivable_account: '',
                      funding_account: '',
                      interest_income_account: '',
                    }))
                  }
                  disabled={!canChooseInstitution || (institutionsLoading && !institutionsData)}
                  required
                >
                  <option value="">Select an institution</option>
                  {institutions.map((institution) => (
                    <option key={institution.id} value={String(institution.id)}>
                      {institution.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Active for origination">
                <select
                  className={formSelectClassName}
                  value={form.is_active ? 'true' : 'false'}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      is_active: event.target.value === 'true',
                    }))
                  }
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Product name">
                <Input
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  required
                />
              </Field>
              <Field label="Code">
                <Input
                  value={form.code}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, code: event.target.value }))
                  }
                  required
                />
              </Field>
            </div>

            <Field label="Description">
              <textarea
                className={textareaClassName}
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Optional notes about this product."
              />
            </Field>

            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Minimum amount">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.min_amount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      min_amount: event.target.value,
                    }))
                  }
                  required
                />
              </Field>
              <Field label="Maximum amount">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.max_amount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      max_amount: event.target.value,
                    }))
                  }
                  required
                />
              </Field>
              <Field label="Interest rate (%)">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.annual_interest_rate}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      annual_interest_rate: event.target.value,
                    }))
                  }
                  required
                />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Interest method">
                <select
                  className={formSelectClassName}
                  value={form.interest_method}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      interest_method: event.target.value,
                    }))
                  }
                >
                  <option value="flat">Flat</option>
                  <option value="reducing_balance">Reducing balance</option>
                  <option value="declining_balance">Declining balance</option>
                  <option value="interest_only">Interest only</option>
                </select>
              </Field>
              <Field label="Repayment frequency">
                <select
                  className={formSelectClassName}
                  value={form.repayment_frequency}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      repayment_frequency: event.target.value,
                    }))
                  }
                >
                  <option value="monthly">Monthly</option>
                  <option value="biweekly">Biweekly</option>
                  <option value="weekly">Weekly</option>
                </select>
              </Field>
              <Field label="Grace period (days)">
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={form.grace_period_days}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      grace_period_days: event.target.value,
                    }))
                  }
                />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Minimum term (months)">
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={form.min_term_months}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      min_term_months: event.target.value,
                    }))
                  }
                  required
                />
              </Field>
              <Field label="Maximum term (months)">
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={form.max_term_months}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      max_term_months: event.target.value,
                    }))
                  }
                  required
                />
              </Field>
              <Field label="Default term (months)">
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={form.default_term_months}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      default_term_months: event.target.value,
                    }))
                  }
                />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Penalty rate (%)">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.penalty_rate}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      penalty_rate: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Penalty flat amount">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.penalty_flat_amount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      penalty_flat_amount: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Penalty grace days">
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={form.penalty_grace_days}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      penalty_grace_days: event.target.value,
                    }))
                  }
                />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Minimum savings balance">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.minimum_savings_balance}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      minimum_savings_balance: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Minimum share capital">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.minimum_share_capital}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      minimum_share_capital: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Maximum outstanding loans">
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={form.max_outstanding_loans}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      max_outstanding_loans: event.target.value,
                    }))
                  }
                />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Savings ratio cap">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.max_amount_to_savings_ratio}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      max_amount_to_savings_ratio: event.target.value,
                    }))
                  }
                  placeholder="Optional"
                />
              </Field>
              <Field label="Share ratio cap">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.max_amount_to_share_ratio}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      max_amount_to_share_ratio: event.target.value,
                    }))
                  }
                  placeholder="Optional"
                />
              </Field>
              <Field label="Debt-to-income limit (%)">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.debt_to_income_limit}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      debt_to_income_limit: event.target.value,
                    }))
                  }
                  placeholder="Optional"
                />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Receivable account">
                <select
                  className={formSelectClassName}
                  value={form.receivable_account}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      receivable_account: event.target.value,
                    }))
                  }
                  disabled={!selectedInstitutionId || (accountsLoading && !accountsData)}
                >
                  <option value="">Use default loans receivable</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={String(account.id)}>
                      {account.code} - {account.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Funding account">
                <select
                  className={formSelectClassName}
                  value={form.funding_account}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      funding_account: event.target.value,
                    }))
                  }
                  disabled={!selectedInstitutionId || (accountsLoading && !accountsData)}
                >
                  <option value="">Use default cash/bank account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={String(account.id)}>
                      {account.code} - {account.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Interest income account">
                <select
                  className={formSelectClassName}
                  value={form.interest_income_account}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      interest_income_account: event.target.value,
                    }))
                  }
                  disabled={!selectedInstitutionId || (accountsLoading && !accountsData)}
                >
                  <option value="">Use default interest income account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={String(account.id)}>
                      {account.code} - {account.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {accountsError ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Could not load active ledger accounts for this institution.
                <button
                  type="button"
                  className="ml-2 font-bold underline underline-offset-2"
                  onClick={() => {
                    void reloadAccounts();
                  }}
                >
                  Retry
                </button>
              </div>
            ) : null}

            {formError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                {formError}
              </div>
            ) : null}
          </form>
        </Modal>
      ) : null}
    </RecordsPageLayout>
  );
}
