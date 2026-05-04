"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Download,
  Eye,
  FileText,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import { RecordsListPanel } from "@/components/records/records-list-panel";
import { RecordsPageLayout } from "@/components/records/records-page-layout";
import { RecordsPagination } from "@/components/records/records-pagination";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import type { Column } from "@/components/ui/data-table";
import { DataTable } from "@/components/ui/data-table";
import { Field, Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { StateView } from "@/components/ui/state-view";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  formSelectClassName,
  formatDate,
  statusLabel,
} from "@/features/admin/shared";
import { useAuth } from "@/features/auth/auth-provider";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useApiResource } from "@/hooks/use-api-resource";
import {
  clientName,
  isPaginatedResponse,
  listCount,
  money,
  unwrapList,
} from "@/lib/api/format";
import { clientsApi, savingsApi, institutionsApi } from "@/lib/api/services";
import type {
  ApiProblem,
  Client,
  SavingsAccount,
  SavingsTransaction,
} from "@/types/api";
import type { Role } from "@/types/roles";

type SavingsAccountFormState = {
  client: string;
  status: string;
};

type SavingsOperationFormState = {
  amount: string;
  reference: string;
  transaction_date: string;
  notes: string;
};

type SavingsOperationMode = "deposit" | "withdrawal" | null;

type SavingsTransactionWithDate = SavingsTransaction & {
  transaction_date?: string | null;
};

const cashRoles: Role[] = [
  "super_admin",
  "institution_admin",
  "branch_manager",
  "accountant",
  "teller",
];

const savingsStatusOptions = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "pending", label: "Pending" },
  { value: "closed", label: "Closed" },
] as const;

const transactionTypeOptions = [
  { value: "all", label: "All transaction types" },
  { value: "deposit", label: "Deposits" },
  { value: "withdrawal", label: "Withdrawals" },
  { value: "withdrawal_charge", label: "Withdrawal charges" },
] as const;

const transactionDateOptions = [
  { value: "all", label: "All dates" },
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
] as const;

function todayDateInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function canProcessCashTransaction(account: SavingsAccount | null | undefined) {
  return account?.status === "active";
}

function createEmptyAccountForm(): SavingsAccountFormState {
  return {
    client: "",
    status: "active",
  };
}

function createEmptyOperationForm(): SavingsOperationFormState {
  return {
    amount: "",
    reference: "",
    transaction_date: todayDateInputValue(),
    notes: "",
  };
}

function flattenErrorList(value: unknown): string | null {
  if (Array.isArray(value)) return value.map(String).join(" ");
  if (typeof value === "string") return value;
  return null;
}

function getProblemMessage(
  error: unknown,
  fallback = "Unable to save savings changes.",
) {
  const problem = error as ApiProblem;
  if (problem?.message) return problem.message;

  if (problem?.errors && typeof problem.errors === "object") {
    const first = Object.values(problem.errors)
      .map(flattenErrorList)
      .find(Boolean);
    if (first) return first;
  }

  return fallback;
}

function buildDateFilter(dateFilter: string) {
  if (dateFilter === "all") return {};

  const today = new Date();
  const start = new Date(today);

  if (dateFilter === "7d") {
    start.setDate(today.getDate() - 6);
  } else if (dateFilter === "30d") {
    start.setDate(today.getDate() - 29);
  }

  const yyyy = start.getFullYear();
  const mm = String(start.getMonth() + 1).padStart(2, "0");
  const dd = String(start.getDate()).padStart(2, "0");

  return {
    transaction_date__gte: `${yyyy}-${mm}-${dd}`,
  };
}

function operationLabel(mode: SavingsOperationMode) {
  return mode === "withdrawal" ? "Withdrawal" : "Deposit";
}

function operationSubmitLabel(mode: SavingsOperationMode) {
  return mode === "withdrawal" ? "Record withdrawal" : "Record deposit";
}

function clientOptionLabel(client: Client) {
  return `${client.full_name || clientName(client)} (${client.member_number || client.id})`;
}

function transactionBusinessDate(row: SavingsTransaction) {
  const transaction = row as SavingsTransactionWithDate;
  return transaction.transaction_date || row.created_at;
}

function transactionTypeBadge(transaction: SavingsTransaction) {
  const isDeposit = transaction.type === "deposit";

  return (
    <StatusBadge
      status={isDeposit ? "active" : "pending"}
      label={transaction.type_label || statusLabel(transaction.type)}
    />
  );
}

function MoneyInline({
  value,
  tone = "text-[#127D61]",
}: {
  value: unknown;
  tone?: string;
}) {
  const safeValue =
    typeof value === "number" || typeof value === "string"
      ? value
      : value == null
        ? value
        : 0;

  return (
    <div className="mt-1 flex items-end justify-between gap-2">
      <span className="text-xs font-bold text-slate-500">USh</span>
      <p
        className={`whitespace-nowrap text-right text-lg font-black tabular-nums ${tone}`}
      >
        {money(safeValue).replace("USh", "").trim()}
      </p>
    </div>
  );
}

function IconActionButton({
  title,
  onClick,
  children,
  tone = "text-slate-700 hover:bg-slate-100",
  disabled = false,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
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
        disabled ? "cursor-not-allowed text-slate-300" : tone
      }`}
    >
      {children}
    </button>
  );
}

function escapeCsvValue(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function statementFileSafeName(value: unknown) {
  return (
    String(value ?? "statement")
      .trim()
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "statement"
  );
}

export function SavingsManagementPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const actorRole = user?.role ?? null;
  const isClient = actorRole === "client";
  const canManageCash = Boolean(actorRole && cashRoles.includes(actorRole));
  const initialSearch = searchParams.get("search") ?? "";
  const initialSelectedAccountId = searchParams.get("account");

  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    initialSelectedAccountId,
  );

  const [transactionTypeFilter, setTransactionTypeFilter] = useState("all");
  const [transactionDateFilter, setTransactionDateFilter] = useState("all");
  const [transactionPage, setTransactionPage] = useState(1);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isStatementOpen, setIsStatementOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [accountForm, setAccountForm] = useState<SavingsAccountFormState>(
    createEmptyAccountForm,
  );
  const [accountFormError, setAccountFormError] = useState<string | null>(null);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  const [operationMode, setOperationMode] =
    useState<SavingsOperationMode>(null);
  const [operationAccountId, setOperationAccountId] = useState<string | null>(
    null,
  );
  const [operationForm, setOperationForm] = useState<SavingsOperationFormState>(
    createEmptyOperationForm,
  );
  const [operationError, setOperationError] = useState<string | null>(null);
  const [isSubmittingOperation, setIsSubmittingOperation] = useState(false);
  const [isPreparingStatement, setIsPreparingStatement] = useState(false);

  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const debouncedClientSearch = useDebouncedValue(clientSearch.trim(), 300);

  const loadAccounts = useCallback(
    () =>
      savingsApi.accounts.list({
        search: debouncedSearch || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
        page,
      }),
    [debouncedSearch, page, statusFilter],
  );

  const loadStatementProfile = useCallback(
    () => institutionsApi.statementProfile(),
    [],
  );

  const { data: statementProfileData } = useApiResource(loadStatementProfile);

  const companyStatementProfile = {
    logoUrl: statementProfileData?.logo_url?.trim() || "/images/logo.png",
    name: statementProfileData?.name?.trim() || "SACCO / COMPANY NAME",
    postalAddress: statementProfileData?.postal_address?.trim() || "",
    physicalAddress: statementProfileData?.physical_address?.trim() || "",
    phone: statementProfileData?.phone?.trim() || "",
    email: statementProfileData?.email?.trim() || "",
    website: statementProfileData?.website?.trim() || "",
    statementTitle:
      statementProfileData?.statement_title?.trim() ||
      "SAVINGS ACCOUNT STATEMENT",
  };

  const { data, error, isLoading, reload } = useApiResource(loadAccounts);
  const accounts = unwrapList(data);

  const selectedAccount =
    accounts.find((candidate) => String(candidate.id) === selectedAccountId) ??
    null;

  useEffect(() => {
    const nextSearch = searchParams.get("search") ?? "";
    const nextSelectedAccountId = searchParams.get("account");

    if (nextSearch !== search) {
      queueMicrotask(() => {
        setSearch(nextSearch);
        setPage(1);
      });
    }

    if (nextSelectedAccountId && nextSelectedAccountId !== selectedAccountId) {
      queueMicrotask(() => {
        setSelectedAccountId(nextSelectedAccountId);
      });
    }
  }, [search, searchParams, selectedAccountId]);

  useEffect(() => {
    if (!selectedAccountId) return;

    const stillVisible = accounts.some(
      (candidate) => String(candidate.id) === selectedAccountId,
    );

    if (!stillVisible) {
      queueMicrotask(() => {
        setSelectedAccountId((current) =>
          current === selectedAccountId ? null : current,
        );
        setTransactionPage(1);
        setIsStatementOpen(false);
      });
    }
  }, [accounts, selectedAccountId]);

  const activeAccountId = selectedAccount ? String(selectedAccount.id) : null;

  const loadTransactions = useCallback(() => {
    if (!activeAccountId) {
      return Promise.resolve([] as SavingsTransaction[]);
    }

    return savingsApi.accounts.transactions(activeAccountId, {
      page: transactionPage,
      type: transactionTypeFilter === "all" ? undefined : transactionTypeFilter,
      ...buildDateFilter(transactionDateFilter),
    });
  }, [
    activeAccountId,
    transactionDateFilter,
    transactionPage,
    transactionTypeFilter,
  ]);

  const {
    data: transactionsData,
    error: transactionsError,
    isLoading: transactionsLoading,
    reload: reloadTransactions,
  } = useApiResource(loadTransactions);

  const transactions = unwrapList(transactionsData);

  const loadClientOptions = useCallback(() => {
    if (!isCreateOpen) return Promise.resolve([] as Client[]);

    return clientsApi.list({
      search: debouncedClientSearch || undefined,
      status: "active",
      page_size: 50,
    });
  }, [debouncedClientSearch, isCreateOpen]);

  const {
    data: clientOptionsData,
    error: clientOptionsError,
    isLoading: clientOptionsLoading,
    reload: reloadClientOptions,
  } = useApiResource(loadClientOptions);

  const clientOptions = unwrapList(clientOptionsData);

  const selectedClient =
    clientOptions.find(
      (candidate) => String(candidate.id) === accountForm.client,
    ) ?? null;

  const pagination = isPaginatedResponse(data)
    ? {
        count: listCount(data),
        hasNext: Boolean(data.next),
        hasPrevious: Boolean(data.previous),
      }
    : null;

  const transactionPagination = isPaginatedResponse(transactionsData)
    ? {
        count: listCount(transactionsData),
        hasNext: Boolean(transactionsData.next),
        hasPrevious: Boolean(transactionsData.previous),
      }
    : null;

  const createAccountFormId = "create-savings-account-form";
  const operationFormId = "savings-operation-form";

  const totalBalance = accounts.reduce(
    (sum, account) => sum + Number(account.balance ?? 0),
    0,
  );

  const accountColumns: Column<SavingsAccount>[] = [
    {
      header: "Account",
      accessor: (account) => (
        <div className="min-w-[140px]">
          <p className="whitespace-nowrap font-bold text-slate-900">
            {account.account_number ?? account.account_no ?? account.id}
          </p>
          <p className="text-xs text-slate-500">
            {account.client_member_number
              ? `Member ${account.client_member_number}`
              : "Savings member account"}
          </p>
        </div>
      ),
    },
    {
      header: "Client",
      accessor: (account) => (
        <div className="min-w-[150px]">
          <p className="font-semibold text-slate-900">
            {account.client_name ?? clientName(account.client)}
          </p>
          <p className="text-xs text-slate-500">
            {account.client_phone || "No phone on file"}
          </p>
        </div>
      ),
    },
    {
      header: "Balance",
      accessor: (account) => (
        <span className="whitespace-nowrap text-right font-bold tabular-nums">
          {money(account.balance)}
        </span>
      ),
      align: "right",
    },
    {
      header: "Status",
      accessor: (account) => <StatusBadge status={account.status} />,
    },
    {
      header: "Activity",
      accessor: (account) => (
        <div className="min-w-[120px]">
          <p className="font-medium text-slate-800">
            {account.transaction_count ?? 0} transactions
          </p>
          <p className="text-xs text-slate-500">
            {formatDate(account.last_transaction_at || undefined)}
          </p>
        </div>
      ),
    },
    {
      header: "Actions",
      accessor: (account) => (
        <div className="flex items-center justify-end gap-1">
          <IconActionButton
            title="View statement"
            tone="text-emerald-700 hover:bg-emerald-50"
            onClick={() => openStatementModal(account)}
          >
            <Eye className="h-4 w-4" />
          </IconActionButton>

          {canManageCash ? (
            <>
              <IconActionButton
                title={
                  canProcessCashTransaction(account)
                    ? "Deposit"
                    : "Deposits are available only for active accounts"
                }
                tone="text-blue-700 hover:bg-blue-50"
                disabled={!canProcessCashTransaction(account)}
                onClick={() => openOperationModal(account, "deposit")}
              >
                <ArrowDownCircle className="h-4 w-4" />
              </IconActionButton>

              <IconActionButton
                title={
                  canProcessCashTransaction(account)
                    ? "Withdraw"
                    : "Withdrawals are available only for active accounts"
                }
                tone="text-rose-700 hover:bg-rose-50"
                disabled={!canProcessCashTransaction(account)}
                onClick={() => openOperationModal(account, "withdrawal")}
              >
                <ArrowUpCircle className="h-4 w-4" />
              </IconActionButton>
            </>
          ) : null}
        </div>
      ),
      align: "right",
    },
  ];

  const transactionColumns: Column<SavingsTransaction>[] = [
    {
      header: "Date",
      accessor: (row) => (
        <span className="whitespace-nowrap text-sm">
          {formatDate(transactionBusinessDate(row))}
        </span>
      ),
    },
    {
      header: "Reference",
      accessor: (row) => (
        <div className="min-w-[140px]">
          <p className="font-bold text-slate-900">{row.reference ?? row.id}</p>
          <p className="text-xs text-slate-500">
            {row.performed_by_email || "Recorded by system"}
          </p>
        </div>
      ),
    },
    {
      header: "Description",
      accessor: (row) => (
        <span className="text-sm text-slate-700">
          {row.notes || row.type_label || statusLabel(row.type)}
        </span>
      ),
    },
    {
      header: "Type",
      accessor: (row) => transactionTypeBadge(row),
    },
    {
      header: "Debit",
      accessor: (row) =>
        row.type === "withdrawal" || row.type === "withdrawal_charge" ? (
          <span className="whitespace-nowrap text-right font-bold tabular-nums text-rose-700">
            {money(row.amount)}
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        ),
      align: "right",
    },
    {
      header: "Credit",
      accessor: (row) =>
        row.type === "deposit" ? (
          <span className="whitespace-nowrap text-right font-bold tabular-nums text-emerald-700">
            {money(row.amount)}
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        ),
      align: "right",
    },
    {
      header: "Balance",
      accessor: (row) => (
        <span className="whitespace-nowrap text-right font-bold tabular-nums">
          {money(row.balance_after)}
        </span>
      ),
      align: "right",
    },
    {
      header: "Status",
      accessor: (row) => (
        <StatusBadge status={row.status || "posted"} label="Posted" />
      ),
    },
  ];

  const operationTargetAccount =
    accounts.find((candidate) => String(candidate.id) === operationAccountId) ??
    selectedAccount;

  const buildStatementQuery = useCallback(
    () => ({
      type: transactionTypeFilter === "all" ? undefined : transactionTypeFilter,
      ...buildDateFilter(transactionDateFilter),
    }),
    [transactionDateFilter, transactionTypeFilter],
  );

  function openCreateAccountModal() {
    setAccountForm(createEmptyAccountForm());
    setAccountFormError(null);
    setClientSearch("");
    setIsCreateOpen(true);
  }

  function closeCreateAccountModal() {
    setIsCreateOpen(false);
    setAccountForm(createEmptyAccountForm());
    setAccountFormError(null);
    setClientSearch("");
  }

  function closeOperationModal() {
    setOperationMode(null);
    setOperationAccountId(null);
    setOperationForm(createEmptyOperationForm());
    setOperationError(null);
  }

  function openStatementModal(account: SavingsAccount) {
    setSelectedAccountId(String(account.id));
    setTransactionPage(1);
    setIsStatementOpen(true);
  }

  function closeStatementModal() {
    setIsStatementOpen(false);
  }

  function openOperationModal(
    account: SavingsAccount,
    mode: Exclude<SavingsOperationMode, null>,
  ) {
    if (!canProcessCashTransaction(account)) {
      toast.error("Only active savings accounts can accept deposits or withdrawals.");
      return;
    }

    setSelectedAccountId(String(account.id));
    setTransactionPage(1);
    setOperationMode(mode);
    setOperationAccountId(String(account.id));
    setOperationForm(createEmptyOperationForm());
    setOperationError(null);
  }

  function buildStandardStatementHtml(
    statementTransactions: SavingsTransaction[],
  ) {
    if (!selectedAccount) return "";

    const generatedAt = new Date().toLocaleString();
    const accountNumber =
      selectedAccount.account_number ??
      selectedAccount.account_no ??
      selectedAccount.id;
    const client =
      selectedAccount.client_name ?? clientName(selectedAccount.client);
    const rows = statementRows(statementTransactions);

    const debitTotal = statementTransactions.reduce((sum, transaction) => {
      const isDebit =
        transaction.type === "withdrawal" ||
        transaction.type === "withdrawal_charge";
      return isDebit ? sum + Number(transaction.amount ?? 0) : sum;
    }, 0);

    const creditTotal = statementTransactions.reduce((sum, transaction) => {
      return transaction.type === "deposit"
        ? sum + Number(transaction.amount ?? 0)
        : sum;
    }, 0);

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
                <td class="num">${escapeHtml(row[4] || "-")}</td>
                <td class="num">${escapeHtml(row[5] || "-")}</td>
                <td class="num">${escapeHtml(row[6])}</td>
              </tr>
            `,
          )
          .join("")
      : `<tr><td colspan="8" class="empty">No statement entries found for the selected filters.</td></tr>`;

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(companyStatementProfile.statementTitle)} - ${escapeHtml(accountNumber)}</title>
  <style>
    @page { size: A4; margin: 16mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 0; background: #fff; }
    .statement { width: 100%; }
    .header { display: flex; align-items: center; justify-content: space-between; gap: 24px; border-bottom: 3px solid #0f766e; padding-bottom: 14px; margin-bottom: 16px; }
    .brand { display: flex; align-items: center; gap: 14px; min-width: 0; }
    .logo { width: 82px; height: 82px; object-fit: contain; border: 1px solid #cbd5e1; border-radius: 12px; padding: 6px; }
    .logo-fallback { width: 82px; height: 82px; border: 1px solid #cbd5e1; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: #64748b; text-align: center; padding: 8px; }
    h1 { margin: 0; font-size: 20px; letter-spacing: 0.04em; color: #0f766e; }
    .company-name { margin: 0 0 4px; font-size: 18px; font-weight: 800; text-transform: uppercase; }
    .company-details { margin: 2px 0; font-size: 11px; color: #475569; }
    .meta { text-align: right; font-size: 11px; color: #475569; line-height: 1.5; }
    .section-title { margin: 18px 0 8px; font-size: 12px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #334155; }
    .details { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; }
    .box { border: 1px solid #cbd5e1; border-radius: 10px; padding: 9px; min-height: 58px; }
    .label { font-size: 9px; font-weight: 800; letter-spacing: 0.08em; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
    .value { font-size: 12px; font-weight: 700; color: #0f172a; overflow-wrap: anywhere; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th { background: #0f766e; color: white; text-align: left; padding: 7px 6px; border: 1px solid #0f766e; }
    td { padding: 7px 6px; border: 1px solid #cbd5e1; vertical-align: top; }
    tbody tr:nth-child(even) td { background: #f8fafc; }
    .num { text-align: right; white-space: nowrap; }
    .empty { text-align: center; color: #64748b; padding: 18px; }
    .totals { display: flex; justify-content: flex-end; gap: 10px; margin-top: 12px; }
    .total-box { min-width: 160px; border: 1px solid #cbd5e1; border-radius: 10px; padding: 9px; }
    .footer { margin-top: 28px; border-top: 1px solid #cbd5e1; padding-top: 10px; display: flex; justify-content: space-between; gap: 20px; font-size: 10px; color: #64748b; }
    .signature { margin-top: 26px; font-size: 10px; color: #334155; }
    .signature-line { display: inline-block; min-width: 220px; border-top: 1px solid #334155; padding-top: 5px; }
    @media print { .no-print { display: none; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <main class="statement">
    <header class="header">
      <div class="brand">
        <img class="logo" src="${escapeHtml(companyStatementProfile.logoUrl)}" alt="Company logo" onerror="this.outerHTML='<div class=&quot;logo-fallback&quot;>LOGO</div>'" />
        <div>
          <p class="company-name">${escapeHtml(companyStatementProfile.name)}</p>
          <p class="company-details">${escapeHtml(companyStatementProfile.postalAddress)}</p>
          <p class="company-details">${escapeHtml(companyStatementProfile.physicalAddress)}</p>
          <p class="company-details">Tel: ${escapeHtml(companyStatementProfile.phone)} | Email: ${escapeHtml(companyStatementProfile.email)}</p>
          <p class="company-details">${escapeHtml(companyStatementProfile.website)}</p>
        </div>
      </div>
      <div class="meta">
        <h1>${escapeHtml(companyStatementProfile.statementTitle)}</h1>
        <div>Generated: ${escapeHtml(generatedAt)}</div>
        <div>Status: Posted transactions only</div>
      </div>
    </header>

    <div class="section-title">Account information</div>
    <section class="details">
      <div class="box"><div class="label">Account number</div><div class="value">${escapeHtml(accountNumber)}</div></div>
      <div class="box"><div class="label">Client</div><div class="value">${escapeHtml(client)}</div></div>
      <div class="box"><div class="label">Phone</div><div class="value">${escapeHtml(selectedAccount.client_phone || "No phone on file")}</div></div>
      <div class="box"><div class="label">Current balance</div><div class="value">${escapeHtml(money(selectedAccount.balance))}</div></div>
      <div class="box"><div class="label">Branch</div><div class="value">${escapeHtml(selectedAccount.branch_name ?? "No branch")}</div></div>
      <div class="box"><div class="label">Institution</div><div class="value">${escapeHtml(selectedAccount.institution_name ?? "No institution")}</div></div>
      <div class="box"><div class="label">Transaction filter</div><div class="value">${escapeHtml(transactionTypeFilter)}</div></div>
      <div class="box"><div class="label">Date window</div><div class="value">${escapeHtml(transactionDateFilter)}</div></div>
    </section>

    <div class="section-title">Statement entries</div>
    <table>
      <thead>
        <tr>
          <th style="width: 34px;">#</th>
          <th>Date</th>
          <th>Reference</th>
          <th>Description</th>
          <th>Type</th>
          <th class="num">Debit</th>
          <th class="num">Credit</th>
          <th class="num">Balance</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>

    <section class="totals">
      <div class="total-box"><div class="label">Total debits</div><div class="value">${escapeHtml(money(debitTotal))}</div></div>
      <div class="total-box"><div class="label">Total credits</div><div class="value">${escapeHtml(money(creditTotal))}</div></div>
      <div class="total-box"><div class="label">Closing balance</div><div class="value">${escapeHtml(money(selectedAccount.balance))}</div></div>
    </section>

    <div class="signature"><span class="signature-line">Authorized signature / stamp</span></div>

    <footer class="footer">
      <span>This statement is system generated from posted savings transactions.</span>
      <span>${escapeHtml(companyStatementProfile.name)}</span>
    </footer>
  </main>
</body>
</html>`;
  }

  async function loadAllStatementTransactions() {
    if (!selectedAccount) {
      return [];
    }

    return savingsApi.accounts.transactionsAll(
      selectedAccount.id,
      buildStatementQuery(),
    );
  }

  async function openStandardStatementPdf() {
    const printWindow = window.open("", "_blank", "width=1100,height=800");
    if (!printWindow) {
      toast.error("Allow pop-ups to download or print the PDF statement.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write("<p>Preparing savings statement...</p>");
    printWindow.document.close();

    setIsPreparingStatement(true);
    try {
      const statementTransactions = await loadAllStatementTransactions();
      const html = buildStandardStatementHtml(statementTransactions);
      if (!html) {
        printWindow.close();
        return;
      }

      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 400);
    } catch (statementError) {
      printWindow.close();
      const message = getProblemMessage(
        statementError,
        "Unable to prepare the savings statement.",
      );
      toast.error(message);
    } finally {
      setIsPreparingStatement(false);
    }
  }

  function handlePrintStatement() {
    void openStandardStatementPdf();
  }

  function selectAccount(accountId: string) {
    setSelectedAccountId(accountId || null);
    setTransactionPage(1);
    if (!accountId) setIsStatementOpen(false);
  }

  function clearSelectedAccount() {
    setSelectedAccountId(null);
    setTransactionPage(1);
    setTransactionTypeFilter("all");
    setIsStatementOpen(false);
  }

  function selectedAccountFileName() {
    if (!selectedAccount) return "savings-statement";
    return `savings-statement-${statementFileSafeName(
      selectedAccount.account_number ??
        selectedAccount.account_no ??
        selectedAccount.id,
    )}`;
  }

  function statementRows(statementTransactions: SavingsTransaction[]) {
    return statementTransactions.map((transaction) => {
      const isWithdrawalDebit =
        transaction.type === "withdrawal" ||
        transaction.type === "withdrawal_charge";

      return [
        formatDate(transactionBusinessDate(transaction)),
        transaction.reference ?? transaction.id,
        transaction.notes ||
          transaction.type_label ||
          statusLabel(transaction.type),
        transaction.type_label || statusLabel(transaction.type),
        isWithdrawalDebit ? money(transaction.amount) : "",
        transaction.type === "deposit" ? money(transaction.amount) : "",
        money(transaction.balance_after),
      ];
    });
  }

  async function handleDownloadStatement() {
    if (!selectedAccount) return;

    setIsPreparingStatement(true);
    try {
      const statementTransactions = await loadAllStatementTransactions();
      const rows = [
        [
          "Date",
          "Reference",
          "Description",
          "Type",
          "Debit",
          "Credit",
          "Balance",
        ],
        ...statementRows(statementTransactions),
      ];

      const csv = rows.map((row) => row.map(escapeCsvValue).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `${selectedAccountFileName()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (statementError) {
      const message = getProblemMessage(
        statementError,
        "Unable to download the savings statement.",
      );
      toast.error(message);
    } finally {
      setIsPreparingStatement(false);
    }
  }

  function handleDownloadPdfStatement() {
    void openStandardStatementPdf();
  }

  async function handleCreateAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreatingAccount(true);
    setAccountFormError(null);

    try {
      const createdAccount = await savingsApi.accounts.create({
        client: accountForm.client,
        status: accountForm.status,
      });

      setSelectedAccountId(String(createdAccount.id));
      closeCreateAccountModal();
      toast.success("Savings account created");
      await reload();
    } catch (saveError) {
      const message = getProblemMessage(
        saveError,
        "Unable to create savings account.",
      );
      setAccountFormError(message);
      toast.error(message);
    } finally {
      setIsCreatingAccount(false);
    }
  }

  async function handleSubmitOperation(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!operationMode || !operationTargetAccount) {
      setOperationError(
        "Select a savings account before recording a transaction.",
      );
      return;
    }

    if (!canProcessCashTransaction(operationTargetAccount)) {
      setOperationError(
        "Only active savings accounts can accept deposits or withdrawals.",
      );
      return;
    }

    if (!operationForm.transaction_date) {
      setOperationError("Transaction date is required.");
      return;
    }

    if (operationForm.transaction_date > todayDateInputValue()) {
      setOperationError("Transaction date cannot be in the future.");
      return;
    }

    setIsSubmittingOperation(true);
    setOperationError(null);

    try {
      const payload = {
        amount: operationForm.amount.trim(),
        reference: operationForm.reference.trim(),
        transaction_date: operationForm.transaction_date,
        notes: operationForm.notes.trim(),
      };

      if (operationMode === "withdrawal") {
        await savingsApi.accounts.withdraw(operationTargetAccount.id, payload);
        toast.success("Withdrawal recorded");
      } else {
        await savingsApi.accounts.deposit(operationTargetAccount.id, payload);
        toast.success("Deposit recorded");
      }

      closeOperationModal();
      await reload();
      await reloadTransactions();
    } catch (saveError) {
      const message = getProblemMessage(
        saveError,
        `Unable to record the ${operationLabel(operationMode).toLowerCase()}.`,
      );
      setOperationError(message);
      toast.error(message);
    } finally {
      setIsSubmittingOperation(false);
    }
  }

  if (!actorRole) {
    return <StateView title="Loading savings workspace..." />;
  }

  const title = isClient ? "My savings" : "Savings";
  const description = isClient
    ? "Select a savings account to view your detailed savings statement."
    : "Create savings accounts, post deposits and withdrawals, and review member savings statements.";

  return (
    <RecordsPageLayout
      title={title}
      description={description}
      headerAction={
        canManageCash ? (
          <Button type="button" onClick={openCreateAccountModal}>
            Create savings account
          </Button>
        ) : undefined
      }
      metrics={[
        {
          label: isClient ? "My accounts" : "Visible accounts",
          value: accounts.length,
          hint: isClient
            ? "Savings accounts currently linked to your client profile."
            : "Accounts matching the current search and status filter.",
        },
        {
          label: isClient ? "My balance" : "Total balance",
          value: money(totalBalance),
          hint: isClient
            ? "Combined balance across your accessible savings accounts."
            : "Combined balance across the loaded account list.",
        },
        {
          label: "Selected account",
          value: selectedAccount ? money(selectedAccount.balance) : "USh 0",
          hint: selectedAccount
            ? `${selectedAccount.account_number ?? selectedAccount.id} - ${
                selectedAccount.transaction_count ?? 0
              } transactions`
            : "Select an account to view its detailed statement.",
          accent: "slate",
        },
      ]}
      filterPanel={
        <Card className="grid gap-3 p-3 sm:p-4">
          <CardTitle>Search and filters</CardTitle>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Search">
              <Input
                placeholder="Account number, member number, client name, or phone"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </Field>

            <Field label="Account status">
              <select
                className={formSelectClassName}
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPage(1);
                }}
              >
                {savingsStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Statement date window">
              <select
                className={formSelectClassName}
                value={transactionDateFilter}
                onChange={(event) => {
                  setTransactionDateFilter(event.target.value);
                  setTransactionPage(1);
                }}
              >
                {transactionDateOptions.map((option) => (
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
      <div className="grid min-w-0 gap-3">
        <RecordsListPanel
          title={isClient ? "Savings accounts" : "Savings account directory"}
          description={
            isClient
              ? "Select one of your savings accounts to view its statement."
              : "Create and manage client savings accounts from the same workspace used by tellers and branch staff."
          }
          action={
            canManageCash ? (
              <Button type="button" onClick={openCreateAccountModal}>
                Add account
              </Button>
            ) : undefined
          }
          footer={
            pagination ? (
              <RecordsPagination
                count={pagination.count}
                page={page}
                rowsOnPage={accounts.length}
                hasNext={pagination.hasNext}
                hasPrevious={pagination.hasPrevious}
                onPageChange={setPage}
              />
            ) : undefined
          }
        >
          <div className="grid min-w-0 gap-3 p-3 sm:p-4">
            {error && data ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                The savings list refresh failed, but your latest loaded records
                are still visible.
                <button
                  type="button"
                  className="ml-2 font-bold underline underline-offset-2"
                  onClick={() => void reload()}
                >
                  Retry
                </button>
              </div>
            ) : null}

            {error && !data ? (
              <StateView
                title="Could not load savings accounts"
                description={error}
                actionLabel="Retry"
                onAction={reload}
              />
            ) : (
              <div className="w-full overflow-x-auto">
                <DataTable<SavingsAccount>
                  data={accounts}
                  columns={accountColumns}
                  loading={isLoading}
                  emptyTitle={
                    isClient
                      ? "No savings accounts yet"
                      : "No savings accounts found"
                  }
                  emptyMessage={
                    isClient
                      ? "No savings accounts are linked to your profile yet. Contact your branch staff for assistance."
                      : "Try widening the current search or status filter."
                  }
                  renderMobileCard={(account) => (
                    <article className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-base font-bold text-slate-900">
                              {account.account_number ??
                                account.account_no ??
                                account.id}
                            </p>
                            <StatusBadge status={account.status} />
                          </div>
                          <p className="mt-1 text-sm font-semibold text-slate-600">
                            {account.client_name ?? clientName(account.client)}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          <IconActionButton
                            title="View statement"
                            tone="text-emerald-700 hover:bg-emerald-50"
                            onClick={() => openStatementModal(account)}
                          >
                            <Eye className="h-4 w-4" />
                          </IconActionButton>

                          {canManageCash ? (
                            <>
                              <IconActionButton
                                title={
                                  canProcessCashTransaction(account)
                                    ? "Deposit"
                                    : "Deposits are available only for active accounts"
                                }
                                tone="text-blue-700 hover:bg-blue-50"
                                disabled={!canProcessCashTransaction(account)}
                                onClick={() =>
                                  openOperationModal(account, "deposit")
                                }
                              >
                                <ArrowDownCircle className="h-4 w-4" />
                              </IconActionButton>

                              <IconActionButton
                                title={
                                  canProcessCashTransaction(account)
                                    ? "Withdraw"
                                    : "Withdrawals are available only for active accounts"
                                }
                                tone="text-rose-700 hover:bg-rose-50"
                                disabled={!canProcessCashTransaction(account)}
                                onClick={() =>
                                  openOperationModal(account, "withdrawal")
                                }
                              >
                                <ArrowUpCircle className="h-4 w-4" />
                              </IconActionButton>
                            </>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                          Balance
                        </p>
                        <p className="mt-1 whitespace-nowrap font-medium text-slate-800 tabular-nums">
                          {money(account.balance)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {account.transaction_count ?? 0} transactions
                        </p>
                      </div>
                    </article>
                  )}
                />
              </div>
            )}
          </div>
        </RecordsListPanel>

        <Card className="grid min-w-0 gap-3 p-3 sm:p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle>Selected account</CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                Choose an account to update the selected account section. Clear
                it to reset.
              </p>
            </div>

            {selectedAccount ? (
              <StatusBadge status={selectedAccount.status} />
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <Field label="Savings account">
              <select
                className={formSelectClassName}
                value={selectedAccountId ?? ""}
                onChange={(event) => selectAccount(event.target.value)}
              >
                <option value="">No account selected</option>
                {accounts.map((account) => (
                  <option key={account.id} value={String(account.id)}>
                    {account.account_number ?? account.account_no ?? account.id}{" "}
                    - {account.client_name ?? clientName(account.client)}
                  </option>
                ))}
              </select>
            </Field>

            <div className="flex items-end gap-2">
              <Button
                type="button"
                className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                onClick={clearSelectedAccount}
                disabled={!selectedAccount}
              >
                Reset
              </Button>

              <Button
                type="button"
                onClick={() =>
                  selectedAccount && openStatementModal(selectedAccount)
                }
                disabled={!selectedAccount}
              >
                <FileText className="mr-2 h-4 w-4" />
                Statement
              </Button>
            </div>
          </div>

          {selectedAccount ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Account
                </p>
                <p className="mt-1 font-bold text-slate-900">
                  {selectedAccount.account_number ??
                    selectedAccount.account_no ??
                    selectedAccount.id}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Client
                </p>
                <p className="mt-1 font-bold text-slate-900">
                  {selectedAccount.client_name ??
                    clientName(selectedAccount.client)}
                </p>
                <p className="text-xs text-slate-500">
                  {selectedAccount.client_phone || "No phone on file"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Balance
                </p>
                <MoneyInline value={selectedAccount.balance} />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Activity
                </p>
                <p className="mt-1 font-bold text-slate-900">
                  {selectedAccount.transaction_count ?? 0} transactions
                </p>
                <p className="text-xs text-slate-500">
                  Last activity{" "}
                  {formatDate(selectedAccount.last_transaction_at || undefined)}
                </p>
              </div>
            </div>
          ) : (
            <StateView
              title="No account selected"
              description="Select an account above to update this section. The selected account metrics reset when no account is selected."
            />
          )}
        </Card>
      </div>

      {isStatementOpen ? (
        <Modal
          open={isStatementOpen}
          onClose={closeStatementModal}
          size="xl"
          title="Savings statement"
          description={
            selectedAccount
              ? `${selectedAccount.client_name ?? clientName(selectedAccount.client)} - ${
                  selectedAccount.account_number ??
                  selectedAccount.account_no ??
                  selectedAccount.id
                }`
              : "Select a savings account to view its statement."
          }
          footer={
            selectedAccount ? (
              <>
                <Button
                  type="button"
                  className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                  onClick={handlePrintStatement}
                  disabled={isPreparingStatement}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  {isPreparingStatement ? "Preparing..." : "Print"}
                </Button>
                <Button
                  type="button"
                  className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                  onClick={handleDownloadPdfStatement}
                  disabled={isPreparingStatement}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  PDF
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleDownloadStatement()}
                  disabled={isPreparingStatement}
                >
                  <Download className="mr-2 h-4 w-4" />
                  CSV
                </Button>
              </>
            ) : (
              <Button
                type="button"
                className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                onClick={closeStatementModal}
              >
                Close
              </Button>
            )
          }
        >
          {selectedAccount ? (
            <div className="grid gap-4">
              <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    Account
                  </p>
                  <p className="mt-1 font-bold text-slate-900">
                    {selectedAccount.account_number ??
                      selectedAccount.account_no ??
                      selectedAccount.id}
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
                    {selectedAccount.client_phone || "No phone on file"}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    Assignment
                  </p>
                  <p className="mt-1 font-bold text-slate-900">
                    {selectedAccount.branch_name ?? "No branch"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {selectedAccount.institution_name ?? "No institution"}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    Balance
                  </p>
                  <p className="mt-1 font-bold text-slate-900 tabular-nums">
                    {money(selectedAccount.balance)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {selectedAccount.transaction_count ?? 0} transactions
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:max-w-2xl">
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

                <Field label="Date window">
                  <select
                    className={formSelectClassName}
                    value={transactionDateFilter}
                    onChange={(event) => {
                      setTransactionDateFilter(event.target.value);
                      setTransactionPage(1);
                    }}
                  >
                    {transactionDateOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              {transactionsError && !transactionsData ? (
                <StateView
                  title="Could not load savings statement"
                  description={transactionsError}
                  actionLabel="Retry"
                  onAction={reloadTransactions}
                />
              ) : (
                <>
                  <div className="w-full overflow-x-auto">
                    <DataTable<SavingsTransaction>
                      data={transactions}
                      columns={transactionColumns}
                      loading={transactionsLoading}
                      emptyTitle="No statement entries found"
                      emptyMessage="No deposits or withdrawals match the current filters."
                      renderMobileCard={(row) => (
                        <article className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="break-words text-base font-bold text-slate-900">
                                {row.reference ?? row.id}
                              </p>
                              <p className="mt-1 text-sm text-slate-500">
                                {formatDate(transactionBusinessDate(row))}
                              </p>
                            </div>

                            {transactionTypeBadge(row)}
                          </div>

                          <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
                            <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
                              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                                Debit
                              </p>
                              <p className="mt-1 whitespace-nowrap font-medium text-slate-800 tabular-nums">
                                {row.type === "withdrawal" ||
                                row.type === "withdrawal_charge"
                                  ? money(row.amount)
                                  : "—"}
                              </p>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
                              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                                Credit
                              </p>
                              <p className="mt-1 whitespace-nowrap font-medium text-slate-800 tabular-nums">
                                {row.type === "deposit"
                                  ? money(row.amount)
                                  : "—"}
                              </p>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
                              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                                Balance
                              </p>
                              <p className="mt-1 whitespace-nowrap font-medium text-slate-800 tabular-nums">
                                {money(row.balance_after)}
                              </p>
                            </div>
                          </div>

                          {row.notes ? (
                            <p className="mt-3 text-sm text-slate-600">
                              {row.notes}
                            </p>
                          ) : null}
                        </article>
                      )}
                    />
                  </div>

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
              title="No savings account selected"
              description="Select a savings account to view its detailed statement."
            />
          )}
        </Modal>
      ) : null}

      {isCreateOpen ? (
        <Modal
          open={isCreateOpen}
          onClose={closeCreateAccountModal}
          size="lg"
          title="Create savings account"
          description="Assign a savings account to an active client within your allowed branch and institution scope."
          footer={
            <>
              <Button
                type="button"
                className="btn-outline-secondary bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                onClick={closeCreateAccountModal}
              >
                Cancel
              </Button>
              <Button
                form={createAccountFormId}
                type="submit"
                disabled={isCreatingAccount}
              >
                {isCreatingAccount ? "Creating..." : "Create savings account"}
              </Button>
            </>
          }
        >
          <form
            className="grid gap-4"
            id={createAccountFormId}
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
                  {savingsStatusOptions
                    .filter(
                      (option) =>
                        option.value !== "all" && option.value !== "closed",
                    )
                    .map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                </select>
              </Field>
            </div>

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

            {clientOptionsError ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Could not load clients for savings account creation.
                <button
                  type="button"
                  className="ml-2 font-bold underline underline-offset-2"
                  onClick={() => void reloadClientOptions()}
                >
                  Retry
                </button>
              </div>
            ) : null}

            {!clientOptionsLoading &&
            isCreateOpen &&
            !clientOptions.length &&
            !clientOptionsError ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                No active clients matched this search. Create or activate the
                client first from the Clients page.
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
                    : ""}
                </p>
                <p className="mt-1 text-xs text-emerald-700">
                  {selectedClient.phone || "No phone on file"}
                </p>
              </div>
            ) : null}

            {accountFormError ? (
              <div className="alert alert-danger">{accountFormError}</div>
            ) : null}
          </form>
        </Modal>
      ) : null}

      {operationMode ? (
        <Modal
          open={Boolean(operationMode)}
          onClose={closeOperationModal}
          size="md"
          title={operationSubmitLabel(operationMode)}
          description={
            operationTargetAccount
              ? `${operationLabel(operationMode)} for ${
                  operationTargetAccount.account_number ??
                  operationTargetAccount.id
                }`
              : "Select a savings account and record the cash movement."
          }
          footer={
            operationTargetAccount ? (
              <>
                <Button
                  type="button"
                  className="btn-outline-secondary bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
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
                className="btn-outline-secondary bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
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
                  {operationTargetAccount.client_name ??
                    clientName(operationTargetAccount.client)}
                </p>
                <p className="mt-1">
                  {operationTargetAccount.account_number ??
                    operationTargetAccount.id}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Current balance {money(operationTargetAccount.balance)}
                </p>
                {operationMode === "withdrawal" ? (
                  <p className="mt-1 text-xs text-slate-500">
                    Withdrawal charge and minimum balance are enforced by the
                    active savings policy. Admin can update the policy any time.
                  </p>
                ) : null}
              </div>

              <Field label="Transaction date">
                <Input
                  type="date"
                  max={todayDateInputValue()}
                  value={operationForm.transaction_date}
                  onChange={(event) =>
                    setOperationForm((current) => ({
                      ...current,
                      transaction_date: event.target.value,
                    }))
                  }
                  required
                />
                <p className="mt-1 text-xs text-slate-500">
                  You can backdate this transaction, but future dates are not
                  allowed.
                </p>
              </Field>

              <Field label="Amount">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={operationForm.amount}
                  onChange={(event) =>
                    setOperationForm((current) => ({
                      ...current,
                      amount: event.target.value,
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
                  placeholder="Cash receipt or voucher reference"
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
                  placeholder="Optional notes for the teller or branch record"
                />
              </Field>

              {operationError ? (
                <div className="alert alert-danger">{operationError}</div>
              ) : null}
            </form>
          ) : (
            <StateView
              title="Savings account not found"
              description="Choose a valid savings account before recording a cash transaction."
            />
          )}
        </Modal>
      ) : null}
    </RecordsPageLayout>
  );
}
