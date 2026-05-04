'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { RecordsListPanel } from '@/components/records/records-list-panel';
import { RecordsPageLayout } from '@/components/records/records-page-layout';
import { RecordsPagination } from '@/components/records/records-pagination';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import type { Column } from '@/components/ui/data-table';
import { DataTable } from '@/components/ui/data-table';
import { Field, Input } from '@/components/ui/input';
import { LoanStatusStepper } from '@/components/ui/LoanStatusStepper';
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
import { useApiResource } from '@/hooks/use-api-resource';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import {
  clientName,
  isPaginatedResponse,
  listCount,
  money,
  unwrapList,
} from '@/lib/api/format';
import { clientsApi, loanApi } from '@/lib/api/services';
import type {
  ApiProblem,
  Client,
  LoanApplication,
  LoanApplicationAction,
  LoanAppraisal,
  LoanProduct,
  LoanRepayment,
  RepaymentScheduleRow,
} from '@/types/api';
import type { Role } from '@/types/roles';

const loanOfficerRoles: Role[] = [
  'super_admin',
  'institution_admin',
  'loan_officer',
];
const approverRoles: Role[] = [
  'super_admin',
  'institution_admin',
  'branch_manager',
];
const cashRoles: Role[] = [
  'super_admin',
  'institution_admin',
  'branch_manager',
  'accountant',
  'teller',
];
const applicationTextareaClassName =
  'min-h-[120px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-950 shadow-sm outline-none transition focus:border-[#127D61] focus:ring-4 focus:ring-emerald-100';

type ApplicationFormState = {
  client: string;
  product: string;
  amount: string;
  term_months: string;
  purpose: string;
  repayment_source: string;
  submit_mode: 'draft' | 'submitted';
};

type DecisionMode =
  | 'start_review'
  | 'appraise'
  | 'recommend'
  | 'approve'
  | 'reject'
  | 'withdraw'
  | 'disburse'
  | null;

type DecisionFormState = {
  comment: string;
  reason: string;
  reference: string;
  disbursement_method: string;
  recommendation: string;
  recommended_amount: string;
  recommended_term_months: string;
  monthly_income: string;
  monthly_expenses: string;
  existing_debt_payments: string;
  risk_score: string;
  collateral_notes: string;
  guarantor_notes: string;
  credit_comments: string;
  notes: string;
};

type RepaymentFormState = {
  amount: string;
  reference: string;
  payment_method: string;
};

function createEmptyApplicationForm(): ApplicationFormState {
  return {
    client: '',
    product: '',
    amount: '',
    term_months: '',
    purpose: '',
    repayment_source: 'other',
    submit_mode: 'submitted',
  };
}

function createEmptyDecisionForm(): DecisionFormState {
  return {
    comment: '',
    reason: '',
    reference: '',
    disbursement_method: 'cash',
    recommendation: 'approve',
    recommended_amount: '',
    recommended_term_months: '',
    monthly_income: '',
    monthly_expenses: '0',
    existing_debt_payments: '0',
    risk_score: '',
    collateral_notes: '',
    guarantor_notes: '',
    credit_comments: '',
    notes: '',
  };
}

function createEmptyRepaymentForm(): RepaymentFormState {
  return {
    amount: '',
    reference: '',
    payment_method: 'cash',
  };
}

function flattenErrorList(value: unknown): string | null {
  if (Array.isArray(value)) return value.map(String).join(' ');
  if (typeof value === 'string') return value;
  return null;
}

function getProblemMessage(
  error: unknown,
  fallback = 'Unable to save loan changes.',
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

function isClientRole(role?: Role | null) {
  return role === 'client';
}

function canCreateApplications(role?: Role | null) {
  return role ? isClientRole(role) || loanOfficerRoles.includes(role) : false;
}

function canStartReview(role?: Role | null, loan?: LoanApplication | null) {
  return role && loan
    ? loanOfficerRoles.includes(role) && loan.status === 'submitted'
    : false;
}

function canRecommend(role?: Role | null, loan?: LoanApplication | null) {
  return role && loan
    ? loanOfficerRoles.includes(role) &&
        ['submitted', 'under_review'].includes(loan.status)
    : false;
}

function canAppraise(role?: Role | null, loan?: LoanApplication | null) {
  return role && loan
    ? loanOfficerRoles.includes(role) &&
        ['submitted', 'under_review', 'appraised'].includes(loan.status)
    : false;
}

function canApprove(role?: Role | null, loan?: LoanApplication | null) {
  return role && loan
    ? approverRoles.includes(role) &&
        ['recommended', 'appraised'].includes(loan.status)
    : false;
}

function canReject(role?: Role | null, loan?: LoanApplication | null) {
  return role && loan
    ? [...loanOfficerRoles, ...approverRoles].includes(role) &&
        ['submitted', 'under_review', 'appraised', 'recommended'].includes(
          loan.status,
        )
    : false;
}

function canWithdraw(role?: Role | null, loan?: LoanApplication | null) {
  return role && loan
    ? (isClientRole(role) ||
        [...loanOfficerRoles, ...approverRoles].includes(role)) &&
        ['draft', 'submitted', 'under_review', 'appraised', 'recommended'].includes(
          loan.status,
        )
    : false;
}

function canDisburse(role?: Role | null, loan?: LoanApplication | null) {
  return role && loan
    ? cashRoles.includes(role) && loan.status === 'approved'
    : false;
}

function canRepay(role?: Role | null, loan?: LoanApplication | null) {
  return role && loan
    ? cashRoles.includes(role) && loan.status === 'disbursed'
    : false;
}

function loanLabel(loan?: LoanApplication | null) {
  if (!loan) return 'Loan';
  return `${loan.client_name ?? clientName(loan.client)} - ${loan.product_name ?? 'Loan'}`;
}

function outstandingValue(loan?: LoanApplication | null) {
  return Number(
    loan?.outstanding_balance ??
      Number(loan?.principal_balance ?? 0) +
        Number(loan?.interest_balance ?? 0),
  );
}

function loanProductLabel(product: LoanProduct) {
  return `${product.name} (${product.code})`;
}

function clientOptionLabel(client: Client) {
  return `${client.full_name || clientName(client)} (${client.member_number || client.id})`;
}

function nextDueSchedule(schedule: RepaymentScheduleRow[] | undefined) {
  return (
    schedule?.find((row) => !row.is_paid)?.due_date ??
    schedule?.[0]?.due_date ??
    undefined
  );
}

function LoanDetailMetric({
  label,
  value,
  helper,
  accent = 'slate',
}: {
  label: string;
  value: ReactNode;
  helper?: ReactNode;
  accent?: 'brand' | 'slate';
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p
        className={`mt-2 break-words text-[clamp(1.35rem,2.8vw,1.85rem)] font-black leading-tight ${
          accent === 'brand' ? 'text-[#127D61]' : 'text-slate-900'
        }`}
      >
        {value}
      </p>
      {helper ? (
        <p className="mt-1 break-words text-sm text-slate-500">{helper}</p>
      ) : null}
    </div>
  );
}

function LoanInfoField({
  label,
  value,
  helper,
}: {
  label: string;
  value: ReactNode;
  helper?: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-900">
        {value}
      </p>
      {helper ? (
        <p className="mt-1 break-words text-xs text-slate-500">{helper}</p>
      ) : null}
    </div>
  );
}

const loanStageKeys = [
  'submitted',
  'under_review',
  'appraised',
  'recommended',
  'approved',
  'disbursed',
  'closed',
] as const;

const loanStageAliases: Record<string, string> = {
  pending: 'submitted',
  submitted: 'submitted',
  review: 'under_review',
  reviewed: 'under_review',
  under_review: 'under_review',
  appraised: 'appraised',
  recommended: 'recommended',
  approved: 'approved',
  disbursed: 'disbursed',
  closed: 'closed',
  rejected: 'rejected',
  withdrawn: 'withdrawn',
  cancelled: 'cancelled',
  canceled: 'cancelled',
};

function normalizeLoanStage(value?: string | null) {
  return (value ?? '').trim().toLowerCase().replaceAll(' ', '_');
}

function loanStageMeta(status?: string | null) {
  const normalizedStatus = normalizeLoanStage(status);
  const resolvedStatus = loanStageAliases[normalizedStatus] ?? normalizedStatus;
  const stepIndex = loanStageKeys.indexOf(
    resolvedStatus as (typeof loanStageKeys)[number],
  );

  if (stepIndex >= 0) {
    return {
      label: statusLabel(resolvedStatus),
      stepText: `Step ${stepIndex + 1} of ${loanStageKeys.length}`,
      description:
        resolvedStatus === 'closed'
          ? 'Loan lifecycle completed'
          : 'Workflow currently active',
    };
  }

  if (resolvedStatus === 'rejected') {
    return {
      label: 'Rejected',
      stepText: 'Workflow stopped',
      description: 'Application declined before completion',
    };
  }

  if (resolvedStatus === 'withdrawn') {
    return {
      label: 'Withdrawn',
      stepText: 'Workflow stopped',
      description: 'Application withdrawn before completion',
    };
  }

  if (resolvedStatus === 'cancelled') {
    return {
      label: 'Cancelled',
      stepText: 'Workflow stopped',
      description: 'Application cancelled before completion',
    };
  }

  return {
    label: statusLabel(status || 'pending'),
    stepText: 'Step pending',
    description: 'Awaiting workflow updates',
  };
}

export function LoanApplicationsPage() {
  const { user } = useAuth();
  const actorRole = user?.role ?? null;
  const isClient = isClientRole(actorRole);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);

  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [applicationForm, setApplicationForm] = useState<ApplicationFormState>(
    createEmptyApplicationForm,
  );
  const [isSubmittingApplication, setIsSubmittingApplication] = useState(false);
  const [applicationError, setApplicationError] = useState<string | null>(null);

  const [decisionMode, setDecisionMode] = useState<DecisionMode>(null);
  const [decisionLoanId, setDecisionLoanId] = useState<string | null>(null);
  const [decisionForm, setDecisionForm] = useState<DecisionFormState>(
    createEmptyDecisionForm,
  );
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  const [repaymentLoanId, setRepaymentLoanId] = useState<string | null>(null);
  const [repaymentForm, setRepaymentForm] = useState<RepaymentFormState>(
    createEmptyRepaymentForm,
  );
  const [isSubmittingRepayment, setIsSubmittingRepayment] = useState(false);
  const [repaymentError, setRepaymentError] = useState<string | null>(null);

  const searchQuery = useDebouncedValue(search.trim(), 300);
  const clientQuery = useDebouncedValue(clientSearch.trim(), 300);

  const loadProducts = useCallback(
    () =>
      loanApi.products.list({
        is_active: isClient ? true : undefined,
        page_size: 100,
      }),
    [isClient],
  );

  const loadApplications = useCallback(
    () =>
      loanApi.applications.list({
        search: searchQuery || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        product: productFilter === 'all' ? undefined : productFilter,
        page,
      }),
    [page, productFilter, searchQuery, statusFilter],
  );

  const loadClientOptions = useCallback(() => {
    if (!isApplicationModalOpen || isClient) {
      return Promise.resolve([] as Client[]);
    }

    return clientsApi.list({
      search: clientQuery || undefined,
      status: 'active',
      page_size: 50,
    });
  }, [clientQuery, isApplicationModalOpen, isClient]);

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
    data: clientOptionsData,
    error: clientOptionsError,
    isLoading: clientOptionsLoading,
    reload: reloadClientOptions,
  } = useApiResource(loadClientOptions);

  const products = unwrapList(productsData);
  const applications = unwrapList(applicationsData);
  const clientOptions = unwrapList(clientOptionsData);

  const activeLoanId =
    selectedLoanId ?? (applications[0] ? String(applications[0].id) : null);

  const loadActiveLoan = useCallback(() => {
    if (!activeLoanId) return Promise.resolve(null);
    return loanApi.applications.get(activeLoanId);
  }, [activeLoanId]);

  const {
    data: activeLoan,
    error: activeLoanError,
    isLoading: activeLoanLoading,
    reload: reloadActiveLoan,
  } = useApiResource<LoanApplication | null>(loadActiveLoan);

  const selectedLoan =
    activeLoan && String(activeLoan.id) === activeLoanId
      ? activeLoan
      : (applications.find(
          (candidate) => String(candidate.id) === activeLoanId,
        ) ?? null);
  const selectedClient =
    clientOptions.find(
      (candidate) => String(candidate.id) === applicationForm.client,
    ) ?? null;
  const selectedProduct =
    products.find(
      (candidate) => String(candidate.id) === applicationForm.product,
    ) ?? null;
  const decisionLoan =
    selectedLoan && String(selectedLoan.id) === decisionLoanId
      ? selectedLoan
      : (applications.find(
          (candidate) => String(candidate.id) === decisionLoanId,
        ) ?? null);
  const repaymentLoan =
    selectedLoan && String(selectedLoan.id) === repaymentLoanId
      ? selectedLoan
      : (applications.find(
          (candidate) => String(candidate.id) === repaymentLoanId,
        ) ?? null);

  const pagination = isPaginatedResponse(applicationsData)
    ? {
        count: listCount(applicationsData),
        hasNext: Boolean(applicationsData.next),
        hasPrevious: Boolean(applicationsData.previous),
      }
    : null;

  const pendingCount = applications.filter((loan) =>
    ['submitted', 'under_review', 'appraised', 'recommended'].includes(
      loan.status,
    ),
  ).length;
  const disbursableCount = applications.filter(
    (loan) => loan.status === 'approved',
  ).length;
  const portfolioInView = applications.reduce(
    (sum, loan) => sum + outstandingValue(loan),
    0,
  );
  const eligibilitySnapshot = selectedLoan?.eligibility_snapshot ?? null;
  const eligibilityChecks = eligibilitySnapshot?.checks ?? [];
  const hasEligibilitySnapshot = Boolean(
    eligibilitySnapshot &&
      (typeof eligibilitySnapshot.eligible === 'boolean' ||
        eligibilityChecks.length > 0),
  );
  const scheduleRows = selectedLoan?.schedule ?? [];
  const repaymentRows = selectedLoan?.repayments ?? [];
  const actionRows = selectedLoan?.action_history ?? [];
  const appraisalRows = selectedLoan?.appraisals ?? [];
  const selectedLoanStage = loanStageMeta(selectedLoan?.status);

  function resetApplicationModal() {
    setIsApplicationModalOpen(false);
    setClientSearch('');
    setApplicationForm(createEmptyApplicationForm());
    setApplicationError(null);
  }

  function openApplicationModal() {
    setClientSearch('');
    setApplicationForm((current) => ({
      ...createEmptyApplicationForm(),
      submit_mode: current.submit_mode,
    }));
    setApplicationError(null);
    setIsApplicationModalOpen(true);
  }

  function openDecisionModal(
    mode: Exclude<DecisionMode, null>,
    loan: LoanApplication,
  ) {
    setDecisionMode(mode);
    setDecisionLoanId(String(loan.id));
    setDecisionForm(createEmptyDecisionForm());
    setDecisionError(null);
  }

  function closeDecisionModal() {
    setDecisionMode(null);
    setDecisionLoanId(null);
    setDecisionForm(createEmptyDecisionForm());
    setDecisionError(null);
  }

  function openRepaymentModal(loan: LoanApplication) {
    setRepaymentLoanId(String(loan.id));
    setRepaymentForm(createEmptyRepaymentForm());
    setRepaymentError(null);
  }

  function closeRepaymentModal() {
    setRepaymentLoanId(null);
    setRepaymentForm(createEmptyRepaymentForm());
    setRepaymentError(null);
  }

  async function refreshLoanWorkspace(nextLoanId?: string | null) {
    await reloadApplications();
    const targetLoanId = nextLoanId ?? activeLoanId;
    if (!targetLoanId) return;

    if (targetLoanId !== activeLoanId) {
      setSelectedLoanId(targetLoanId);
      return;
    }

    await reloadActiveLoan();
  }

  async function handleApplicationSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!applicationForm.product) {
      setApplicationError('Select a loan product before continuing.');
      return;
    }

    if (!isClient && !applicationForm.client) {
      setApplicationError('Select a client before continuing.');
      return;
    }

    setIsSubmittingApplication(true);
    setApplicationError(null);

    try {
      const payload: Record<string, unknown> = {
        product: applicationForm.product,
        amount: applicationForm.amount.trim(),
        term_months: Number(applicationForm.term_months),
        purpose: applicationForm.purpose.trim(),
        repayment_source: applicationForm.repayment_source,
        submit: applicationForm.submit_mode === 'submitted',
      };

      if (!isClient) {
        payload.client = applicationForm.client;
      }

      const created = await loanApi.applications.create(payload as never);
      resetApplicationModal();
      toast.success(
        isClient ? 'Loan application submitted' : 'Loan application created',
      );
      await refreshLoanWorkspace(String(created.id));
    } catch (error) {
      const message = getProblemMessage(
        error,
        'Unable to save the loan application.',
      );
      setApplicationError(message);
      toast.error(message);
    } finally {
      setIsSubmittingApplication(false);
    }
  }

  async function handleDecisionSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!decisionMode || !decisionLoan) return;

    setIsSubmittingDecision(true);
    setDecisionError(null);

    try {
      if (decisionMode === 'start_review') {
        await loanApi.applications.startReview(decisionLoan.id, {
          comment: decisionForm.comment.trim(),
        });
      } else if (decisionMode === 'appraise') {
        await loanApi.applications.appraise(decisionLoan.id, {
          recommendation: decisionForm.recommendation,
          recommended_amount: decisionForm.recommended_amount.trim() || null,
          recommended_term_months: decisionForm.recommended_term_months.trim()
            ? Number(decisionForm.recommended_term_months.trim())
            : null,
          monthly_income: decisionForm.monthly_income.trim(),
          monthly_expenses: decisionForm.monthly_expenses.trim() || '0',
          existing_debt_payments:
            decisionForm.existing_debt_payments.trim() || '0',
          risk_score: decisionForm.risk_score.trim()
            ? Number(decisionForm.risk_score.trim())
            : null,
          collateral_notes: decisionForm.collateral_notes.trim(),
          guarantor_notes: decisionForm.guarantor_notes.trim(),
          credit_comments: decisionForm.credit_comments.trim(),
          notes: decisionForm.notes.trim(),
        });
      } else if (decisionMode === 'recommend') {
        await loanApi.applications.recommend(decisionLoan.id, {
          comment: decisionForm.comment.trim(),
        });
      } else if (decisionMode === 'approve') {
        await loanApi.applications.approve(decisionLoan.id, {
          comment: decisionForm.comment.trim(),
        });
      } else if (decisionMode === 'reject') {
        await loanApi.applications.reject(decisionLoan.id, {
          reason: decisionForm.reason.trim(),
          comment: decisionForm.comment.trim(),
        });
      } else if (decisionMode === 'withdraw') {
        await loanApi.applications.withdraw(decisionLoan.id, {
          reason: decisionForm.reason.trim(),
          comment: decisionForm.comment.trim(),
        });
      } else if (decisionMode === 'disburse') {
        await loanApi.applications.disburse(decisionLoan.id, {
          reference: decisionForm.reference.trim(),
          disbursement_method: decisionForm.disbursement_method.trim(),
        });
      }

      toast.success(`${statusLabel(decisionMode)} action completed`);
      closeDecisionModal();
      await refreshLoanWorkspace(String(decisionLoan.id));
    } catch (error) {
      const message = getProblemMessage(
        error,
        'Unable to process this loan action.',
      );
      setDecisionError(message);
      toast.error(message);
    } finally {
      setIsSubmittingDecision(false);
    }
  }

  async function handleRepaymentSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!repaymentLoan) return;

    setIsSubmittingRepayment(true);
    setRepaymentError(null);

    try {
      await loanApi.applications.repay(repaymentLoan.id, {
        amount: repaymentForm.amount.trim(),
        reference: repaymentForm.reference.trim(),
        payment_method: repaymentForm.payment_method.trim(),
      });
      toast.success('Repayment recorded');
      closeRepaymentModal();
      await refreshLoanWorkspace(String(repaymentLoan.id));
    } catch (error) {
      const message = getProblemMessage(
        error,
        'Unable to record the repayment.',
      );
      setRepaymentError(message);
      toast.error(message);
    } finally {
      setIsSubmittingRepayment(false);
    }
  }

  const applicationColumns: Column<LoanApplication>[] = [
    {
      header: isClient ? 'Loan' : 'Client',
      accessor: (loan) => (
        <div className="min-w-0 max-w-[15rem]">
          <p className="truncate font-bold text-slate-900">
            {isClient
              ? (loan.product_name ?? 'Loan product')
              : (loan.client_name ?? clientName(loan.client))}
          </p>
          <p className="mt-1 break-words text-xs text-slate-500">
            {isClient
              ? `${loan.product_code ?? 'Product'} - ${loan.client_member_number ?? 'Member'}`
              : `${loan.client_member_number ?? 'Member'} - ${loan.branch_name ?? 'Branch'}`}
          </p>
        </div>
      ),
    },
    {
      header: 'Amount',
      accessor: (loan) => (
        <div>
          <p className="font-semibold text-slate-900">{money(loan.amount)}</p>
          <p className="text-xs text-slate-500">
            Outstanding {money(loan.outstanding_balance)}
          </p>
        </div>
      ),
      align: 'right',
    },
    {
      header: 'Status',
      accessor: (loan) => {
        const stage = loanStageMeta(loan.status);
        return (
          <div className="space-y-1">
            <StatusBadge status={loan.status} />
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
              {stage.stepText}
            </p>
          </div>
        );
      },
    },
    {
      header: 'Submitted',
      accessor: (loan) => formatDate(loan.submitted_at ?? loan.created_at),
    },
    {
      header: 'Actions',
      accessor: (loan) => (
        <RowActions
          actions={[
            {
              key: 'view',
              label: 'View',
              onClick: () => {
                setSelectedLoanId(String(loan.id));
              },
              tone: 'success',
            },
            {
              key: 'start_review',
              label: 'Start review',
              hidden: !canStartReview(actorRole, loan),
              onClick: () => openDecisionModal('start_review', loan),
            },
            {
              key: 'recommend',
              label: 'Recommend',
              hidden: !canRecommend(actorRole, loan),
              onClick: () => openDecisionModal('recommend', loan),
            },
            {
              key: 'appraise',
              label: 'Appraise',
              hidden: !canAppraise(actorRole, loan),
              onClick: () => openDecisionModal('appraise', loan),
            },
            {
              key: 'approve',
              label: 'Approve',
              hidden: !canApprove(actorRole, loan),
              onClick: () => openDecisionModal('approve', loan),
            },
            {
              key: 'reject',
              label: 'Reject',
              hidden: !canReject(actorRole, loan),
              tone: 'danger',
              onClick: () => openDecisionModal('reject', loan),
            },
            {
              key: 'withdraw',
              label: 'Withdraw',
              hidden: !canWithdraw(actorRole, loan),
              tone: 'danger',
              onClick: () => openDecisionModal('withdraw', loan),
            },
            {
              key: 'disburse',
              label: 'Disburse',
              hidden: !canDisburse(actorRole, loan),
              onClick: () => openDecisionModal('disburse', loan),
            },
            {
              key: 'repay',
              label: 'Repay',
              hidden: !canRepay(actorRole, loan),
              onClick: () => openRepaymentModal(loan),
            },
          ]}
          align="end"
        />
      ),
      align: 'right',
    },
  ];

  const scheduleColumns: Column<RepaymentScheduleRow>[] = [
    { header: 'Due date', accessor: (row) => formatDate(row.due_date) },
    {
      header: 'Principal',
      accessor: (row) => money(row.principal_due),
      align: 'right',
    },
    {
      header: 'Interest',
      accessor: (row) => money(row.interest_due),
      align: 'right',
    },
    {
      header: 'Paid',
      accessor: (row) => money(row.paid_amount),
      align: 'right',
    },
    {
      header: 'Status',
      accessor: (row) => (
        <StatusBadge status={row.is_paid ? 'paid' : 'pending'} />
      ),
    },
  ];

  const repaymentColumns: Column<LoanRepayment>[] = [
    { header: 'Date', accessor: (row) => formatDate(row.created_at) },
    {
      header: 'Reference',
      accessor: (row) => (
        <div>
          <p className="font-bold text-slate-900">{row.reference ?? row.id}</p>
          <p className="text-xs text-slate-500">
            {row.payment_method || row.received_by_email || 'Repayment'}
          </p>
        </div>
      ),
    },
    { header: 'Amount', accessor: (row) => money(row.amount), align: 'right' },
    {
      header: 'Remaining',
      accessor: (row) => money(row.remaining_balance_after),
      align: 'right',
    },
  ];

  const actionColumns: Column<LoanApplicationAction>[] = [
    { header: 'When', accessor: (row) => formatDate(row.created_at) },
    {
      header: 'Action',
      accessor: (row) => (
        <div>
          <p className="font-bold text-slate-900">
            {row.action_label ?? statusLabel(row.action)}
          </p>
          <p className="text-xs text-slate-500">
            {row.from_status
              ? `${statusLabel(row.from_status)} -> ${statusLabel(row.to_status)}`
              : statusLabel(row.to_status)}
          </p>
        </div>
      ),
    },
    {
      header: 'By',
      accessor: (row) => row.acted_by_email ?? 'System',
    },
    {
      header: 'Comment',
      accessor: (row) => (
        <p className="max-w-[16rem] break-words text-sm text-slate-700">
          {row.comment || '-'}
        </p>
      ),
    },
  ];

  const appraisalColumns: Column<LoanAppraisal>[] = [
    { header: 'When', accessor: (row) => formatDate(row.created_at) },
    {
      header: 'Recommendation',
      accessor: (row) => (
        <div>
          <p className="font-bold text-slate-900">
            {row.recommendation_label ?? statusLabel(row.recommendation)}
          </p>
          <p className="text-xs text-slate-500">
            Eligibility {row.eligibility_passed ? 'passed' : 'failed'}
          </p>
        </div>
      ),
    },
    {
      header: 'Affordability',
      accessor: (row) => (
        <div>
          <p className="font-semibold text-slate-900">
            Income {money(row.monthly_income)}
          </p>
          <p className="text-xs text-slate-500">
            Expenses {money(row.monthly_expenses)} | Installment{' '}
            {money(row.estimated_installment)}
          </p>
        </div>
      ),
    },
    {
      header: 'Notes',
      accessor: (row) => (
        <p className="max-w-[16rem] break-words text-sm text-slate-700">
          {row.notes || row.credit_comments || row.collateral_notes || '-'}
        </p>
      ),
    },
  ];

  if (!actorRole) {
    return <StateView title="Loading loan workspace..." />;
  }

  if (productsError && !productsData) {
    return (
      <StateView
        title="Could not load loan products"
        description={productsError}
        actionLabel="Retry"
        onAction={() => {
          void reloadProducts();
        }}
      />
    );
  }

  return (
    <RecordsPageLayout
      className="min-w-0"
      title={isClient ? 'My loans' : 'Loan applications'}
      description={
        isClient
          ? 'Apply for a loan, follow approvals, and review your schedule and repayments.'
          : 'Review, recommend, approve, disburse, and monitor loan applications in one workflow.'
      }
      headerAction={
        canCreateApplications(actorRole) ? (
          <Button type="button" onClick={openApplicationModal}>
            {isClient ? 'Apply for loan' : 'Create application'}
          </Button>
        ) : undefined
      }
      metrics={[
        {
          label: isClient ? 'My applications' : 'Applications in view',
          value: applications.length,
          hint: 'Filtered by your current search and status selections.',
        },
        {
          label: 'Pending action',
          value: pendingCount,
          hint: 'Submitted, under-review, or recommended applications.',
          accent: 'amber',
        },
        {
          label: 'Outstanding in view',
          value: money(portfolioInView),
          hint: `${disbursableCount} approved loans are ready for disbursement.`,
          accent: 'slate',
        },
      ]}
      filterPanel={
        <Card className="grid min-w-0 gap-4 p-4 sm:p-5">
          <CardTitle>Search and filters</CardTitle>
          <div className="grid min-w-0 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            <Field label="Search">
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder={
                  isClient
                    ? 'Product, status, or purpose'
                    : 'Client, product, or purpose'
                }
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
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="under_review">Under review</option>
                <option value="appraised">Appraised</option>
                <option value="recommended">Recommended</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="withdrawn">Withdrawn</option>
                <option value="disbursed">Disbursed</option>
                <option value="closed">Closed</option>
              </select>
            </Field>

            <Field label="Loan product">
              <select
                className={formSelectClassName}
                value={productFilter}
                onChange={(event) => {
                  setProductFilter(event.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All products</option>
                {products.map((product) => (
                  <option key={product.id} value={String(product.id)}>
                    {loanProductLabel(product)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Card>
      }
    >
      <div className="grid min-w-0 gap-5">
        <RecordsListPanel
          className="min-w-0"
          title={isClient ? 'Loan applications' : 'Loan pipeline'}
          description={
            isClient
              ? 'Every application linked to your client profile.'
              : 'Role-aware actions help loan officers, managers, and tellers work from the same queue.'
          }
          action={
            canCreateApplications(actorRole) ? (
              <Button type="button" onClick={openApplicationModal}>
                {isClient ? 'Apply now' : 'New application'}
              </Button>
            ) : undefined
          }
          footer={
            pagination ? (
              <RecordsPagination
                count={pagination.count}
                page={page}
                rowsOnPage={applications.length}
                hasNext={pagination.hasNext}
                hasPrevious={pagination.hasPrevious}
                onPageChange={setPage}
              />
            ) : undefined
          }
        >
          <div className="grid min-w-0 gap-4 p-4 sm:p-5">
            {applicationsError && !applicationsData ? (
              <StateView
                title="Could not load loan applications"
                description={applicationsError}
                actionLabel="Retry"
                onAction={reloadApplications}
              />
            ) : (
              <div className="min-w-0 xl:max-h-[30rem] xl:overflow-auto xl:pr-1">
                <DataTable<LoanApplication>
                  data={applications}
                  columns={applicationColumns}
                  loading={applicationsLoading}
                  emptyTitle="No loan applications found"
                  emptyMessage="Try widening your filters or create a new application."
                  renderMobileCard={(loan) => (
                    <article className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
                      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <p className="truncate text-base font-bold text-slate-900">
                              {loanLabel(loan)}
                            </p>
                            <StatusBadge status={loan.status} />
                          </div>
                          <p className="mt-1 break-words text-sm text-slate-500">
                            Submitted{' '}
                            {formatDate(loan.submitted_at ?? loan.created_at)}
                          </p>
                          <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                            {loanStageMeta(loan.status).stepText} -{' '}
                            {loanStageMeta(loan.status).label}
                          </p>
                        </div>
                        <Button
                          type="button"
                          className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                          onClick={() => setSelectedLoanId(String(loan.id))}
                        >
                          View
                        </Button>
                      </div>

                      <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white px-3 py-2">
                          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                            Requested
                          </p>
                          <p className="mt-1 break-words font-medium text-slate-800">
                            {money(loan.amount)}
                          </p>
                        </div>
                        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white px-3 py-2">
                          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                            Outstanding
                          </p>
                          <p className="mt-1 break-words font-medium text-slate-800">
                            {money(loan.outstanding_balance)}
                          </p>
                        </div>
                      </div>
                    </article>
                  )}
                />
              </div>
            )}
          </div>
        </RecordsListPanel>

        <div className="grid min-w-0 gap-5">
          <Card className="grid min-w-0 gap-4 overflow-hidden p-4 sm:p-5">
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <CardTitle>Loan detail</CardTitle>
                <p className="mt-1 break-words text-sm text-slate-500">
                  {selectedLoan
                    ? `${loanLabel(selectedLoan)} - next due ${formatDate(nextDueSchedule(scheduleRows))}`
                    : 'Select any application to inspect its schedule, approvals, and repayments.'}
                </p>
              </div>
              {selectedLoan ? (
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={selectedLoan.status} />
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-600">
                    {selectedLoanStage.stepText}
                  </span>
                </div>
              ) : null}
            </div>

            {activeLoanLoading && !selectedLoan ? (
              <StateView title="Loading selected loan..." />
            ) : activeLoanError && !selectedLoan ? (
              <StateView
                title="Could not load the selected loan"
                description={activeLoanError}
                actionLabel="Retry"
                onAction={reloadActiveLoan}
              />
            ) : selectedLoan ? (
              <div className="grid min-w-0 gap-4">
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                      Current step
                    </p>
                    <p className="mt-1 break-words text-sm font-semibold text-slate-900">
                      {selectedLoanStage.label}
                    </p>
                  </div>
                  <p className="rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-600 ring-1 ring-slate-200">
                    {selectedLoanStage.stepText}
                  </p>
                </div>

                <div className="min-w-0 overflow-x-auto pb-1">
                  <LoanStatusStepper
                    className={activeLoanLoading ? 'opacity-80' : undefined}
                    loan={selectedLoan}
                    title={isClient ? 'Loan lifecycle' : 'Approval flow'}
                  />
                </div>

                <div className="grid min-w-0 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                  <LoanDetailMetric
                    label="Requested amount"
                    value={money(selectedLoan.amount)}
                    helper={
                      selectedLoan.product_name ??
                      selectedLoan.product_code ??
                      'Loan product'
                    }
                    accent="brand"
                  />
                  <LoanDetailMetric
                    label="Outstanding balance"
                    value={money(selectedLoan.outstanding_balance)}
                    helper={`Principal ${money(selectedLoan.principal_balance)} | Interest ${money(selectedLoan.interest_balance)}`}
                  />
                  <LoanDetailMetric
                    label="Requested term"
                    value={`${selectedLoan.term_months ?? '-'} months`}
                    helper={`Interest ${selectedLoan.annual_interest_rate ?? 0}%`}
                  />
                  <LoanDetailMetric
                    label="Next due"
                    value={formatDate(nextDueSchedule(scheduleRows))}
                    helper={`Repayment source ${statusLabel(selectedLoan.repayment_source || 'other')}`}
                  />
                </div>

                {selectedLoan.status === 'rejected' ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                    <p className="font-bold">Rejection note</p>
                    <p className="mt-1 break-words">
                      {selectedLoan.rejected_reason ||
                        'No rejection reason was provided.'}
                    </p>
                  </div>
                ) : null}

                {selectedLoan.status === 'withdrawn' ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <p className="font-bold text-slate-900">Withdrawal note</p>
                    <p className="mt-1 break-words">
                      {selectedLoan.withdrawal_reason ||
                        'No withdrawal reason was provided.'}
                    </p>
                  </div>
                ) : null}

                <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Purpose
                  </p>
                  <p className="mt-2 break-words text-sm leading-6 text-slate-700">
                    {selectedLoan.purpose ||
                      'No purpose was provided for this application.'}
                  </p>
                </div>

                <div className="grid min-w-0 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                  <LoanInfoField
                    label="Client"
                    value={selectedLoan.client_name ?? clientName(selectedLoan.client)}
                    helper={selectedLoan.client_member_number ?? 'No member number'}
                  />
                  <LoanInfoField
                    label="Branch"
                    value={selectedLoan.branch_name || 'No branch'}
                    helper={selectedLoan.product_code || 'No product code'}
                  />
                  <LoanInfoField
                    label="Repayment source"
                    value={statusLabel(selectedLoan.repayment_source || 'other')}
                    helper={
                      selectedLoan.repayment_frequency
                        ? statusLabel(selectedLoan.repayment_frequency)
                        : 'No repayment frequency'
                    }
                  />
                  <LoanInfoField
                    label="Submitted"
                    value={formatDate(selectedLoan.submitted_at ?? selectedLoan.created_at)}
                    helper={`Current status ${statusLabel(selectedLoan.status)}`}
                  />
                </div>

                {hasEligibilitySnapshot ? (
                  <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-900">
                          Eligibility snapshot
                        </p>
                        <p className="mt-1 break-words text-sm text-slate-500">
                          Latest backend eligibility result for this request.
                        </p>
                      </div>
                      <StatusBadge
                        status={
                          eligibilitySnapshot?.eligible
                            ? 'active'
                            : 'rejected'
                        }
                      />
                    </div>

                    <div className="mt-4 grid min-w-0 gap-3 md:grid-cols-2">
                      {eligibilityChecks.map((check) => (
                        <div
                          className="min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-3"
                          key={check.code}
                        >
                          <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                            <p className="min-w-0 flex-1 break-words font-semibold text-slate-900">
                              {check.label ?? statusLabel(check.code)}
                            </p>
                            <StatusBadge
                              status={check.passed ? 'active' : 'rejected'}
                            />
                          </div>
                          <p className="mt-2 break-words text-sm text-slate-600">
                            {check.message}
                          </p>
                          {(check.value != null || check.threshold != null) ? (
                            <p className="mt-2 break-words text-xs text-slate-500">
                              Value {check.value ?? '-'} | Threshold{' '}
                              {check.threshold ?? '-'}
                            </p>
                          ) : null}
                        </div>
                      ))}
                      {!eligibilityChecks.length ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-4 text-sm text-slate-600 md:col-span-2">
                          No detailed eligibility checks were stored for this
                          application yet.
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  {canStartReview(actorRole, selectedLoan) ? (
                    <Button
                      type="button"
                      className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                      onClick={() =>
                        openDecisionModal('start_review', selectedLoan)
                      }
                    >
                      Start review
                    </Button>
                  ) : null}
                  {canRecommend(actorRole, selectedLoan) ? (
                    <Button
                      type="button"
                      onClick={() =>
                        openDecisionModal('recommend', selectedLoan)
                      }
                    >
                      Recommend
                    </Button>
                  ) : null}
                  {canAppraise(actorRole, selectedLoan) ? (
                    <Button
                      type="button"
                      className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                      onClick={() => openDecisionModal('appraise', selectedLoan)}
                    >
                      Appraise
                    </Button>
                  ) : null}
                  {canApprove(actorRole, selectedLoan) ? (
                    <Button
                      type="button"
                      onClick={() => openDecisionModal('approve', selectedLoan)}
                    >
                      Approve
                    </Button>
                  ) : null}
                  {canReject(actorRole, selectedLoan) ? (
                    <Button
                      type="button"
                      className="bg-white text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50"
                      onClick={() => openDecisionModal('reject', selectedLoan)}
                    >
                      Reject
                    </Button>
                  ) : null}
                  {canWithdraw(actorRole, selectedLoan) ? (
                    <Button
                      type="button"
                      className="bg-white text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50"
                      onClick={() => openDecisionModal('withdraw', selectedLoan)}
                    >
                      Withdraw
                    </Button>
                  ) : null}
                  {canDisburse(actorRole, selectedLoan) ? (
                    <Button
                      type="button"
                      onClick={() =>
                        openDecisionModal('disburse', selectedLoan)
                      }
                    >
                      Disburse
                    </Button>
                  ) : null}
                  {canRepay(actorRole, selectedLoan) ? (
                    <Button
                      type="button"
                      className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                      onClick={() => openRepaymentModal(selectedLoan)}
                    >
                      Record repayment
                    </Button>
                  ) : null}
                </div>

                <div className="grid min-w-0 gap-4 xl:grid-cols-2">
                  <div className="min-w-0">
                    <CardTitle>Repayment schedule</CardTitle>
                    <div className="mt-3 min-w-0 overflow-hidden">
                      <DataTable<RepaymentScheduleRow>
                        data={scheduleRows}
                        columns={scheduleColumns}
                        emptyTitle="No schedule available"
                        emptyMessage="Schedule rows will appear after the loan is disbursed."
                      />
                    </div>
                  </div>

                  <div className="min-w-0">
                    <CardTitle>Repayments</CardTitle>
                    <div className="mt-3 min-w-0 overflow-hidden">
                      <DataTable<LoanRepayment>
                        data={repaymentRows}
                        columns={repaymentColumns}
                        emptyTitle="No repayments recorded"
                        emptyMessage="Repayments will appear here as tellers record them."
                      />
                    </div>
                  </div>

                  <div className="min-w-0">
                    <CardTitle>Appraisals</CardTitle>
                    <div className="mt-3 min-w-0 overflow-hidden">
                      <DataTable<LoanAppraisal>
                        data={appraisalRows}
                        columns={appraisalColumns}
                        emptyTitle="No appraisals recorded"
                        emptyMessage="Appraisals will appear here once a loan officer completes them."
                      />
                    </div>
                  </div>

                  <div className="min-w-0">
                    <CardTitle>Action history</CardTitle>
                    <div className="mt-3 min-w-0 overflow-hidden">
                      <DataTable<LoanApplicationAction>
                        data={actionRows}
                        columns={actionColumns}
                        emptyTitle="No actions recorded"
                        emptyMessage="Workflow history will appear as the application moves forward."
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <StateView
                title="No loan selected"
                description="Choose a loan application from the list to review its full lifecycle."
              />
            )}
          </Card>
        </div>
      </div>

      {isApplicationModalOpen ? (
        <Modal
          open={isApplicationModalOpen}
          onClose={resetApplicationModal}
          size="xl"
          title={isClient ? 'Apply for a loan' : 'Create loan application'}
          description={
            isClient
              ? 'Submit your loan request directly from self-service.'
              : 'Capture the client, product, and submission mode for a new application.'
          }
          footer={
            <>
              <Button
                type="button"
                className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                onClick={resetApplicationModal}
              >
                Cancel
              </Button>
              <Button
                form="loan-application-form"
                type="submit"
                disabled={isSubmittingApplication}
              >
                {isSubmittingApplication
                  ? 'Saving...'
                  : isClient
                    ? 'Submit application'
                    : 'Save application'}
              </Button>
            </>
          }
        >
          <form
            className="grid gap-4"
            id="loan-application-form"
            onSubmit={handleApplicationSubmit}
          >
            {!isClient ? (
              <>
                <Field label="Search clients">
                  <Input
                    value={clientSearch}
                    onChange={(event) => setClientSearch(event.target.value)}
                    placeholder="Member number, name, or phone"
                  />
                </Field>

                <Field label="Client">
                  <select
                    className={formSelectClassName}
                    value={applicationForm.client}
                    onChange={(event) =>
                      setApplicationForm((current) => ({
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
                    Could not load clients for loan origination.
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
              </>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
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
                  {products.map((product) => (
                    <option key={product.id} value={String(product.id)}>
                      {loanProductLabel(product)}
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

            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Term (months)">
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

              {!isClient ? (
                <Field label="Submission mode">
                  <select
                    className={formSelectClassName}
                    value={applicationForm.submit_mode}
                    onChange={(event) =>
                      setApplicationForm((current) => ({
                        ...current,
                        submit_mode: event.target
                          .value as ApplicationFormState['submit_mode'],
                      }))
                    }
                  >
                    <option value="submitted">Submit for review</option>
                    <option value="draft">Save as draft</option>
                  </select>
                </Field>
              ) : null}
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
                placeholder="Describe the intended use of the loan."
              />
            </Field>

            {selectedProduct ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <p className="font-bold text-slate-900">
                  {selectedProduct.name}
                </p>
                <p className="mt-1">
                  Limits {money(selectedProduct.min_amount)} to{' '}
                  {money(selectedProduct.max_amount)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Interest {selectedProduct.annual_interest_rate}% -{' '}
                  {statusLabel(selectedProduct.repayment_frequency)} | Grace{' '}
                  {selectedProduct.grace_period_days ?? 0} days
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Minimum savings {money(selectedProduct.minimum_savings_balance)} |
                  minimum shares {money(selectedProduct.minimum_share_capital)}
                </p>
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

      {decisionMode ? (
        <Modal
          open={Boolean(decisionMode)}
          onClose={closeDecisionModal}
          size="lg"
          title={statusLabel(decisionMode)}
          description={
            decisionLoan
              ? `${statusLabel(decisionMode)} for ${loanLabel(decisionLoan)}`
              : 'Choose a valid loan before continuing.'
          }
          footer={
            <>
              <Button
                type="button"
                className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                onClick={closeDecisionModal}
              >
                Cancel
              </Button>
              <Button
                form="loan-decision-form"
                type="submit"
                disabled={isSubmittingDecision}
              >
                {isSubmittingDecision ? 'Saving...' : statusLabel(decisionMode)}
              </Button>
            </>
          }
        >
          <form
            className="grid gap-4"
            id="loan-decision-form"
            onSubmit={handleDecisionSubmit}
          >
            {decisionLoan ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <p className="font-bold text-slate-900">
                  {loanLabel(decisionLoan)}
                </p>
                <p className="mt-1">
                  Requested {money(decisionLoan.amount)} - status{' '}
                  {statusLabel(decisionLoan.status)}
                </p>
              </div>
            ) : null}

            {decisionMode === 'reject' || decisionMode === 'withdraw' ? (
              <Field label="Reason">
                <textarea
                  className={applicationTextareaClassName}
                  value={decisionForm.reason}
                  onChange={(event) =>
                    setDecisionForm((current) => ({
                      ...current,
                      reason: event.target.value,
                    }))
                  }
                  required
                />
              </Field>
            ) : null}

            {decisionMode === 'appraise' ? (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Recommendation">
                    <select
                      className={formSelectClassName}
                      value={decisionForm.recommendation}
                      onChange={(event) =>
                        setDecisionForm((current) => ({
                          ...current,
                          recommendation: event.target.value,
                        }))
                      }
                    >
                      <option value="approve">Recommend approval</option>
                      <option value="reject">Recommend rejection</option>
                      <option value="modify">Recommend modification</option>
                    </select>
                  </Field>
                  <Field label="Risk score">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={decisionForm.risk_score}
                      onChange={(event) =>
                        setDecisionForm((current) => ({
                          ...current,
                          risk_score: event.target.value,
                        }))
                      }
                      placeholder="Optional"
                    />
                  </Field>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Monthly income">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={decisionForm.monthly_income}
                      onChange={(event) =>
                        setDecisionForm((current) => ({
                          ...current,
                          monthly_income: event.target.value,
                        }))
                      }
                      required
                    />
                  </Field>
                  <Field label="Monthly expenses">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={decisionForm.monthly_expenses}
                      onChange={(event) =>
                        setDecisionForm((current) => ({
                          ...current,
                          monthly_expenses: event.target.value,
                        }))
                      }
                    />
                  </Field>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="Existing debt payments">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={decisionForm.existing_debt_payments}
                      onChange={(event) =>
                        setDecisionForm((current) => ({
                          ...current,
                          existing_debt_payments: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field label="Recommended amount">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={decisionForm.recommended_amount}
                      onChange={(event) =>
                        setDecisionForm((current) => ({
                          ...current,
                          recommended_amount: event.target.value,
                        }))
                      }
                      placeholder="Optional"
                    />
                  </Field>
                  <Field label="Recommended term (months)">
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      value={decisionForm.recommended_term_months}
                      onChange={(event) =>
                        setDecisionForm((current) => ({
                          ...current,
                          recommended_term_months: event.target.value,
                        }))
                      }
                      placeholder="Optional"
                    />
                  </Field>
                </div>

                <Field label="Collateral notes">
                  <textarea
                    className={applicationTextareaClassName}
                    value={decisionForm.collateral_notes}
                    onChange={(event) =>
                      setDecisionForm((current) => ({
                        ...current,
                        collateral_notes: event.target.value,
                      }))
                    }
                    placeholder="Collateral observations, valuation notes, or gaps."
                  />
                </Field>

                <Field label="Guarantor notes">
                  <textarea
                    className={applicationTextareaClassName}
                    value={decisionForm.guarantor_notes}
                    onChange={(event) =>
                      setDecisionForm((current) => ({
                        ...current,
                        guarantor_notes: event.target.value,
                      }))
                    }
                    placeholder="Guarantor assessment and support capacity."
                  />
                </Field>

                <Field label="Credit comments">
                  <textarea
                    className={applicationTextareaClassName}
                    value={decisionForm.credit_comments}
                    onChange={(event) =>
                      setDecisionForm((current) => ({
                        ...current,
                        credit_comments: event.target.value,
                      }))
                    }
                    placeholder="Credit observations, repayment behavior, and officer comments."
                  />
                </Field>

                <Field label="Appraisal note">
                  <textarea
                    className={applicationTextareaClassName}
                    value={decisionForm.notes}
                    onChange={(event) =>
                      setDecisionForm((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                    placeholder="Summarize the affordability and final recommendation."
                  />
                </Field>
              </>
            ) : null}

            {decisionMode === 'disburse' ? (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Reference">
                    <Input
                      value={decisionForm.reference}
                      onChange={(event) =>
                        setDecisionForm((current) => ({
                          ...current,
                          reference: event.target.value,
                        }))
                      }
                      required
                    />
                  </Field>
                  <Field label="Method">
                    <select
                      className={formSelectClassName}
                      value={decisionForm.disbursement_method}
                      onChange={(event) =>
                        setDecisionForm((current) => ({
                          ...current,
                          disbursement_method: event.target.value,
                        }))
                      }
                    >
                      <option value="cash">Cash</option>
                      <option value="mobile_money">Mobile money</option>
                      <option value="bank_transfer">Bank transfer</option>
                    </select>
                  </Field>
                </div>
              </>
            ) : null}

            {decisionMode !== 'disburse' && decisionMode !== 'appraise' ? (
              <Field label="Comment">
                <textarea
                  className={applicationTextareaClassName}
                  value={decisionForm.comment}
                  onChange={(event) =>
                    setDecisionForm((current) => ({
                      ...current,
                      comment: event.target.value,
                    }))
                  }
                  placeholder="Optional workflow note."
                />
              </Field>
            ) : null}

            {decisionError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                {decisionError}
              </div>
            ) : null}
          </form>
        </Modal>
      ) : null}

      {repaymentLoanId ? (
        <Modal
          open={Boolean(repaymentLoanId)}
          onClose={closeRepaymentModal}
          size="md"
          title="Record repayment"
          description={
            repaymentLoan
              ? `Repayment for ${loanLabel(repaymentLoan)}`
              : 'Choose a valid loan before recording a repayment.'
          }
          footer={
            <>
              <Button
                type="button"
                className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                onClick={closeRepaymentModal}
              >
                Cancel
              </Button>
              <Button
                form="loan-repayment-form"
                type="submit"
                disabled={isSubmittingRepayment}
              >
                {isSubmittingRepayment ? 'Saving...' : 'Record repayment'}
              </Button>
            </>
          }
        >
          <form
            className="grid gap-4"
            id="loan-repayment-form"
            onSubmit={handleRepaymentSubmit}
          >
            {repaymentLoan ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <p className="font-bold text-slate-900">
                  {loanLabel(repaymentLoan)}
                </p>
                <p className="mt-1">
                  Outstanding {money(repaymentLoan.outstanding_balance)}
                </p>
              </div>
            ) : null}

            <Field label="Amount">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={repaymentForm.amount}
                onChange={(event) =>
                  setRepaymentForm((current) => ({
                    ...current,
                    amount: event.target.value,
                  }))
                }
                required
              />
            </Field>

            <Field label="Reference">
              <Input
                value={repaymentForm.reference}
                onChange={(event) =>
                  setRepaymentForm((current) => ({
                    ...current,
                    reference: event.target.value,
                  }))
                }
                required
              />
            </Field>

            <Field label="Payment method">
              <select
                className={formSelectClassName}
                value={repaymentForm.payment_method}
                onChange={(event) =>
                  setRepaymentForm((current) => ({
                    ...current,
                    payment_method: event.target.value,
                  }))
                }
              >
                <option value="cash">Cash</option>
                <option value="mobile_money">Mobile money</option>
                <option value="bank_transfer">Bank transfer</option>
              </select>
            </Field>

            {repaymentError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                {repaymentError}
              </div>
            ) : null}
          </form>
        </Modal>
      ) : null}
    </RecordsPageLayout>
  );
}
