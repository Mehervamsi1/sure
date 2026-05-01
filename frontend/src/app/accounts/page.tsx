"use client";

import Masthead from "@/components/Masthead";
import { motion } from "framer-motion";

const groups = [
  {
    name: "Liquid Assets",
    total: 43540.50,
    accounts: [
      { name: "Mercury Operating", balance: 43540.50, type: "asset" },
      { name: "Chase Checking", balance: 1200.00, type: "asset" },
    ]
  },
  {
    name: "Investments",
    total: 84200.00,
    accounts: [
      { name: "Vanguard Total Stock ETF", balance: 64200.00, type: "asset" },
      { name: "Fidelity 401k", balance: 20000.00, type: "asset" },
    ]
  },
  {
    name: "Liabilities",
    total: -3240.50,
    accounts: [
      { name: "Chase Sapphire Reserve", balance: -3240.50, type: "liability" },
    ]
  }
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

export default function Accounts() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 pb-32 min-h-screen flex flex-col">
      <Masthead />
      
      <section className="mb-16">
        <h1 className="font-serif text-5xl md:text-6xl tracking-tighter mb-4">The Holdings</h1>
        <p className="text-muted-foreground">The structure of your net worth.</p>
      </section>

      <section className="flex-1 space-y-16">
        {groups.map((group, i) => (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            key={group.name}
          >
            <div className="flex justify-between items-end border-b border-border pb-2 mb-4">
              <h2 className="text-sm tracking-widest uppercase text-muted-foreground">{group.name}</h2>
              <span className="font-serif text-xl">{formatCurrency(group.total)}</span>
            </div>
            
            <div className="space-y-1">
              {group.accounts.map(acc => (
                <div key={acc.name} className="flex justify-between items-center py-3 px-2 cursor-pointer hover:bg-muted/30 transition-colors">
                  <span className="font-medium">{acc.name}</span>
                  <span className={`font-serif text-lg ${acc.type === 'liability' ? 'text-negative' : 'text-foreground'}`}>
                    {formatCurrency(acc.balance)}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </section>
    </div>
  );
}
