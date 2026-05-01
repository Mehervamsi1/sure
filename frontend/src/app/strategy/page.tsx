"use client";

import Masthead from "@/components/Masthead";
import { motion } from "framer-motion";

const strategyMetrics = [
  { label: "Target Monthly Spend", value: 4500 },
  { label: "Current Spend", value: 3240.50 },
  { label: "Remaining Velocity", value: 1259.50 },
];

const categories = [
  { name: "Housing", allocated: 2000, spent: 2000 },
  { name: "Food & Dining", allocated: 800, spent: 650 },
  { name: "Transportation", allocated: 400, spent: 120 },
  { name: "Software & Subs", allocated: 100, spent: 45 },
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);
};

export default function Strategy() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 pb-32 min-h-screen flex flex-col">
      <Masthead />
      
      <section className="mb-16">
        <h1 className="font-serif text-5xl md:text-6xl tracking-tighter mb-4">The Strategy</h1>
        <p className="text-muted-foreground">Capital allocation and burn rate.</p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 border-b border-border pb-12">
        {strategyMetrics.map((metric, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={metric.label}
          >
            <h3 className="text-xs tracking-widest uppercase text-muted-foreground mb-2">{metric.label}</h3>
            <p className="font-serif text-4xl">{formatCurrency(metric.value)}</p>
          </motion.div>
        ))}
      </section>

      <section className="flex-1">
        <div className="flex justify-between items-end border-b border-border pb-2 mb-4">
          <h2 className="text-sm tracking-widest uppercase text-muted-foreground">Allocation</h2>
          <span className="text-xs uppercase tracking-widest text-muted-foreground">Spent / Target</span>
        </div>
        
        <div className="space-y-6 mt-6">
          {categories.map((cat, i) => {
            const percentage = Math.min((cat.spent / cat.allocated) * 100, 100);
            const isOver = cat.spent > cat.allocated;
            return (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.1 + 0.3 }}
                key={cat.name} 
                className="group"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-lg">{cat.name}</span>
                  <span className={`font-serif text-xl ${isOver ? 'text-negative' : 'text-foreground'}`}>
                    {formatCurrency(cat.spent)} <span className="text-muted-foreground text-sm">/ {formatCurrency(cat.allocated)}</span>
                  </span>
                </div>
                {/* Brutalist progress bar */}
                <div className="h-1 w-full bg-muted overflow-hidden">
                  <div 
                    className={`h-full ${isOver ? 'bg-negative' : 'bg-foreground'}`} 
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </motion.div>
            )
          })}
        </div>
      </section>
    </div>
  );
}
