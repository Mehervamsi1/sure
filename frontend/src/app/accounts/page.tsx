"use client";

import { useEffect, useState } from "react";
import Masthead from "@/components/Masthead";
import { motion, AnimatePresence } from "framer-motion";
import { api, Account } from "@/lib/api";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(value));
};

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [type, setType] = useState("depository");
  const [balance, setBalance] = useState("");
  const [institution, setInstitution] = useState("");

  const loadAccounts = async () => {
    try {
      const data = await api.getAccounts();
      setAccounts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createAccount({
        user_id: 1, // Mock current user
        name,
        type,
        balance: parseFloat(balance),
        institution_name: institution,
      });
      setShowForm(false);
      setName("");
      setType("depository");
      setBalance("");
      setInstitution("");
      loadAccounts();
    } catch (err) {
      console.error("Failed to create account", err);
    }
  };

  // Grouping logic
  const assets = accounts.filter(a => !['credit_card', 'loan', 'other_liability'].includes(a.type));
  const liabilities = accounts.filter(a => ['credit_card', 'loan', 'other_liability'].includes(a.type));

  const groups = [
    {
      name: "Assets",
      total: assets.reduce((sum, a) => sum + a.balance, 0),
      accounts: assets
    },
    {
      name: "Liabilities",
      total: liabilities.reduce((sum, a) => sum + a.balance, 0),
      accounts: liabilities
    }
  ];

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12 min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground animate-pulse tracking-widest uppercase text-xs">Loading Holdings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 pb-32 min-h-screen flex flex-col">
      <Masthead />
      
      <section className="mb-12 flex justify-between items-end">
        <div>
          <h1 className="font-serif text-5xl md:text-6xl tracking-tighter mb-4">The Holdings</h1>
          <p className="text-muted-foreground">The structure of your net worth.</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="border border-foreground py-2 px-6 text-sm tracking-widest uppercase hover:bg-foreground hover:text-background transition-colors"
        >
          {showForm ? "Cancel" : "+ New Account"}
        </button>
      </section>

      <AnimatePresence>
        {showForm && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-16"
          >
            <form onSubmit={handleSubmit} className="border border-border p-8 bg-muted/10 flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-xs tracking-widest uppercase text-muted-foreground">Account Name</label>
                  <input 
                    type="text" 
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="border-b border-border bg-transparent py-2 focus:outline-none focus:border-foreground font-serif text-xl" 
                    placeholder="e.g. Secret Stash"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs tracking-widest uppercase text-muted-foreground">Institution</label>
                  <input 
                    type="text" 
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    className="border-b border-border bg-transparent py-2 focus:outline-none focus:border-foreground font-serif text-xl" 
                    placeholder="e.g. Chase"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs tracking-widest uppercase text-muted-foreground">Type</label>
                  <select 
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="border-b border-border bg-transparent py-2 focus:outline-none focus:border-foreground font-serif text-xl cursor-pointer"
                  >
                    <option value="depository">Depository (Checking/Savings)</option>
                    <option value="investment">Investment</option>
                    <option value="property">Property</option>
                    <option value="vehicle">Vehicle</option>
                    <option value="crypto">Crypto</option>
                    <option value="other_asset">Other Asset</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="loan">Loan</option>
                    <option value="other_liability">Other Liability</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs tracking-widest uppercase text-muted-foreground">Starting Balance</label>
                  <input 
                    type="number" 
                    required
                    step="0.01"
                    value={balance}
                    onChange={(e) => setBalance(e.target.value)}
                    className="border-b border-border bg-transparent py-2 focus:outline-none focus:border-foreground font-serif text-xl" 
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <button type="submit" className="bg-foreground text-background py-3 px-8 text-sm tracking-widest uppercase hover:opacity-90 transition-opacity">
                  Add Account
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="flex-1 space-y-16">
        {groups.map((group, i) => (
          group.accounts.length > 0 && (
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
                {group.accounts.map(acc => {
                  const isLiability = ['credit_card', 'loan', 'other_liability'].includes(acc.type);
                  return (
                    <div key={acc.id} className="flex justify-between items-center py-3 px-2 cursor-pointer hover:bg-muted/30 transition-colors group">
                      <div>
                        <span className="font-medium block">{acc.name}</span>
                        <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">{acc.institution_name || 'Manual'}</span>
                      </div>
                      <span className={`font-serif text-lg ${isLiability ? 'text-negative' : 'text-foreground'}`}>
                        {formatCurrency(acc.balance)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )
        ))}
      </section>
    </div>
  );
}
