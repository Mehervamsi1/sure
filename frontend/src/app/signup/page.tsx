"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

export default function SignupPage() {
  // Step 1: User Data
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Step 2: OTP
  const [otp, setOtp] = useState("");
  const [isOtpStep, setIsOtpStep] = useState(false);

  // States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify.");
      return;
    }
    
    setLoading(true);
    setError(null);

    // Call Supabase signup
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          gender: gender,
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      // Transition to OTP step
      setIsOtpStep(true);
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "signup",
    });

    if (error) {
      setError("Invalid or expired verification code. " + error.message);
      setLoading(false);
    } else {
      // Trigger Welcome Email Endpoint here in the future
      try {
        await fetch("/api/v1/email/welcome", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${data.session?.access_token}`
          },
        });
      } catch (err) {
        console.error("Failed to send welcome email", err);
      }

      setSuccess(true);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-alabaster flex flex-col justify-center items-center p-6 selection:bg-ink selection:text-alabaster py-20">
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

        {success ? (
          <div className="space-y-6">
            <h1 className="font-serif text-5xl md:text-6xl text-ink leading-[1.1] tracking-tight mb-2">
              Identity Verified
            </h1>
            <p className="text-secondary text-lg">
              Your profile is now established. Welcome to Findance.
            </p>
            <Link
              href="/"
              className="inline-block mt-8 bg-ink text-alabaster py-4 px-6 text-sm uppercase tracking-widest hover:bg-ink/90 active:scale-[0.98] transition-all"
            >
              Enter Dashboard
            </Link>
          </div>
        ) : isOtpStep ? (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <h1 className="font-serif text-4xl md:text-5xl text-ink leading-[1.1] tracking-tight mb-2">
                Verification Required
              </h1>
              <p className="text-secondary text-lg mb-8">
                Enter the 6-digit access code sent to <span className="text-ink font-medium">{email}</span>.
              </p>

              <form onSubmit={handleVerifyOtp} className="space-y-8">
                {error && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-terracotta text-sm"
                  >
                    {error}
                  </motion.div>
                )}

                <div>
                  <label htmlFor="otp" className="block text-xs uppercase tracking-widest text-secondary mb-2">
                    Access Code
                  </label>
                  <input
                    id="otp"
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-transparent border-b border-ink/20 focus:border-ink py-3 text-4xl tracking-[1em] font-serif text-ink placeholder:text-secondary/30 outline-none transition-colors text-center"
                    placeholder="000000"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="w-full bg-ink text-alabaster py-4 px-6 text-sm uppercase tracking-widest hover:bg-ink/90 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {loading ? "Verifying..." : "Confirm Identity"}
                </button>
              </form>
            </motion.div>
          </AnimatePresence>
        ) : (
          <>
            <h1 className="font-serif text-5xl md:text-6xl text-ink leading-[1.1] tracking-tight mb-2">
              Initialize
            </h1>
            <p className="text-secondary text-lg mb-12">
              Create your financial architecture.
            </p>

            <form onSubmit={handleSignup} className="space-y-8">
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-xs uppercase tracking-widest text-secondary mb-2">
                      First Name
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full bg-transparent border-b border-ink/20 focus:border-ink py-3 text-lg text-ink placeholder:text-secondary/50 outline-none transition-colors"
                      placeholder="Jane"
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-xs uppercase tracking-widest text-secondary mb-2">
                      Last Name
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full bg-transparent border-b border-ink/20 focus:border-ink py-3 text-lg text-ink placeholder:text-secondary/50 outline-none transition-colors"
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-xs uppercase tracking-widest text-secondary mb-2">
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
                  <label htmlFor="gender" className="block text-xs uppercase tracking-widest text-secondary mb-2">
                    Gender Identity
                  </label>
                  <select
                    id="gender"
                    required
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full bg-transparent border-b border-ink/20 focus:border-ink py-3 text-lg text-ink outline-none transition-colors appearance-none cursor-pointer"
                  >
                    <option value="" disabled className="text-secondary">Select Identity</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="password" className="block text-xs uppercase tracking-widest text-secondary mb-2">
                    Secure Password
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
                  <label htmlFor="confirmPassword" className="block text-xs uppercase tracking-widest text-secondary mb-2">
                    Confirm Password
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
                disabled={loading}
                className="w-full bg-ink text-alabaster py-4 px-6 text-sm uppercase tracking-widest hover:bg-ink/90 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? "Processing..." : "Establish Profile"}
              </button>
            </form>

            <div className="mt-12 text-center">
              <p className="text-secondary text-sm">
                Already established?{" "}
                <Link
                  href="/login"
                  className="text-ink border-b border-ink/30 hover:border-ink transition-colors pb-0.5"
                >
                  Sign In
                </Link>
              </p>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
