"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import Masthead from "@/components/Masthead";
import {
  api, CashflowResponse, Transaction, NetWorthDataPoint,
  ConvertedNetWorthResponse, ConvertedAccountBalance, CURRENCIES
} from "@/lib/api";

const formatCurrency = (value: number, currencyCode: string = "USD") => {
  const curr = CURRENCIES.find(c => c.code === currencyCode);
  const symbol = curr?.symbol || "$";
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value));
  return `${value < 0 ? "-" : ""}${symbol}${formatted}`;
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", { month: 'short', day: 'numeric' });
};

export default function Home() {
  const [activeAccount, setActiveAccount] = useState<number | null>(null);
  const [displayCurrency, setDisplayCurrency] = useState("USD");

  const [convertedNW, setConvertedNW] = useState<ConvertedNetWorthResponse | null>(null);
  const [cashflow, setCashflow] = useState<CashflowResponse | null>(null);
  const [nwHistory, setNwHistory] = useState<NetWorthDataPoint[]>([]);
  const [recentTx, setRecentTx] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [currencyLoading, setCurrencyLoading] = useState(false);

  const fetchConvertedNW = useCallback(async (currency: string) => {
    try {
      const data = await api.getNetWorthConverted(currency);
      setConvertedNW(data);
    } catch (e) {
      console.error("Failed to fetch converted net worth:", e);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const results = await Promise.allSettled([
        api.getNetWorthConverted(displayCurrency),
        api.getCashflow(),
        api.getNetWorthHistory(30, displayCurrency),
        api.getRecentTransactions(10)
      ]);
      if (results[0].status === "fulfilled") setConvertedNW(results[0].value);
      if (results[1].status === "fulfilled") setCashflow(results[1].value);
      if (results[2].status === "fulfilled") setNwHistory(results[2].value.history);
      if (results[3].status === "fulfilled") setRecentTx(results[3].value);
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleCurrencyChange = async (newCurrency: string) => {
    setDisplayCurrency(newCurrency);
    setCurrencyLoading(true);
    const [nwResult, histResult] = await Promise.allSettled([
      api.getNetWorthConverted(newCurrency),
      api.getNetWorthHistory(30, newCurrency),
    ]);
    if (nwResult.status === "fulfilled") setConvertedNW(nwResult.value);
    if (histResult.status === "fulfilled") setNwHistory(histResult.value.history);
    setCurrencyLoading(false);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12 min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground animate-pulse tracking-widest uppercase text-xs">Loading the Index...</p>
      </div>
    );
  }

  const accounts = convertedNW?.accounts || [];
  const nwChange = nwHistory.length >= 2
    ? nwHistory[nwHistory.length - 1].net_worth - nwHistory[0].net_worth
    : 0;
  const nwChangePercent = nwHistory.length >= 2 && nwHistory[0].net_worth !== 0
    ? ((nwChange / Math.abs(nwHistory[0].net_worth)) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 pb-32 min-h-screen flex flex-col">
      <Masthead />

      {/* Currency Selector */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex justify-center mt-6 mb-2"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs tracking-widest uppercase text-muted-foreground">Display in</span>
          <select
            value={displayCurrency}
            onChange={(e) => handleCurrencyChange(e.target.value)}
            className="bg-transparent border-b border-border text-sm font-medium py-1 px-2 focus:outline-none focus:border-foreground cursor-pointer appearance-none"
          >
            {CURRENCIES.map(c => (
              <option key={c.code} value={c.code} className="bg-background text-foreground">
                {c.symbol} {c.code}
              </option>
            ))}
          </select>
        </div>
      </motion.div>

      {/* The Statement */}
      <section className="mb-16 text-center mt-4">
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`font-serif text-6xl md:text-8xl tracking-tighter mb-4 transition-opacity ${currencyLoading ? 'opacity-40' : ''}`}
        >
          {convertedNW ? formatCurrency(convertedNW.net_worth, displayCurrency) : "$0.00"}
        </motion.h2>
        {convertedNW && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="flex justify-center gap-8 text-sm mb-4"
          >
            <span className="text-positive">Assets: {formatCurrency(convertedNW.total_assets, displayCurrency)}</span>
            <span className="text-negative">Liabilities: {formatCurrency(convertedNW.total_liabilities, displayCurrency)}</span>
          </motion.div>
        )}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-lg text-foreground/80 max-w-md mx-auto leading-relaxed"
        >
          {accounts.length === 0 ? (
            <>No accounts yet. <a href="/settings" className="underline text-positive">Initialize your first account</a> to begin.</>
          ) : cashflow && cashflow.net_cashflow >= 0 ? (
            <>Your wealth has grown by <span className="text-positive font-medium">{formatCurrency(cashflow.net_cashflow, displayCurrency)}</span> this month.</>
          ) : (
            <>Your wealth decreased by <span className="text-negative font-medium">{formatCurrency(cashflow?.net_cashflow || 0, displayCurrency)}</span> this month.</>
          )}
        </motion.p>
      </section>

      {/* Net Worth Sparkline */}
      {nwHistory.length > 1 && (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-16 max-w-2xl mx-auto w-full"
        >
          <div className="flex justify-between items-center text-xs tracking-widest uppercase text-muted-foreground mb-3 px-2">
            <span>Net Worth — 30 Days</span>
            <span className={nwChange >= 0 ? "text-positive" : "text-negative"}>
              {nwChange >= 0 ? "+" : ""}{nwChangePercent}%
            </span>
          </div>
          <div className="h-24 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={nwHistory}>
                <YAxis domain={['dataMin', 'dataMax']} hide />
                <Line
                  type="monotone"
                  dataKey="net_worth"
                  stroke={nwChange >= 0 ? "#4E8A6E" : "#D35236"}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1 px-2">
            <span>{nwHistory[0]?.date ? formatDate(nwHistory[0].date) : ""}</span>
            <span>{nwHistory[nwHistory.length - 1]?.date ? formatDate(nwHistory[nwHistory.length - 1].date) : ""}</span>
          </div>
        </motion.section>
      )}

      {/* The Ledger */}
      <section className="max-w-2xl mx-auto w-full z-10 relative mb-16">
        <div className="flex justify-between items-center text-xs tracking-widest uppercase text-muted-foreground mb-4 px-2">
          <span>Account</span>
          <span>Balance ({displayCurrency})</span>
        </div>

        <div className="border-t border-border">
          {accounts.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground italic">No holdings configured.</p>
              <a href="/settings" className="text-sm underline text-muted-foreground hover:text-foreground mt-2 inline-block">
                Add your first account →
              </a>
            </div>
          ) : (
            <>
              {accounts.map((acc) => (
                <LedgerRow
                  key={acc.account_id}
                  account={acc}
                  displayCurrency={displayCurrency}
                  isActive={activeAccount === acc.account_id}
                  onToggle={() => setActiveAccount(activeAccount === acc.account_id ? null : acc.account_id)}
                />
              ))}
              <p className="text-xs text-muted-foreground text-center mt-6 italic">
                Press and hold an account to reveal details.
              </p>
            </>
          )}
        </div>
      </section>

      {/* Recent Transactions */}
      {recentTx.length > 0 && (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="max-w-2xl mx-auto w-full"
        >
          <div className="flex justify-between items-center text-xs tracking-widest uppercase text-muted-foreground mb-4 px-2">
            <span>Recent Activity</span>
            <a href="/transactions" className="hover:text-foreground transition-colors">View All →</a>
          </div>

          <div className="border-t border-border">
            {recentTx.map((tx) => (
              <div key={tx.id} className="flex justify-between items-center py-4 px-2 border-b border-border/50">
                <div className="flex flex-col">
                  <span className="font-medium">{tx.merchant_name || tx.name}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(tx.date)}</span>
                </div>
                <span className={`font-serif text-lg ${tx.amount < 0 ? 'text-foreground' : 'text-positive'}`}>
                  {tx.amount < 0 ? "−" : "+"}{formatCurrency(Math.abs(tx.amount), tx.currency)}
                </span>
              </div>
            ))}
          </div>
        </motion.section>
      )}
    </div>
  );
}

function LedgerRow({ account, displayCurrency, isActive, onToggle }: {
  account: ConvertedAccountBalance,
  displayCurrency: string,
  isActive: boolean,
  onToggle: () => void
}) {
  const [isPressing, setIsPressing] = useState(false);
  const holdTimeout = useRef<NodeJS.Timeout | null>(null);

  const handlePointerDown = () => {
    setIsPressing(true);
    holdTimeout.current = setTimeout(() => {
      setIsPressing(false);
      onToggle();
    }, 1500);
  };

  const handlePointerUp = () => {
    setIsPressing(false);
    if (holdTimeout.current) {
      clearTimeout(holdTimeout.current);
    }
  };

  const isLiability = ['credit_card', 'loan', 'other_liability'].includes(account.type);
  const showConversion = account.original_currency !== displayCurrency;

  return (
    <div className="border-b border-border relative overflow-hidden group">
      <div
        className={`absolute inset-0 bg-muted origin-left ease-linear z-0
          ${isPressing ? 'scale-x-100 transition-transform duration-[1500ms]' : 'scale-x-0 transition-transform duration-300'}
        `}
      />

      <div
        className="relative z-10 flex justify-between items-center py-5 px-2 cursor-pointer select-none"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="flex flex-col">
          <span className="font-medium text-lg">{account.name}</span>
          {showConversion && (
            <span className="text-xs text-muted-foreground">
              {formatCurrency(account.original_balance, account.original_currency)} {account.original_currency}
            </span>
          )}
        </div>
        <span className={`font-serif text-xl ${isLiability ? 'text-negative' : 'text-foreground'}`}>
          {formatCurrency(account.converted_balance, displayCurrency)}
        </span>
      </div>

      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="relative z-10 bg-muted/50 px-2 overflow-hidden"
          >
            <div className="py-4 text-sm text-foreground flex justify-between items-center border-t border-border/50 mt-1">
              <div className="flex flex-col gap-1">
                <span>Type: <span className="text-muted-foreground capitalize">{account.type.replace('_', ' ')}</span></span>
                <span>Native Currency: <span className="text-muted-foreground">{account.original_currency}</span></span>
                {showConversion && (
                  <span>Original: <span className="text-muted-foreground">{formatCurrency(account.original_balance, account.original_currency)}</span></span>
                )}
              </div>
              <a href="/transactions" className="underline hover:text-muted-foreground transition-colors">View Ledger</a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
