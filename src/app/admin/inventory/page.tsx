"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { adminFetch } from "@/lib/api/admin-client";
import {
  Boxes,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Package,
  Plus,
  Minus,
  Sliders,
  X,
  History,
} from "lucide-react";

interface InventoryItem {
  productId: string;
  name: string;
  sku: string;
  sizeLabel: string;
  categoryName: string;
  stockQuantity: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  status: string;
  imageUrl?: string;
}

export default function AdminInventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Adjustment Modal
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);
  const [adjustType, setAdjustType] = useState<"ADD" | "DEDUCT">("ADD");
  const [units, setUnits] = useState("25");
  const [reasonCategory, setReasonCategory] = useState("Restock batch from manufacturing lab");
  const [customNote, setCustomNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadInventory = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (lowStockOnly) params.set("lowStock", "true");
      if (searchQuery.trim()) params.set("q", searchQuery.trim());

      const res = await adminFetch<{ items: InventoryItem[] }>(
        `/api/admin/inventory?${params.toString()}`
      );
      if (!res.ok || !res.data) {
        throw new Error(res.error?.message || "Failed to load inventory");
      }
      setItems(res.data.items || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error fetching inventory";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadInventory();
    }, 200);
    return () => clearTimeout(timer);
  }, [lowStockOnly, searchQuery]);

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setModalError(null);
    setSubmitting(true);

    try {
      const parsedUnits = parseInt(units, 10);
      if (isNaN(parsedUnits) || parsedUnits <= 0) {
        throw new Error("Units must be a positive integer");
      }

      const quantityChange = adjustType === "ADD" ? parsedUnits : -parsedUnits;
      const combinedReason = `${reasonCategory}${customNote.trim() ? ` — ${customNote.trim()}` : ""}`;

      const res = await adminFetch("/api/admin/inventory/adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProduct.productId,
          quantityChange,
          reason: combinedReason,
        }),
      });

      if (!res.ok) {
        throw new Error(res.error?.message || "Failed to adjust inventory");
      }

      setSelectedProduct(null);
      setCustomNote("");
      loadInventory();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error adjusting stock";
      setModalError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const totalSKUs = items.length;
  const lowStockCount = items.filter((i) => i.isLowStock).length;
  const depletedCount = items.filter((i) => i.stockQuantity === 0).length;
  const healthyCount = totalSKUs - lowStockCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-white tracking-wide">
            Inventory & Warehouse Stock Control
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time stock balancing, threshold monitoring, and audited replenishment logs.
          </p>
        </div>
        <button
          type="button"
          onClick={loadInventory}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Stock
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Total Monitored SKUs
          </div>
          <div className="text-xl font-bold text-white mt-1">{totalSKUs}</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
            Healthy Stock
          </div>
          <div className="text-xl font-bold text-emerald-400 mt-1">{healthyCount}</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
            Low Stock Alerts
          </div>
          <div className="text-xl font-bold text-amber-400 mt-1">{lowStockCount}</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">
            Depleted (0 Units)
          </div>
          <div className="text-xl font-bold text-rose-400 mt-1">{depletedCount}</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between bg-slate-950/60 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setLowStockOnly(false)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
              !lowStockOnly
                ? "bg-amber-400 text-slate-950 font-semibold"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            All Stock Items
          </button>
          <button
            type="button"
            onClick={() => setLowStockOnly(true)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
              lowStockOnly
                ? "bg-rose-500 text-white font-semibold"
                : "text-rose-400 hover:text-rose-300 hover:bg-slate-800"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Low Stock Only ({lowStockCount})
          </button>
        </div>

        {/* Search */}
        <div className="relative min-w-[280px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, SKU..."
            className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl pl-9 pr-4 py-1.5 text-xs text-white placeholder-slate-500 outline-none transition"
          />
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl overflow-hidden">
        {items.length === 0 ? (
          <div className="p-16 text-center text-slate-500 text-sm">
            {loading ? "Checking inventory status..." : "No items match current filters."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-6">Product Item</th>
                  <th className="py-3.5 px-6">SKU / Size</th>
                  <th className="py-3.5 px-6">Category</th>
                  <th className="py-3.5 px-6">On-Hand Quantity</th>
                  <th className="py-3.5 px-6">Low Threshold</th>
                  <th className="py-3.5 px-6">Stock Health</th>
                  <th className="py-3.5 px-6 text-right">Adjustment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {items.map((it) => (
                  <tr key={it.productId} className="hover:bg-slate-900/40 transition">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 overflow-hidden relative shrink-0">
                          {it.imageUrl ? (
                            <Image
                              src={it.imageUrl}
                              alt={it.name}
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-600">
                              <Package className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <div className="text-white font-medium">{it.name}</div>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <div className="font-mono text-slate-300 font-medium">{it.sku}</div>
                      <div className="text-slate-500 text-[11px]">{it.sizeLabel}</div>
                    </td>

                    <td className="py-4 px-6 text-slate-300">
                      <span className="px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 text-[11px]">
                        {it.categoryName}
                      </span>
                    </td>

                    <td className="py-4 px-6 font-semibold text-sm">
                      <span
                        className={
                          it.stockQuantity === 0
                            ? "text-rose-400"
                            : it.isLowStock
                            ? "text-amber-400"
                            : "text-emerald-400"
                        }
                      >
                        {it.stockQuantity} units
                      </span>
                    </td>

                    <td className="py-4 px-6 text-slate-400 font-mono">
                      {it.lowStockThreshold} units
                    </td>

                    <td className="py-4 px-6">
                      {it.stockQuantity === 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/30">
                          Depleted
                        </span>
                      ) : it.isLowStock ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          Low Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          Healthy
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-6 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedProduct(it)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition font-medium text-[11px] inline-flex items-center gap-1.5"
                      >
                        <Sliders className="w-3.5 h-3.5 text-amber-400" />
                        Adjust Stock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Adjust Stock Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-lg text-white">
                  Audited Inventory Adjustment
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Update inventory levels with strict compliance audit trail.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
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

            <form onSubmit={handleAdjustSubmit} className="p-6 space-y-4 text-xs">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-white font-semibold text-sm">
                    {selectedProduct.name}
                  </div>
                  <div className="text-slate-400 text-[11px] font-mono mt-0.5">
                    SKU: {selectedProduct.sku}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-slate-400">Current Stock</div>
                  <div className="text-base font-bold text-amber-400">
                    {selectedProduct.stockQuantity} units
                  </div>
                </div>
              </div>

              {/* Adjustment Direction */}
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">
                  Adjustment Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAdjustType("ADD")}
                    className={`py-2.5 px-4 rounded-xl border font-semibold flex items-center justify-center gap-2 transition ${
                      adjustType === "ADD"
                        ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                        : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    Add Stock (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType("DEDUCT")}
                    className={`py-2.5 px-4 rounded-xl border font-semibold flex items-center justify-center gap-2 transition ${
                      adjustType === "DEDUCT"
                        ? "bg-rose-500/10 border-rose-500 text-rose-400"
                        : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
                    }`}
                  >
                    <Minus className="w-4 h-4" />
                    Deduct Stock (-)
                  </button>
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Quantity ({adjustType === "ADD" ? "Units to Add" : "Units to Remove"}) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={units}
                  onChange={(e) => setUnits(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2 text-white font-mono text-sm outline-none"
                />
              </div>

              {/* Reason Category */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Reason Category *
                </label>
                <select
                  value={reasonCategory}
                  onChange={(e) => setReasonCategory(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-white outline-none"
                >
                  <option value="Restock batch from manufacturing lab">
                    Restock batch from manufacturing lab
                  </option>
                  <option value="Packaging damage or container leakage">
                    Packaging damage or container leakage
                  </option>
                  <option value="Customer return inspected & restocked">
                    Customer return inspected & restocked
                  </option>
                  <option value="Physical audit inventory correction">
                    Physical audit inventory correction
                  </option>
                  <option value="Promotional & influencer PR sampling">
                    Promotional & influencer PR sampling
                  </option>
                </select>
              </div>

              {/* Audit Note */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Audit Remark / PO Reference (optional)
                </label>
                <input
                  type="text"
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="PO #8472 / Batch 2026-B"
                  className="w-full bg-slate-800 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 outline-none"
                />
              </div>

              {/* Projected Stock Preview */}
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between text-slate-300">
                <span>Resulting Stock Level:</span>
                <span className="font-bold text-white text-sm">
                  {Math.max(
                    0,
                    selectedProduct.stockQuantity +
                      (adjustType === "ADD"
                        ? parseInt(units, 10) || 0
                        : -(parseInt(units, 10) || 0))
                  )}{" "}
                  units
                </span>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold shadow-md shadow-amber-400/20 transition disabled:opacity-50"
                >
                  {submitting ? "Logging Adjustment..." : "Commit Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
