import { sourceLabel } from '@/features/accounting/shared';
import type {
  JournalEntry,
  JournalEntryLine,
  LedgerAccount,
  TrialBalanceReport,
} from '@/types/api';

export type GeneralLedgerRow = {
  id: string;
  date: string;
  reference: string;
  description: string;
  source: string;
  branchName: string;
  counterpart: string;
  debit: number;
  credit: number;
  runningBalance: number;
};

export type BalanceSheetRow = {
  id: string;
  code: string;
  name: string;
  amount: number;
};

export type BalanceSheetData = {
  assets: BalanceSheetRow[];
  liabilities: BalanceSheetRow[];
  equity: BalanceSheetRow[];
  retainedEarnings: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  totalLiabilitiesAndEquity: number;
  difference: number;
  isBalanced: boolean;
};

export type CashflowGroupRow = {
  id: string;
  label: string;
  amount: number;
  transactionCount: number;
};

export type CashAccountBalance = {
  id: string;
  label: string;
  openingBalance: number;
  closingBalance: number;
};

export type CashflowReportData = {
  cashAccounts: CashAccountBalance[];
  openingBalance: number;
  totalInflows: number;
  totalOutflows: number;
  netCashflow: number;
  closingBalance: number;
  inflows: CashflowGroupRow[];
  outflows: CashflowGroupRow[];
};

type ReportFilters = {
  institutionId?: string;
  branchId?: string;
  startDate?: string;
  endDate?: string;
  asOf?: string;
};

type AccountLine = JournalEntryLine & {
  account_code?: string;
  account_name?: string;
};

function toAmount(value?: string | number | null) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function accountNormalBalance(account?: LedgerAccount | null) {
  if (account?.normal_balance) {
    return account.normal_balance;
  }

  if (account?.type === 'liability' || account?.type === 'equity' || account?.type === 'income') {
    return 'credit';
  }

  return 'debit';
}

function dateOnly(value?: string | null) {
  if (!value) return '';
  return value.slice(0, 10);
}

function isWithinDateRange(value: string, startDate?: string, endDate?: string) {
  if (!value) return false;
  if (startDate && value < startDate) return false;
  if (endDate && value > endDate) return false;
  return true;
}

function compareEntryDates(a: JournalEntry, b: JournalEntry) {
  const dateA = dateOnly(a.entry_date || a.created_at);
  const dateB = dateOnly(b.entry_date || b.created_at);
  return (
    dateA.localeCompare(dateB) ||
    String(a.reference ?? '').localeCompare(String(b.reference ?? ''))
  );
}

function lineNetForAccount(line: AccountLine, account?: LedgerAccount | null) {
  const debit = toAmount(line.debit);
  const credit = toAmount(line.credit);
  return accountNormalBalance(account) === 'credit' ? credit - debit : debit - credit;
}

function entryDate(entry: JournalEntry) {
  return dateOnly(entry.entry_date || entry.created_at);
}

function lineAccountId(line: JournalEntryLine) {
  return String(line.account);
}

function accountLabel(account?: Partial<LedgerAccount> | null) {
  if (!account) return 'Unmapped account';
  return account.code ? `${account.code} - ${account.name}` : account.name || 'Account';
}

export function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

export function startOfMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

export function filterPostedEntries(entries: JournalEntry[], filters: ReportFilters) {
  return entries
    .filter((entry) => entry.status === 'posted')
    .filter((entry) =>
      filters.institutionId ? String(entry.institution ?? '') === filters.institutionId : true,
    )
    .filter((entry) =>
      filters.branchId ? String(entry.branch ?? '') === filters.branchId : true,
    )
    .filter((entry) => {
      const date = entryDate(entry);
      if (filters.asOf) {
        return date ? date <= filters.asOf : false;
      }
      return isWithinDateRange(date, filters.startDate, filters.endDate);
    })
    .sort(compareEntryDates);
}

export function buildBalanceSheetData(report?: TrialBalanceReport | null): BalanceSheetData {
  const rows = report?.rows ?? [];
  const assets = rows
    .filter((row) => row.type === 'asset')
    .map((row) => ({
      id: row.code,
      code: row.code,
      name: row.name,
      amount: toAmount(row.balance),
    }));
  const liabilities = rows
    .filter((row) => row.type === 'liability')
    .map((row) => ({
      id: row.code,
      code: row.code,
      name: row.name,
      amount: toAmount(row.balance),
    }));
  const baseEquityRows = rows
    .filter((row) => row.type === 'equity')
    .map((row) => ({
      id: row.code,
      code: row.code,
      name: row.name,
      amount: toAmount(row.balance),
    }));

  const incomeTotal = rows
    .filter((row) => row.type === 'income')
    .reduce((sum, row) => sum + toAmount(row.balance), 0);
  const expenseTotal = rows
    .filter((row) => row.type === 'expense')
    .reduce((sum, row) => sum + toAmount(row.balance), 0);
  const retainedEarnings = incomeTotal - expenseTotal;

  const equity = [...baseEquityRows];
  if (retainedEarnings !== 0) {
    equity.push({
      id: 'retained-earnings',
      code: 'YTD',
      name: 'Current period earnings',
      amount: retainedEarnings,
    });
  }

  const totalAssets = assets.reduce((sum, row) => sum + row.amount, 0);
  const totalLiabilities = liabilities.reduce((sum, row) => sum + row.amount, 0);
  const totalEquity = equity.reduce((sum, row) => sum + row.amount, 0);
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
  const difference = totalAssets - totalLiabilitiesAndEquity;

  return {
    assets,
    liabilities,
    equity,
    retainedEarnings,
    totalAssets,
    totalLiabilities,
    totalEquity,
    totalLiabilitiesAndEquity,
    difference,
    isBalanced: Math.abs(difference) < 0.005,
  };
}

export function identifyCashAccounts(accounts: LedgerAccount[]) {
  return accounts.filter((account) => {
    const name = `${account.code} ${account.name} ${account.description ?? ''}`.toLowerCase();
    return (
      account.system_code === 'cash_on_hand' ||
      (account.type === 'asset' && /(cash|bank|teller)/.test(name))
    );
  });
}

function groupByLabel(rows: Array<{ label: string; amount: number }>) {
  const map = new Map<string, CashflowGroupRow>();

  rows.forEach((row) => {
    const current = map.get(row.label);
    if (current) {
      current.amount += row.amount;
      current.transactionCount += 1;
      return;
    }

    map.set(row.label, {
      id: row.label,
      label: row.label,
      amount: row.amount,
      transactionCount: 1,
    });
  });

  return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
}

function counterpartSummary(
  entry: JournalEntry,
  excludedAccountIds: Set<string>,
  direction: 'inflow' | 'outflow',
  fallbackAmount: number,
) {
  const candidates = (entry.lines ?? [])
    .filter((line) => !excludedAccountIds.has(lineAccountId(line)))
    .map((line) => {
      const debit = toAmount(line.debit);
      const credit = toAmount(line.credit);
      const amount =
        direction === 'inflow'
          ? credit > 0
            ? credit
            : Math.max(debit, credit)
          : debit > 0
            ? debit
            : Math.max(debit, credit);

      return {
        label:
          line.account_code && line.account_name
            ? `${line.account_code} - ${line.account_name}`
            : line.account_name || sourceLabel(entry.source),
        amount,
      };
    })
    .filter((row) => row.amount > 0);

  if (!candidates.length) {
    return [{ label: sourceLabel(entry.source), amount: fallbackAmount }];
  }

  return candidates;
}

export function buildCashflowData(
  accounts: LedgerAccount[],
  entries: JournalEntry[],
  filters: ReportFilters,
): CashflowReportData {
  const cashAccounts = identifyCashAccounts(accounts);
  const cashAccountIds = new Set(cashAccounts.map((account) => String(account.id)));
  const accountMap = new Map(cashAccounts.map((account) => [String(account.id), account]));

  const scopedEntries = entries
    .filter((entry) => entry.status === 'posted')
    .filter((entry) =>
      filters.institutionId ? String(entry.institution ?? '') === filters.institutionId : true,
    )
    .filter((entry) =>
      filters.branchId ? String(entry.branch ?? '') === filters.branchId : true,
    )
    .sort(compareEntryDates);

  const openingCutoff = filters.startDate;
  const openingEntries = openingCutoff
    ? scopedEntries.filter((entry) => {
        const date = entryDate(entry);
        return date ? date < openingCutoff : false;
      })
    : [];

  const periodEntries = scopedEntries.filter((entry) =>
    isWithinDateRange(entryDate(entry), filters.startDate, filters.endDate),
  );

  const openingByAccount = new Map<string, number>();
  const closingByAccount = new Map<string, number>();

  cashAccounts.forEach((account) => {
    openingByAccount.set(String(account.id), 0);
    closingByAccount.set(String(account.id), 0);
  });

  openingEntries.forEach((entry) => {
    (entry.lines ?? []).forEach((line) => {
      const accountId = lineAccountId(line);
      if (!cashAccountIds.has(accountId)) return;
      const account = accountMap.get(accountId);
      openingByAccount.set(
        accountId,
        (openingByAccount.get(accountId) ?? 0) + lineNetForAccount(line, account),
      );
    });
  });

  const inflowRows: Array<{ label: string; amount: number }> = [];
  const outflowRows: Array<{ label: string; amount: number }> = [];

  periodEntries.forEach((entry) => {
    const cashLines = (entry.lines ?? []).filter((line) => cashAccountIds.has(lineAccountId(line)));
    if (!cashLines.length) return;

    const entryDelta = cashLines.reduce((sum, line) => {
      const account = accountMap.get(lineAccountId(line));
      return sum + lineNetForAccount(line, account);
    }, 0);

    cashLines.forEach((line) => {
      const accountId = lineAccountId(line);
      const account = accountMap.get(accountId);
      closingByAccount.set(
        accountId,
        (closingByAccount.get(accountId) ?? openingByAccount.get(accountId) ?? 0) +
          lineNetForAccount(line, account),
      );
    });

    if (entryDelta === 0) return;

    const counterpartRows = counterpartSummary(
      entry,
      new Set(cashLines.map((line) => lineAccountId(line))),
      entryDelta > 0 ? 'inflow' : 'outflow',
      Math.abs(entryDelta),
    );

    counterpartRows.forEach((row) => {
      if (entryDelta > 0) {
        inflowRows.push(row);
      } else {
        outflowRows.push(row);
      }
    });
  });

  const openingBalance = Array.from(openingByAccount.values()).reduce(
    (sum, amount) => sum + amount,
    0,
  );
  const groupedInflows = groupByLabel(inflowRows);
  const groupedOutflows = groupByLabel(outflowRows);
  const totalInflows = groupedInflows.reduce((sum, row) => sum + row.amount, 0);
  const totalOutflows = groupedOutflows.reduce((sum, row) => sum + row.amount, 0);
  const netCashflow = totalInflows - totalOutflows;
  const closingBalance = openingBalance + netCashflow;

  const cashAccountBalances = cashAccounts.map((account) => {
    const id = String(account.id);
    return {
      id,
      label: accountLabel(account),
      openingBalance: openingByAccount.get(id) ?? 0,
      closingBalance:
        (openingByAccount.get(id) ?? 0) +
        periodEntries.reduce((sum, entry) => {
          return (
            sum +
            (entry.lines ?? [])
              .filter((line) => lineAccountId(line) === id)
              .reduce(
                (lineSum, line) => lineSum + lineNetForAccount(line, account),
                0,
              )
          );
        }, 0),
    };
  });

  return {
    cashAccounts: cashAccountBalances,
    openingBalance,
    totalInflows,
    totalOutflows,
    netCashflow,
    closingBalance,
    inflows: groupedInflows,
    outflows: groupedOutflows,
  };
}

export function buildGeneralLedgerData(
  account: LedgerAccount | null,
  entries: JournalEntry[],
  filters: ReportFilters,
) {
  if (!account) {
    return {
      rows: [] as GeneralLedgerRow[],
      openingBalance: 0,
      totalDebits: 0,
      totalCredits: 0,
      closingBalance: 0,
    };
  }

  const scopedEntries = entries
    .filter((entry) => entry.status === 'posted')
    .filter((entry) =>
      filters.institutionId ? String(entry.institution ?? '') === filters.institutionId : true,
    )
    .filter((entry) =>
      filters.branchId ? String(entry.branch ?? '') === filters.branchId : true,
    )
    .sort(compareEntryDates);

  const openingBalance = scopedEntries
    .filter((entry) => {
      const date = entryDate(entry);
      return filters.startDate ? Boolean(date && date < filters.startDate) : false;
    })
    .flatMap((entry) => entry.lines ?? [])
    .filter((line) => lineAccountId(line) === String(account.id))
    .reduce((sum, line) => sum + lineNetForAccount(line, account), 0);

  let runningBalance = openingBalance;
  let totalDebits = 0;
  let totalCredits = 0;

  const rows = scopedEntries
    .filter((entry) => isWithinDateRange(entryDate(entry), filters.startDate, filters.endDate))
    .flatMap((entry) => {
      return (entry.lines ?? [])
        .filter((line) => lineAccountId(line) === String(account.id))
        .map((line, index) => {
          const debit = toAmount(line.debit);
          const credit = toAmount(line.credit);
          totalDebits += debit;
          totalCredits += credit;
          runningBalance += lineNetForAccount(line, account);

          const counterpart = (entry.lines ?? [])
            .filter((candidate) => lineAccountId(candidate) !== String(account.id))
            .map((candidate) =>
              candidate.account_code && candidate.account_name
                ? `${candidate.account_code} - ${candidate.account_name}`
                : candidate.account_name || sourceLabel(entry.source),
            )
            .join(', ');

          return {
            id: `${entry.id}-${index}`,
            date: entryDate(entry),
            reference: entry.reference,
            description: entry.description || sourceLabel(entry.source),
            source: sourceLabel(entry.source),
            branchName: entry.branch_name || entry.institution_name || '-',
            counterpart: counterpart || 'Balancing line',
            debit,
            credit,
            runningBalance,
          };
        });
    });

  return {
    rows,
    openingBalance,
    totalDebits,
    totalCredits,
    closingBalance: runningBalance,
  };
}
