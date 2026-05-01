"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Helper for formatting
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value);
};

const accounts = [
  { id: 1, name: "Chase Sapphire Reserve", balance: -3240.50, type: "liability", lastTransaction: "Sweetgreen - $14.20" },
  { id: 2, name: "Vanguard Total Stock ETF", balance: 84200.00, type: "asset", lastTransaction: "Dividend Reinvestment - $112.40" },
  { id: 3, name: "Mercury Operating Account", balance: 43540.50, type: "asset", lastTransaction: "Stripe Payout - $4,200.00" },
];

import Masthead from "@/components/Masthead";

export default function Home() {
  const [activeAccount, setActiveAccount] = useState<number | null>(null);

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 pb-32 min-h-screen flex flex-col">
      <Masthead />

      {/* 2. The Statement */}
      <section className="mb-24 text-center">
        <motion.h2 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-serif text-6xl md:text-8xl tracking-tighter mb-6"
        >
          $124,500.00
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-lg text-foreground/80 max-w-md mx-auto leading-relaxed"
        >
          Your wealth has grown by <span className="text-positive font-medium">$4,500</span> this month.
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
function LedgerRow({ account, isActive, onToggle }: { account: any, isActive: boolean, onToggle: () => void }) {
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
        <span className={`font-serif text-xl ${account.type === 'liability' ? 'text-negative' : 'text-foreground'}`}>
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
              <span>Latest: <span className="text-muted-foreground">{account.lastTransaction}</span></span>
              <button className="underline hover:text-muted-foreground transition-colors">View Ledger</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
