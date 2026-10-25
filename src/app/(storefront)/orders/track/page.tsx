"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Search,
  Package,
  Truck,
  CheckCircle,
  Clock,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

interface TrackingResult {
  orderNumber: string;
  createdAt: string;
  fulfilmentStatus: string;
  paymentStatus: string;
  paymentMethod: string;
  items: Array<{
    name: string;
    sizeLabel: string;
    quantity: number;
    imageUrl?: string;
  }>;
  destination: {
    city: string;
    state: string;
  };
  shipment?: {
    carrier?: string;
    trackingNumber?: string;
    trackingUrl?: string;
    shippedAt?: string;
    deliveredAt?: string;
  } | null;
  timeline?: Array<{
    status: string;
    at: string;
  }>;
}

const STATUS_STEPS = [
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "PROCESSING", label: "Processing" },
  { key: "SHIPPED", label: "Shipped" },
  { key: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
  { key: "DELIVERED", label: "Delivered" },
];

export default function OrderTrackingPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TrackingResult | null>(null);

  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim() || !phone.trim()) {
      setError("Please enter both your order number and 10-digit phone number.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(
        `/api/orders/track?orderNumber=${encodeURIComponent(
          orderNumber.trim()
        )}&phone=${encodeURIComponent(phone.trim())}`
      );
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(
          data.error?.message ||
            "Unable to find this order. Please verify your order number and phone."
        );
      } else {
        setResult(data.data);
      }
    } catch {
      setError("Network error while tracking order. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const getStepStatus = (stepKey: string, currentStatus: string) => {
    const sequence = [
      "PENDING_PAYMENT",
      "CONFIRMED",
      "PROCESSING",
      "PACKED",
      "SHIPPED",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
    ];
    const currentIndex = sequence.indexOf(currentStatus);
    const stepIndex = sequence.indexOf(stepKey);

    if (currentStatus === "CANCELLED") return "cancelled";
    if (currentIndex >= stepIndex && stepIndex !== -1) return "completed";
    return "upcoming";
  };

  return (
    <div className="py-8 sm:py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-niyat-muted">
          <Link href="/" className="hover:text-niyat-emerald transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-niyat-charcoal font-medium">Track Order</span>
        </nav>

        {/* Header */}
        <div className="text-center max-w-xl mx-auto space-y-3">
          <span className="text-xs uppercase tracking-widest text-niyat-gold font-semibold">
            Order Status &amp; Real-time Dispatch
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-niyat-charcoal">
            Track Your Delivery
          </h1>
          <p className="text-xs sm:text-sm text-niyat-muted font-light leading-relaxed">
            Enter your order reference number (sent via SMS/Email) and registered mobile number
            to check your formulation&apos;s fulfillment status.
          </p>
        </div>

        {/* Tracking Search Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-niyat-ivory-border shadow-sm">
          <form onSubmit={handleTrackSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Order Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-niyat-charcoal">
                  Order Number
                </label>
                <input
                  type="text"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. NIY-2026-000001"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-niyat-ivory-border text-sm text-niyat-charcoal placeholder:text-niyat-muted focus:outline-none focus:border-niyat-gold focus:ring-1 focus:ring-niyat-gold uppercase"
                />
              </div>

              {/* Phone Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-niyat-charcoal">
                  Registered Mobile Number
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-medium text-niyat-muted select-none">
                    +91
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="9876543210"
                    required
                    maxLength={10}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-niyat-ivory-border text-sm text-niyat-charcoal placeholder:text-niyat-muted focus:outline-none focus:border-niyat-gold focus:ring-1 focus:ring-niyat-gold"
                  />
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 border border-red-200 text-xs sm:text-sm text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 rounded-full bg-niyat-emerald text-white text-xs sm:text-sm font-semibold uppercase tracking-wider hover:bg-niyat-emerald-dark transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying Order Details...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 text-niyat-gold" /> Track Shipment
                </>
              )}
            </button>
          </form>
        </div>

        {/* Tracking Result View */}
        {result && (
          <div className="bg-white rounded-3xl p-6 sm:p-10 border border-niyat-ivory-border shadow-md space-y-8 animate-fadeIn">
            {/* Header Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-niyat-ivory-border">
              <div>
                <span className="text-xs uppercase tracking-widest text-niyat-gold font-semibold">
                  Verified Order
                </span>
                <h3 className="font-serif text-2xl font-bold text-niyat-charcoal mt-1">
                  {result.orderNumber}
                </h3>
                <p className="text-xs text-niyat-muted mt-0.5">
                  Placed on{" "}
                  {new Date(result.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Payment: {result.paymentStatus}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-niyat-gold-subtle text-niyat-gold-dark border border-niyat-gold/30">
                  Status: {result.fulfilmentStatus.replace(/_/g, " ")}
                </span>
              </div>
            </div>

            {/* Stepper Progress */}
            <div className="space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-niyat-charcoal">
                Fulfillment Progress
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {STATUS_STEPS.map((step) => {
                  const status = getStepStatus(step.key, result.fulfilmentStatus);
                  const isDone = status === "completed";
                  return (
                    <div
                      key={step.key}
                      className={`p-3.5 rounded-xl border text-center transition-all ${
                        isDone
                          ? "bg-niyat-emerald/5 border-niyat-emerald/20 text-niyat-emerald"
                          : "bg-neutral-50 border-neutral-200 text-neutral-400"
                      }`}
                    >
                      <div className="w-6 h-6 rounded-full mx-auto mb-2 flex items-center justify-center">
                        {isDone ? (
                          <CheckCircle className="w-5 h-5 text-niyat-emerald" />
                        ) : (
                          <Clock className="w-4 h-4 text-neutral-400" />
                        )}
                      </div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider block">
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Shipment Courier Details (if shipped) */}
            {result.shipment && (
              <div className="p-6 rounded-2xl bg-niyat-ivory border border-niyat-ivory-border space-y-3">
                <div className="flex items-center gap-2 text-niyat-emerald">
                  <Truck className="w-4 h-4 text-niyat-gold" />
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-niyat-charcoal">
                    Carrier &amp; Dispatch Information
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-niyat-muted block">Courier Partner:</span>
                    <span className="font-medium text-niyat-charcoal">
                      {result.shipment.carrier || "Standard Express"}
                    </span>
                  </div>
                  <div>
                    <span className="text-niyat-muted block">AWB / Tracking Number:</span>
                    <span className="font-mono font-medium text-niyat-charcoal">
                      {result.shipment.trackingNumber || "Assigned at Hub"}
                    </span>
                  </div>
                  <div>
                    {result.shipment.trackingUrl && (
                      <a
                        href={result.shipment.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-niyat-emerald text-white text-xs font-medium hover:bg-niyat-emerald-dark transition-all mt-1"
                      >
                        Live Tracking <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Destination & Ordered Items */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-niyat-charcoal">
                  Delivery Destination
                </h4>
                <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-niyat-charcoal space-y-1">
                  <p className="font-medium">
                    {result.destination.city}, {result.destination.state}
                  </p>
                  <p className="text-niyat-muted text-[11px] flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-niyat-emerald" /> Recipient details protected
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-niyat-charcoal">
                  Formulations in Shipment
                </h4>
                <div className="space-y-2">
                  {result.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-niyat-gold" />
                        <div>
                          <p className="font-medium text-niyat-charcoal">{item.name}</p>
                          <p className="text-[11px] text-niyat-muted">{item.sizeLabel}</p>
                        </div>
                      </div>
                      <span className="font-semibold text-niyat-charcoal">
                        Qty: {item.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
