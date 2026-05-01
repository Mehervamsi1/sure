"use client";

import Masthead from "@/components/Masthead";
import { motion } from "framer-motion";

const transactions = [
  { id: 1, date: "May 1, 2026", merchant: "Sweetgreen", amount: -14.20, category: "Food & Dining" },
  { id: 2, date: "May 1, 2026", merchant: "Stripe Payout", amount: 4200.00, category: "Income" },
  { id: 3, date: "Apr 30, 2026", merchant: "Uber", amount: -24.50, category: "Transportation" },
  { id: 4, date: "Apr 29, 2026", merchant: "Whole Foods", amount: -145.80, category: "Groceries" },
  { id: 5, date: "Apr 28, 2026", merchant: "Equinox", amount: -240.00, category: "Health & Fitness" },
  { id: 6, date: "Apr 28, 2026", merchant: "Apple Subscription", amount: -14.99, category: "Software" },
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

export default function Transactions() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 pb-32 min-h-screen flex flex-col">
      <Masthead />
      
      <section className="mb-16">
        <h1 className="font-serif text-5xl md:text-6xl tracking-tighter mb-4">The Archive</h1>
        <p className="text-muted-foreground">Every movement of capital, cataloged.</p>
      </section>

      <section className="flex-1">
        <div className="grid grid-cols-12 gap-4 text-xs tracking-widest uppercase text-muted-foreground mb-4 px-2">
          <div className="col-span-3">Date</div>
          <div className="col-span-6">Merchant</div>
          <div className="col-span-3 text-right">Amount</div>
        </div>

        <div className="border-t border-border">
          {transactions.map((t, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              key={t.id} 
              className="grid grid-cols-12 gap-4 items-center py-4 px-2 border-b border-border/50 group cursor-pointer hover:bg-muted/30 transition-colors"
            >
              <div className="col-span-3 text-sm text-muted-foreground">{t.date}</div>
              <div className="col-span-6">
                <span className="font-serif text-xl block">{t.merchant}</span>
                <span className="text-xs text-muted-foreground">{t.category}</span>
              </div>
              <div className={`col-span-3 text-right font-serif text-xl ${t.amount < 0 ? 'text-foreground' : 'text-positive'}`}>
                {formatCurrency(t.amount)}
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
