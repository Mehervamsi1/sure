"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success", text: string } | null>(null);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setMessage({ type: "success", text: "Recovery link dispatched. Check your inbox." });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-alabaster flex flex-col justify-center items-center p-6 selection:bg-ink selection:text-alabaster">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        <Link href="/" className="inline-block mb-12 group">
          <span className="font-serif text-2xl tracking-tight text-ink group-hover:opacity-70 transition-opacity">
            Findance.
          </span>
        </Link>

        {message?.type === 'success' ? (
          <div className="space-y-6">
            <h1 className="font-serif text-5xl md:text-6xl text-ink leading-[1.1] tracking-tight mb-2">
              Recovery Sent
            </h1>
            <p className="text-secondary text-lg">
              {message.text} Follow the link to securely reset your credentials.
            </p>
            <Link
              href="/login"
              className="inline-block mt-8 bg-ink text-alabaster py-4 px-6 text-sm uppercase tracking-widest hover:bg-ink/90 active:scale-[0.98] transition-all"
            >
              Return to Login
            </Link>
          </div>
        ) : (
          <>
            <h1 className="font-serif text-5xl md:text-6xl text-ink leading-[1.1] tracking-tight mb-2">
              Recover Access
            </h1>
            <p className="text-secondary text-lg mb-12">
              Regain control of your financial architecture.
            </p>

            <form onSubmit={handleReset} className="space-y-8">
              {message?.type === 'error' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-terracotta text-sm"
                >
                  {message.text}
                </motion.div>
              )}

              <div>
                <label
                  htmlFor="email"
                  className="block text-xs uppercase tracking-widest text-secondary mb-2"
                >
                  Registered Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent border-b border-ink/20 focus:border-ink py-3 text-lg text-ink placeholder:text-secondary/50 outline-none transition-colors"
                  placeholder="portfolio@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-ink text-alabaster py-4 px-6 text-sm uppercase tracking-widest hover:bg-ink/90 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? "Processing..." : "Dispatch Recovery Link"}
              </button>
            </form>

            <div className="mt-12 text-center">
              <Link
                href="/login"
                className="text-secondary text-sm hover:text-ink transition-colors underline decoration-secondary/30 underline-offset-4"
              >
                Cancel and return
              </Link>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
