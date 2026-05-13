const API_BASE_URL = "http://localhost:8000/api/v1";

export interface Account {
  id: number;
  name: string;
  type: string;
  balance: number;
  currency: string;
  institution_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface Transaction {
  id: number;
  account_id: number;
  destination_account_id: number | null;
  amount: number;
  currency: string;
  date: string;
  name: string;
  merchant_name: string | null;
  pending: boolean;
  type: string;
  category_id: number | null;
  is_subscription: boolean;
  billing_cycle: string | null;
  notes: string | null;
  receipt_url: string | null;
  // Income-specific fields
  income_source: string | null;
  source_detail: string | null;
  bank_name: string | null;
  investment_name: string | null;
  receipt_type: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface Category {
  id: number;
  name: string;
  parent_id: number | null;
  children: Category[];
}

export interface IncomeOption {
  id: number;
  category: string;
  label: string;
  created_at: string;
}

export interface NetWorthResponse {
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
}

export interface CashflowResponse {
  total_inflow: number;
  total_outflow: number;
  net_cashflow: number;
}

export interface CategorySpending {
  category: string;
  amount: number;
}

export interface CategorySpendingResponse {
  breakdown: CategorySpending[];
}

// Currency constants
export const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

export const api = {
  // ── Accounts ──
  async getAccounts(): Promise<Account[]> {
    const res = await fetch(`${API_BASE_URL}/accounts/`);
    if (!res.ok) throw new Error("Failed to fetch accounts");
    return res.json();
  },

  async createAccount(data: Partial<Account> & { user_id: number }): Promise<Account> {
    const res = await fetch(`${API_BASE_URL}/accounts/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error("Failed to create account");
    return res.json();
  },

  // ── Transactions ──
  async getTransactions(accountId?: number): Promise<Transaction[]> {
    const url = accountId 
      ? `${API_BASE_URL}/transactions/?account_id=${accountId}`
      : `${API_BASE_URL}/transactions/`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch transactions");
    return res.json();
  },

  async createTransaction(data: Partial<Transaction> & { account_id: number }): Promise<Transaction> {
    const res = await fetch(`${API_BASE_URL}/transactions/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error("Failed to create transaction");
    return res.json();
  },

  // ── Categories ──
  async getCategories(): Promise<Category[]> {
    const res = await fetch(`${API_BASE_URL}/categories/`);
    if (!res.ok) throw new Error("Failed to fetch categories");
    return res.json();
  },

  async createCategory(data: { name: string; parent_id?: number | null }): Promise<Category> {
    const res = await fetch(`${API_BASE_URL}/categories/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error("Failed to create category");
    return res.json();
  },

  // ── Income Options ──
  async getIncomeOptions(category?: string): Promise<IncomeOption[]> {
    const url = category
      ? `${API_BASE_URL}/income-options/?category=${category}`
      : `${API_BASE_URL}/income-options/`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch income options");
    return res.json();
  },

  async createIncomeOption(data: { category: string; label: string }): Promise<IncomeOption> {
    const res = await fetch(`${API_BASE_URL}/income-options/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error("Failed to create income option");
    return res.json();
  },

  async deleteIncomeOption(id: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/income-options/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete income option");
  },

  // ── Analytics ──
  async getNetWorth(): Promise<NetWorthResponse> {
    const res = await fetch(`${API_BASE_URL}/analytics/net-worth`);
    if (!res.ok) throw new Error("Failed to fetch net worth");
    return res.json();
  },

  async getCashflow(): Promise<CashflowResponse> {
    const res = await fetch(`${API_BASE_URL}/analytics/cashflow`);
    if (!res.ok) throw new Error("Failed to fetch cashflow");
    return res.json();
  },

  async getSpending(): Promise<CategorySpendingResponse> {
    const res = await fetch(`${API_BASE_URL}/analytics/spending`);
    if (!res.ok) throw new Error("Failed to fetch spending");
    return res.json();
  }
};
