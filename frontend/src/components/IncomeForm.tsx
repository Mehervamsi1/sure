"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api, Account, IncomeOption, CURRENCIES } from "@/lib/api";

const INCOME_SOURCES = [
  { value: "gic", label: "GIC" },
  { value: "parents_money", label: "Parent's Money" },
  { value: "part_time", label: "Part Time" },
  { value: "banking", label: "Banking" },
  { value: "investment_returns", label: "Investment Returns" },
  { value: "money_return", label: "Money Return (SplitWise)" },
  { value: "full_time", label: "Full Time" },
] as const;

// Which sources need sub-detail dropdowns
const SOURCES_WITH_DETAIL: Record<string, string> = {
  part_time: "part_time_name",
  full_time: "full_time_name",
  banking: "banking_source",
  investment_returns: "investment_type",
};

// Which sources need a text field after sub-detail
const SOURCES_WITH_TEXT: Record<string, string> = {
  banking: "Bank Name",
  investment_returns: "Investment Name",
};

interface IncomeFormProps {
  accounts: Account[];
  onSubmit: () => void;
  onCancel: () => void;
}

export default function IncomeForm({ accounts, onSubmit, onCancel }: IncomeFormProps) {
  // Form state
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [incomeSource, setIncomeSource] = useState("");
  const [sourceDetail, setSourceDetail] = useState("");
  const [bankName, setBankName] = useState("");
  const [investmentName, setInvestmentName] = useState("");
  const [receiptType, setReceiptType] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [notes, setNotes] = useState("");

  // Income options from backend
  const [incomeOptions, setIncomeOptions] = useState<IncomeOption[]>([]);
  const [receiptOptions, setReceiptOptions] = useState<IncomeOption[]>([]);
  const [addingOption, setAddingOption] = useState<string | null>(null);
  const [newOptionLabel, setNewOptionLabel] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const opts = await api.getIncomeOptions();
        setIncomeOptions(opts.filter((o) => o.category !== "receipt_type"));
        setReceiptOptions(opts.filter((o) => o.category === "receipt_type"));
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (accounts.length > 0 && !accountId) setAccountId(accounts[0].id.toString());
  }, [accounts, accountId]);

  // Reset sub-fields when source changes
  useEffect(() => {
    setSourceDetail("");
    setBankName("");
    setInvestmentName("");
  }, [incomeSource]);

  const detailCategory = incomeSource ? SOURCES_WITH_DETAIL[incomeSource] : null;
  const detailOptions = detailCategory
    ? incomeOptions.filter((o) => o.category === detailCategory)
    : [];
  const needsTextField = incomeSource ? SOURCES_WITH_TEXT[incomeSource] : null;

  const handleAddOption = async (category: string) => {
    if (!newOptionLabel.trim()) return;
    try {
      const created = await api.createIncomeOption({ category, label: newOptionLabel.trim() });
      if (category === "receipt_type") {
        setReceiptOptions((prev) => [...prev, created]);
      } else {
        setIncomeOptions((prev) => [...prev, created]);
      }
      setNewOptionLabel("");
      setAddingOption(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createTransaction({
        account_id: parseInt(accountId),
        amount: Math.abs(parseFloat(amount)),
        name: `Income — ${INCOME_SOURCES.find((s) => s.value === incomeSource)?.label || incomeSource}`,
        type: "income",
        currency,
        date: new Date(date).toISOString(),
        income_source: incomeSource,
        source_detail: sourceDetail || undefined,
        bank_name: bankName || undefined,
        investment_name: investmentName || undefined,
        receipt_type: receiptType || undefined,
        notes: notes || undefined,
      });
      onSubmit();
    } catch (err) {
      console.error("Failed to create income", err);
    }
  };

  const selectClass =
    "border-b border-border bg-background text-foreground py-2 focus:outline-none focus:border-foreground font-serif text-xl cursor-pointer w-full appearance-none";
  const inputClass =
    "border-b border-border bg-transparent py-2 focus:outline-none focus:border-foreground font-serif text-xl";
  const labelClass = "text-xs tracking-widest uppercase text-muted-foreground";

  const renderOptionDropdown = (
    category: string,
    value: string,
    onChange: (v: string) => void,
    options: IncomeOption[],
    placeholder: string
  ) => (
    <div className="flex flex-col gap-2">
      <label className={labelClass}>{placeholder}</label>
      <div className="flex items-end gap-2">
        <select value={value} onChange={(e) => onChange(e.target.value)} className={selectClass}>
          <option value="" className="bg-background text-foreground">Select…</option>
          {options.map((o) => (
            <option key={o.id} value={o.label} className="bg-background text-foreground">
              {o.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setAddingOption(addingOption === category ? null : category)}
          className="text-muted-foreground hover:text-foreground text-xl pb-2 transition-colors flex-shrink-0"
          title="Add custom option"
        >
          +
        </button>
      </div>
      <AnimatePresence>
        {addingOption === category && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                value={newOptionLabel}
                onChange={(e) => setNewOptionLabel(e.target.value)}
                placeholder="New option name…"
                className="border-b border-border bg-transparent py-1 text-sm focus:outline-none focus:border-foreground flex-1"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddOption(category))}
              />
              <button
                type="button"
                onClick={() => handleAddOption(category)}
                className="text-xs tracking-widest uppercase border border-foreground px-3 py-1 hover:bg-foreground hover:text-background transition-colors"
              >
                Add
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="border border-border p-8 bg-muted/10 flex flex-col gap-8">
      <h3 className="font-serif text-2xl tracking-tight">Record Income</h3>

      {/* Row 1: Date + Income Source */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <label className={labelClass}>Date</label>
          <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
        </div>
        <div className="flex flex-col gap-2">
          <label className={labelClass}>Income Source</label>
          <select
            value={incomeSource}
            onChange={(e) => setIncomeSource(e.target.value)}
            required
            className={selectClass}
          >
            <option value="" className="bg-background text-foreground">Select source…</option>
            {INCOME_SOURCES.map((s) => (
              <option key={s.value} value={s.value} className="bg-background text-foreground">
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Conditional: Sub-detail dropdown */}
      <AnimatePresence>
        {detailCategory && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderOptionDropdown(
                detailCategory,
                sourceDetail,
                setSourceDetail,
                detailOptions,
                detailCategory.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
              )}
              {/* Conditional: Text field for Banking/Investment */}
              {needsTextField && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex flex-col gap-2"
                >
                  <label className={labelClass}>{needsTextField}</label>
                  <input
                    type="text"
                    value={incomeSource === "banking" ? bankName : investmentName}
                    onChange={(e) =>
                      incomeSource === "banking"
                        ? setBankName(e.target.value)
                        : setInvestmentName(e.target.value)
                    }
                    className={inputClass}
                    placeholder={`Enter ${needsTextField.toLowerCase()}…`}
                  />
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Receipt Section */}
      <AnimatePresence>
        {incomeSource && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderOptionDropdown("receipt_type", receiptType, setReceiptType, receiptOptions, "Receipt Type")}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Amount + Currency + Account */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="flex flex-col gap-2">
          <label className={labelClass}>Currency</label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={selectClass}>
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code} className="bg-background text-foreground">
                {c.symbol} {c.code}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className={labelClass}>Income Amount</label>
          <input
            type="number"
            required
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={inputClass}
            placeholder="0.00"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className={labelClass}>Deposit Into</label>
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={selectClass}>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id} className="bg-background text-foreground">
                {acc.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-2">
        <label className={labelClass}>Additional Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="border-b border-border bg-transparent py-2 focus:outline-none focus:border-foreground font-serif text-lg resize-none"
          placeholder="Optional notes…"
        />
      </div>

      {/* Invoice Upload */}
      <div className="flex flex-col gap-2">
        <label className={labelClass}>Invoice / Pay Slip</label>
        <div className="border border-dashed border-border py-8 flex flex-col items-center justify-center cursor-pointer hover:border-foreground transition-colors">
          <span className="text-muted-foreground text-sm">Drag & drop file here, or click to upload</span>
          <span className="text-xs text-muted-foreground/60 mt-1">Storage will be configured in a future phase</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between mt-4">
        <button
          type="button"
          onClick={onCancel}
          className="text-muted-foreground hover:text-foreground text-sm tracking-widest uppercase transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="bg-foreground text-background py-3 px-8 text-sm tracking-widest uppercase hover:opacity-90 transition-opacity"
        >
          Record Income
        </button>
      </div>
    </form>
  );
}
