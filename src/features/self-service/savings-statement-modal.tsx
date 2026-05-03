'use client';

import { useCallback, useMemo, useState } from 'react';
import { Download, FileText, RotateCcw, X } from 'lucide-react';
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

function safeFileName(value: unknown) {
  return (
    String(value ?? 'savings-statement')
      .trim()
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'savings-statement'
  );
}

function escapeCsvValue(value: unknown) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function downloadBlob(content: BlobPart, type: string, filename: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

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
  const transactions = useMemo(() => data?.transactions ?? [], [data?.transactions]);

  const statementFileName = safeFileName(
    `${data?.member_number || data?.client_name || 'member'}-savings-statement`,
  );

  const columns: Column<SelfServiceSavingsStatementEntry>[] = [
    {
      header: 'Date',
      accessor: (row) => <span className="whitespace-nowrap">{formatDate(row.date)}</span>,
    },
    {
      header: 'Reference',
      accessor: (row) => (
        <div className="min-w-[150px]">
          <p className="break-words font-bold text-slate-900">{row.reference ?? row.id}</p>
          <p className="text-xs text-slate-500">
            {row.account_number || 'Savings statement entry'}
          </p>
        </div>
      ),
    },
    {
      header: 'Type',
      accessor: (row) => (
        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold capitalize text-slate-700">
          {statusLabel(row.transaction_type_label ?? row.transaction_type)}
        </span>
      ),
    },
    {
      header: 'Amount',
      accessor: (row) => (
        <span className="whitespace-nowrap text-sm font-bold tabular-nums">
          {currencyMoney(row.amount, currency, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      ),
      align: 'right',
    },
    {
      header: 'Running balance',
      accessor: (row) => (
        <span className="whitespace-nowrap text-sm font-bold tabular-nums text-[#127D61]">
          {currencyMoney(row.balance, currency, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      ),
      align: 'right',
    },
  ];

  function buildStatementRows() {
    return transactions.map((row) => [
      formatDate(row.date),
      row.account_number || '',
      row.reference ?? row.id,
      statusLabel(row.transaction_type_label ?? row.transaction_type),
      currencyMoney(row.amount, currency, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      currencyMoney(row.balance, currency, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    ]);
  }

  function handleDownloadExcel() {
    const rows = [
      ['Client', data?.client_name || 'Member'],
      ['Member number', data?.member_number || ''],
      ['Currency', currency],
      ['Total balance', currencyMoney(data?.total_balance, currency, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })],
      ['Date from', dateFrom || 'All'],
      ['Date to', dateTo || 'All'],
      [],
      ['Date', 'Account', 'Reference', 'Type', 'Amount', 'Running balance'],
      ...buildStatementRows(),
    ];

    const csv = rows.map((row) => row.map(escapeCsvValue).join(',')).join('\n');
    downloadBlob(csv, 'text/csv;charset=utf-8;', `${statementFileName}.csv`);
  }

  function buildPdfHtml() {
    const generatedAt = new Date().toLocaleString();
    const rows = buildStatementRows();
    const rowsHtml = rows.length
      ? rows
          .map(
            (row, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${escapeHtml(row[0])}</td>
                <td>${escapeHtml(row[1])}</td>
                <td>${escapeHtml(row[2])}</td>
                <td>${escapeHtml(row[3])}</td>
                <td class="num">${escapeHtml(row[4])}</td>
                <td class="num">${escapeHtml(row[5])}</td>
              </tr>
            `,
          )
          .join('')
      : '<tr><td colspan="7" class="empty">No savings activity found for the selected period.</td></tr>';

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Savings Statement - ${escapeHtml(data?.member_number || data?.client_name || 'Member')}</title>
  <style>
    @page { size: A4; margin: 16mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #0f172a; background: #fff; }
    .header { border-bottom: 3px solid #0f766e; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; gap: 20px; }
    h1 { margin: 0; font-size: 20px; color: #0f766e; letter-spacing: .05em; }
    .muted { color: #64748b; font-size: 11px; line-height: 1.5; }
    .title { font-size: 16px; font-weight: 800; text-transform: uppercase; margin: 0 0 4px; }
    .meta { text-align: right; }
    .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; }
    .card { border: 1px solid #cbd5e1; border-radius: 10px; padding: 9px; min-height: 58px; }
    .label { font-size: 9px; color: #64748b; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; }
    .value { margin-top: 4px; font-size: 12px; font-weight: 700; overflow-wrap: anywhere; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th { background: #0f766e; color: white; text-align: left; padding: 7px 6px; border: 1px solid #0f766e; }
    td { padding: 7px 6px; border: 1px solid #cbd5e1; vertical-align: top; }
    tbody tr:nth-child(even) td { background: #f8fafc; }
    .num { text-align: right; white-space: nowrap; }
    .empty { text-align: center; color: #64748b; padding: 18px; }
    .footer { margin-top: 28px; border-top: 1px solid #cbd5e1; padding-top: 10px; display: flex; justify-content: space-between; gap: 20px; font-size: 10px; color: #64748b; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <header class="header">
    <div>
      <p class="title">Savings Account Statement</p>
      <p class="muted">Client: ${escapeHtml(data?.client_name || 'Member')}</p>
      <p class="muted">Member number: ${escapeHtml(data?.member_number || '-')}</p>
    </div>
    <div class="meta">
      <h1>STATEMENT</h1>
      <p class="muted">Generated: ${escapeHtml(generatedAt)}</p>
      <p class="muted">Period: ${escapeHtml(dateFrom || 'Start')} to ${escapeHtml(dateTo || 'Today')}</p>
    </div>
  </header>

  <section class="cards">
    <div class="card"><div class="label">Total balance</div><div class="value">${escapeHtml(currencyMoney(data?.total_balance, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}</div></div>
    <div class="card"><div class="label">Currency</div><div class="value">${escapeHtml(currency)}</div></div>
    <div class="card"><div class="label">Transactions</div><div class="value">${transactions.length}</div></div>
    <div class="card"><div class="label">Status</div><div class="value">Posted entries</div></div>
  </section>

  <table>
    <thead>
      <tr>
        <th style="width: 34px;">#</th>
        <th>Date</th>
        <th>Account</th>
        <th>Reference</th>
        <th>Type</th>
        <th class="num">Amount</th>
        <th class="num">Running balance</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>

  <footer class="footer">
    <span>This statement is system generated from posted savings transactions.</span>
    <span>Self-service savings portal</span>
  </footer>
</body>
</html>`;
  }

  function handleDownloadPdf() {
    const printWindow = window.open('', '_blank', 'width=1100,height=800');
    if (!printWindow) return;

    printWindow.document.open();
    printWindow.document.write(buildPdfHtml());
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 400);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="3xl"
      title="Savings statement"
      description="Review deposits and withdrawals on your savings account."
      footer={
        <div className="flex w-full flex-wrap justify-between gap-3">
          <Button
            type="button"
            className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
            onClick={() => {
              setDateFrom('');
              setDateTo('');
            }}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Clear dates
          </Button>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
              onClick={handleDownloadPdf}
              disabled={!data}
            >
              <FileText className="mr-2 h-4 w-4" />
              PDF
            </Button>

            <Button type="button" onClick={handleDownloadExcel} disabled={!data}>
              <Download className="mr-2 h-4 w-4" />
              Excel
            </Button>

            <Button
              type="button"
              className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
              onClick={onClose}
            >
              <X className="mr-2 h-4 w-4" />
              Close
            </Button>
          </div>
        </div>
      }
    >
      <div className="grid gap-4">
        <Card className="grid gap-4 border-slate-200 bg-slate-50/80 p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Total balance
              </p>
              <p className="mt-1 truncate text-base font-bold text-[#127D61] tabular-nums">
                {currencyMoney(data?.total_balance, currency, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>

            <div className="min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Member
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                {data?.client_name || 'Member'}
              </p>
              <p className="truncate text-xs text-slate-500">
                {data?.member_number || 'No member number'}
              </p>
            </div>

            <div className="min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Transactions
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {transactions.length}
              </p>
              <p className="text-xs text-slate-500">{currency}</p>
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
            <div className="min-w-0 overflow-x-auto">
              <DataTable<SelfServiceSavingsStatementEntry>
                data={transactions}
                columns={columns}
                loading={isLoading}
                emptyTitle="No savings activity found"
                emptyMessage="Try a different date range or wait for the next branch-posted savings transaction."
                renderMobileCard={(row) => (
                  <article className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words font-bold text-slate-900">
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
                      <div className="min-w-0 rounded-2xl border border-slate-200 bg-white px-3 py-2">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                          Amount
                        </p>
                        <p className="mt-1 truncate text-sm font-semibold text-slate-900 tabular-nums">
                          {currencyMoney(row.amount, currency, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>

                      <div className="min-w-0 rounded-2xl border border-slate-200 bg-white px-3 py-2">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                          Running balance
                        </p>
                        <p className="mt-1 truncate text-sm font-semibold text-[#127D61] tabular-nums">
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
          </div>
        )}
      </div>
    </Modal>
  );
}
