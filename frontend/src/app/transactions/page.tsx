"use client";

import { useEffect, useState } from "react";
import Masthead from "@/components/Masthead";
import { motion, AnimatePresence } from "framer-motion";
import { api, Transaction, Account, Category } from "@/lib/api";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(value));
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form State
  const [txType, setTxType] = useState<"expense" | "income" | "transfer">("expense");
  const [name, setName] = useState("");
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [destAccountId, setDestAccountId] = useState("");
  const [parentCategoryId, setParentCategoryId] = useState("");
  const [childCategoryId, setChildCategoryId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSub, setIsSub] = useState(false);
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [notes, setNotes] = useState("");

  const loadData = async () => {
    try {
      const [txs, accs, cats] = await Promise.all([
        api.getTransactions(),
        api.getAccounts(),
        api.getCategories()
      ]);
      setTransactions(txs);
      setAccounts(accs);
      setCategories(cats);
      if (accs.length > 0 && !accountId) {
        setAccountId(accs[0].id.toString());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Get children for the selected parent category
  const selectedParent = categories.find(c => c.id.toString() === parentCategoryId);
  const childCategories = selectedParent?.children || [];

  const resetForm = () => {
    setTxType("expense");
    setName("");
    setMerchant("");
    setAmount("");
    setParentCategoryId("");
    setChildCategoryId("");
    setIsSub(false);
    setBillingCycle("monthly");
    setNotes("");
    setDestAccountId("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsedAmount = parseFloat(amount);
      // For expenses, ensure amount is negative
      const finalAmount = txType === "expense" ? -Math.abs(parsedAmount) : Math.abs(parsedAmount);
      // For transfers, the source loses money
      const transferAmount = txType === "transfer" ? -Math.abs(parsedAmount) : finalAmount;

      // Use child category if selected, otherwise parent
      const finalCategoryId = childCategoryId ? parseInt(childCategoryId) : (parentCategoryId ? parseInt(parentCategoryId) : undefined);

      await api.createTransaction({
        account_id: parseInt(accountId),
        amount: transferAmount,
        name,
        merchant_name: merchant || undefined,
        type: txType,
        category_id: finalCategoryId,
        destination_account_id: txType === "transfer" && destAccountId ? parseInt(destAccountId) : undefined,
        is_subscription: isSub,
        billing_cycle: isSub ? billingCycle : undefined,
        notes: notes || undefined,
        date: new Date(date).toISOString(),
      });
      setShowForm(false);
      resetForm();
      loadData();
    } catch (err) {
      console.error("Failed to create transaction", err);
    }
  };

  // Check if the selected parent is "Investments" to auto-switch to transfer
  useEffect(() => {
    const parent = categories.find(c => c.id.toString() === parentCategoryId);
    if (parent?.name === "Investments") {
      setTxType("transfer");
    }
  }, [parentCategoryId, categories]);

  // Check if the selected parent is "Subscriptions" to auto-toggle subscription
  useEffect(() => {
    const parent = categories.find(c => c.id.toString() === parentCategoryId);
    if (parent?.name === "Subscriptions") {
      setIsSub(true);
    }
  }, [parentCategoryId, categories]);

  // Build a lookup map: category_id -> category_name
  const categoryLookup: Record<number, string> = {};
  categories.forEach(parent => {
    categoryLookup[parent.id] = parent.name;
    parent.children?.forEach(child => {
      categoryLookup[child.id] = child.name;
    });
  });

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12 min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground animate-pulse tracking-widest uppercase text-xs">Loading Archive...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 pb-32 min-h-screen flex flex-col">
      <Masthead />
      
      <section className="mb-12 flex justify-between items-end">
        <div>
          <h1 className="font-serif text-5xl md:text-6xl tracking-tighter mb-4">The Archive</h1>
          <p className="text-muted-foreground">Every movement of capital, cataloged.</p>
        </div>
        <button 
          onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }}
          className="border border-foreground py-2 px-6 text-sm tracking-widest uppercase hover:bg-foreground hover:text-background transition-colors"
        >
          {showForm ? "Cancel" : "+ Log Transaction"}
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
            <form onSubmit={handleSubmit} className="border border-border p-8 bg-muted/10 flex flex-col gap-8">
              
              {/* ── Transaction Type Selector ── */}
              <div>
                <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-4">Transaction Type</label>
                <div className="flex gap-2">
                  {(["expense", "income", "transfer"] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTxType(t)}
                      className={`py-2 px-6 text-sm tracking-widest uppercase border transition-colors ${
                        txType === t 
                          ? "bg-foreground text-background border-foreground" 
                          : "border-border hover:border-foreground"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Core Fields ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-xs tracking-widest uppercase text-muted-foreground">Title</label>
                  <input 
                    type="text" required value={name} onChange={(e) => setName(e.target.value)}
                    className="border-b border-border bg-transparent py-2 focus:outline-none focus:border-foreground font-serif text-xl" 
                    placeholder={txType === "transfer" ? "e.g. Move to Investments" : "e.g. Dinner with Client"}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs tracking-widest uppercase text-muted-foreground">Amount</label>
                  <input 
                    type="number" required step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
                    className="border-b border-border bg-transparent py-2 focus:outline-none focus:border-foreground font-serif text-xl" 
                    placeholder="120.00"
                  />
                </div>
                {txType !== "transfer" && (
                  <div className="flex flex-col gap-2">
                    <label className="text-xs tracking-widest uppercase text-muted-foreground">Merchant / Entity</label>
                    <input 
                      type="text" value={merchant} onChange={(e) => setMerchant(e.target.value)}
                      className="border-b border-border bg-transparent py-2 focus:outline-none focus:border-foreground font-serif text-xl" 
                      placeholder="e.g. Balthazar"
                    />
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <label className="text-xs tracking-widest uppercase text-muted-foreground">Date</label>
                  <input 
                    type="date" required value={date} onChange={(e) => setDate(e.target.value)}
                    className="border-b border-border bg-transparent py-2 focus:outline-none focus:border-foreground font-serif text-xl" 
                  />
                </div>
              </div>

              {/* ── Account Selection ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-xs tracking-widest uppercase text-muted-foreground">
                    {txType === "transfer" ? "From Account" : "Payment Method (Account)"}
                  </label>
                  <select 
                    value={accountId} onChange={(e) => setAccountId(e.target.value)}
                    className="border-b border-border bg-transparent py-2 focus:outline-none focus:border-foreground font-serif text-xl cursor-pointer"
                  >
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                </div>
                {txType === "transfer" && (
                  <div className="flex flex-col gap-2">
                    <label className="text-xs tracking-widest uppercase text-muted-foreground">To Account</label>
                    <select 
                      value={destAccountId} onChange={(e) => setDestAccountId(e.target.value)}
                      className="border-b border-border bg-transparent py-2 focus:outline-none focus:border-foreground font-serif text-xl cursor-pointer"
                    >
                      <option value="">Select destination…</option>
                      {accounts.filter(a => a.id.toString() !== accountId).map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* ── Category Dropdowns (Parent → Child) ── */}
              {txType !== "transfer" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs tracking-widest uppercase text-muted-foreground">Category</label>
                    <select 
                      value={parentCategoryId} 
                      onChange={(e) => { setParentCategoryId(e.target.value); setChildCategoryId(""); }}
                      className="border-b border-border bg-transparent py-2 focus:outline-none focus:border-foreground font-serif text-xl cursor-pointer"
                    >
                      <option value="">Select category…</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  {childCategories.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex flex-col gap-2"
                    >
                      <label className="text-xs tracking-widest uppercase text-muted-foreground">Sub-Category</label>
                      <select 
                        value={childCategoryId} onChange={(e) => setChildCategoryId(e.target.value)}
                        className="border-b border-border bg-transparent py-2 focus:outline-none focus:border-foreground font-serif text-xl cursor-pointer"
                      >
                        <option value="">Select sub-category…</option>
                        {childCategories.map(child => (
                          <option key={child.id} value={child.id}>{child.name}</option>
                        ))}
                      </select>
                    </motion.div>
                  )}
                </div>
              )}

              {/* ── Subscription Toggle ── */}
              <div className="flex items-center gap-4">
                <label className="text-xs tracking-widest uppercase text-muted-foreground">Subscription?</label>
                <button
                  type="button"
                  onClick={() => setIsSub(!isSub)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${isSub ? 'bg-foreground' : 'bg-border'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-background transition-transform ${isSub ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>

              <AnimatePresence>
                {isSub && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex gap-2">
                      {(["monthly", "yearly"] as const).map(cycle => (
                        <button
                          key={cycle}
                          type="button"
                          onClick={() => setBillingCycle(cycle)}
                          className={`py-2 px-6 text-sm tracking-widest uppercase border transition-colors ${
                            billingCycle === cycle 
                              ? "bg-foreground text-background border-foreground" 
                              : "border-border hover:border-foreground"
                          }`}
                        >
                          {cycle}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Notes ── */}
              <div className="flex flex-col gap-2">
                <label className="text-xs tracking-widest uppercase text-muted-foreground">Notes</label>
                <textarea 
                  value={notes} onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="border-b border-border bg-transparent py-2 focus:outline-none focus:border-foreground font-serif text-lg resize-none" 
                  placeholder="Optional notes…"
                />
              </div>

              {/* ── Receipt Upload (UI Only) ── */}
              <div className="flex flex-col gap-2">
                <label className="text-xs tracking-widest uppercase text-muted-foreground">Receipt</label>
                <div className="border border-dashed border-border py-8 flex flex-col items-center justify-center cursor-pointer hover:border-foreground transition-colors">
                  <span className="text-muted-foreground text-sm">Drag & drop receipt here, or click to upload</span>
                  <span className="text-xs text-muted-foreground/60 mt-1">Storage will be configured in a future phase</span>
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <button type="submit" className="bg-foreground text-background py-3 px-8 text-sm tracking-widest uppercase hover:opacity-90 transition-opacity">
                  {txType === "transfer" ? "Execute Transfer" : txType === "income" ? "Record Income" : "Log Expense"}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Transaction Ledger ── */}
      <section className="flex-1">
        <div className="grid grid-cols-12 gap-4 text-xs tracking-widest uppercase text-muted-foreground mb-4 px-2">
          <div className="col-span-2">Date</div>
          <div className="col-span-5">Entity</div>
          <div className="col-span-2">Category</div>
          <div className="col-span-3 text-right">Amount</div>
        </div>

        <div className="border-t border-border">
          {transactions.length === 0 ? (
            <p className="text-muted-foreground mt-8 text-center italic">No transactions recorded yet.</p>
          ) : (
            transactions.map((t, i) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                key={t.id} 
                className="grid grid-cols-12 gap-4 items-center py-4 px-2 border-b border-border/50 group cursor-pointer hover:bg-muted/30 transition-colors"
              >
                <div className="col-span-2 text-sm text-muted-foreground">{formatDate(t.date)}</div>
                <div className="col-span-5">
                  <span className="font-serif text-xl block">{t.merchant_name || t.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {t.type === "transfer" ? "Transfer" : accounts.find(a => a.id === t.account_id)?.name}
                    {t.is_subscription && " · Subscription"}
                  </span>
                </div>
                <div className="col-span-2 text-xs text-muted-foreground">
                  {t.category_id ? categoryLookup[t.category_id] || "—" : "—"}
                </div>
                <div className={`col-span-3 text-right font-serif text-xl ${t.amount < 0 ? 'text-foreground' : 'text-positive'}`}>
                  {t.amount < 0 ? "-" : "+"}{formatCurrency(t.amount)}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
