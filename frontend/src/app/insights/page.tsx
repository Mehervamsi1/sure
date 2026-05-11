"use client";

import { useEffect, useState } from "react";
import Masthead from "@/components/Masthead";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import BespokeSankey from "@/components/BespokeSankey";
import { api, Account, CategorySpending } from "@/lib/api";

const COLORS = ["#1C1C19", "#3E6150", "#D35236", "#828076"];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(value));
};

export default function DeepInsights() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [spending, setSpending] = useState<CategorySpending[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [accs, spend] = await Promise.all([
          api.getAccounts(),
          api.getSpending()
        ]);
        setAccounts(accs);
        setSpending(spend.breakdown);
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
      <div className="max-w-7xl mx-auto px-6 py-12 min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground animate-pulse tracking-widest uppercase text-xs">Loading Insights...</p>
      </div>
    );
  }

  // Calculate outflows data for the Donut Chart
  const totalOutflows = spending.reduce((sum, item) => sum + item.amount, 0);
  
  const outflowsData = spending.map(item => ({
    name: item.category,
    value: item.amount,
    weight: totalOutflows > 0 ? `${((item.amount / totalOutflows) * 100).toFixed(1)}%` : "0%"
  }));

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 pb-32 min-h-screen flex flex-col">
      <Masthead />

      <div className="flex flex-col lg:flex-row gap-12 mt-8">
        {/* Left Side Panel - Granular Accounts */}
        <aside className="w-full lg:w-72 flex-shrink-0 border-r border-border pr-8">
          <div className="flex space-x-6 text-sm tracking-widest uppercase text-muted-foreground mb-8 border-b border-border pb-2">
            <button className="text-foreground font-medium">All</button>
            <button className="hover:text-foreground transition-colors">Assets</button>
            <button className="hover:text-foreground transition-colors">Debts</button>
          </div>

          <button className="w-full text-left font-serif text-lg border border-border py-2 px-4 mb-8 hover:bg-foreground hover:text-background transition-colors">
            + New Account
          </button>

          <div className="space-y-6">
            {accounts.map((acc, i) => {
              const isDebt = ['credit_card', 'loan', 'other_liability'].includes(acc.type);
              return (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={acc.id} 
                  className="flex justify-between items-start group cursor-pointer"
                >
                  <span className="font-medium group-hover:italic transition-all">{acc.name}</span>
                  <div className="text-right">
                    <div className="font-serif text-lg">{formatCurrency(acc.balance)}</div>
                    <div className={`text-xs ${isDebt ? 'text-negative' : 'text-positive'}`}>
                      {/* Placeholder for individual account change */}
                      {isDebt ? "-1.0%" : "+2.4%"}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </aside>

        {/* Right Main Content */}
        <main className="flex-1 space-y-16">
          <header>
            <h1 className="font-serif text-5xl tracking-tighter mb-2">Deep Insights</h1>
            <p className="text-muted-foreground">Here's a breakdown of your wealth architecture.</p>
          </header>

          <BespokeSankey />

          {/* Outflows Donut & Ledger */}
          <section>
            <h2 className="text-sm tracking-widest uppercase text-muted-foreground border-b border-border pb-2 mb-8">Outflows Breakdown</h2>
            <div className="flex flex-col md:flex-row gap-12 items-center border border-border p-8 bg-muted/20">
              
              <div className="w-64 h-64 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={outflowsData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {outflowsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xs tracking-widest uppercase text-muted-foreground">Total Outflows</span>
                  <span className="font-serif text-2xl mt-1">{formatCurrency(totalOutflows)}</span>
                </div>
              </div>

              <div className="flex-1 w-full">
                <div className="flex justify-between text-xs tracking-widest uppercase text-muted-foreground mb-4 border-b border-border/50 pb-2">
                  <span>Category</span>
                  <div className="flex space-x-12">
                    <span>Value</span>
                    <span>Weight</span>
                  </div>
                </div>
                <div className="space-y-4">
                  {outflowsData.map((out, i) => (
                    <div key={out.name} className="flex justify-between items-center group">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="font-medium">{out.name}</span>
                      </div>
                      <div className="flex space-x-12 font-serif text-lg">
                        <span>{formatCurrency(out.value)}</span>
                        <span className="text-muted-foreground w-12 text-right">{out.weight}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </section>

        </main>
      </div>
    </div>
  );
}
