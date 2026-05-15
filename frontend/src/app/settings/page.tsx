"use client";

import { useEffect, useState } from "react";
import Masthead from "@/components/Masthead";
import { motion, AnimatePresence } from "framer-motion";
import { api, Account, CURRENCIES } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function Settings() {
  const [profile, setProfile] = useState<{ id: number, first_name: string | null, last_name: string | null, email: string } | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const router = useRouter();

  // Expandable States
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Email Update State
  const [newEmail, setNewEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailStep, setEmailStep] = useState<"input" | "otp">("input");
  
  // Password Update State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  // Account Initialization State
  const [editingAccountId, setEditingAccountId] = useState<number | null>(null);
  const [accName, setAccName] = useState("");
  const [accType, setAccType] = useState("depository");
  const [accBalance, setAccBalance] = useState("");
  const [accCurrency, setAccCurrency] = useState("USD");
  const [accLast4, setAccLast4] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success", text: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [prof, accs] = await Promise.all([
        api.getUserProfile(),
        api.getAccounts()
      ]);
      setProfile(prof);
      setAccounts(accs);
    } catch (err) {
      console.error("Failed to fetch settings data", err);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleUpdateEmailRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setEmailStep("otp");
      setMessage({ type: "success", text: "Verification code dispatched to your new email." });
    }
    setLoading(false);
  };

  const handleVerifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const { error } = await supabase.auth.verifyOtp({
      email: newEmail,
      token: emailOtp,
      type: 'email_change'
    });
    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setMessage({ type: "success", text: "Email successfully updated." });
      setExpandedSection(null);
      fetchData(); // Refresh profile
    }
    setLoading(false);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.email) return;
    
    if (newPassword !== confirmNewPassword) {
      setMessage({ type: "error", text: "Passwords do not match." });
      return;
    }
    setLoading(true);
    setMessage(null);

    // Update to new password, passing current password for Supabase security checks
    const { error: updateError } = await supabase.auth.updateUser({ 
      password: newPassword,
      currentPassword: currentPassword 
    });
    if (updateError) {
      setMessage({ type: "error", text: updateError.message });
    } else {
      setMessage({ type: "success", text: "Security credentials updated." });
      setExpandedSection(null);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    }
    setLoading(false);
  };

  const resetAccountForm = () => {
    setEditingAccountId(null);
    setAccName("");
    setAccType("depository");
    setAccBalance("");
    setAccCurrency("USD");
    setAccLast4("");
    setExpandedSection(null);
  };

  const handleEditAccount = (acc: Account) => {
    setEditingAccountId(acc.id);
    setAccName(acc.name);
    setAccType(acc.type);
    setAccBalance(acc.balance.toString());
    setAccCurrency(acc.currency || "USD");
    setAccLast4(acc.institution_name || "");
    setExpandedSection('account');
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  const handleInitializeAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      setMessage({ type: "error", text: "Profile is not fully loaded. Please refresh." });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const payload = {
        name: accName,
        type: accType,
        balance: parseFloat(accBalance) || 0,
        currency: accCurrency,
        institution_name: accLast4 ? accLast4 : undefined,
      };

      if (editingAccountId) {
        await api.updateAccount(editingAccountId, payload);
        setMessage({ type: "success", text: "Asset successfully updated." });
      } else {
        await api.createAccount({ ...payload, user_id: profile.id });
        setMessage({ type: "success", text: "Account successfully initialized." });
      }
      resetAccountForm();
      fetchData(); // Refresh accounts
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to process account." });
    }
    setLoading(false);
  };

  const toggleSection = (section: string) => {
    setMessage(null); // Clear messages when toggling
    if (expandedSection === section) {
      setExpandedSection(null);
      if (section === 'account') resetAccountForm();
    } else {
      setExpandedSection(section);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 pb-32 min-h-screen flex flex-col selection:bg-ink selection:text-alabaster">
      <Masthead />
      
      <section className="mb-16 mt-8 text-center">
        <h1 className="font-serif text-5xl md:text-7xl tracking-tighter mb-4 text-ink">Preferences</h1>
        <p className="text-secondary text-lg">Configure your operational parameters.</p>
      </section>

      {message && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          className={`max-w-2xl mx-auto w-full mb-8 p-4 text-sm tracking-wide text-center border-b ${message.type === 'error' ? 'text-terracotta border-terracotta/30' : 'text-positive border-positive/30'}`}
        >
          {message.text}
        </motion.div>
      )}

      <section className="max-w-2xl mx-auto w-full space-y-12">
        {/* PROFILE (READ ONLY) */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <h2 className="text-xs tracking-widest uppercase text-secondary border-b border-ink/20 pb-3 mb-6">Identity</h2>
          <div className="space-y-6">
            <div className="flex flex-col space-y-2">
              <span className="text-xs uppercase tracking-widest text-secondary">Name</span>
              <span className="font-serif text-2xl text-ink">
                {profile ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() : "Loading..."}
              </span>
            </div>
          </div>
        </motion.div>

        {/* SECURITY & CREDENTIALS */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <h2 className="text-xs tracking-widest uppercase text-secondary border-b border-ink/20 pb-3 mb-6">Security & Credentials</h2>
          
          <div className="space-y-6">
            {/* Email Option */}
            <div className="border border-ink/10 p-6 bg-transparent hover:border-ink/30 transition-colors">
              <div className="flex justify-between items-center cursor-pointer select-none" onClick={() => toggleSection('email')}>
                <div className="flex flex-col">
                  <span className="text-xs uppercase tracking-widest text-secondary mb-1">Registered Email</span>
                  <span className="font-serif text-xl text-ink">{profile?.email || "Loading..."}</span>
                </div>
                <span className="text-sm border border-ink/20 px-4 py-1.5 hover:bg-ink hover:text-alabaster transition-colors">
                  {expandedSection === 'email' ? 'Close' : 'Update'}
                </span>
              </div>
              
              <AnimatePresence>
                {expandedSection === 'email' && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }} 
                    animate={{ height: "auto", opacity: 1 }} 
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-8 border-t border-ink/10 mt-6">
                      {emailStep === 'input' ? (
                        <form onSubmit={handleUpdateEmailRequest} className="space-y-6">
                          <input 
                            type="email" 
                            required 
                            placeholder="New Email Address" 
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            className="w-full bg-transparent border-b border-ink/20 py-3 text-lg text-ink focus:border-ink outline-none placeholder:text-secondary/50"
                          />
                          <button type="submit" disabled={loading} className="bg-ink text-alabaster py-3 px-6 text-sm uppercase tracking-widest hover:bg-ink/90 transition-all disabled:opacity-50">
                            {loading ? "Processing..." : "Request Change"}
                          </button>
                        </form>
                      ) : (
                        <form onSubmit={handleVerifyEmailOtp} className="space-y-6">
                          <p className="text-sm text-secondary">Enter the 6-digit verification code sent to {newEmail}</p>
                          <input 
                            type="text" 
                            required 
                            maxLength={6}
                            placeholder="000000" 
                            value={emailOtp}
                            onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ''))}
                            className="w-full bg-transparent border-b border-ink/20 py-3 text-4xl tracking-[1em] font-serif text-ink text-center focus:border-ink outline-none placeholder:text-secondary/30"
                          />
                          <button type="submit" disabled={loading || emailOtp.length < 6} className="w-full bg-ink text-alabaster py-4 px-6 text-sm uppercase tracking-widest hover:bg-ink/90 transition-all disabled:opacity-50">
                            {loading ? "Verifying..." : "Verify & Update"}
                          </button>
                        </form>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Password Option */}
            <div className="border border-ink/10 p-6 bg-transparent hover:border-ink/30 transition-colors">
              <div className="flex justify-between items-center cursor-pointer select-none" onClick={() => toggleSection('password')}>
                <div className="flex flex-col">
                  <span className="text-xs uppercase tracking-widest text-secondary mb-1">Access Credentials</span>
                  <span className="font-serif text-xl text-ink">••••••••</span>
                </div>
                <span className="text-sm border border-ink/20 px-4 py-1.5 hover:bg-ink hover:text-alabaster transition-colors">
                  {expandedSection === 'password' ? 'Close' : 'Update'}
                </span>
              </div>

              <AnimatePresence>
                {expandedSection === 'password' && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }} 
                    animate={{ height: "auto", opacity: 1 }} 
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-8 border-t border-ink/10 mt-6">
                      <form onSubmit={handleUpdatePassword} className="space-y-6">
                        <input 
                          type="password" 
                          required 
                          placeholder="Current Password" 
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full bg-transparent border-b border-ink/20 py-3 text-lg text-ink focus:border-ink outline-none placeholder:text-secondary/50"
                        />
                        <input 
                          type="password" 
                          required 
                          placeholder="New Secure Password" 
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full bg-transparent border-b border-ink/20 py-3 text-lg text-ink focus:border-ink outline-none placeholder:text-secondary/50"
                        />
                        <input 
                          type="password" 
                          required 
                          placeholder="Confirm New Password" 
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          className="w-full bg-transparent border-b border-ink/20 py-3 text-lg text-ink focus:border-ink outline-none placeholder:text-secondary/50"
                        />
                        <button type="submit" disabled={loading} className="bg-ink text-alabaster py-3 px-6 text-sm uppercase tracking-widest hover:bg-ink/90 transition-all disabled:opacity-50">
                          {loading ? "Processing..." : "Update Credentials"}
                        </button>
                      </form>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* FINANCIAL ARCHITECTURE */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <h2 className="text-xs tracking-widest uppercase text-secondary border-b border-ink/20 pb-3 mb-6">Financial Architecture</h2>
          
          <div className="space-y-4 mb-8">
            {accounts.length > 0 ? accounts.map(acc => {
              const curr = CURRENCIES.find(c => c.code === acc.currency) || CURRENCIES[0];
              return (
              <div key={acc.id} className="flex justify-between items-center py-3 border-b border-ink/10 group">
                <div className="flex flex-col">
                  <span className="font-medium text-lg text-ink">
                    {acc.name} {acc.institution_name ? <span className="text-sm text-secondary font-mono ml-2">...{acc.institution_name}</span> : ""}
                  </span>
                  <span className="text-xs uppercase tracking-widest text-secondary mt-1">{acc.type.replace('_', ' ')} • {acc.currency}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-serif text-xl text-ink">{curr.symbol}{acc.balance.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                  <button onClick={() => handleEditAccount(acc)} className="text-xs uppercase tracking-widest text-secondary opacity-0 group-hover:opacity-100 transition-opacity hover:text-ink">
                    Edit
                  </button>
                </div>
              </div>
            )}) : (
              <p className="text-sm text-secondary italic">No active holdings found.</p>
            )}
          </div>

          <div className="border border-ink/10 p-6 bg-transparent hover:border-ink/30 transition-colors">
            <div className="flex justify-between items-center cursor-pointer select-none" onClick={() => toggleSection('account')}>
              <span className="font-serif text-xl text-ink">{editingAccountId ? "Update Asset Configuration" : "Initialize Manual Account"}</span>
              <span className="text-sm border border-ink/20 px-4 py-1.5 hover:bg-ink hover:text-alabaster transition-colors">
                {expandedSection === 'account' ? 'Close' : (editingAccountId ? 'Edit' : 'Add')}
              </span>
            </div>

            <AnimatePresence>
              {expandedSection === 'account' && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }} 
                  animate={{ height: "auto", opacity: 1 }} 
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-8 border-t border-ink/10 mt-6">
                    <form onSubmit={handleInitializeAccount} className="space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs uppercase tracking-widest text-secondary mb-2">Account Designation</label>
                          <input 
                            type="text" 
                            required 
                            value={accName}
                            onChange={(e) => setAccName(e.target.value)}
                            placeholder="e.g. Chase Sapphire" 
                            className="w-full bg-transparent border-b border-ink/20 py-3 text-lg text-ink focus:border-ink outline-none placeholder:text-secondary/50"
                          />
                        </div>
                        <div>
                          <label className="block text-xs uppercase tracking-widest text-secondary mb-2">Last 4 Digits (Optional)</label>
                          <input 
                            type="text" 
                            maxLength={4}
                            value={accLast4}
                            onChange={(e) => setAccLast4(e.target.value.replace(/\D/g, ''))}
                            placeholder="1234" 
                            className="w-full bg-transparent border-b border-ink/20 py-3 text-lg font-mono text-ink focus:border-ink outline-none placeholder:text-secondary/50"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <label className="block text-xs uppercase tracking-widest text-secondary mb-2">Classification</label>
                          <select 
                            value={accType}
                            onChange={(e) => setAccType(e.target.value)}
                            className="w-full bg-transparent border-b border-ink/20 py-3 text-lg text-ink outline-none appearance-none rounded-none cursor-pointer"
                          >
                            <option value="depository">Checking / Savings</option>
                            <option value="other_asset">Cash / Wallet</option>
                            <option value="credit_card">Credit Card</option>
                            <option value="investment">Investment</option>
                            <option value="loan">Liability / Loan</option>
                            <option value="property">Real Estate / Property</option>
                            <option value="crypto">Cryptocurrency</option>
                            <option value="vehicle">Vehicle</option>
                            <option value="other_liability">Other Liability</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs uppercase tracking-widest text-secondary mb-2">Currency</label>
                          <select 
                            value={accCurrency}
                            onChange={(e) => setAccCurrency(e.target.value)}
                            className="w-full bg-transparent border-b border-ink/20 py-3 text-lg text-ink outline-none appearance-none rounded-none cursor-pointer"
                          >
                            {CURRENCIES.map(c => (
                              <option key={c.code} value={c.code} className="bg-background text-foreground">{c.code} - {c.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs uppercase tracking-widest text-secondary mb-2">Initial Balance</label>
                          <input 
                            type="number" 
                            step="0.01"
                            required 
                            value={accBalance}
                            onChange={(e) => setAccBalance(e.target.value)}
                            placeholder="0.00" 
                            className="w-full bg-transparent border-b border-ink/20 py-3 text-lg font-serif text-ink focus:border-ink outline-none placeholder:text-secondary/50"
                          />
                        </div>
                      </div>

                      <motion.button 
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        type="submit" 
                        disabled={loading} 
                        className="w-full bg-ink text-alabaster py-4 px-6 text-sm uppercase tracking-widest transition-opacity disabled:opacity-50"
                      >
                        {loading ? "Processing..." : (editingAccountId ? "Update Asset" : "Deploy Asset")}
                      </motion.button>
                    </form>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* DATA PROVIDERS */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <h2 className="text-xs tracking-widest uppercase text-secondary border-b border-ink/20 pb-3 mb-6">Data Providers</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-4 border-b border-ink/5">
              <span className="font-medium text-lg text-ink">Plaid Integration</span>
              <button className="text-xs uppercase tracking-widest text-secondary border border-ink/20 px-4 py-1.5 hover:bg-ink hover:text-alabaster transition-colors">Connect</button>
            </div>
          </div>
        </motion.div>

        {/* TERMINATE SESSION */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="pt-16 pb-8 text-center">
          <button onClick={handleSignOut} className="text-terracotta text-sm uppercase tracking-widest font-medium hover:italic transition-all">
            Terminate Session
          </button>
        </motion.div>
      </section>
    </div>
  );
}
