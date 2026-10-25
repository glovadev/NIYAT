"use client";

import React, { useEffect, useState } from "react";
import { formatPaise } from "@/lib/utils";
import {
  TicketPercent,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  Calendar,
  X,
  Sparkles,
  AlertCircle,
  Tag,
} from "lucide-react";

interface CouponItem {
  id: string;
  code: string;
  type: "PERCENTAGE" | "FIXED";
  value: number;
  minimumOrderPaise: number;
  maximumDiscountPaise?: number;
  startsAt: string;
  expiresAt: string;
  usageLimit?: number;
  usedCount: number;
  status: "ACTIVE" | "INACTIVE";
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [formCode, setFormCode] = useState("");
  const [formType, setFormType] = useState<"PERCENTAGE" | "FIXED">("PERCENTAGE");
  const [formValue, setFormValue] = useState("10");
  const [formMinOrder, setFormMinOrder] = useState("999");
  const [formMaxDiscount, setFormMaxDiscount] = useState("500");
  const [formStartsAt, setFormStartsAt] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [formExpiresAt, setFormExpiresAt] = useState(
    new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10)
  );
  const [formUsageLimit, setFormUsageLimit] = useState("500");

  const loadCoupons = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/coupons");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to load coupons");
      }
      setCoupons(json.data.items || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error fetching coupons";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setSubmitting(true);

    try {
      const numericValue = parseFloat(formValue);
      if (isNaN(numericValue) || numericValue <= 0) {
        throw new Error("Coupon value must be a positive number");
      }

      const minOrderPaise = Math.round(parseFloat(formMinOrder || "0") * 100);
      const maxDiscountPaise = formMaxDiscount
        ? Math.round(parseFloat(formMaxDiscount) * 100)
        : undefined;
      const usageLimit = formUsageLimit ? parseInt(formUsageLimit, 10) : undefined;

      const body = {
        code: formCode.trim().toUpperCase(),
        type: formType,
        value: numericValue,
        minimumOrderPaise: isNaN(minOrderPaise) ? 0 : minOrderPaise,
        maximumDiscountPaise: isNaN(maxDiscountPaise as number)
          ? undefined
          : maxDiscountPaise,
        startsAt: new Date(formStartsAt).toISOString(),
        expiresAt: new Date(formExpiresAt).toISOString(),
        usageLimit,
        status: "ACTIVE",
      };

      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to create coupon");
      }

      setModalOpen(false);
      resetForm();
      loadCoupons();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error creating coupon";
      setModalError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormCode("");
    setFormValue("10");
    setFormMinOrder("999");
    setFormMaxDiscount("500");
    setModalError(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-white tracking-wide">
            Promotions & Coupon Codes
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure authoritative checkout discounts, percentage markdowns, and minimum order thresholds.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadCoupons}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-semibold shadow-md shadow-amber-400/20 transition"
          >
            <Plus className="w-4 h-4" />
            Create Coupon
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* Coupons Table */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl overflow-hidden">
        {coupons.length === 0 ? (
          <div className="p-16 text-center text-slate-500 text-sm">
            {loading ? "Loading coupons..." : "No coupons created yet."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-6">Coupon Code</th>
                  <th className="py-3.5 px-6">Discount Benefit</th>
                  <th className="py-3.5 px-6">Min Order</th>
                  <th className="py-3.5 px-6">Max Cap</th>
                  <th className="py-3.5 px-6">Redemptions</th>
                  <th className="py-3.5 px-6">Valid Period</th>
                  <th className="py-3.5 px-6 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {coupons.map((c) => {
                  const isExpired = new Date(c.expiresAt) < new Date();
                  return (
                    <tr key={c.id} className="hover:bg-slate-900/40 transition">
                      <td className="py-4 px-6 font-mono font-bold text-amber-400 text-sm">
                        {c.code}
                      </td>

                      <td className="py-4 px-6">
                        <span className="font-semibold text-white">
                          {c.type === "PERCENTAGE"
                            ? `${c.value}% OFF`
                            : `${formatPaise(c.value * 100)} FLAT OFF`}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-slate-300">
                        {c.minimumOrderPaise > 0
                          ? formatPaise(c.minimumOrderPaise)
                          : "No Minimum"}
                      </td>

                      <td className="py-4 px-6 text-slate-300">
                        {c.maximumDiscountPaise
                          ? formatPaise(c.maximumDiscountPaise)
                          : "No Cap"}
                      </td>

                      <td className="py-4 px-6">
                        <div className="font-semibold text-white">
                          {c.usedCount}{" "}
                          <span className="text-slate-500 font-normal">
                            / {c.usageLimit ? c.usageLimit : "∞"} uses
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-6 text-slate-400">
                        <div>
                          Till{" "}
                          {new Date(c.expiresAt).toLocaleDateString("en-IN", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                        {isExpired && (
                          <div className="text-rose-400 text-[10px] font-medium">
                            Expired
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-6 text-right">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                            c.status === "ACTIVE" && !isExpired
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                              : "bg-slate-800 text-slate-400 border border-slate-700"
                          }`}
                        >
                          {isExpired ? "EXPIRED" : c.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Coupon Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TicketPercent className="w-5 h-5 text-amber-400" />
                <h3 className="font-serif font-bold text-lg text-white">
                  Create Promotional Coupon
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateCoupon} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Coupon Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    placeholder="GLOW20"
                    className="w-full bg-slate-800 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2 text-white font-mono placeholder-slate-500 outline-none uppercase font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Discount Type *
                  </label>
                  <select
                    value={formType}
                    onChange={(e) =>
                      setFormType(e.target.value as "PERCENTAGE" | "FIXED")
                    }
                    className="w-full bg-slate-800 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-white outline-none"
                  >
                    <option value="PERCENTAGE">PERCENTAGE (%)</option>
                    <option value="FIXED">FIXED AMOUNT (₹)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Value ({formType === "PERCENTAGE" ? "%" : "₹"}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formValue}
                    onChange={(e) => setFormValue(e.target.value)}
                    placeholder={formType === "PERCENTAGE" ? "15" : "200"}
                    className="w-full bg-slate-800 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Min Order (₹)
                  </label>
                  <input
                    type="number"
                    value={formMinOrder}
                    onChange={(e) => setFormMinOrder(e.target.value)}
                    placeholder="999"
                    className="w-full bg-slate-800 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Max Discount (₹)
                  </label>
                  <input
                    type="number"
                    value={formMaxDiscount}
                    onChange={(e) => setFormMaxDiscount(e.target.value)}
                    placeholder="500"
                    className="w-full bg-slate-800 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2 text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Valid From *
                  </label>
                  <input
                    type="date"
                    required
                    value={formStartsAt}
                    onChange={(e) => setFormStartsAt(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Expires On *
                  </label>
                  <input
                    type="date"
                    required
                    value={formExpiresAt}
                    onChange={(e) => setFormExpiresAt(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Redemption Usage Limit
                </label>
                <input
                  type="number"
                  value={formUsageLimit}
                  onChange={(e) => setFormUsageLimit(e.target.value)}
                  placeholder="500"
                  className="w-full bg-slate-800 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2 text-white outline-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold shadow-md shadow-amber-400/20 transition disabled:opacity-50"
                >
                  {submitting ? "Creating..." : "Save Coupon"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
