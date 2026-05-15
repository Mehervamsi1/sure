"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
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

        <h1 className="font-serif text-5xl md:text-6xl text-ink leading-[1.1] tracking-tight mb-2">
          Sign In
        </h1>
        <p className="text-secondary text-lg mb-12">
          Access your strategy and insights.
        </p>

        <form onSubmit={handleLogin} className="space-y-8">
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-terracotta text-sm"
            >
              {error}
            </motion.div>
          )}

          <div className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-xs uppercase tracking-widest text-secondary mb-2"
              >
                Email Address
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

            <div>
              <div className="flex justify-between items-center mb-2">
                <label
                  htmlFor="password"
                  className="block text-xs uppercase tracking-widest text-secondary"
                >
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs text-secondary hover:text-ink transition-colors underline decoration-secondary/30 underline-offset-4">
                  Recover Access
                </Link>
              </div>
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
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ink text-alabaster py-4 px-6 text-sm uppercase tracking-widest hover:bg-ink/90 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? "Authenticating..." : "Enter"}
          </button>
        </form>

        <div className="mt-12 text-center">
          <p className="text-secondary text-sm">
            No portfolio yet?{" "}
            <Link
              href="/signup"
              className="text-ink border-b border-ink/30 hover:border-ink transition-colors pb-0.5"
            >
              Initialize Strategy
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
