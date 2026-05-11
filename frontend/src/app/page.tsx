"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Masthead from "@/components/Masthead";
import { api, Account, NetWorthResponse, CashflowResponse } from "@/lib/api";

// Helper for formatting
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(Math.abs(value));
};

export default function Home() {
  const [activeAccount, setActiveAccount] = useState<number | null>(null);
  
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [netWorth, setNetWorth] = useState<NetWorthResponse | null>(null);
  const [cashflow, setCashflow] = useState<CashflowResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [accs, nw, cf] = await Promise.all([
          api.getAccounts(),
          api.getNetWorth(),
          api.getCashflow()
        ]);
        setAccounts(accs);
        setNetWorth(nw);
        setCashflow(cf);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12 min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground animate-pulse tracking-widest uppercase text-xs">Loading the Index...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 pb-32 min-h-screen flex flex-col">
      <Masthead />

      {/* 2. The Statement */}
      <section className="mb-24 text-center mt-8">
        <motion.h2 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-serif text-6xl md:text-8xl tracking-tighter mb-6"
        >
          {netWorth ? formatCurrency(netWorth.net_worth) : "$0.00"}
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-lg text-foreground/80 max-w-md mx-auto leading-relaxed"
        >
          Your wealth has grown by <span className="text-positive font-medium">{cashflow ? formatCurrency(cashflow.net_cashflow) : "$0.00"}</span> this month.
        </motion.p>
      </section>

      {/* 3. The Ledger */}
      <section className="flex-1 max-w-2xl mx-auto w-full z-10 relative">
        <div className="flex justify-between items-center text-xs tracking-widest uppercase text-muted-foreground mb-4 px-2">
          <span>Account</span>
          <span>Balance</span>
        </div>
        
        <div className="border-t border-border">
          {accounts.map((acc) => (
            <LedgerRow 
              key={acc.id} 
              account={acc} 
              isActive={activeAccount === acc.id}
              onToggle={() => setActiveAccount(activeAccount === acc.id ? null : acc.id)}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center mt-8 italic">
          Press and hold an account to reveal details.
        </p>
      </section>

      {/* 4. The Pulse (Placeholder for Recharts sparkline) */}
      <div className="fixed bottom-0 left-0 w-full h-32 opacity-10 pointer-events-none overflow-hidden z-0">
        <svg viewBox="0 0 1000 100" preserveAspectRatio="none" className="w-full h-full fill-foreground">
          <path d="M0,100 C200,80 300,30 500,60 C700,90 800,20 1000,50 L1000,100 Z" />
        </svg>
      </div>
    </div>
  );
}

// The 'Friction' Choice: Press and hold to expand
function LedgerRow({ account, isActive, onToggle }: { account: Account, isActive: boolean, onToggle: () => void }) {
  const [isPressing, setIsPressing] = useState(false);
  const holdTimeout = useRef<NodeJS.Timeout | null>(null);

  const handlePointerDown = () => {
    setIsPressing(true);
    holdTimeout.current = setTimeout(() => {
      setIsPressing(false);
      onToggle();
    }, 1500); // 1.5s intentionality friction
  };

  const handlePointerUp = () => {
    setIsPressing(false);
    if (holdTimeout.current) {
      clearTimeout(holdTimeout.current);
    }
  };

  // Determine if it's a debt/liability
  const isLiability = ['credit_card', 'loan', 'other_liability'].includes(account.type);

  return (
    <div className="border-b border-border relative overflow-hidden group">
      {/* Progress fill animation for the friction */}
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
        <span className="font-medium text-lg">{account.name}</span>
        <span className={`font-serif text-xl ${isLiability ? 'text-negative' : 'text-foreground'}`}>
          {formatCurrency(account.balance)}
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
              <span>Institution: <span className="text-muted-foreground">{account.institution_name || "N/A"}</span></span>
              <button className="underline hover:text-muted-foreground transition-colors">View Ledger</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
