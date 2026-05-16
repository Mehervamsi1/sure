"use client";

import { useEffect, useState } from "react";
import Masthead from "@/components/Masthead";
import { motion, AnimatePresence } from "framer-motion";
import { api, Transaction, Account, Category, CURRENCIES } from "@/lib/api";

const formatCurrency = (value: number, currencyCode: string = "USD") => {
  const curr = CURRENCIES.find(c => c.code === currencyCode);
  const symbol = curr?.symbol || "$";
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value));
  return `${symbol}${formatted}`;
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' });
};

const EXPENSE_CATEGORY_NAMES = [
  "Transit", "Cuisine", "Habitat", "Vogue", "Digital", "Finance",
  "Wellness", "Career", "Leisure", "Retail", "Benevolence", "Charges"
];

const INCOME_CATEGORY_NAMES = [
  "Assets", "Creative", "Enterprise", "Family", "Finance (Income)",
  "Investments (Income)", "Reimbursements", "Salary", "Scholarships", "Windfalls"
];

const INVESTMENT_SUBCATEGORIES = [
  "Investments", "Mutual Funds", "Savings", "Stocks", "ETFs",
  "Bond Returns", "Capital Gains", "Crypto Profits", "Dividends",
  "Investment Returns", "SIP Withdrawals"
];

type FormMode = "expense" | "income" | "transfer";

const inputClass = "border-b border-border bg-transparent py-2 focus:outline-none focus:border-foreground font-serif text-xl w-full";
const selectClass = "border-b border-border bg-transparent py-2 focus:outline-none focus:border-foreground font-serif text-xl cursor-pointer w-full appearance-none";
const labelClass = "text-xs tracking-widest uppercase text-muted-foreground";

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("expense");

  // Shared form state
  const [name, setName] = useState("");
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("CAD");
  const [accountId, setAccountId] = useState("");
  const [parentCategoryId, setParentCategoryId] = useState("");
  const [childCategoryId, setChildCategoryId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSub, setIsSub] = useState(false);
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Edit / Delete
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null);
  const [editName, setEditName] = useState("");
  const [editMerchant, setEditMerchant] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editCurrency, setEditCurrency] = useState("CAD");
  const [editDate, setEditDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editChildCategoryId, setEditChildCategoryId] = useState("");
  const [editIsSub, setEditIsSub] = useState(false);
  const [editBillingCycle, setEditBillingCycle] = useState("monthly");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);


  const loadData = async () => {
    const results = await Promise.allSettled([
      api.getTransactions(),
      api.getAccounts(),
      api.getCategories()
    ]);
    if (results[0].status === "fulfilled") setTransactions(results[0].value);
    if (results[1].status === "fulfilled") {
      const accs = results[1].value;
      setAccounts(accs);
      if (accs.length > 0 && !accountId) {
        setAccountId(accs[0].id.toString());
      }
    }
    if (results[2].status === "fulfilled") setCategories(results[2].value);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter categories by form mode
  const expenseCategories = categories.filter(c => EXPENSE_CATEGORY_NAMES.includes(c.name));
  const incomeCategories = categories.filter(c => INCOME_CATEGORY_NAMES.includes(c.name));
  const activeCategories = formMode === "expense" ? expenseCategories : incomeCategories;

  const selectedParent = categories.find(c => c.id.toString() === parentCategoryId);
  const childCategories = selectedParent?.children || [];

  const resetForm = () => {
    setName("");
    setMerchant("");
    setAmount("");
    setCurrency("CAD");
    setParentCategoryId("");
    setChildCategoryId("");
    setIsSub(false);
    setBillingCycle("monthly");
    setNotes("");
    setFormError(null);
  };

  const openEdit = (t: Transaction) => {
    setEditingTxn(t);
    setEditName(t.name);
    setEditMerchant(t.merchant_name || "");
    setEditAmount(Math.abs(t.amount).toString());
    setEditCurrency(t.currency || "CAD");
    setEditDate(new Date(t.date).toISOString().split("T")[0]);
    setEditNotes(t.notes || "");
    setEditIsSub(t.is_subscription);
    setEditBillingCycle(t.billing_cycle || "monthly");
    const catId = t.category_id;
    if (catId) {
      const parent = categories.find(c => c.id === catId);
      if (parent) {
        setEditCategoryId(catId.toString());
        setEditChildCategoryId("");
      } else {
        const parentCat = categories.find(c => c.children?.some(ch => ch.id === catId));
        if (parentCat) {
          setEditCategoryId(parentCat.id.toString());
          setEditChildCategoryId(catId.toString());
        } else {
          setEditCategoryId("");
          setEditChildCategoryId("");
        }
      }
    } else {
      setEditCategoryId("");
      setEditChildCategoryId("");
    }
    setEditError(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTxn) return;
    setEditSubmitting(true);
    setEditError(null);
    try {
      const parsedAmount = parseFloat(editAmount);
      const finalAmount = editingTxn.type === "expense" ? -Math.abs(parsedAmount) : Math.abs(parsedAmount);
      const finalCategoryId = editChildCategoryId ? parseInt(editChildCategoryId) : (editCategoryId ? parseInt(editCategoryId) : undefined);

      await api.updateTransaction(editingTxn.id, {
        name: editName,
        merchant_name: editMerchant || undefined,
        amount: finalAmount,
        currency: editCurrency,
        date: new Date(editDate).toISOString(),
        notes: editNotes || undefined,
        category_id: finalCategoryId,
        is_subscription: editIsSub,
        billing_cycle: editIsSub ? editBillingCycle : undefined,
      });
      setEditingTxn(null);
      loadData();
    } catch (err: any) {
      setEditError(err.message || "Failed to update transaction.");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await api.deleteTransaction(id);
      setEditingTxn(null);
      loadData();
    } catch (err: any) {
      setEditError(err.message || "Failed to delete transaction.");
    } finally {
      setDeletingId(null);
    }
  };

  const editParentCategory = categories.find(c => c.id.toString() === editCategoryId);
  const editChildCategories = editParentCategory?.children || [];

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const parsedAmount = parseFloat(amount);
      const finalAmount = -Math.abs(parsedAmount);
      const finalCategoryId = childCategoryId ? parseInt(childCategoryId) : (parentCategoryId ? parseInt(parentCategoryId) : undefined);

      await api.createTransaction({
        account_id: parseInt(accountId),
        amount: finalAmount,
        currency,
        name,
        merchant_name: merchant || undefined,
        type: "expense",
        category_id: finalCategoryId,
        is_subscription: isSub,
        billing_cycle: isSub ? billingCycle : undefined,
        notes: notes || undefined,
        date: new Date(date).toISOString(),
      });
      setShowForm(false);
      resetForm();
      loadData();
    } catch (err: any) {
      setFormError(err.message || "Failed to log expense.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleIncomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const parsedAmount = parseFloat(amount);
      const finalAmount = Math.abs(parsedAmount);
      const finalCategoryId = childCategoryId ? parseInt(childCategoryId) : (parentCategoryId ? parseInt(parentCategoryId) : undefined);

      // If depositing to Cash/Wallet (no real account), use the first account as fallback
      const targetAccountId = accountId === "cash"
        ? (accounts.length > 0 ? accounts[0].id : 0)
        : parseInt(accountId);

      await api.createTransaction({
        account_id: targetAccountId,
        amount: finalAmount,
        currency,
        name,
        merchant_name: merchant || undefined,
        type: "income",
        category_id: finalCategoryId,
        income_source: selectedParent?.name || undefined,
        source_detail: childCategoryId ? (selectedParent?.children?.find(c => c.id.toString() === childCategoryId)?.name) : undefined,
        is_subscription: isSub,
        billing_cycle: isSub ? billingCycle : undefined,
        notes: notes ? (accountId === "cash" ? `[Cash/Wallet] ${notes}` : notes) : (accountId === "cash" ? "[Cash/Wallet]" : undefined),
        date: new Date(date).toISOString(),
      });
      setShowForm(false);
      resetForm();
      loadData();
    } catch (err: any) {
      setFormError(err.message || "Failed to record income.");
    } finally {
      setSubmitting(false);
    }
  };

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
            <div className="border border-border p-8 bg-muted/10">
              {/* Transaction Type Tabs */}
              <div className="mb-8">
                <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-4">Transaction Type</label>
                <div className="flex gap-2">
                  {(["expense", "income", "transfer"] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => { setFormMode(t); setParentCategoryId(""); setChildCategoryId(""); setFormError(null); }}
                      className={`py-2 px-6 text-sm tracking-widest uppercase border transition-colors ${
                        formMode === t
                          ? "bg-foreground text-background border-foreground"
                          : "border-border hover:border-foreground"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {formMode === "expense" && (
                <TransactionForm
                  mode="expense"
                  name={name} setName={setName}
                  merchant={merchant} setMerchant={setMerchant}
                  amount={amount} setAmount={setAmount}
                  currency={currency} setCurrency={setCurrency}
                  accountId={accountId} setAccountId={setAccountId}
                  parentCategoryId={parentCategoryId} setParentCategoryId={setParentCategoryId}
                  childCategoryId={childCategoryId} setChildCategoryId={setChildCategoryId}
                  date={date} setDate={setDate}
                  isSub={isSub} setIsSub={setIsSub}
                  billingCycle={billingCycle} setBillingCycle={setBillingCycle}
                  notes={notes} setNotes={setNotes}
                  accounts={accounts}
                  filteredCategories={activeCategories}
                  childCategories={childCategories}

                  submitting={submitting}
                  formError={formError}
                  onSubmit={handleExpenseSubmit}
                />
              )}

              {formMode === "income" && (
                <TransactionForm
                  mode="income"
                  name={name} setName={setName}
                  merchant={merchant} setMerchant={setMerchant}
                  amount={amount} setAmount={setAmount}
                  currency={currency} setCurrency={setCurrency}
                  accountId={accountId} setAccountId={setAccountId}
                  parentCategoryId={parentCategoryId} setParentCategoryId={setParentCategoryId}
                  childCategoryId={childCategoryId} setChildCategoryId={setChildCategoryId}
                  date={date} setDate={setDate}
                  isSub={isSub} setIsSub={setIsSub}
                  billingCycle={billingCycle} setBillingCycle={setBillingCycle}
                  notes={notes} setNotes={setNotes}
                  accounts={accounts}
                  filteredCategories={activeCategories}
                  childCategories={childCategories}

                  submitting={submitting}
                  formError={formError}
                  onSubmit={handleIncomeSubmit}
                />
              )}

              {formMode === "transfer" && (
                <div className="py-12 text-center text-muted-foreground italic">
                  Transfer form — coming next.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transaction Ledger */}
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
            transactions.map((t, i) => {
              const catName = t.category_id ? categoryLookup[t.category_id] : null;
              const isInvestment = catName ? INVESTMENT_SUBCATEGORIES.includes(catName) : false;
              const amountColor = isInvestment
                ? "text-[#4A6FA5]"
                : t.amount < 0
                  ? "text-negative"
                  : "text-positive";

              return (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  key={t.id}
                  className="border-b border-border/50 group cursor-pointer hover:bg-muted/30 transition-colors"
                >
                  <div className="grid grid-cols-12 gap-4 items-center py-4 px-2">
                    <div className="col-span-2 text-sm text-muted-foreground">{formatDate(t.date)}</div>
                    <div className="col-span-5">
                      <span className="font-serif text-xl block">{t.merchant_name || t.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {t.type === "transfer" ? "Transfer" : t.type === "income" ? "Income" : accounts.find(a => a.id === t.account_id)?.name}
                        {t.is_subscription && " · Recurring"}
                        {t.currency && t.currency !== "USD" && ` · ${t.currency}`}
                      </span>
                    </div>
                    <div className="col-span-2 text-xs text-muted-foreground">
                      {catName || "—"}
                    </div>
                    <div className={`col-span-3 text-right font-serif text-xl ${amountColor}`}>
                      {t.amount < 0 ? "−" : "+"}{formatCurrency(t.amount, t.currency || "USD")}
                    </div>
                  </div>

                  {/* Hover reveal: notes + edit/delete */}
                  <div className="max-h-0 overflow-hidden group-hover:max-h-24 transition-all duration-300 ease-in-out">
                    <div className="flex justify-between items-center px-2 pb-3 pt-1">
                      <span className="text-xs text-muted-foreground italic truncate max-w-[60%]">
                        {t.notes || "No notes."}
                      </span>
                      <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(t)}
                          className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          disabled={deletingId === t.id}
                          className="text-xs uppercase tracking-widest text-negative/70 hover:text-negative transition-colors disabled:opacity-50"
                        >
                          {deletingId === t.id ? "Removing..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </section>

      {/* ── Edit Modal ── */}
      <AnimatePresence>
        {editingTxn && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm"
            onClick={() => setEditingTxn(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-background border border-border p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="font-serif text-3xl tracking-tight">Edit Transaction</h2>
                <button
                  onClick={() => setEditingTxn(null)}
                  className="text-muted-foreground hover:text-foreground text-2xl leading-none"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="flex flex-col gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className={labelClass}>Title</label>
                    <input type="text" required value={editName} onChange={e => setEditName(e.target.value)} className={inputClass} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className={labelClass}>Merchant / Entity</label>
                    <input type="text" value={editMerchant} onChange={e => setEditMerchant(e.target.value)} className={inputClass} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className={labelClass}>Amount</label>
                    <input type="number" required step="0.01" value={editAmount} onChange={e => setEditAmount(e.target.value)} className={inputClass} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className={labelClass}>Currency</label>
                    <select value={editCurrency} onChange={e => setEditCurrency(e.target.value)} className={selectClass}>
                      {CURRENCIES.map(c => (
                        <option key={c.code} value={c.code} className="bg-background text-foreground">{c.symbol} {c.code}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className={labelClass}>Date</label>
                    <input type="date" required value={editDate} onChange={e => setEditDate(e.target.value)} className={inputClass} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className={labelClass}>Category</label>
                    <select
                      value={editCategoryId}
                      onChange={e => { setEditCategoryId(e.target.value); setEditChildCategoryId(""); }}
                      className={selectClass}
                    >
                      <option value="" className="bg-background text-foreground">Select category...</option>
                      {(editingTxn.type === "income" ? incomeCategories : expenseCategories).map(cat => (
                        <option key={cat.id} value={cat.id} className="bg-background text-foreground">{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  {editChildCategories.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <label className={labelClass}>Sub-Category</label>
                      <select value={editChildCategoryId} onChange={e => setEditChildCategoryId(e.target.value)} className={selectClass}>
                        <option value="" className="bg-background text-foreground">Select sub-category...</option>
                        {editChildCategories.map(child => (
                          <option key={child.id} value={child.id} className="bg-background text-foreground">{child.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <label className={labelClass}>Recurring?</label>
                  <button
                    type="button"
                    onClick={() => setEditIsSub(!editIsSub)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${editIsSub ? 'bg-foreground' : 'bg-border'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-background transition-transform ${editIsSub ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>

                {editIsSub && (
                  <div className="flex gap-2 flex-wrap">
                    {(["weekly", "fortnightly", "monthly", "yearly"] as const).map(cycle => (
                      <button
                        key={cycle} type="button" onClick={() => setEditBillingCycle(cycle)}
                        className={`py-2 px-6 text-sm tracking-widest uppercase border transition-colors ${
                          editBillingCycle === cycle ? "bg-foreground text-background border-foreground" : "border-border hover:border-foreground"
                        }`}
                      >
                        {cycle}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <label className={labelClass}>Notes</label>
                  <textarea
                    value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={2}
                    className="border-b border-border bg-transparent py-2 focus:outline-none focus:border-foreground font-serif text-lg resize-none"
                    placeholder="Optional notes..."
                  />
                </div>

                {editError && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-negative text-sm border-b border-negative/30 pb-2">
                    {editError}
                  </motion.div>
                )}

                <div className="flex justify-between items-center mt-4">
                  <button
                    type="button"
                    onClick={() => editingTxn && handleDelete(editingTxn.id)}
                    disabled={deletingId === editingTxn.id}
                    className="text-sm tracking-widest uppercase text-negative/70 hover:text-negative transition-colors disabled:opacity-50"
                  >
                    {deletingId === editingTxn.id ? "Deleting..." : "Delete Transaction"}
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    type="submit"
                    disabled={editSubmitting}
                    className="bg-foreground text-background py-3 px-8 text-sm tracking-widest uppercase hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {editSubmitting ? "Saving..." : "Save Changes"}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Unified Transaction Form ────────────────────────────────────────

interface TransactionFormProps {
  mode: "expense" | "income";
  name: string; setName: (v: string) => void;
  merchant: string; setMerchant: (v: string) => void;
  amount: string; setAmount: (v: string) => void;
  currency: string; setCurrency: (v: string) => void;
  accountId: string; setAccountId: (v: string) => void;
  parentCategoryId: string; setParentCategoryId: (v: string) => void;
  childCategoryId: string; setChildCategoryId: (v: string) => void;
  date: string; setDate: (v: string) => void;
  isSub: boolean; setIsSub: (v: boolean) => void;
  billingCycle: string; setBillingCycle: (v: string) => void;
  notes: string; setNotes: (v: string) => void;
  accounts: Account[];
  filteredCategories: Category[];
  childCategories: Category[];
  submitting: boolean;
  formError: string | null;
  onSubmit: (e: React.FormEvent) => void;
}

function TransactionForm({
  mode, name, setName, merchant, setMerchant, amount, setAmount,
  currency, setCurrency, accountId, setAccountId,
  parentCategoryId, setParentCategoryId, childCategoryId, setChildCategoryId,
  date, setDate, isSub, setIsSub, billingCycle, setBillingCycle,
  notes, setNotes, accounts, filteredCategories, childCategories,
  submitting, formError, onSubmit
}: TransactionFormProps) {

  const isIncome = mode === "income";

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-8">
      {/* Row 1: Title + Source/Merchant */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <label className={labelClass}>{isIncome ? "Description" : "Title"}</label>
          <input
            type="text" required value={name} onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder={isIncome ? "e.g. Monthly Salary" : "e.g. Morning Espresso"}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className={labelClass}>{isIncome ? "Source / Payer" : "Merchant / Entity"}</label>
          <input
            type="text" value={merchant} onChange={(e) => setMerchant(e.target.value)}
            className={inputClass}
            placeholder={isIncome ? "e.g. Acme Corp" : "e.g. Aroma Café"}
          />
        </div>
      </div>

      {/* Row 2: Amount + Currency + Date */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="flex flex-col gap-2">
          <label className={labelClass}>Amount</label>
          <input
            type="number" required step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
            className={inputClass}
            placeholder="0.00"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className={labelClass}>Currency</label>
          <select
            value={currency} onChange={(e) => setCurrency(e.target.value)}
            className={selectClass}
          >
            {CURRENCIES.map(c => (
              <option key={c.code} value={c.code} className="bg-background text-foreground">
                {c.symbol} {c.code} — {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className={labelClass}>Date</label>
          <input
            type="date" required value={date} onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {/* Row 3: Account */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <label className={labelClass}>{isIncome ? "Deposit Into" : "Debit From (Account)"}</label>
          <select
            value={accountId} onChange={(e) => setAccountId(e.target.value)}
            className={selectClass}
          >
            {isIncome && (
              <option value="cash" className="bg-background text-foreground">
                Cash / Wallet
              </option>
            )}
            {accounts.map(acc => {
              const curr = CURRENCIES.find(c => c.code === acc.currency);
              return (
                <option key={acc.id} value={acc.id} className="bg-background text-foreground">
                  {acc.name} ({curr?.symbol || "$"}{acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} {acc.currency})
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Row 4: Category + Subcategory */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <label className={labelClass}>Category</label>
          <select
            value={parentCategoryId}
            onChange={(e) => { setParentCategoryId(e.target.value); setChildCategoryId(""); }}
            className={selectClass}
          >
            <option value="" className="bg-background text-foreground">Select category…</option>
            {filteredCategories.map(cat => (
              <option key={cat.id} value={cat.id} className="bg-background text-foreground">{cat.name}</option>
            ))}
          </select>
        </div>
        <AnimatePresence mode="wait">
          {childCategories.length > 0 && (
            <motion.div
              key={parentCategoryId}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex flex-col gap-2"
            >
              <label className={labelClass}>Sub-Category</label>
              <select
                value={childCategoryId} onChange={(e) => setChildCategoryId(e.target.value)}
                className={selectClass}
              >
                <option value="" className="bg-background text-foreground">Select sub-category…</option>
                {childCategories.map(child => (
                  <option key={child.id} value={child.id} className="bg-background text-foreground">{child.name}</option>
                ))}
              </select>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Recurring Toggle */}
      <div className="flex items-center gap-4">
        <label className={labelClass}>Recurring?</label>
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
            <div className="flex gap-2 flex-wrap">
              {(["weekly", "fortnightly", "monthly", "yearly"] as const).map(cycle => (
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

      {/* Notes */}
      <div className="flex flex-col gap-2">
        <label className={labelClass}>Notes</label>
        <textarea
          value={notes} onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="border-b border-border bg-transparent py-2 focus:outline-none focus:border-foreground font-serif text-lg resize-none"
          placeholder="Optional notes…"
        />
      </div>

      {/* Error Display */}
      {formError && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-negative text-sm border-b border-negative/30 pb-2"
        >
          {formError}
        </motion.div>
      )}

      {/* Submit */}
      <div className="flex justify-end mt-4">
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          type="submit"
          disabled={submitting}
          className="bg-foreground text-background py-3 px-8 text-sm tracking-widest uppercase hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {submitting ? "Processing..." : isIncome ? "Record Income" : "Log Expense"}
        </motion.button>
      </div>
    </form>
  );
}
