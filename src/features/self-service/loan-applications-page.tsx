'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/input';
import { LoanStatusStepper } from '@/components/ui/LoanStatusStepper';
import { Modal } from '@/components/ui/modal';
import { StateView } from '@/components/ui/state-view';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  formSelectClassName,
  formatDate,
  statusLabel,
} from '@/features/admin/shared';
import { useApiResource } from '@/hooks/use-api-resource';
import { currencyMoney, unwrapList } from '@/lib/api/format';
import { selfServiceApi } from '@/lib/api/services';
import type {
  ApiProblem,
  LoanApplication,
  LoanEligibilitySnapshot,
  LoanProduct,
  SelfServiceLoanStatement,
} from '@/types/api';
import { SelfServiceLoanStatementModal } from './loan-statement-modal';

const applicationTextareaClassName =
  'min-h-[120px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-950 shadow-sm outline-none transition focus:border-[#127D61] focus:ring-4 focus:ring-emerald-100';

type ApplicationFormState = {
  product: string;
  amount: string;
  term_months: string;
  purpose: string;
  repayment_source: string;
  monthly_income: string;
  monthly_expenses: string;
  existing_debt_payments: string;
};

function createEmptyApplicationForm(): ApplicationFormState {
  return {
    product: '',
    amount: '',
    term_months: '',
    purpose: '',
    repayment_source: 'other',
    monthly_income: '',
    monthly_expenses: '0',
    existing_debt_payments: '0',
  };
}

function flattenErrorList(value: unknown): string | null {
  if (Array.isArray(value)) return value.map(String).join(' ');
  if (typeof value === 'string') return value;
  return null;
}

function getProblemMessage(
  error: unknown,
  fallback = 'Unable to save the loan application.',
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

function isLoanStatementEligible(loan?: LoanApplication | null) {
  if (!loan) return false;
  return (
    ['approved', 'disbursed', 'closed'].includes(loan.status) ||
    Number(loan.repayment_count ?? 0) > 0
  );
}

function canWithdrawApplication(loan?: LoanApplication | null) {
  if (!loan) return false;
  return ['draft', 'submitted', 'under_review', 'appraised', 'recommended'].includes(
    loan.status,
  );
}

function validateApplicationRequest({
  form,
  product,
  currency,
}: {
  form: ApplicationFormState;
  product?: LoanProduct | null;
  currency: string;
}) {
  const amount = Number(form.amount);
  const termMonths = Number(form.term_months);

  if (!form.product) {
    return 'Select a loan product before continuing.';
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return 'Requested amount must be greater than zero.';
  }

  if (!Number.isInteger(termMonths) || termMonths <= 0) {
    return 'Requested term must be at least one month.';
  }

  if (product?.min_amount !== undefined && amount < Number(product.min_amount)) {
    return `Requested amount must be at least ${currencyMoney(
      product.min_amount,
      currency,
      { minimumFractionDigits: 2, maximumFractionDigits: 2 },
    )}.`;
  }

  if (product?.max_amount !== undefined && amount > Number(product.max_amount)) {
    return `Requested amount cannot exceed ${currencyMoney(
      product.max_amount,
      currency,
      { minimumFractionDigits: 2, maximumFractionDigits: 2 },
    )}.`;
  }

  if (
    product?.min_term_months !== undefined &&
    termMonths < Number(product.min_term_months)
  ) {
    return `Requested term must be at least ${product.min_term_months} month(s).`;
  }

  if (
    product?.max_term_months !== undefined &&
    termMonths > Number(product.max_term_months)
  ) {
    return `Requested term cannot exceed ${product.max_term_months} month(s).`;
  }

  return null;
}

export function SelfServiceLoanApplicationsPage() {
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isStatementOpen, setIsStatementOpen] = useState(false);
  const [selectedApplicationId, setSelectedApplicationId] = useState<
    string | null
  >(null);
  const [applicationForm, setApplicationForm] = useState<ApplicationFormState>(
    createEmptyApplicationForm,
  );
  const [applicationError, setApplicationError] = useState<string | null>(null);
  const [isSubmittingApplication, setIsSubmittingApplication] = useState(false);
  const [eligibilityPreview, setEligibilityPreview] =
    useState<LoanEligibilitySnapshot | null>(null);
  const [eligibilityError, setEligibilityError] = useState<string | null>(null);
  const [eligibilityCheckSignature, setEligibilityCheckSignature] = useState<
    string | null
  >(null);
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState('');
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [isWithdrawingApplication, setIsWithdrawingApplication] = useState(false);

  const loadProducts = useCallback(
    () => selfServiceApi.loanProducts.list({ page_size: 100 }),
    [],
  );

  const loadApplications = useCallback(
    () => selfServiceApi.loanApplications.list({ page_size: 50 }),
    [],
  );

  const loadStatementPreview = useCallback(
    () => selfServiceApi.loans.statement(),
    [],
  );

  const {
    data: productsData,
    error: productsError,
    isLoading: productsLoading,
    reload: reloadProducts,
  } = useApiResource(loadProducts);

  const {
    data: applicationsData,
    error: applicationsError,
    isLoading: applicationsLoading,
    reload: reloadApplications,
  } = useApiResource(loadApplications);

  const {
    data: statementPreview,
    error: statementPreviewError,
    reload: reloadStatementPreview,
  } = useApiResource<SelfServiceLoanStatement>(loadStatementPreview);

  const products = unwrapList(productsData);
  const applications = unwrapList(applicationsData);
  const currency = statementPreview?.currency || 'UGX';

  const activeApplicationId =
    selectedApplicationId ??
    (applications[0] ? String(applications[0].id) : null);

  const loadSelectedApplication = useCallback(() => {
    if (!activeApplicationId) return Promise.resolve(null);
    return selfServiceApi.loanApplications.get(activeApplicationId);
  }, [activeApplicationId]);

  const {
    data: selectedApplicationData,
    isLoading: selectedApplicationLoading,
    reload: reloadSelectedApplication,
  } = useApiResource<LoanApplication | null>(loadSelectedApplication);

  const selectedApplication =
    selectedApplicationData &&
    String(selectedApplicationData.id) === activeApplicationId
      ? selectedApplicationData
      : (applications.find(
          (candidate) => String(candidate.id) === activeApplicationId,
        ) ??
        applications[0] ??
        null);

  const selectedProduct =
    products.find(
      (candidate) => String(candidate.id) === applicationForm.product,
    ) ?? null;

  const pendingApplications = applications.filter((loan) =>
    ['submitted', 'under_review', 'appraised', 'recommended'].includes(
      loan.status,
    ),
  ).length;

  const hasLoanStatement = Boolean(statementPreview?.available_loans?.length);

  const statementLoanId =
    selectedApplication && isLoanStatementEligible(selectedApplication)
      ? String(selectedApplication.id)
      : statementPreview?.selected_loan_id
        ? String(statementPreview.selected_loan_id)
        : null;

  const latestAppraisal = selectedApplication?.appraisals?.[0] ?? null;
  const currentEligibilitySignature = [
    applicationForm.product,
    applicationForm.amount,
    applicationForm.term_months,
    applicationForm.monthly_income,
    applicationForm.monthly_expenses,
    applicationForm.existing_debt_payments,
  ].join('|');
  const activeEligibilityPreview =
    eligibilityCheckSignature === currentEligibilitySignature
      ? eligibilityPreview
      : null;
  const activeEligibilityError =
    eligibilityCheckSignature === currentEligibilitySignature
      ? eligibilityError
      : null;

  function resetApplicationModal() {
    setApplicationForm(createEmptyApplicationForm());
    setApplicationError(null);
    setEligibilityPreview(null);
    setEligibilityError(null);
    setEligibilityCheckSignature(null);
    setIsApplyModalOpen(false);
  }

  function openApplicationModal() {
    setApplicationForm(createEmptyApplicationForm());
    setApplicationError(null);
    setEligibilityPreview(null);
    setEligibilityError(null);
    setEligibilityCheckSignature(null);
    setIsApplyModalOpen(true);
  }

  function openWithdrawModal() {
    setWithdrawReason('');
    setWithdrawError(null);
    setIsWithdrawModalOpen(true);
  }

  function closeWithdrawModal() {
    setWithdrawReason('');
    setWithdrawError(null);
    setIsWithdrawModalOpen(false);
  }

  async function refreshLoanWorkspace(nextApplicationId?: string | null) {
    await reloadApplications();
    await reloadStatementPreview();

    const targetApplicationId = nextApplicationId ?? activeApplicationId;
    if (!targetApplicationId) return;

    if (targetApplicationId !== activeApplicationId) {
      setSelectedApplicationId(targetApplicationId);
      return;
    }

    await reloadSelectedApplication();
  }

  async function handleEligibilityCheck() {
    const validationMessage = validateApplicationRequest({
      form: applicationForm,
      product: selectedProduct,
      currency,
    });

    if (validationMessage) {
      setApplicationError(validationMessage);
      return;
    }

    setIsCheckingEligibility(true);
    setApplicationError(null);
    setEligibilityError(null);
    setEligibilityCheckSignature(currentEligibilitySignature);

    try {
      const snapshot = await selfServiceApi.loanApplications.eligibilityCheck({
        product: applicationForm.product,
        amount: applicationForm.amount.trim(),
        term_months: Number(applicationForm.term_months),
        monthly_income: applicationForm.monthly_income.trim() || undefined,
        monthly_expenses: applicationForm.monthly_expenses.trim() || undefined,
        existing_debt_payments:
          applicationForm.existing_debt_payments.trim() || undefined,
      });

      setEligibilityPreview(snapshot);
      toast.success(
        snapshot.eligible
          ? 'Eligibility check passed'
          : 'Eligibility check completed with review notes',
      );
    } catch (error) {
      const message = getProblemMessage(
        error,
        'Unable to complete the eligibility check.',
      );
      setEligibilityError(message);
      toast.error(message);
    } finally {
      setIsCheckingEligibility(false);
    }
  }

  async function handleApplicationSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const validationMessage = validateApplicationRequest({
      form: applicationForm,
      product: selectedProduct,
      currency,
    });

    if (validationMessage) {
      setApplicationError(validationMessage);
      return;
    }

    setIsSubmittingApplication(true);
    setApplicationError(null);

    try {
      const created = await selfServiceApi.loanApplications.create({
        product: applicationForm.product,
        amount: applicationForm.amount.trim(),
        term_months: Number(applicationForm.term_months),
        purpose: applicationForm.purpose.trim(),
        repayment_source: applicationForm.repayment_source,
        submit: true,
      });

      resetApplicationModal();
      toast.success('Loan application submitted');
      await refreshLoanWorkspace(String(created.id));
    } catch (error) {
      const message = getProblemMessage(error);
      setApplicationError(message);
      toast.error(message);
    } finally {
      setIsSubmittingApplication(false);
    }
  }

  async function handleWithdrawSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedApplication) return;

    if (!withdrawReason.trim()) {
      setWithdrawError('Provide a reason before withdrawing this application.');
      return;
    }

    setIsWithdrawingApplication(true);
    setWithdrawError(null);

    try {
      await selfServiceApi.loanApplications.withdraw(selectedApplication.id, {
        reason: withdrawReason.trim(),
      });
      closeWithdrawModal();
      toast.success('Loan application withdrawn');
      await refreshLoanWorkspace(String(selectedApplication.id));
    } catch (error) {
      const message = getProblemMessage(
        error,
        'Unable to withdraw this application.',
      );
      setWithdrawError(message);
      toast.error(message);
    } finally {
      setIsWithdrawingApplication(false);
    }
  }

  if (applicationsLoading && !applicationsData) {
    return <StateView title="Loading your loan applications..." />;
  }

  if (applicationsError && !applicationsData) {
    return (
      <StateView
        title="Could not load your loan applications"
        description={applicationsError}
        actionLabel="Retry"
        onAction={() => {
          void reloadApplications();
        }}
      />
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-5 px-3 sm:px-4 lg:px-6">
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <PageHeader
          title="Loan applications"
          description="Apply for a loan, follow each application status, and open your loan statement only when a loan is eligible."
        />

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          {hasLoanStatement ? (
            <Button
              type="button"
              className="w-full bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100 sm:w-auto"
              onClick={() => setIsStatementOpen(true)}
            >
              View Loan Statement
            </Button>
          ) : null}

          <Button
            type="button"
            className="w-full sm:w-auto"
            onClick={openApplicationModal}
          >
            Apply for Loan
          </Button>
        </div>
      </div>

      {applicationsError && applicationsData ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Your application list could not be fully refreshed.
          <button
            type="button"
            className="ml-2 font-bold underline underline-offset-2"
            onClick={() => {
              void reloadApplications();
            }}
          >
            Retry
          </button>
        </div>
      ) : null}

      {statementPreviewError ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Loan statement availability could not be refreshed.
          <button
            type="button"
            className="ml-2 font-bold underline underline-offset-2"
            onClick={() => {
              void reloadStatementPreview();
            }}
          >
            Retry
          </button>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard
          label="Applications"
          value={String(applications.length)}
          helper="All applications currently visible in self-service."
        />
        <SummaryCard
          label="Pending review"
          value={String(pendingApplications)}
          helper="Submitted, appraised, under-review, or recommended applications."
        />
        <SummaryCard
          label="Loan statement"
          value={hasLoanStatement ? 'Available' : 'Not yet'}
          helper={
            hasLoanStatement
              ? 'Open your approved or disbursed loan statement.'
              : 'The statement appears after approval, disbursement, or repayments.'
          }
        />
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Card className="grid min-w-0 gap-4 overflow-hidden">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle>My applications</CardTitle>
              <p className="mt-2 text-sm text-slate-500">
                Select any application to review its status and request details.
              </p>
            </div>
            <StatusBadge
              status={pendingApplications ? 'pending' : 'active'}
              label={`${pendingApplications} pending`}
            />
          </div>

          {applications.length ? (
            <div className="grid max-h-[65vh] gap-3 overflow-y-auto pr-1">
              {applications.map((loan) => {
                const isActive =
                  String(loan.id) === String(selectedApplication?.id);

                return (
                  <button
                    key={loan.id}
                    type="button"
                    className={`min-w-0 rounded-2xl border px-4 py-4 text-left transition ${
                      isActive
                        ? 'border-emerald-300 bg-emerald-50/70 shadow-sm'
                        : 'border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                    onClick={() => setSelectedApplicationId(String(loan.id))}
                  >
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-bold text-slate-900">
                          {loan.product_name || 'Loan product'}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {formatDate(loan.submitted_at ?? loan.created_at)}
                        </p>
                      </div>
                      <StatusBadge status={loan.status} />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                      <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
                        {currencyMoney(loan.amount, currency, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
                        {loan.term_months ?? 0} months
                      </span>
                      {isLoanStatementEligible(loan) ? (
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">
                          Statement ready
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-3 line-clamp-2 text-sm text-slate-600">
                      {loan.purpose || 'No purpose provided.'}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                        {isActive ? 'Selected' : 'Select to review'}
                      </span>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          isActive
                            ? 'bg-[#127D61] text-white'
                            : 'bg-white text-slate-700 ring-1 ring-slate-200'
                        }`}
                      >
                        {isActive ? 'Viewing details' : 'View details'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-5 text-sm text-slate-600">
              No loan applications yet. Use Apply for Loan to submit your first
              request.
            </div>
          )}
        </Card>

        <Card className="grid min-w-0 gap-4 overflow-hidden">
          <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle>Application detail</CardTitle>
              <p className="mt-2 text-sm text-slate-500">
                Review the current application without mixing in statement or
                repayment tables.
              </p>
            </div>
            {selectedApplication ? (
              <StatusBadge status={selectedApplication.status} />
            ) : null}
          </div>

          {!selectedApplication ? (
            <StateView
              title="No application selected"
              description="Choose an application from the list to see its status and request summary."
            />
          ) : (
            <>
              <div className="min-w-0 overflow-x-auto pb-1">
                <LoanStatusStepper
                  className={
                    selectedApplicationLoading ? 'opacity-80' : undefined
                  }
                  loan={selectedApplication}
                  title="Loan lifecycle"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                <DetailMetric
                  label="Requested amount"
                  value={currencyMoney(selectedApplication.amount, currency, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  helper={`Submitted ${formatDate(
                    selectedApplication.submitted_at ??
                      selectedApplication.created_at,
                  )}`}
                />
                <DetailMetric
                  label="Requested term"
                  value={`${selectedApplication.term_months ?? 0} months`}
                  helper={selectedApplication.product_name || 'Loan product'}
                />
                <DetailMetric
                  label="Outstanding"
                  value={currencyMoney(
                    selectedApplication.outstanding_balance,
                    currency,
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    },
                  )}
                  helper={`Next due ${formatDate(
                    selectedApplication.next_due_date,
                  )}`}
                />
              </div>

              {selectedApplication.status === 'rejected' ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                  <p className="font-bold">Rejection note</p>
                  <p className="mt-1">
                    {selectedApplication.rejected_reason ||
                      'No rejection reason was provided.'}
                  </p>
                </div>
              ) : null}

              {selectedApplication.status === 'withdrawn' ? (
                <div className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <p className="font-bold text-slate-900">Withdrawal note</p>
                  <p className="mt-1">
                    {selectedApplication.withdrawal_reason ||
                      'No withdrawal reason was provided.'}
                  </p>
                </div>
              ) : null}

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Purpose
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {selectedApplication.purpose ||
                    'No purpose was provided for this application.'}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <DetailMetric
                  label="Interest rate"
                  value={`${selectedApplication.annual_interest_rate ?? 0}%`}
                  helper={
                    selectedApplication.repayment_frequency ||
                    'No repayment frequency'
                  }
                />
                <DetailMetric
                  label="Institution branch"
                  value={selectedApplication.branch_name || 'No branch'}
                  helper={
                    selectedApplication.client_member_number ||
                    'No member number'
                  }
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <DetailMetric
                  label="Repayment source"
                  value={statusLabel(selectedApplication.repayment_source || 'other')}
                  helper="Declared income or cash-flow source for repayment."
                />
                <DetailMetric
                  label="Institution branch"
                  value={selectedApplication.branch_name || 'No branch'}
                  helper={
                    selectedApplication.client_member_number ||
                    'No member number'
                  }
                />
              </div>

              {selectedApplication.eligibility_snapshot ? (
                <EligibilitySnapshotCard
                  currency={currency}
                  snapshot={selectedApplication.eligibility_snapshot}
                  title="Eligibility snapshot"
                  description="The current eligibility checks stored against this application."
                />
              ) : null}

              {latestAppraisal ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                        Latest appraisal
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {statusLabel(latestAppraisal.recommendation || 'approve')}
                      </p>
                    </div>
                    <div className="text-sm text-slate-600">
                      Risk score {latestAppraisal.risk_score ?? '-'}
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <DetailMetric
                      label="Estimated installment"
                      value={currencyMoney(
                        latestAppraisal.estimated_installment,
                        currency,
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        },
                      )}
                    />
                    <DetailMetric
                      label="Affordability"
                      value={currencyMoney(
                        latestAppraisal.affordability_amount,
                        currency,
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        },
                      )}
                    />
                    <DetailMetric
                      label="Monthly income"
                      value={currencyMoney(latestAppraisal.monthly_income, currency, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    />
                    <DetailMetric
                      label="Monthly expenses"
                      value={currencyMoney(
                        latestAppraisal.monthly_expenses,
                        currency,
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        },
                      )}
                    />
                  </div>
                  {latestAppraisal.notes ? (
                    <p className="mt-4 text-sm leading-6 text-slate-700">
                      {latestAppraisal.notes}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {isLoanStatementEligible(selectedApplication) ? (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    type="button"
                    className="w-full sm:w-auto"
                    onClick={() => setIsStatementOpen(true)}
                  >
                    View Loan Statement
                  </Button>
                  {canWithdrawApplication(selectedApplication) ? (
                    <Button
                      type="button"
                      className="w-full bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100 sm:w-auto"
                      onClick={openWithdrawModal}
                    >
                      Withdraw application
                    </Button>
                  ) : null}
                </div>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-600">
                    Loan statement details appear after approval, disbursement,
                    or once repayments exist.
                  </div>
                  {canWithdrawApplication(selectedApplication) ? (
                    <Button
                      type="button"
                      className="w-full bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100 sm:w-auto"
                      onClick={openWithdrawModal}
                    >
                      Withdraw application
                    </Button>
                  ) : null}
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      {isApplyModalOpen ? (
        <Modal
          open={isApplyModalOpen}
          onClose={resetApplicationModal}
          size="xl"
          title="Apply for a loan"
          description="Submit a standard self-service loan request."
          footer={
            <div className="flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                className="w-full bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100 sm:w-auto"
                onClick={resetApplicationModal}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="w-full bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100 sm:w-auto"
                onClick={() => {
                  void handleEligibilityCheck();
                }}
                disabled={isCheckingEligibility || isSubmittingApplication}
              >
                {isCheckingEligibility ? 'Checking...' : 'Check eligibility'}
              </Button>
              <Button
                form="self-service-loan-application-form"
                type="submit"
                className="w-full sm:w-auto"
                disabled={isSubmittingApplication}
              >
                {isSubmittingApplication
                  ? 'Submitting...'
                  : 'Submit application'}
              </Button>
            </div>
          }
        >
          <form
            className="grid max-h-[70vh] gap-4 overflow-y-auto pr-1"
            id="self-service-loan-application-form"
            onSubmit={handleApplicationSubmit}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Loan product">
                <select
                  className={formSelectClassName}
                  value={applicationForm.product}
                  onChange={(event) =>
                    setApplicationForm((current) => ({
                      ...current,
                      product: event.target.value,
                    }))
                  }
                  disabled={productsLoading && !productsData}
                  required
                >
                  <option value="">Select a product</option>
                  {products.map((product: LoanProduct) => (
                    <option key={product.id} value={String(product.id)}>
                      {product.name} ({product.code})
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Requested amount">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={applicationForm.amount}
                  onChange={(event) =>
                    setApplicationForm((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                  required
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Requested term (months)">
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={applicationForm.term_months}
                  onChange={(event) =>
                    setApplicationForm((current) => ({
                      ...current,
                      term_months: event.target.value,
                    }))
                  }
                  required
                />
              </Field>

              <Field label="Repayment source">
                <select
                  className={formSelectClassName}
                  value={applicationForm.repayment_source}
                  onChange={(event) =>
                    setApplicationForm((current) => ({
                      ...current,
                      repayment_source: event.target.value,
                    }))
                  }
                >
                  <option value="business">Business</option>
                  <option value="salary">Salary</option>
                  <option value="farm">Farm</option>
                  <option value="savings">Savings</option>
                  <option value="payroll">Payroll</option>
                  <option value="other">Other</option>
                </select>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Monthly income">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={applicationForm.monthly_income}
                  onChange={(event) =>
                    setApplicationForm((current) => ({
                      ...current,
                      monthly_income: event.target.value,
                    }))
                  }
                  placeholder="Optional"
                />
              </Field>

              <Field label="Monthly expenses">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={applicationForm.monthly_expenses}
                  onChange={(event) =>
                    setApplicationForm((current) => ({
                      ...current,
                      monthly_expenses: event.target.value,
                    }))
                  }
                />
              </Field>

              <Field label="Existing debt payments">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={applicationForm.existing_debt_payments}
                  onChange={(event) =>
                    setApplicationForm((current) => ({
                      ...current,
                      existing_debt_payments: event.target.value,
                    }))
                  }
                />
              </Field>
            </div>

            <Field label="Purpose">
              <textarea
                className={applicationTextareaClassName}
                value={applicationForm.purpose}
                onChange={(event) =>
                  setApplicationForm((current) => ({
                    ...current,
                    purpose: event.target.value,
                  }))
                }
                placeholder="Describe what the loan will support."
              />
            </Field>

            {selectedProduct ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <p className="font-bold text-slate-900">
                  {selectedProduct.name}
                </p>
                <p className="mt-1">
                  Limits{' '}
                  {currencyMoney(selectedProduct.min_amount, currency, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  to{' '}
                  {currencyMoney(selectedProduct.max_amount, currency, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                <p className="mt-1">
                  Terms {selectedProduct.min_term_months ?? 0} to{' '}
                  {selectedProduct.max_term_months ?? 0} month(s)
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Interest {selectedProduct.annual_interest_rate ?? 0}% ,{' '}
                  {statusLabel(selectedProduct.repayment_frequency)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Minimum savings{' '}
                  {currencyMoney(selectedProduct.minimum_savings_balance, currency, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  | minimum shares{' '}
                  {currencyMoney(selectedProduct.minimum_share_capital, currency, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
            ) : null}

            {activeEligibilityPreview ? (
              <EligibilitySnapshotCard
                currency={currency}
                snapshot={activeEligibilityPreview}
                title="Eligibility preview"
                description="Use this preview before submission to catch product-rule issues early."
              />
            ) : null}

            {productsError ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Could not load loan products.
                <button
                  type="button"
                  className="ml-2 font-bold underline underline-offset-2"
                  onClick={() => {
                    void reloadProducts();
                  }}
                >
                  Retry
                </button>
              </div>
            ) : null}

            {activeEligibilityError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                {activeEligibilityError}
              </div>
            ) : null}

            {applicationError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                {applicationError}
              </div>
            ) : null}
          </form>
        </Modal>
      ) : null}

      {isWithdrawModalOpen ? (
        <Modal
          open={isWithdrawModalOpen}
          onClose={closeWithdrawModal}
          size="md"
          title="Withdraw loan application"
          description={
            selectedApplication
              ? `Withdraw ${selectedApplication.product_name || 'this loan application'} before approval.`
              : 'Select an application before continuing.'
          }
          footer={
            <div className="flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                className="w-full bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100 sm:w-auto"
                onClick={closeWithdrawModal}
              >
                Cancel
              </Button>
              <Button
                form="self-service-withdraw-form"
                type="submit"
                className="w-full sm:w-auto"
                disabled={isWithdrawingApplication}
              >
                {isWithdrawingApplication ? 'Withdrawing...' : 'Withdraw application'}
              </Button>
            </div>
          }
        >
          <form
            className="grid gap-4"
            id="self-service-withdraw-form"
            onSubmit={handleWithdrawSubmit}
          >
            <Field label="Reason">
              <textarea
                className={applicationTextareaClassName}
                value={withdrawReason}
                onChange={(event) => setWithdrawReason(event.target.value)}
                placeholder="Tell us why you want to withdraw this application."
                required
              />
            </Field>

            {withdrawError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                {withdrawError}
              </div>
            ) : null}
          </form>
        </Modal>
      ) : null}

      {isStatementOpen ? (
        <SelfServiceLoanStatementModal
          open={isStatementOpen}
          onClose={() => setIsStatementOpen(false)}
          initialLoanId={statementLoanId}
          defaultCurrency={currency}
        />
      ) : null}
    </div>
  );
}

function EligibilitySnapshotCard({
  currency,
  snapshot,
  title,
  description,
}: {
  currency: string;
  snapshot: LoanEligibilitySnapshot;
  title: string;
  description: string;
}) {
  const estimatedInstallment = currencyMoney(
    snapshot.summary?.estimated_installment,
    currency,
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
            {title}
          </p>
          <p className="mt-2 text-sm text-slate-600">{description}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            snapshot.eligible
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-amber-100 text-amber-900'
          }`}
        >
          {snapshot.eligible ? 'Eligible' : 'Needs review'}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DetailMetric
          label="Estimated installment"
          value={estimatedInstallment}
          helper="Largest expected installment from the schedule preview."
        />
        <DetailMetric
          label="Savings balance"
          value={currencyMoney(snapshot.summary?.savings_balance, currency, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
          helper="Current savings balance used for the product checks."
        />
        <DetailMetric
          label="Share capital"
          value={currencyMoney(snapshot.summary?.share_capital, currency, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
          helper="Current share capital used for the product checks."
        />
        <DetailMetric
          label="Overdue loans"
          value={String(snapshot.summary?.overdue_loans_count ?? 0)}
          helper="Existing overdue loans in the current portfolio."
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {snapshot.checks.map((check) => (
          <div
            key={check.code}
            className={`rounded-2xl border px-4 py-3 text-sm ${
              check.passed
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : 'border-rose-200 bg-rose-50 text-rose-900'
            }`}
          >
            <p className="font-bold">{check.label || statusLabel(check.code)}</p>
            <p className="mt-1 leading-6">{check.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <Card className="grid min-w-0 gap-2 overflow-hidden">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="break-words text-2xl font-black tracking-tight text-slate-900">
        {value}
      </p>
      <p className="text-sm text-slate-500">{helper}</p>
    </Card>
  );
}

function DetailMetric({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 break-words font-semibold text-slate-900">{value}</p>
      {helper ? <p className="mt-1 text-sm text-slate-500">{helper}</p> : null}
    </div>
  );
}
