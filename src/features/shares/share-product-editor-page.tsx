'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/input';
import { StateView } from '@/components/ui/state-view';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDate } from '@/features/admin/shared';
import { useAuth } from '@/features/auth/auth-provider';
import { useApiResource } from '@/hooks/use-api-resource';
import { money, unwrapList } from '@/lib/api/format';
import { adminApi, sharesApi } from '@/lib/api/services';
import type { Institution, ShareProduct } from '@/types/api';
import {
  SharesFeatureGate,
  SharesWorkspaceHeader,
  canAccessShareFeature,
  getProblemMessage,
  shareProductManagerRoles,
  shareProductStatusOptions,
  shareTextareaClassName,
} from '@/features/shares/shared';

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

function productFormFromRecord(product: ShareProduct): ShareProductFormState {
  return {
    institution: product.institution ? String(product.institution) : '',
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

function emptyProductForm(institutionId = ''): ShareProductFormState {
  return {
    institution: institutionId,
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

function ShareProductFormCard({
  actorRole,
  fixedInstitutionId,
  initialForm,
  institutions,
  productId,
}: {
  actorRole: string | null;
  fixedInstitutionId: string;
  initialForm: ShareProductFormState;
  institutions: Institution[];
  productId?: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState<ShareProductFormState>(initialForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSaving(true);
    setFormError(null);

    try {
      const payload = {
        institution: form.institution || fixedInstitutionId,
        name: form.name.trim(),
        code: form.code.trim(),
        nominal_price: form.nominal_price.trim(),
        minimum_shares: Number(form.minimum_shares),
        maximum_shares: form.maximum_shares.trim()
          ? Number(form.maximum_shares)
          : null,
        allow_dividends: form.allow_dividends,
        status: form.status,
        description: form.description.trim(),
      };

      if (productId) {
        await sharesApi.products.update(productId, payload);
        toast.success('Share product updated');
      } else {
        await sharesApi.products.create(payload);
        toast.success('Share product created');
      }

      router.push('/shares/products');
    } catch (saveError) {
      const message = getProblemMessage(saveError, 'Unable to save share product.');
      setFormError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="grid gap-5 p-5">
      <form className="grid gap-5" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Institution">
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-950 shadow-sm outline-none transition focus:border-[#127D61] focus:ring-4 focus:ring-emerald-100"
              value={form.institution || fixedInstitutionId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  institution: event.target.value,
                }))
              }
              disabled={actorRole !== 'super_admin'}
            >
              <option value="">Select institution</option>
              {institutions.map((institution) => (
                <option key={institution.id} value={String(institution.id)}>
                  {institution.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Status">
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-950 shadow-sm outline-none transition focus:border-[#127D61] focus:ring-4 focus:ring-emerald-100"
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  status: event.target.value,
                }))
              }
            >
              {shareProductStatusOptions
                .filter((option) => option.value !== 'all')
                .map((option) => (
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
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              required
            />
          </Field>

          <Field label="Product code">
            <Input
              value={form.code}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  code: event.target.value,
                }))
              }
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
              value={form.nominal_price}
              onChange={(event) =>
                setForm((current) => ({
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
              value={form.minimum_shares}
              onChange={(event) =>
                setForm((current) => ({
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
              value={form.maximum_shares}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  maximum_shares: event.target.value,
                }))
              }
            />
          </Field>
        </div>

        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.allow_dividends}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                allow_dividends: event.target.checked,
              }))
            }
            className="h-4 w-4 rounded border-slate-300 text-[#127D61] focus:ring-[#127D61]"
          />
          Allow dividend allocation for this product
        </label>

        <Field label="Description">
          <textarea
            className={shareTextareaClassName}
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            placeholder="Describe the share product rules and eligibility."
          />
        </Field>

        {formError ? <div className="alert alert-danger">{formError}</div> : null}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Saving...' : productId ? 'Update product' : 'Create product'}
          </Button>
          <Link href="/shares/products">
            <Button
              type="button"
              className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
            >
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </Card>
  );
}

function ShareProductReadonlyCard({ product }: { product: ShareProduct }) {
  return (
    <Card className="grid gap-5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-900">{product.name}</h2>
          <p className="mt-1 text-sm text-slate-500">{product.code}</p>
        </div>
        <StatusBadge status={product.status} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Nominal price
          </p>
          <p className="mt-2 text-lg font-black text-slate-900">
            {money(product.nominal_price)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Minimum shares
          </p>
          <p className="mt-2 text-lg font-black text-slate-900">
            {product.minimum_shares ?? 1}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Maximum shares
          </p>
          <p className="mt-2 text-lg font-black text-slate-900">
            {product.maximum_shares ?? 'No cap'}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Dividends
          </p>
          <p className="mt-2 text-lg font-black text-slate-900">
            {product.allow_dividends ? 'Enabled' : 'Disabled'}
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Institution
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {product.institution_name || '-'}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Last updated
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {formatDate(product.updated_at ?? product.created_at)}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
          Description
        </p>
        <p className="mt-2 text-sm text-slate-700">
          {product.description || 'No product description has been recorded yet.'}
        </p>
      </div>
    </Card>
  );
}

export function ShareProductEditorPage({ productId }: { productId?: string }) {
  const { user } = useAuth();
  const actorRole = user?.role ?? null;
  const canManage = canAccessShareFeature(actorRole, shareProductManagerRoles);
  const isCreateMode = !productId;
  const fixedInstitutionId = user?.institution ? String(user.institution) : '';

  const loadProduct = useCallback(() => {
    if (!productId) return Promise.resolve(null);
    return sharesApi.products.get(productId);
  }, [productId]);

  const loadInstitutions = useCallback(() => {
    if (actorRole === 'super_admin') {
      return adminApi.institutions.list({ status: 'active' });
    }

    return Promise.resolve(
      institutionPlaceholder({
        institution: user?.institution,
        institution_name: user?.institution_name,
        institution_code: user?.institution_code,
      }),
    );
  }, [actorRole, user?.institution, user?.institution_code, user?.institution_name]);

  const {
    data: product,
    error: productError,
    isLoading: productLoading,
  } = useApiResource<ShareProduct | null>(loadProduct);

  const {
    data: institutionsData,
    error: institutionsError,
    isLoading: institutionsLoading,
  } = useApiResource(loadInstitutions);

  const institutions = useMemo(
    () => unwrapList(institutionsData) as Institution[],
    [institutionsData],
  );
  const initialForm = useMemo(
    () => (product ? productFormFromRecord(product) : emptyProductForm(fixedInstitutionId)),
    [fixedInstitutionId, product],
  );

  return (
    <SharesFeatureGate
      unavailableTitle="Share product details are not available"
      unavailableDescription="Only staff roles can review share product details."
    >
      <div className="grid gap-6">
        <SharesWorkspaceHeader
          title={isCreateMode ? 'Create share product' : 'Share product details'}
          description={
            isCreateMode
              ? 'Configure a new share product with pricing, minimum holdings, and dividend rules.'
              : 'Review or update a share product configuration.'
          }
          actions={
            <Link href="/shares/products">
              <Button
                type="button"
                className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to products
              </Button>
            </Link>
          }
        />

        {productLoading && productId ? <StateView title="Loading share product..." /> : null}

        {productError ? (
          <StateView title="Could not load share product" description={productError} />
        ) : null}

        {institutionsLoading && !institutions.length ? (
          <StateView title="Loading institution choices..." />
        ) : null}

        {institutionsError ? (
          <StateView title="Could not load institutions" description={institutionsError} />
        ) : null}

        {!productLoading && !institutionsLoading && !productError && !institutionsError ? (
          isCreateMode && !canManage ? (
            <StateView
              title="You do not have permission to create share products"
              description="Ask an administrator, branch manager, or accountant role to manage share product configuration."
            />
          ) : canManage ? (
            <ShareProductFormCard
              key={product ? `product-${product.id}` : `new-${fixedInstitutionId || 'default'}`}
              actorRole={actorRole}
              fixedInstitutionId={fixedInstitutionId}
              initialForm={initialForm}
              institutions={institutions}
              productId={productId}
            />
          ) : product ? (
            <ShareProductReadonlyCard product={product} />
          ) : (
            <StateView
              title="Share product not found"
              description="The requested share product could not be loaded."
            />
          )
        ) : null}
      </div>
    </SharesFeatureGate>
  );
}
