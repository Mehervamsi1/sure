import { supabase } from "./supabase";

const API_BASE_URL = "/api/v1";

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = new Headers(options.headers || {});
  
  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    throw new Error(`API Request failed: ${response.statusText}`);
  }
  return response.json();
}

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
    return fetchWithAuth(`${API_BASE_URL}/accounts`);
  },

  async createAccount(data: Partial<Account> & { user_id: number }): Promise<Account> {
    return fetchWithAuth(`${API_BASE_URL}/accounts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
  },

  async updateAccount(id: number, data: Partial<Account>): Promise<Account> {
    return fetchWithAuth(`${API_BASE_URL}/accounts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
  },

  // ── Transactions ──
  async getTransactions(accountId?: number): Promise<Transaction[]> {
    const url = accountId 
      ? `${API_BASE_URL}/transactions?account_id=${accountId}`
      : `${API_BASE_URL}/transactions`;
    return fetchWithAuth(url);
  },

  async createTransaction(data: Partial<Transaction> & { account_id: number }): Promise<Transaction> {
    return fetchWithAuth(`${API_BASE_URL}/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
  },

  // ── Categories ──
  async getCategories(): Promise<Category[]> {
    return fetchWithAuth(`${API_BASE_URL}/categories`);
  },

  async createCategory(data: { name: string; parent_id?: number | null }): Promise<Category> {
    return fetchWithAuth(`${API_BASE_URL}/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
  },

  // ── Income Options ──
  async getIncomeOptions(category?: string): Promise<IncomeOption[]> {
    const url = category
      ? `${API_BASE_URL}/income-options?category=${category}`
      : `${API_BASE_URL}/income-options`;
    return fetchWithAuth(url);
  },

  async createIncomeOption(data: { category: string; label: string }): Promise<IncomeOption> {
    return fetchWithAuth(`${API_BASE_URL}/income-options`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
  },

  async deleteIncomeOption(id: number): Promise<void> {
    await fetchWithAuth(`${API_BASE_URL}/income-options/${id}`, {
      method: "DELETE",
    });
  },

  // ── Analytics ──
  async getNetWorth(): Promise<NetWorthResponse> {
    return fetchWithAuth(`${API_BASE_URL}/analytics/net-worth`);
  },

  async getCashflow(): Promise<CashflowResponse> {
    return fetchWithAuth(`${API_BASE_URL}/analytics/cashflow`);
  },

  async getSpending(): Promise<CategorySpendingResponse> {
    return fetchWithAuth(`${API_BASE_URL}/analytics/spending`);
  },

  // ── Profile ──
  async getUserProfile(): Promise<{ id: number, email: string, first_name: string | null, last_name: string | null, gender: string | null } | null> {
    try {
      return await fetchWithAuth(`${API_BASE_URL}/users/me`);
    } catch (err) {
      console.error("Failed to load user profile:", err);
      return null;
    }
  }
};
