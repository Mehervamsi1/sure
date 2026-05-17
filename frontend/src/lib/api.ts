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
    let detail = response.statusText;
    try {
      const body = await response.json();
      detail = body.detail || JSON.stringify(body);
    } catch {}
    throw new Error(`API ${response.status}: ${detail}`);
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
  holding_id: number | null;
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

export interface NetWorthDataPoint {
  date: string;
  net_worth: number;
}

export interface NetWorthHistoryResponse {
  history: NetWorthDataPoint[];
}

export interface ConvertedAccountBalance {
  account_id: number;
  name: string;
  type: string;
  original_balance: number;
  original_currency: string;
  converted_balance: number;
  display_currency: string;
}

export interface ConvertedNetWorthResponse {
  display_currency: string;
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
  accounts: ConvertedAccountBalance[];
}

export interface ExchangeRatesResponse {
  base: string;
  rates: Record<string, number>;
}

export interface Holding {
  id: number;
  user_id: number;
  account_id: number;
  ticker: string;
  asset_name: string;
  asset_type: string;
  exchange: string | null;
  quantity: number;
  avg_cost_price: number;
  total_invested: number;
  currency: string;
  purchase_date: string | null;
  broker_name: string | null;
  broker_account_last4: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface TickerSearchResult {
  ticker: string;
  name: string;
  exchange: string;
  asset_type: string;
  currency: string;
  current_price: number | null;
}

export interface QuoteResult {
  ticker: string;
  price: number;
  change: number;
  change_percent: number;
  currency: string;
  market_state: string;
}

export interface HistoryPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
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

  async updateTransaction(id: number, data: Partial<Transaction>): Promise<Transaction> {
    return fetchWithAuth(`${API_BASE_URL}/transactions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
  },

  async deleteTransaction(id: number): Promise<void> {
    await fetchWithAuth(`${API_BASE_URL}/transactions/${id}`, {
      method: "DELETE",
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

  async getNetWorthHistory(days: number = 30, displayCurrency: string = "USD"): Promise<NetWorthHistoryResponse> {
    return fetchWithAuth(`${API_BASE_URL}/analytics/net-worth-history?days=${days}&display_currency=${displayCurrency}`);
  },

  async getNetWorthConverted(displayCurrency: string = "USD"): Promise<ConvertedNetWorthResponse> {
    return fetchWithAuth(`${API_BASE_URL}/analytics/net-worth-converted?display_currency=${displayCurrency}`);
  },

  async getExchangeRates(base: string = "USD"): Promise<ExchangeRatesResponse> {
    return fetchWithAuth(`${API_BASE_URL}/analytics/exchange-rates?base=${base}`);
  },

  async getRecentTransactions(limit: number = 10): Promise<Transaction[]> {
    return fetchWithAuth(`${API_BASE_URL}/analytics/recent-transactions?limit=${limit}`);
  },

  async getCashflow(): Promise<CashflowResponse> {
    return fetchWithAuth(`${API_BASE_URL}/analytics/cashflow`);
  },

  async getSpending(): Promise<CategorySpendingResponse> {
    return fetchWithAuth(`${API_BASE_URL}/analytics/spending`);
  },

  // ── Holdings ──
  async getHoldings(): Promise<Holding[]> {
    return fetchWithAuth(`${API_BASE_URL}/holdings`);
  },

  async searchTicker(query: string): Promise<TickerSearchResult[]> {
    return fetchWithAuth(`${API_BASE_URL}/holdings/search?q=${encodeURIComponent(query)}`);
  },

  async getQuotes(tickers: string[]): Promise<Record<string, QuoteResult>> {
    return fetchWithAuth(`${API_BASE_URL}/holdings/quotes?tickers=${tickers.join(",")}`);
  },

  async getHistory(ticker: string, period: string = "1mo"): Promise<HistoryPoint[]> {
    return fetchWithAuth(`${API_BASE_URL}/holdings/history?ticker=${encodeURIComponent(ticker)}&period=${period}`);
  },

  async buyHolding(data: {
    ticker: string;
    asset_name: string;
    asset_type: string;
    exchange?: string;
    quantity: number;
    price_per_unit: number;
    currency: string;
    date: string;
    debit_account_id: number;
    investment_account_id: number;
    broker_name?: string;
    broker_account_last4?: string;
    notes?: string;
  }): Promise<Holding> {
    return fetchWithAuth(`${API_BASE_URL}/holdings/buy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  async sellHolding(data: {
    holding_id: number;
    quantity: number;
    price_per_unit: number;
    date: string;
    deposit_account_id: number;
  }): Promise<Holding> {
    return fetchWithAuth(`${API_BASE_URL}/holdings/sell`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  async updateHolding(id: number, data: { broker_name?: string; broker_account_last4?: string; notes?: string }): Promise<Holding> {
    return fetchWithAuth(`${API_BASE_URL}/holdings/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  async deleteHolding(id: number): Promise<void> {
    await fetchWithAuth(`${API_BASE_URL}/holdings/${id}`, { method: "DELETE" });
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
