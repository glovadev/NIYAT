"use client";

import React, { useEffect, useState } from "react";
import { adminFetch } from "@/lib/api/admin-client";
import { formatPaise } from "@/lib/utils";
import {
  Truck,
  Sparkles,
  RefreshCw,
  Save,
  CheckCircle2,
  AlertCircle,
  Gift,
  HelpCircle,
  Calculator,
  ShieldCheck,
} from "lucide-react";

interface ShippingSettingsData {
  standardShippingFeePaise: number;
  freeShippingThresholdPaise: number;
  isFreeDeliveryOfferActive: boolean;
  freeDeliveryBannerText: string;
  updatedAt?: string;
}

export default function AdminShippingPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State (in Rupees for intuitive user input)
  const [standardFeeRupees, setStandardFeeRupees] = useState("99");
  const [thresholdRupees, setThresholdRupees] = useState("999");
  const [isFreeDeliveryActive, setIsFreeDeliveryActive] = useState(false);
  const [bannerText, setBannerText] = useState(
    "Limited Time: Complimentary Free Delivery on All Orders!"
  );
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const loadSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch<ShippingSettingsData>("/api/admin/shipping");
      if (!res.ok || !res.data) {
        throw new Error(res.error?.message || "Failed to load shipping settings");
      }

      const data = res.data;
      setStandardFeeRupees((data.standardShippingFeePaise / 100).toString());
      setThresholdRupees((data.freeShippingThresholdPaise / 100).toString());
      setIsFreeDeliveryActive(Boolean(data.isFreeDeliveryOfferActive));
      setBannerText(
        data.freeDeliveryBannerText ||
          "Limited Time: Complimentary Free Delivery on All Orders!"
      );
      if (data.updatedAt) {
        setLastUpdated(new Date(data.updatedAt).toLocaleString("en-IN"));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error fetching settings";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setSaving(true);

    try {
      const standardFee = parseFloat(standardFeeRupees);
      const threshold = parseFloat(thresholdRupees);

      if (isNaN(standardFee) || standardFee < 0) {
        throw new Error("Standard delivery charge must be a valid non-negative number (e.g. 99, 49, 0)");
      }
      if (isNaN(threshold) || threshold < 0) {
        throw new Error("Minimum order value for free delivery must be a valid non-negative number");
      }

      const res = await adminFetch<ShippingSettingsData>("/api/admin/shipping", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          standardShippingFeeRupees: standardFee,
          freeShippingThresholdRupees: threshold,
          isFreeDeliveryOfferActive: isFreeDeliveryActive,
          freeDeliveryBannerText: bannerText,
        }),
      });

      if (!res.ok || !res.data) {
        throw new Error(res.error?.message || "Failed to save shipping settings");
      }

      setSuccessMsg("Shipping configuration updated successfully! Changes are active immediately across the store.");
      if (res.data.updatedAt) {
        setLastUpdated(new Date(res.data.updatedAt).toLocaleString("en-IN"));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving settings";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  // Simulation calculations
  const parsedFee = Math.max(0, parseFloat(standardFeeRupees) || 0);
  const parsedThreshold = Math.max(0, parseFloat(thresholdRupees) || 0);

  const calculateSimulatedShipping = (cartTotal: number) => {
    if (isFreeDeliveryActive) return 0;
    if (parsedFee === 0) return 0;
    if (cartTotal >= parsedThreshold) return 0;
    return parsedFee;
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-white tracking-wide flex items-center gap-3">
            <Truck className="w-6 h-6 text-amber-400" />
            Shipping & Delivery Configuration
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Authoritative storefront rules for delivery charges, minimum cart value thresholds, and global promotional free delivery.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadSettings}
            disabled={loading || saving}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading || saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold shadow-md shadow-amber-400/20 transition disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "Saving Changes..." : "Save Configuration"}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-3">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-start gap-3">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* ============================================================== */}
        {/* 1. HERO TOGGLE: Global Free Delivery Promotion                */}
        {/* ============================================================== */}
        <div
          className={`p-6 sm:p-8 rounded-3xl border transition-all duration-300 relative overflow-hidden ${
            isFreeDeliveryActive
              ? "bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border-emerald-500/40 shadow-xl shadow-emerald-950/30"
              : "bg-slate-900/60 border-slate-800"
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    isFreeDeliveryActive
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-slate-800 text-slate-400 border border-slate-700"
                  }`}
                >
                  <Gift className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-serif font-bold text-white tracking-wide">
                  Offer Free Delivery on All Orders
                </h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                    isFreeDeliveryActive
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 animate-pulse"
                      : "bg-slate-800 text-slate-400 border border-slate-700"
                  }`}
                >
                  {isFreeDeliveryActive ? "Active Promotion" : "Inactive"}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                When activated, <strong className="text-white">100% Free Complimentary Delivery</strong> is automatically applied to every customer checkout regardless of cart amount. Customers will never be charged delivery while this offer is active.
              </p>
            </div>

            {/* Big Interactive Toggle Switch */}
            <div className="flex items-center gap-3 self-start md:self-center">
              <button
                type="button"
                onClick={() => setIsFreeDeliveryActive(!isFreeDeliveryActive)}
                className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-250 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                  isFreeDeliveryActive ? "bg-emerald-500" : "bg-slate-700"
                }`}
                role="switch"
                aria-checked={isFreeDeliveryActive}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-250 ease-in-out ${
                    isFreeDeliveryActive ? "translate-x-8" : "translate-x-0"
                  }`}
                />
              </button>
              <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                {isFreeDeliveryActive ? "ON" : "OFF"}
              </span>
            </div>
          </div>

          {/* Promotional Banner Customization */}
          {isFreeDeliveryActive && (
            <div className="mt-6 pt-6 border-t border-emerald-500/20 space-y-2">
              <label className="block text-xs font-semibold text-emerald-300 uppercase tracking-wider">
                Promotional Announcement Message (Shown in Store Cart & Checkout)
              </label>
              <input
                type="text"
                value={bannerText}
                onChange={(e) => setBannerText(e.target.value)}
                placeholder="e.g. Limited Time: Complimentary Free Delivery on All Orders!"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-emerald-500/30 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-emerald-400"
              />
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* 2. CORE SHIPPING RULES: Delivery Charge & Minimum Cart Value   */}
        {/* ============================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Standard Delivery Charge Card */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-4 hover:border-slate-700 transition">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
                  <Truck className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                  Standard Delivery Charge
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">INR (₹)</span>
            </div>

            <p className="text-xs text-slate-400">
              The fee charged to the customer when their order subtotal is below the free delivery threshold.
            </p>

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                ₹
              </span>
              <input
                type="number"
                min="0"
                step="1"
                value={standardFeeRupees}
                onChange={(e) => setStandardFeeRupees(e.target.value)}
                className="w-full pl-9 pr-4 py-3 rounded-2xl bg-slate-900 border border-slate-700 text-white text-base font-bold font-mono focus:outline-none focus:border-amber-400 transition"
                placeholder="99"
              />
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Current customer charge: <strong className="text-white">₹{parsedFee}</strong></span>
            </div>
          </div>

          {/* Minimum Order Value Card */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-4 hover:border-slate-700 transition">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                  Minimum Order Value for Free Delivery
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">INR (₹)</span>
            </div>

            <p className="text-xs text-slate-400">
              Orders with a net cart subtotal equal to or exceeding this amount receive free complimentary delivery automatically.
            </p>

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                ₹
              </span>
              <input
                type="number"
                min="0"
                step="1"
                value={thresholdRupees}
                onChange={(e) => setThresholdRupees(e.target.value)}
                className="w-full pl-9 pr-4 py-3 rounded-2xl bg-slate-900 border border-slate-700 text-white text-base font-bold font-mono focus:outline-none focus:border-emerald-400 transition"
                placeholder="999"
              />
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Customers unlock free shipping at: <strong className="text-white">₹{parsedThreshold}</strong></span>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 3. LIVE SIMULATION & CHECKOUT PREVIEW                          */}
        {/* ============================================================== */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Calculator className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                  Live Rule Simulator
                </h3>
                <p className="text-[11px] text-slate-400">
                  Real-time preview of how your settings will calculate at customer checkout.
                </p>
              </div>
            </div>
            {lastUpdated && (
              <span className="text-[10px] text-slate-400">
                Last saved: {lastUpdated}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Simulation 1: Small order */}
            {(() => {
              const testTotal = Math.max(1, Math.round(parsedThreshold * 0.25));
              const fee = calculateSimulatedShipping(testTotal);
              return (
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Small Order</span>
                    <span className="font-mono font-semibold text-white">₹{testTotal}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
                    <span className="text-slate-400">Delivery Fee:</span>
                    <span
                      className={`font-mono font-bold ${
                        fee === 0 ? "text-emerald-400" : "text-amber-400"
                      }`}
                    >
                      {fee === 0 ? "FREE" : `₹${fee}`}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Simulation 2: Just below threshold */}
            {(() => {
              const testTotal = Math.max(1, parsedThreshold - 1);
              const fee = calculateSimulatedShipping(testTotal);
              return (
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Below Threshold</span>
                    <span className="font-mono font-semibold text-white">₹{testTotal}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
                    <span className="text-slate-400">Delivery Fee:</span>
                    <span
                      className={`font-mono font-bold ${
                        fee === 0 ? "text-emerald-400" : "text-amber-400"
                      }`}
                    >
                      {fee === 0 ? "FREE" : `₹${fee}`}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Simulation 3: Equal to or above threshold */}
            {(() => {
              const testTotal = parsedThreshold + 200;
              const fee = calculateSimulatedShipping(testTotal);
              return (
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Above Threshold</span>
                    <span className="font-mono font-semibold text-white">₹{testTotal}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
                    <span className="text-slate-400">Delivery Fee:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      FREE
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Bottom Save Action */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            type="submit"
            disabled={loading || saving}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold shadow-lg shadow-amber-400/20 transition disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "Saving Changes..." : "Save Configuration"}
          </button>
        </div>
      </form>
    </div>
  );
}

