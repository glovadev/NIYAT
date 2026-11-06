"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { formatPaise } from "@/lib/utils";
import { adminFetch } from "@/lib/api/admin-client";
import { useAuth } from "@/lib/auth/auth-context";
import {
  TrendingUp,
  ShoppingBag,
  Truck,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Plus,
  Package,
  Boxes,
  Star,
  TicketPercent,
  SlidersHorizontal,
  CheckCircle2,
  Clock,
} from "lucide-react";

interface DashboardMetrics {
  totalOrders: number;
  totalRevenuePaise: number;
  pendingFulfilmentCount: number;
  lowStockCount: number;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  totalPaise: number;
  paymentStatus: string;
  paymentMethod: string;
  fulfilmentStatus: string;
  createdAt: string;
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch<{
        metrics: DashboardMetrics;
        recentOrders: RecentOrder[];
      }>("/api/admin/dashboard");

      if (!res.ok || !res.data) {
        throw new Error(res.error?.message || "Failed to load dashboard metrics");
      }

      setMetrics(res.data.metrics);
      setRecentOrders(res.data.recentOrders || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error fetching data";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  return (
    <div className="space-y-8">
      {/* Top Welcome & Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-white tracking-wide">
            Operations & Performance
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time telemetry, store revenue, order pipeline, and inventory status.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadDashboardData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link
            href="/admin/products?new=true"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-semibold shadow-md shadow-amber-400/20 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Product
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Gross Revenue */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Paid Revenue
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold font-serif text-white tracking-tight">
              {metrics ? formatPaise(metrics.totalRevenuePaise) : "₹0"}
            </div>
            <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
              <span>●</span> Authoritative Razorpay & Settled COD
            </p>
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Total Orders
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-white tracking-tight">
              {metrics ? metrics.totalOrders : 0}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              All lifetime placed orders
            </p>
          </div>
        </div>

        {/* Pending Fulfillment */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Pending Dispatch
            </span>
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                metrics && metrics.pendingFulfilmentCount > 0
                  ? "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-white tracking-tight">
              {metrics ? metrics.pendingFulfilmentCount : 0}
            </div>
            <p className="text-[11px] text-amber-300 mt-1">
              Confirmed & processing queue
            </p>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Low Stock Alerts
            </span>
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                metrics && metrics.lowStockCount > 0
                  ? "bg-rose-500/10 border border-rose-500/20 text-rose-400"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-white tracking-tight">
              {metrics ? metrics.lowStockCount : 0}
            </div>
            <p className="text-[11px] text-rose-300 mt-1">
              SKUs at or below threshold
            </p>
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Link
          href="/admin/banners"
          className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 hover:border-amber-400/40 hover:bg-slate-850 transition group flex flex-col justify-between"
        >
          <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center mb-3 group-hover:text-amber-400">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white">Hero Banners</div>
            <div className="text-[11px] text-slate-400">Sliding carousel & links</div>
          </div>
        </Link>

        <Link
          href="/admin/products"
          className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 hover:border-amber-400/40 hover:bg-slate-850 transition group flex flex-col justify-between"
        >
          <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center mb-3 group-hover:text-amber-400">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white">Product Catalog</div>
            <div className="text-[11px] text-slate-400">Manage SKUs & pricing</div>
          </div>
        </Link>

        <Link
          href="/admin/orders"
          className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 hover:border-amber-400/40 hover:bg-slate-850 transition group flex flex-col justify-between"
        >
          <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center mb-3 group-hover:text-amber-400">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white">Orders & Shipments</div>
            <div className="text-[11px] text-slate-400">Fulfill & update track</div>
          </div>
        </Link>

        <Link
          href="/admin/inventory"
          className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 hover:border-amber-400/40 hover:bg-slate-850 transition group flex flex-col justify-between"
        >
          <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center mb-3 group-hover:text-amber-400">
            <Boxes className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white">Stock Control</div>
            <div className="text-[11px] text-slate-400">Log movements & audits</div>
          </div>
        </Link>

        <Link
          href="/admin/coupons"
          className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 hover:border-amber-400/40 hover:bg-slate-850 transition group flex flex-col justify-between"
        >
          <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center mb-3 group-hover:text-amber-400">
            <TicketPercent className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white">Promotions</div>
            <div className="text-[11px] text-slate-400">Coupons & discounts</div>
          </div>
        </Link>
      </div>

      {/* Recent Orders Section */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="font-serif font-bold text-lg text-white">
              Recent Customer Orders
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Latest transactions placed across the boutique
            </p>
          </div>
          <Link
            href="/admin/orders"
            className="text-xs font-medium text-amber-400 hover:text-amber-300 transition flex items-center gap-1"
          >
            View All Orders
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No orders have been placed yet. Place a test order through the storefront!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-900/60 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-6">Order ID</th>
                  <th className="py-3.5 px-6">Customer</th>
                  <th className="py-3.5 px-6">Total</th>
                  <th className="py-3.5 px-6">Payment</th>
                  <th className="py-3.5 px-6">Fulfillment</th>
                  <th className="py-3.5 px-6">Date</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {recentOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-900/40 transition">
                    <td className="py-4 px-6 font-mono font-medium text-white">
                      {ord.orderNumber}
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-slate-200 font-medium">
                        {ord.customerName}
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        {ord.customerPhone}
                      </div>
                    </td>
                    <td className="py-4 px-6 font-semibold text-white">
                      {formatPaise(ord.totalPaise)}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                          ord.paymentStatus === "PAID"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                        }`}
                      >
                        {ord.paymentStatus} ({ord.paymentMethod})
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                          ord.fulfilmentStatus === "DELIVERED"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : ord.fulfilmentStatus === "SHIPPED"
                            ? "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                        }`}
                      >
                        {ord.fulfilmentStatus}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-400">
                      {new Date(ord.createdAt).toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Link
                        href={`/admin/orders`}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition font-medium text-[11px]"
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
