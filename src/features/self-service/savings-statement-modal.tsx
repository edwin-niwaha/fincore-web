'use client';

import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import type { Column } from '@/components/ui/data-table';
import { DataTable } from '@/components/ui/data-table';
import { Field, Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { StateView } from '@/components/ui/state-view';
import { formatDate, statusLabel } from '@/features/admin/shared';
import { useApiResource } from '@/hooks/use-api-resource';
import { currencyMoney } from '@/lib/api/format';
import { selfServiceApi } from '@/lib/api/services';
import type {
  SelfServiceSavingsStatement,
  SelfServiceSavingsStatementEntry,
} from '@/types/api';

export function SelfServiceSavingsStatementModal({
  open,
  onClose,
  defaultCurrency = 'UGX',
}: {
  open: boolean;
  onClose: () => void;
  defaultCurrency?: string;
}) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadStatement = useCallback(
    () =>
      selfServiceApi.savings.statement({
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      }),
    [dateFrom, dateTo],
  );

  const { data, error, isLoading, reload } =
    useApiResource<SelfServiceSavingsStatement>(loadStatement);

  const currency = data?.currency || defaultCurrency;
  const transactions = data?.transactions ?? [];
  const columns: Column<SelfServiceSavingsStatementEntry>[] = [
    {
      header: 'Date',
      accessor: (row) => formatDate(row.date),
    },
    {
      header: 'Reference',
      accessor: (row) => (
        <div>
          <p className="font-bold text-slate-900">{row.reference ?? row.id}</p>
          <p className="text-xs text-slate-500">
            {row.account_number || 'Savings statement entry'}
          </p>
        </div>
      ),
    },
    {
      header: 'Type',
      accessor: (row) => statusLabel(row.transaction_type_label ?? row.transaction_type),
    },
    {
      header: 'Amount',
      accessor: (row) => currencyMoney(row.amount, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      align: 'right',
    },
    {
      header: 'Running balance',
      accessor: (row) =>
        currencyMoney(row.balance, currency, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      align: 'right',
    },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="3xl"
      title="Savings statement"
      description="Review deposits and withdrawals on your savings account."
      footer={
        <div className="flex w-full justify-between gap-3">
          <Button
            type="button"
            className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
            onClick={() => {
              setDateFrom('');
              setDateTo('');
            }}
          >
            Clear dates
          </Button>
          <Button
            type="button"
            className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      }
    >
      <div className="grid gap-4">
        <Card className="grid gap-4 border-slate-200 bg-slate-50/80">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Total balance
              </p>
              <p className="mt-2 text-2xl font-black text-[#127D61]">
                {currencyMoney(data?.total_balance, currency, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Member
              </p>
              <p className="mt-2 font-semibold text-slate-900">
                {data?.client_name || 'Member'}
              </p>
              <p className="text-sm text-slate-500">
                {data?.member_number || 'No member number'}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Transactions
              </p>
              <p className="mt-2 font-semibold text-slate-900">
                {transactions.length}
              </p>
              <p className="text-sm text-slate-500">{currency}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="From">
              <Input
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
              />
            </Field>

            <Field label="To">
              <Input
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
              />
            </Field>
          </div>
        </Card>

        {error && data ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            The statement could not be refreshed.
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
            title="Could not load your savings statement"
            description={error}
            actionLabel="Retry"
            onAction={() => {
              void reload();
            }}
          />
        ) : (
          <div className="grid gap-3">
            <CardTitle>Statement activity</CardTitle>
            <DataTable<SelfServiceSavingsStatementEntry>
              data={transactions}
              columns={columns}
              loading={isLoading}
              emptyTitle="No savings activity found"
              emptyMessage="Try a different date range or wait for the next branch-posted savings transaction."
              renderMobileCard={(row) => (
                <article className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-900">
                        {row.reference ?? row.id}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {formatDate(row.date)}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-700">
                      {statusLabel(row.transaction_type_label ?? row.transaction_type)}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                        Amount
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {currencyMoney(row.amount, currency, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                        Running balance
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {currencyMoney(row.balance, currency, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  </div>
                </article>
              )}
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
