'use client';

import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import type { Column } from '@/components/ui/data-table';
import { DataTable } from '@/components/ui/data-table';
import { Field } from '@/components/ui/input';
import { LoanStatusStepper } from '@/components/ui/LoanStatusStepper';
import { Modal } from '@/components/ui/modal';
import { StateView } from '@/components/ui/state-view';
import { StatusBadge } from '@/components/ui/status-badge';
import { formSelectClassName, formatDate } from '@/features/admin/shared';
import { useApiResource } from '@/hooks/use-api-resource';
import { currencyMoney } from '@/lib/api/format';
import { selfServiceApi } from '@/lib/api/services';
import type {
  RepaymentScheduleRow,
  SelfServiceLoanStatement,
  SelfServiceLoanStatementRepayment,
} from '@/types/api';

export function SelfServiceLoanStatementModal({
  open,
  onClose,
  initialLoanId,
  defaultCurrency = 'UGX',
}: {
  open: boolean;
  onClose: () => void;
  initialLoanId?: string | null;
  defaultCurrency?: string;
}) {
  const [selectedLoanId, setSelectedLoanId] = useState(initialLoanId ?? '');

  const loadStatement = useCallback(
    () =>
      selfServiceApi.loans.statement({
        loan: selectedLoanId || undefined,
      }),
    [selectedLoanId],
  );

  const { data, error, isLoading, reload } =
    useApiResource<SelfServiceLoanStatement>(loadStatement);

  const currency = data?.currency || defaultCurrency;
  const loan = data?.loan_summary;
  const balances = data?.balances;
  const availableLoans = data?.available_loans ?? [];
  const repayments = data?.repayments ?? [];
  const schedule = data?.repayment_schedule ?? [];
  const activeLoanId =
    selectedLoanId ||
    (data?.selected_loan_id ? String(data.selected_loan_id) : '') ||
    initialLoanId ||
    '';

  const repaymentColumns: Column<SelfServiceLoanStatementRepayment>[] = [
    {
      header: 'Date',
      accessor: (row) => formatDate(row.date),
    },
    {
      header: 'Amount paid',
      accessor: (row) =>
        currencyMoney(row.amount, currency, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      align: 'right',
    },
    {
      header: 'Principal',
      accessor: (row) =>
        currencyMoney(row.principal, currency, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      align: 'right',
    },
    {
      header: 'Interest',
      accessor: (row) =>
        currencyMoney(row.interest, currency, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      align: 'right',
    },
    {
      header: 'Penalty',
      accessor: (row) =>
        currencyMoney(row.penalty, currency, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      align: 'right',
    },
    {
      header: 'Remaining balance',
      accessor: (row) =>
        currencyMoney(row.remaining_balance, currency, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      align: 'right',
    },
  ];

  const scheduleColumns: Column<RepaymentScheduleRow>[] = [
    {
      header: 'Due date',
      accessor: (row) => formatDate(row.due_date),
    },
    {
      header: 'Due amount',
      accessor: (row) =>
        currencyMoney(row.total_due, currency, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      align: 'right',
    },
    {
      header: 'Paid',
      accessor: (row) =>
        currencyMoney(row.paid_amount, currency, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      align: 'right',
    },
    {
      header: 'Outstanding',
      accessor: (row) =>
        currencyMoney(row.outstanding_amount, currency, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      align: 'right',
    },
    {
      header: 'Status',
      accessor: (row) => (
        <StatusBadge
          status={row.is_paid ? 'active' : 'pending'}
          label={row.is_paid ? 'Paid' : 'Pending'}
        />
      ),
    },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="3xl"
      title="Loan statement"
      description="Review your loan summary, repayments, and schedule in one place."
      footer={
        <Button
          type="button"
          className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
          onClick={onClose}
        >
          Close
        </Button>
      }
    >
      <div className="grid gap-4">
        {availableLoans.length > 1 ? (
          <Card className="grid gap-3 border-slate-200 bg-slate-50/80">
            <CardTitle>Choose a loan</CardTitle>
            <Field label="Loan">
              <select
                className={formSelectClassName}
                value={activeLoanId}
                onChange={(event) => setSelectedLoanId(event.target.value)}
              >
                {availableLoans.map((candidate) => (
                  <option key={candidate.id} value={String(candidate.id)}>
                    {candidate.product_name || 'Loan'} -{' '}
                    {currencyMoney(candidate.amount, currency, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </option>
                ))}
              </select>
            </Field>
          </Card>
        ) : null}

        {error && data ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            The loan statement could not be refreshed.
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
            title="Could not load your loan statement"
            description={error}
            actionLabel="Retry"
            onAction={() => {
              void reload();
            }}
          />
        ) : !loan && !isLoading ? (
          <StateView
            title="No loan statement yet"
            description="Your statement will appear here after a loan is approved, disbursed, or starts receiving repayments."
          />
        ) : (
          <>
            <Card className="grid gap-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>{loan?.product_name || 'Loan summary'}</CardTitle>
                  <p className="mt-2 text-sm text-slate-500">
                    {loan?.product_code || 'Loan product'}
                  </p>
                </div>
                {loan ? <StatusBadge status={loan.status} /> : null}
              </div>

              <LoanStatusStepper
                className={isLoading ? 'opacity-80' : undefined}
                loan={loan}
                title="Loan lifecycle"
              />

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <LoanStatementMetric
                  label="Loan amount"
                  value={currencyMoney(loan?.amount, currency, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  helper={`${loan?.term_months ?? 0} months`}
                />
                <LoanStatementMetric
                  label="Interest"
                  value={`${loan?.annual_interest_rate ?? 0}%`}
                  helper={loan?.repayment_frequency || 'No frequency'}
                />
                <LoanStatementMetric
                  label="Disbursement date"
                  value={formatDate(loan?.disbursed_at)}
                  helper={loan?.disbursement_method || 'Awaiting disbursement'}
                />
                <LoanStatementMetric
                  label="Outstanding balance"
                  value={currencyMoney(
                    balances?.outstanding_balance,
                    currency,
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    },
                  )}
                  helper={`Principal ${currencyMoney(
                    balances?.principal_balance,
                    currency,
                    { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                  )}`}
                />
                <LoanStatementMetric
                  label="Interest balance"
                  value={currencyMoney(balances?.interest_balance, currency, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  helper={`Total repaid ${currencyMoney(
                    balances?.total_repaid,
                    currency,
                    { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                  )}`}
                />
                <LoanStatementMetric
                  label="Next due date"
                  value={formatDate(loan?.next_due_date)}
                  helper={loan?.purpose || 'No purpose provided'}
                />
              </div>
            </Card>

            <Card className="grid gap-4">
              <CardTitle>Repayments</CardTitle>
              <DataTable<SelfServiceLoanStatementRepayment>
                data={repayments}
                columns={repaymentColumns}
                loading={isLoading}
                emptyTitle="No repayments recorded"
                emptyMessage="Repayments will appear here after branch staff post them."
                renderMobileCard={(row) => (
                  <article className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-slate-900">
                          {row.reference || row.id}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {formatDate(row.date)}
                        </p>
                      </div>
                      <p className="font-semibold text-slate-900">
                        {currencyMoney(row.amount, currency, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <LoanStatementCell
                        label="Principal"
                        value={currencyMoney(row.principal, currency, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      />
                      <LoanStatementCell
                        label="Interest"
                        value={currencyMoney(row.interest, currency, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      />
                      <LoanStatementCell
                        label="Penalty"
                        value={currencyMoney(row.penalty, currency, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      />
                      <LoanStatementCell
                        label="Remaining balance"
                        value={currencyMoney(row.remaining_balance, currency, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      />
                    </div>
                  </article>
                )}
              />
            </Card>

            <Card className="grid gap-4">
              <CardTitle>Repayment schedule</CardTitle>
              <DataTable<RepaymentScheduleRow>
                data={schedule}
                columns={scheduleColumns}
                loading={isLoading}
                emptyTitle="No repayment schedule available"
                emptyMessage="The repayment schedule will appear here after the loan is fully prepared for repayment tracking."
              />
            </Card>
          </>
        )}
      </div>
    </Modal>
  );
}

function LoanStatementMetric({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 font-semibold text-slate-900">{value}</p>
      {helper ? <p className="mt-1 text-sm text-slate-500">{helper}</p> : null}
    </div>
  );
}

function LoanStatementCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 font-semibold text-slate-900">{value}</p>
    </div>
  );
}
