"use client";

import React, { useState } from "react";
import { RazorpayStandardButton } from "@/components/checkout/RazorpayStandardButton";
import { ShieldCheck, Sparkles, CheckCircle2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function TestCheckoutPage() {
  const [amount, setAmount] = useState<number>(799);
  const [customerName, setCustomerName] = useState("NIYAT Patron");
  const [customerEmail, setCustomerEmail] = useState("patron@niyat.in");
  const [customerPhone, setCustomerPhone] = useState("9876543210");
  const [completedPayment, setCompletedPayment] = useState<{
    order_id: string;
    payment_id: string;
    message: string;
  } | null>(null);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto space-y-8">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-amber-400 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Storefront</span>
        </Link>

        {/* Card Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 font-serif font-black flex items-center justify-center text-lg shadow-md shadow-amber-500/20">
                N
              </div>
              <div>
                <h1 className="font-serif font-bold text-xl text-white">
                  Razorpay Standard Checkout
                </h1>
                <p className="text-xs text-slate-400">
                  Secure Checkout Sandbox • Mode: <span className="font-mono text-emerald-400">Razorpay Live Gateway</span>
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Live Production Key
            </span>
          </div>

          {/* Configuration Form */}
          <div className="space-y-4 text-xs">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Transaction Amount (₹ INR)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                  ₹
                </span>
                <input
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl pl-8 pr-4 py-2.5 text-white font-mono text-sm outline-none transition"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Converted to {(amount * 100).toLocaleString("en-IN")} paise on order creation (Min: 100 paise).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl px-3 py-2 text-white text-xs outline-none transition"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Mobile Number
                </label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl px-3 py-2 text-white font-mono text-xs outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Customer Email
              </label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl px-3 py-2 text-white text-xs outline-none transition"
              />
            </div>
          </div>

          {/* Standard Checkout Button */}
          <div className="pt-2">
            <RazorpayStandardButton
              amountInRupees={amount}
              prefill={{
                name: customerName,
                email: customerEmail,
                contact: customerPhone,
              }}
              onSuccess={(result) => setCompletedPayment(result)}
            />
          </div>

          {/* Payment Success Card */}
          {completedPayment && (
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 space-y-2 animate-in fade-in">
              <div className="flex items-center gap-2 font-semibold text-emerald-300 text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>HMAC Signature Verified &amp; Payment Captured</span>
              </div>
              <div className="text-[11px] font-mono space-y-1 text-slate-300 pt-1">
                <div>
                  <span className="text-slate-400">Order ID:</span>{" "}
                  <span className="text-amber-300">{completedPayment.order_id}</span>
                </div>
                <div>
                  <span className="text-slate-400">Payment ID:</span>{" "}
                  <span className="text-emerald-300">{completedPayment.payment_id}</span>
                </div>
                <div>
                  <span className="text-slate-400">Message:</span>{" "}
                  <span>{completedPayment.message}</span>
                </div>
              </div>
            </div>
          )}

          {/* Instructions Guide */}
          <div className="border-t border-slate-800 pt-5 text-[11px] text-slate-400 space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-slate-300 uppercase tracking-wider text-[10px]">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Razorpay Standard Web Flow Verified:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-400">
              <li>Clicks button → Calls <code className="text-amber-400">POST /api/create-order</code> to generate <code className="text-slate-200">order_id</code></li>
              <li>Loads <code className="text-slate-200">checkout.js</code> &amp; opens Razorpay popup modal</li>
              <li>Completes payment → receives <code className="text-slate-200">razorpay_payment_id</code>, <code className="text-slate-200">razorpay_order_id</code>, <code className="text-slate-200">razorpay_signature</code></li>
              <li>Calls <code className="text-amber-400">POST /api/verify-payment</code> → validates HMAC-SHA256 signature with <code className="text-slate-200">RAZORPAY_KEY_SECRET</code></li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
