"use client";

import React, { useState } from "react";
import Script from "next/script";
import { ShieldCheck, Lock, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";

export interface RazorpayStandardButtonProps {
  amountInRupees?: number;
  amountInPaise?: number;
  receipt?: string;
  notes?: Record<string, string>;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  className?: string;
  buttonText?: string;
  onSuccess?: (verifyResult: {
    order_id: string;
    payment_id: string;
    message: string;
  }) => void;
  onError?: (errorMessage: string) => void;
  onDismiss?: () => void;
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay?: any;
  }
}

export function RazorpayStandardButton({
  amountInRupees = 799,
  amountInPaise,
  receipt,
  notes,
  prefill = {
    name: "NIYAT Patron",
    email: "customer@niyat.in",
    contact: "9876543210",
  },
  className = "",
  buttonText,
  onSuccess,
  onError,
  onDismiss,
}: RazorpayStandardButtonProps) {
  const [loading, setLoading] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  const effectivePaise = amountInPaise ?? Math.round(amountInRupees * 100);

  const handleCheckout = async () => {
    try {
      setLoading(true);
      setStatusMessage(null);

      // Verify minimum amount constraint
      if (effectivePaise < 100) {
        throw new Error("Minimum amount for Razorpay checkout is ₹1.00 (100 paise)");
      }

      // Step 1: Create Order on Backend
      const orderRes = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: effectivePaise,
          currency: "INR",
          receipt: receipt || `rcpt_${Date.now()}`,
          notes,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.order_id) {
        throw new Error(orderData.error || "Failed to initialize Razorpay order");
      }

      const { order_id, amount, currency, key_id } = orderData;
      const razorpayKey =
        key_id ||
        process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
        "rzp_test_Ts3hLoeVcYerdE";

      if (!window.Razorpay) {
        throw new Error("Razorpay checkout SDK is not ready yet. Please try again.");
      }

      // Step 2: Open Standard Razorpay Checkout Modal
      const options = {
        key: razorpayKey,
        amount,
        currency: currency || "INR",
        name: "NIYAT Luxury Skincare",
        description: "Standard Web Checkout • Radiant Formulations",
        order_id,
        image: "/logo.svg",
        prefill: {
          name: prefill.name,
          email: prefill.email,
          contact: prefill.contact,
        },
        theme: {
          color: "#084C3E",
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            setStatusMessage({
              type: "info",
              text: "Payment window was closed before completion.",
            });
            onDismiss?.();
          },
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            setStatusMessage({
              type: "info",
              text: "Verifying payment cryptographic signature...",
            });

            // Step 3: Verify Signature on Backend
            const verifyRes = await fetch("/api/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();

            if (!verifyRes.ok || !verifyData.success) {
              throw new Error(verifyData.error || "Signature verification failed");
            }

            setStatusMessage({
              type: "success",
              text: `Payment authorized & verified! ID: ${response.razorpay_payment_id}`,
            });

            onSuccess?.({
              order_id: response.razorpay_order_id,
              payment_id: response.razorpay_payment_id,
              message: verifyData.message,
            });
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Payment verification failed";
            setStatusMessage({ type: "error", text: msg });
            onError?.(msg);
          } finally {
            setLoading(false);
          }
        },
      };

      const rzpInstance = new window.Razorpay(options);

      rzpInstance.on("payment.failed", (response: { error: { description?: string; code?: string } }) => {
        setLoading(false);
        const errMsg = response.error?.description || "Payment failed or was declined by the bank.";
        setStatusMessage({ type: "error", text: errMsg });
        onError?.(errMsg);
      });

      rzpInstance.open();
    } catch (err: unknown) {
      setLoading(false);
      const msg = err instanceof Error ? err.message : "Checkout error";
      setStatusMessage({ type: "error", text: msg });
      onError?.(msg);
    }
  };

  return (
    <div className="w-full space-y-3">
      {/* Load Razorpay Standard Checkout Script */}
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
        onLoad={() => setScriptLoaded(true)}
      />

      <button
        type="button"
        onClick={handleCheckout}
        disabled={loading}
        className={
          className ||
          "w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:brightness-105 active:scale-[0.99] text-slate-950 font-bold text-sm tracking-wide transition shadow-lg shadow-amber-400/20 flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:pointer-events-none"
        }
      >
        {loading ? (
          <>
            <RefreshCw className="w-4 h-4 text-slate-950 animate-spin" />
            <span>Connecting to Razorpay...</span>
          </>
        ) : (
          <>
            <Lock className="w-4 h-4 text-slate-950" />
            <span>
              {buttonText || `Pay ₹${(effectivePaise / 100).toFixed(2)} with Razorpay`}
            </span>
            <ShieldCheck className="w-4 h-4 text-emerald-800 ml-1" />
          </>
        )}
      </button>

      {/* Real-time Status Banner */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 animate-in fade-in ${
            statusMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : statusMessage.type === "error"
              ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
              : "bg-slate-900 border-slate-800 text-slate-300"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : statusMessage.type === "error" ? (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <RefreshCw className="w-4 h-4 text-amber-400 shrink-0 animate-spin" />
          )}
          <span className="flex-1 font-mono text-[11px]">{statusMessage.text}</span>
        </div>
      )}
    </div>
  );
}
