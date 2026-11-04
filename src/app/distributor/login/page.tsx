"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Lock, Mail, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";

export default function DistributorLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/distributor/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Invalid distributor credentials");
      }

      // Store in localStorage for client state
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("niyat_distributor", JSON.stringify(json.data.distributor));
        } catch (_) {}
      }

      // Route to distributor portal
      router.push("/distributor");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 text-slate-100 font-sans selection:bg-amber-400/20 selection:text-amber-300">
      {/* Decorative ambient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Brand header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4 group">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-amber-400/30 p-2 flex items-center justify-center shadow-lg shadow-amber-500/10 group-hover:scale-105 transition-transform">
              <Image
                src="/logo.svg"
                alt="NIYAT"
                width={36}
                height={36}
                className="w-full h-full object-contain"
              />
            </div>
          </Link>
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="font-serif font-bold text-2xl tracking-wider text-white">
              NIYAT
            </span>
            <span className="text-[10px] font-bold tracking-widest uppercase bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30">
              B2B WHOLESALE
            </span>
          </div>
          <p className="text-xs text-slate-400 uppercase tracking-widest">
            Distributor Partner Gateway
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-amber-300 to-amber-500" />

          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800/80">
            <div className="p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Sign In to Distributor Portal</h2>
              <p className="text-xs text-slate-400">Access contracted bulk pricing & direct ordering</p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Registered Distributor Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="distributor@enterprise.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-850 border border-slate-700/80 focus:border-amber-400 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Portal Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-850 border border-slate-700/80 focus:border-amber-400 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-sm transition shadow-lg shadow-amber-400/20 disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? "Authenticating..." : "Enter Wholesale Portal"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Secure B2B Badge */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Authorized Enterprise Tier Authentication</span>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-8 text-center space-y-3">
          <p className="text-xs text-slate-500">
            Need distributor access or forgot your password?{" "}
            <span className="text-slate-400">Contact NIYAT B2B Sales at info@niyat.in</span>
          </p>
          <div>
            <Link
              href="/"
              className="text-xs text-slate-400 hover:text-amber-400 transition inline-flex items-center gap-1.5"
            >
              ← Return to Boutique Retail Storefront
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

