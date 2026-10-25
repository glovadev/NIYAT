"use client";

import React, { useState, useEffect } from "react";
import { formatPaise } from "@/lib/utils";
import {
  ShieldCheck,
  CreditCard,
  QrCode,
  Building2,
  Wallet,
  X,
  CheckCircle2,
  AlertCircle,
  Lock,
  ArrowRight,
  Smartphone,
  Sparkles,
  RefreshCw,
} from "lucide-react";

interface RazorpayPaymentModalProps {
  isOpen: boolean;
  orderNumber: string;
  orderId: string;
  amountPaise: number;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  razorpayOrderId: string;
  onSuccess: (paymentId: string, signature: string) => Promise<void>;
  onClose: () => void;
}

type PaymentTab = "UPI" | "CARD" | "NETBANKING" | "WALLET";

export function RazorpayPaymentModal({
  isOpen,
  orderNumber,
  orderId,
  amountPaise,
  customerName,
  customerEmail,
  customerPhone,
  razorpayOrderId,
  onSuccess,
  onClose,
}: RazorpayPaymentModalProps) {
  const [activeTab, setActiveTab] = useState<PaymentTab>("UPI");
  const [selectedUpiApp, setSelectedUpiApp] = useState("gpay");
  const [upiId, setUpiId] = useState("niyat.customer@okaxis");
  const [cardNumber, setCardNumber] = useState("4111 2222 3333 4444");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvv, setCardCvv] = useState("888");
  const [cardHolder, setCardHolder] = useState(customerName || "NIYAT PATRON");
  const [selectedBank, setSelectedBank] = useState("HDFC");
  const [selectedWallet, setSelectedWallet] = useState("paytm");

  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>("");
  const [simulatedError, setSimulatedError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(900); // 15 mins countdown

  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const handlePaySuccess = async () => {
    try {
      setSimulatedError(null);
      setProcessing(true);

      setProcessingStep("Contacting issuing bank...");
      await new Promise((r) => setTimeout(r, 600));

      setProcessingStep("Securing 256-bit token authorization...");
      await new Promise((r) => setTimeout(r, 600));

      setProcessingStep("Capturing payment on Razorpay...");
      await new Promise((r) => setTimeout(r, 500));

      const mockPaymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const mockSignature = `sig_verified_${Date.now()}`;

      await onSuccess(mockPaymentId, mockSignature);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Payment confirmation failed";
      setSimulatedError(msg);
      setProcessing(false);
    }
  };

  const handlePayFailure = async () => {
    setProcessing(true);
    setProcessingStep("Simulating declined authorization...");
    await new Promise((r) => setTimeout(r, 800));
    setProcessing(false);
    setSimulatedError("Transaction declined by bank: Insufficient authorization or cancelled by user. Please retry.");
  };

  const fillTestCard = (type: "visa" | "mastercard" | "rupay") => {
    if (type === "visa") {
      setCardNumber("4111 2222 3333 4444");
    } else if (type === "mastercard") {
      setCardNumber("5123 4567 8901 2345");
    } else {
      setCardNumber("6082 1234 5678 9012");
    }
    setCardExpiry("08/29");
    setCardCvv("777");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-6 flex flex-col text-slate-100">
        {/* Top Header / Branding Bar */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 px-6 py-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 font-serif font-black flex items-center justify-center text-lg shadow-md shadow-amber-500/20">
              N
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-white text-base tracking-wide">
                  NIYAT Checkout
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Razorpay Secured
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Order <span className="font-mono text-amber-300">{orderNumber}</span> • Session expires in{" "}
                <span className="font-mono text-slate-200 font-semibold">{formattedTime}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={processing}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition disabled:opacity-50"
            title="Cancel & close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Amount Banner */}
        <div className="px-6 py-3 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between text-xs">
          <span className="text-slate-400">Total Payable Amount</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xs text-amber-400/80 font-medium">INR</span>
            <span className="font-serif text-xl sm:text-2xl font-bold text-white">
              {formatPaise(amountPaise)}
            </span>
          </div>
        </div>

        {/* Error Alert */}
        {simulatedError && (
          <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <div className="flex-1">{simulatedError}</div>
            <button
              type="button"
              onClick={() => setSimulatedError(null)}
              className="text-rose-400 hover:text-rose-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Body: Tabs & Options */}
        <div className="p-6 space-y-5">
          {/* Payment Method Selector Tabs */}
          <div className="grid grid-cols-4 gap-1.5 p-1 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("UPI")}
              className={`py-2 px-2 rounded-xl font-medium transition flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                activeTab === "UPI"
                  ? "bg-amber-400 text-slate-950 font-semibold shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>UPI / QR</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("CARD")}
              className={`py-2 px-2 rounded-xl font-medium transition flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                activeTab === "CARD"
                  ? "bg-amber-400 text-slate-950 font-semibold shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("NETBANKING")}
              className={`py-2 px-2 rounded-xl font-medium transition flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                activeTab === "NETBANKING"
                  ? "bg-amber-400 text-slate-950 font-semibold shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>NetBanking</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("WALLET")}
              className={`py-2 px-2 rounded-xl font-medium transition flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                activeTab === "WALLET"
                  ? "bg-amber-400 text-slate-950 font-semibold shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Wallets</span>
            </button>
          </div>

          {/* TAB 1: UPI / QR Code */}
          {activeTab === "UPI" && (
            <div className="space-y-4 text-xs animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row items-center gap-4">
                {/* Simulated dynamic QR code */}
                <div className="relative w-28 h-28 bg-white p-2 rounded-2xl flex flex-col items-center justify-center shadow-lg border-2 border-amber-400/40 shrink-0">
                  <div className="w-full h-full border border-slate-900/10 rounded-lg flex flex-col items-center justify-center text-slate-900 space-y-1">
                    <QrCode className="w-16 h-16 text-slate-950" />
                    <span className="text-[8px] font-bold tracking-tighter text-emerald-800 uppercase">
                      Scan to Pay
                    </span>
                  </div>
                  <div className="absolute inset-0 rounded-2xl ring-2 ring-amber-400/30 animate-pulse pointer-events-none" />
                </div>

                <div className="space-y-2 flex-1 text-center sm:text-left">
                  <h4 className="font-semibold text-white text-sm">
                    Scan with any UPI App
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Open Google Pay, PhonePe, Paytm, or BHIM and scan this QR code to verify and approve ₹
                    {formatPaise(amountPaise)}.
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 justify-center sm:justify-start pt-1">
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] text-slate-300 font-mono">
                      GPay
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] text-slate-300 font-mono">
                      PhonePe
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] text-slate-300 font-mono">
                      Paytm
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] text-slate-300 font-mono">
                      BHIM
                    </span>
                  </div>
                </div>
              </div>

              {/* Instant App Buttons */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
                  Or select fast payment app
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "gpay", label: "Google Pay", icon: "🟢" },
                    { id: "phonepe", label: "PhonePe", icon: "🟣" },
                    { id: "paytm", label: "Paytm UPI", icon: "🔵" },
                  ].map((app) => (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => setSelectedUpiApp(app.id)}
                      className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition ${
                        selectedUpiApp === app.id
                          ? "border-amber-400 bg-amber-400/10 text-white"
                          : "border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <span>{app.icon}</span>
                      <span>{app.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Direct UPI ID input */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">
                  UPI ID / VPA
                </label>
                <div className="relative">
                  <Smartphone className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="mobile@upi or user@okhdfcbank"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Credit / Debit Cards */}
          {activeTab === "CARD" && (
            <div className="space-y-4 text-xs animate-in fade-in duration-150">
              {/* Luxury Virtual Card Visual */}
              <div className="p-4 rounded-2xl bg-gradient-to-tr from-emerald-950 via-slate-900 to-amber-950/40 border border-amber-500/30 shadow-xl space-y-4">
                <div className="flex items-center justify-between text-amber-400 text-xs font-mono">
                  <span className="font-serif tracking-widest text-white text-sm font-bold">
                    NIYAT PLATINUM
                  </span>
                  <div className="flex items-center gap-1 font-bold text-xs uppercase">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Razorpay Secure</span>
                  </div>
                </div>

                <div className="font-mono text-base tracking-widest text-white text-center py-2 font-bold select-all">
                  {cardNumber}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider block text-slate-500">
                      Card Holder
                    </span>
                    <span className="font-semibold text-slate-200 uppercase truncate max-w-[160px] block">
                      {cardHolder}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-wider block text-slate-500">
                      Expires
                    </span>
                    <span className="font-mono text-slate-200 font-semibold">{cardExpiry}</span>
                  </div>
                </div>
              </div>

              {/* Pre-fill quick test buttons */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Test Card:</span>
                <button
                  type="button"
                  onClick={() => fillTestCard("visa")}
                  className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-[10px] text-amber-300 font-mono transition"
                >
                  Visa
                </button>
                <button
                  type="button"
                  onClick={() => fillTestCard("mastercard")}
                  className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-[10px] text-amber-300 font-mono transition"
                >
                  Mastercard
                </button>
                <button
                  type="button"
                  onClick={() => fillTestCard("rupay")}
                  className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-[10px] text-amber-300 font-mono transition"
                >
                  RuPay
                </button>
              </div>

              {/* Card Inputs */}
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 mb-1 block">
                    Card Number
                  </label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="4111 2222 3333 4444"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 mb-1 block">
                      Valid Thru (MM/YY)
                    </label>
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      placeholder="12/28"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 mb-1 block">
                      CVV / CVC
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      placeholder="888"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: NetBanking */}
          {activeTab === "NETBANKING" && (
            <div className="space-y-3 text-xs animate-in fade-in duration-150">
              <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
                Select Indian Bank
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {[
                  { id: "HDFC", name: "HDFC Bank", badge: "Fast" },
                  { id: "ICICI", name: "ICICI Bank", badge: "Popular" },
                  { id: "SBI", name: "State Bank of India", badge: "Popular" },
                  { id: "AXIS", name: "Axis Bank", badge: "Fast" },
                  { id: "KOTAK", name: "Kotak Mahindra", badge: "Fast" },
                  { id: "PNB", name: "Punjab National Bank", badge: "" },
                ].map((bank) => (
                  <button
                    key={bank.id}
                    type="button"
                    onClick={() => setSelectedBank(bank.id)}
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between h-16 ${
                      selectedBank === bank.id
                        ? "border-amber-400 bg-amber-400/10 text-white"
                        : "border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span className="font-semibold text-xs text-white">{bank.name}</span>
                    {bank.badge && (
                      <span className="text-[9px] text-amber-400 font-mono self-start uppercase">
                        {bank.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: Wallets */}
          {activeTab === "WALLET" && (
            <div className="space-y-3 text-xs animate-in fade-in duration-150">
              <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
                Select Digital Wallet
              </label>
              <div className="space-y-2">
                {[
                  { id: "paytm", name: "Paytm Wallet & Postpaid", balance: "Simulated Balance ₹2,500" },
                  { id: "phonepe", name: "PhonePe Wallet", balance: "Simulated Balance ₹1,800" },
                  { id: "amazon", name: "Amazon Pay", balance: "Simulated Balance ₹3,200" },
                ].map((w) => (
                  <label
                    key={w.id}
                    onClick={() => setSelectedWallet(w.id)}
                    className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition ${
                      selectedWallet === w.id
                        ? "border-amber-400 bg-amber-400/10 text-white"
                        : "border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-white">{w.name}</div>
                      <div className="text-[10px] text-slate-500">{w.balance}</div>
                    </div>
                    <input
                      type="radio"
                      name="wallet"
                      checked={selectedWallet === w.id}
                      onChange={() => setSelectedWallet(w.id)}
                      className="text-amber-400 focus:ring-amber-400"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Processing State Overlay */}
        {processing && (
          <div className="absolute inset-0 z-20 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 space-y-4 animate-in fade-in">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-2 border-amber-400/20 border-t-amber-400 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-amber-400 font-bold text-xs">
                ₹
              </div>
            </div>
            <div className="space-y-1">
              <h4 className="font-serif font-bold text-white text-base">
                Processing Secure Payment
              </h4>
              <p className="text-xs text-amber-300 font-mono">{processingStep}</p>
              <p className="text-[11px] text-slate-500 pt-1">
                Do not refresh or close this browser window.
              </p>
            </div>
          </div>
        )}

        {/* Modal Footer & Action Buttons */}
        <div className="p-6 bg-slate-950 border-t border-slate-800 flex flex-col gap-3">
          <button
            type="button"
            disabled={processing}
            onClick={handlePaySuccess}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:brightness-105 text-slate-950 font-bold text-sm tracking-wide transition shadow-lg shadow-amber-400/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Lock className="w-4 h-4 text-slate-950" />
            <span>Authorize &amp; Pay {formatPaise(amountPaise)}</span>
            <ArrowRight className="w-4 h-4 text-slate-950" />
          </button>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
            <button
              type="button"
              disabled={processing}
              onClick={handlePayFailure}
              className="text-rose-400/80 hover:text-rose-300 hover:underline transition"
            >
              Simulate Failed Transaction (Test Error Handling)
            </button>
            <span className="flex items-center gap-1 text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              PCI-DSS Compliant Gateway
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
