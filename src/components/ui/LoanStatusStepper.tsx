import type { LoanApplication, LoanApplicationAction } from '@/types/api';
import {
  StatusStepper,
  type StatusStepperDates,
  type StatusStepperTerminalState,
} from './StatusStepper';

const loanLifecycleSteps = [
  { key: 'submitted', label: 'Submitted' },
  { key: 'under_review', label: 'Under review' },
  { key: 'recommended', label: 'Recommended' },
  { key: 'approved', label: 'Approved' },
  { key: 'disbursed', label: 'Disbursed' },
  { key: 'closed', label: 'Closed' },
] as const;

const loanStatusAliases = {
  pending: 'submitted',
  submitted: 'submitted',
  review: 'under_review',
  reviewed: 'under_review',
  under_review: 'under_review',
  recommended: 'recommended',
  approved: 'approved',
  disbursed: 'disbursed',
  closed: 'closed',
  rejected: 'rejected',
  cancelled: 'cancelled',
  canceled: 'cancelled',
} as const;

type LoanStepperSource = Pick<
  LoanApplication,
  | 'status'
  | 'submitted_at'
  | 'reviewed_at'
  | 'recommended_at'
  | 'approved_at'
  | 'rejected_at'
  | 'disbursed_at'
  | 'action_history'
>;

type LoanStatusStepperProps = {
  loan?: LoanStepperSource | null;
  currentStatus?: string | null;
  stepDates?: StatusStepperDates;
  actionHistory?: LoanApplicationAction[] | null;
  rejectedDate?: string | null;
  cancelledDate?: string | null;
  title?: string;
  className?: string;
};

function normalizeStatusKey(value?: string | null) {
  return (value ?? '').trim().toLowerCase().replaceAll(' ', '_');
}

function findActionDate(
  actions: LoanApplicationAction[] | null | undefined,
  targetStatus: string,
) {
  const normalizedTargetStatus = normalizeStatusKey(targetStatus);

  for (let index = (actions?.length ?? 0) - 1; index >= 0; index -= 1) {
    const action = actions?.[index];
    if (!action) continue;

    if (
      normalizeStatusKey(action.to_status) === normalizedTargetStatus ||
      normalizeStatusKey(action.action) === normalizedTargetStatus
    ) {
      return action.created_at ?? null;
    }
  }

  return null;
}

export function LoanStatusStepper({
  loan,
  currentStatus,
  stepDates,
  actionHistory,
  rejectedDate,
  cancelledDate,
  title = 'Loan lifecycle',
  className,
}: LoanStatusStepperProps) {
  const resolvedHistory = actionHistory ?? loan?.action_history ?? null;
  const resolvedCurrentStatus = currentStatus ?? loan?.status;
  const normalizedCurrentStatus = normalizeStatusKey(resolvedCurrentStatus);
  const resolvedStepDates: StatusStepperDates = {
    submitted: loan?.submitted_at ?? null,
    under_review:
      loan?.reviewed_at ?? findActionDate(resolvedHistory, 'under_review'),
    recommended:
      loan?.recommended_at ?? findActionDate(resolvedHistory, 'recommended'),
    approved: loan?.approved_at ?? findActionDate(resolvedHistory, 'approved'),
    disbursed:
      loan?.disbursed_at ?? findActionDate(resolvedHistory, 'disbursed'),
    closed: findActionDate(resolvedHistory, 'closed'),
    ...stepDates,
  };

  let terminalState: StatusStepperTerminalState | null = null;

  if (normalizedCurrentStatus === 'rejected') {
    terminalState = {
      label: 'Rejected',
      date:
        rejectedDate ??
        loan?.rejected_at ??
        findActionDate(resolvedHistory, 'rejected'),
      tone: 'danger',
    };
  } else if (normalizedCurrentStatus === 'cancelled') {
    terminalState = {
      label: 'Cancelled',
      date: cancelledDate ?? findActionDate(resolvedHistory, 'cancelled'),
      tone: 'neutral',
    };
  }

  return (
    <StatusStepper
      aliases={loanStatusAliases}
      className={className}
      currentStatus={resolvedCurrentStatus}
      stepDates={resolvedStepDates}
      steps={[...loanLifecycleSteps]}
      terminalState={terminalState}
      title={title}
    />
  );
}
