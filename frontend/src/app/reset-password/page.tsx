"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success", text: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Optional: check if the user is actually authenticated from the recovery link
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setMessage({ type: "error", text: "Invalid or expired recovery link. Please request a new one." });
      }
    });
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match." });
      return;
    }
    
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setMessage({ type: "error", text: error.message });
      setLoading(false);
    } else {
      setMessage({ type: "success", text: "Credentials updated successfully." });
      setTimeout(() => {
        router.push("/");
      }, 2000);
    }
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
              Access Restored
            </h1>
            <p className="text-secondary text-lg">
              Your security credentials have been successfully updated. Redirecting to your dashboard...
            </p>
          </div>
        ) : (
          <>
            <h1 className="font-serif text-5xl md:text-6xl text-ink leading-[1.1] tracking-tight mb-2">
              New Credentials
            </h1>
            <p className="text-secondary text-lg mb-12">
              Establish a new secure password for your architecture.
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

              <div className="space-y-6">
                <div>
                  <label
                    htmlFor="password"
                    className="block text-xs uppercase tracking-widest text-secondary mb-2"
                  >
                    New Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-transparent border-b border-ink/20 focus:border-ink py-3 text-lg text-ink placeholder:text-secondary/50 outline-none transition-colors"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-xs uppercase tracking-widest text-secondary mb-2"
                  >
                    Confirm New Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-transparent border-b border-ink/20 focus:border-ink py-3 text-lg text-ink placeholder:text-secondary/50 outline-none transition-colors"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || message?.type === 'error'}
                className="w-full bg-ink text-alabaster py-4 px-6 text-sm uppercase tracking-widest hover:bg-ink/90 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? "Processing..." : "Establish Password"}
              </button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}
