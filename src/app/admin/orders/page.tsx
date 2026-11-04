"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { formatPaise } from "@/lib/utils";
import { adminFetch } from "@/lib/api/admin-client";
import {
  ShoppingBag,
  Search,
  RefreshCw,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  CreditCard,
  MapPin,
  Phone,
  Mail,
  User,
  ShieldCheck,
  Send,
} from "lucide-react";

interface AdminOrderItem {
  id: string;
  orderNumber: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  itemCount: number;
  totalPaise: number;
  currency: string;
  paymentMethod: string;
  paymentStatus: string;
  fulfilmentStatus: string;
  carrier?: string | null;
  trackingNumber?: string | null;
  isDistributorOrder?: boolean;
  distributorInfo?: { companyName?: string; gstNumber?: string; poNumber?: string };
}

interface DetailedOrder {
  _id: string;
  orderNumber: string;
  createdAt: string;
  customer: {
    name: string;
    phone: string;
    email?: string;
  };
  shippingAddress: {
    fullName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  items: Array<{
    name: string;
    sizeLabel: string;
    sku: string;
    imageUrl?: string;
    regularPricePaise: number;
    effectivePricePaise: number;
    quantity: number;
    lineTotalPaise: number;
  }>;
  subtotalPaise: number;
  discountPaise: number;
  shippingPaise: number;
  taxPaise: number;
  totalPaise: number;
  paymentMethod: string;
  paymentStatus: string;
  fulfilmentStatus: string;
  shipment?: {
    carrier?: string;
    trackingNumber?: string;
    trackingUrl?: string;
    shippedAt?: string;
    deliveredAt?: string;
  };
  statusHistory?: Array<{
    type: string;
    from: string;
    to: string;
    reason?: string;
    at: string;
  }>;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [fulfilmentFilter, setFulfilmentFilter] = useState("ALL");
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [orderTypeFilter, setOrderTypeFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [detailedOrder, setDetailedOrder] = useState<DetailedOrder | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Transition form
  const [nextStatus, setNextStatus] = useState("");
  const [carrier, setCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [statusNote, setStatusNote] = useState("");

  const loadOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (fulfilmentFilter !== "ALL") params.set("fulfilmentStatus", fulfilmentFilter);
      if (paymentFilter !== "ALL") params.set("paymentStatus", paymentFilter);
      if (orderTypeFilter !== "ALL") params.set("orderType", orderTypeFilter);
      if (searchQuery.trim()) params.set("q", searchQuery.trim());

      const res = await adminFetch<{ items: AdminOrderItem[] }>(
        `/api/admin/orders?${params.toString()}`
      );
      if (!res.ok || !res.data) {
        throw new Error(res.error?.message || "Failed to load orders");
      }
      setOrders(res.data.items || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error fetching orders";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadOrders();
    }, 200);
    return () => clearTimeout(timer);
  }, [fulfilmentFilter, paymentFilter, orderTypeFilter, searchQuery]);

  const openOrderDetail = async (orderId: string) => {
    setSelectedOrderId(orderId);
    setDetailLoading(true);
    try {
      const res = await adminFetch<any>(`/api/admin/orders/${orderId}`);
      if (res.ok && res.data) {
        setDetailedOrder(res.data);
        setNextStatus(res.data.fulfilmentStatus);
        setCarrier(res.data.shipment?.carrier || "Delhivery");
        setTrackingNumber(res.data.shipment?.trackingNumber || "");
        setTrackingUrl(res.data.shipment?.trackingUrl || "");
      }
    } catch (err) {
      console.error("Failed to load detailed order:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleStatusTransition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId) return;
    setStatusUpdating(true);
    try {
      const res = await adminFetch(`/api/admin/orders/${selectedOrderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          carrier: carrier.trim() || undefined,
          trackingNumber: trackingNumber.trim() || undefined,
          trackingUrl: trackingUrl.trim() || undefined,
          note: statusNote.trim() || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error(res.error?.message || "Failed to update order status");
      }

      // Reload order details & table
      await openOrderDetail(selectedOrderId);
      loadOrders();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Status update failed");
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleMarkCodCollected = async () => {
    if (!selectedOrderId) return;
    if (!confirm("Are you sure you want to mark COD cash as collected?")) return;
    setStatusUpdating(true);
    try {
      const res = await adminFetch(
        `/api/admin/orders/${selectedOrderId}/mark-cod-collected`,
        { method: "POST" }
      );
      if (!res.ok) {
        throw new Error(res.error?.message || "Failed to mark COD collected");
      }
      await openOrderDetail(selectedOrderId);
      loadOrders();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Action failed");
    } finally {
      setStatusUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-white tracking-wide">
            Order Fulfillment & Logistics
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track customer orders, transition shipment states, input AWB tracking, and settle COD collections.
          </p>
        </div>
        <button
          type="button"
          onClick={loadOrders}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Orders
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between bg-slate-950/60 border border-slate-800 p-4 rounded-2xl">
        <div className="flex flex-wrap items-center gap-3">
          {/* Fulfilment Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 font-medium">Status:</span>
            <select
              value={fulfilmentFilter}
              onChange={(e) => setFulfilmentFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-amber-400"
            >
              <option value="ALL">All Statuses</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="PROCESSING">PROCESSING</option>
              <option value="PACKED">PACKED</option>
              <option value="SHIPPED">SHIPPED</option>
              <option value="DELIVERED">DELIVERED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>

          {/* Payment Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 font-medium">Payment:</span>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-amber-400"
            >
              <option value="ALL">All Payments</option>
              <option value="PAID">PAID</option>
              <option value="PENDING">PENDING</option>
              <option value="FAILED">FAILED</option>
            </select>
          </div>

          {/* Channel / Order Type Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 font-medium">Channel:</span>
            <select
              value={orderTypeFilter}
              onChange={(e) => setOrderTypeFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-amber-400"
            >
              <option value="ALL">All Channels</option>
              <option value="RETAIL">Retail Direct</option>
              <option value="DISTRIBUTOR">Distributor Wholesale</option>
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="relative min-w-[280px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Order #, customer, phone..."
            className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl pl-9 pr-4 py-1.5 text-xs text-white placeholder-slate-500 outline-none transition"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl overflow-hidden">
        {orders.length === 0 ? (
          <div className="p-16 text-center text-slate-500 text-sm">
            {loading ? "Loading order records..." : "No orders found matching criteria."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-6">Order ID</th>
                  <th className="py-3.5 px-6">Date</th>
                  <th className="py-3.5 px-6">Customer</th>
                  <th className="py-3.5 px-6">Items</th>
                  <th className="py-3.5 px-6">Total Amount</th>
                  <th className="py-3.5 px-6">Payment</th>
                  <th className="py-3.5 px-6">Fulfillment</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-900/40 transition">
                    <td className="py-4 px-6">
                      <div className="font-mono font-medium text-white">{o.orderNumber}</div>
                      {o.isDistributorOrder && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                            WHOLESALE
                          </span>
                          {o.distributorInfo?.companyName && (
                            <span className="text-[10px] text-slate-400 truncate max-w-[110px]">
                              {o.distributorInfo.companyName}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6 text-slate-400">
                      {new Date(o.createdAt).toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-slate-200 font-medium">{o.customerName}</div>
                      <div className="text-slate-500 text-[11px]">{o.customerPhone}</div>
                    </td>
                    <td className="py-4 px-6 text-slate-300 font-medium">
                      {o.itemCount} {o.itemCount === 1 ? "unit" : "units"}
                    </td>
                    <td className="py-4 px-6 font-semibold text-white">
                      {formatPaise(o.totalPaise)}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                          o.paymentStatus === "PAID"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                        }`}
                      >
                        {o.paymentStatus} ({o.paymentMethod})
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                            o.fulfilmentStatus === "DELIVERED"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                              : o.fulfilmentStatus === "SHIPPED"
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                          }`}
                        >
                          {o.fulfilmentStatus}
                        </span>
                        {o.carrier && o.trackingNumber && (
                          <div className="text-[10px] text-slate-400 font-mono mt-1">
                            {o.carrier}: {o.trackingNumber}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        type="button"
                        onClick={() => openOrderDetail(o.id)}
                        className="px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold transition text-[11px] shadow-sm"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Details & Transition Modal */}
      {selectedOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif font-bold text-xl text-white">
                    Order {detailedOrder?.orderNumber}
                  </h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                      detailedOrder?.fulfilmentStatus === "DELIVERED"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                    }`}
                  >
                    {detailedOrder?.fulfilmentStatus}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Placed on{" "}
                  {detailedOrder &&
                    new Date(detailedOrder.createdAt).toLocaleString("en-IN")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderId(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
              {detailLoading || !detailedOrder ? (
                <div className="py-12 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-400" />
                  Loading order dossier...
                </div>
              ) : (
                <>
                  {/* Customer & Shipping Summary Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-amber-400" />
                        Customer Information
                      </div>
                      <div className="text-white font-medium">
                        {detailedOrder.customer.name}
                      </div>
                      <div className="text-slate-400 flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-slate-500" />
                        {detailedOrder.customer.phone}
                      </div>
                      {detailedOrder.customer.email && (
                        <div className="text-slate-400 flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-slate-500" />
                          {detailedOrder.customer.email}
                        </div>
                      )}
                    </div>

                    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-amber-400" />
                        Shipping Destination
                      </div>
                      <div className="text-white font-medium">
                        {detailedOrder.shippingAddress.fullName}
                      </div>
                      <div className="text-slate-400">
                        {detailedOrder.shippingAddress.addressLine1}
                        {detailedOrder.shippingAddress.addressLine2 &&
                          `, ${detailedOrder.shippingAddress.addressLine2}`}
                      </div>
                      <div className="text-slate-400">
                        {detailedOrder.shippingAddress.city},{" "}
                        {detailedOrder.shippingAddress.state} -{" "}
                        {detailedOrder.shippingAddress.postalCode}
                      </div>
                    </div>
                  </div>

                  {/* Payment Details & COD settlement banner */}
                  <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                        <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                        Payment Settlement
                      </div>
                      <div className="text-slate-200">
                        Method:{" "}
                        <span className="font-semibold text-white">
                          {detailedOrder.paymentMethod}
                        </span>{" "}
                        | Status:{" "}
                        <span
                          className={`font-semibold ${
                            detailedOrder.paymentStatus === "PAID"
                              ? "text-emerald-400"
                              : "text-amber-400"
                          }`}
                        >
                          {detailedOrder.paymentStatus}
                        </span>
                      </div>
                    </div>

                    {detailedOrder.paymentMethod === "COD" &&
                      detailedOrder.paymentStatus === "PENDING" && (
                        <button
                          type="button"
                          onClick={handleMarkCodCollected}
                          disabled={statusUpdating}
                          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold transition text-xs shadow-md shadow-emerald-500/20 disabled:opacity-50"
                        >
                          Mark COD Cash Collected (₹)
                        </button>
                      )}
                  </div>

                  {/* Order Items */}
                  <div className="border border-slate-800 rounded-xl overflow-hidden">
                    <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 font-semibold text-slate-300">
                      Purchased Items ({detailedOrder.items.length})
                    </div>
                    <div className="divide-y divide-slate-800/60">
                      {detailedOrder.items.map((it, idx) => (
                        <div
                          key={idx}
                          className="p-4 flex items-center justify-between gap-4 bg-slate-900/40"
                        >
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
                                  <ShoppingBag className="w-4 h-4" />
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="text-white font-medium">{it.name}</div>
                              <div className="text-slate-500 text-[11px]">
                                {it.sizeLabel} • Qty: {it.quantity} ×{" "}
                                {formatPaise(it.effectivePricePaise)}
                              </div>
                            </div>
                          </div>
                          <div className="font-semibold text-white">
                            {formatPaise(it.lineTotalPaise)}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-slate-950/80 p-4 space-y-1.5 border-t border-slate-800">
                      <div className="flex justify-between text-slate-400">
                        <span>Subtotal:</span>
                        <span>{formatPaise(detailedOrder.subtotalPaise)}</span>
                      </div>
                      {detailedOrder.discountPaise > 0 && (
                        <div className="flex justify-between text-emerald-400">
                          <span>Discount Applied:</span>
                          <span>- {formatPaise(detailedOrder.discountPaise)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-slate-400">
                        <span>Shipping Fee:</span>
                        <span>
                          {detailedOrder.shippingPaise === 0
                            ? "FREE"
                            : formatPaise(detailedOrder.shippingPaise)}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Estimated Tax (GST):</span>
                        <span>{formatPaise(detailedOrder.taxPaise)}</span>
                      </div>
                      <div className="flex justify-between text-white font-bold text-sm pt-2 border-t border-slate-800">
                        <span>Grand Total:</span>
                        <span className="text-amber-400">
                          {formatPaise(detailedOrder.totalPaise)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Transition Fulfillment Form */}
                  <form
                    onSubmit={handleStatusTransition}
                    className="bg-slate-950/80 border border-amber-400/30 rounded-xl p-5 space-y-4"
                  >
                    <div className="text-sm font-semibold text-white flex items-center gap-2">
                      <Truck className="w-4 h-4 text-amber-400" />
                      Update Fulfillment Status & Shipping Info
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-300 font-medium mb-1">
                          Transition Status To
                        </label>
                        <select
                          value={nextStatus}
                          onChange={(e) => setNextStatus(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-white outline-none"
                        >
                          <option value="CONFIRMED">CONFIRMED</option>
                          <option value="PROCESSING">PROCESSING</option>
                          <option value="PACKED">PACKED</option>
                          <option value="SHIPPED">SHIPPED</option>
                          <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY</option>
                          <option value="DELIVERED">DELIVERED</option>
                          <option value="CANCELLED">CANCELLED</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-300 font-medium mb-1">
                          Logistics Carrier
                        </label>
                        <input
                          type="text"
                          value={carrier}
                          onChange={(e) => setCarrier(e.target.value)}
                          placeholder="Delhivery / Blue Dart / Shiprocket"
                          className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-300 font-medium mb-1">
                          Tracking AWB Number
                        </label>
                        <input
                          type="text"
                          value={trackingNumber}
                          onChange={(e) => setTrackingNumber(e.target.value)}
                          placeholder="AWB123456789"
                          className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2 text-white font-mono placeholder-slate-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-300 font-medium mb-1">
                          Public Tracking URL (optional)
                        </label>
                        <input
                          type="url"
                          value={trackingUrl}
                          onChange={(e) => setTrackingUrl(e.target.value)}
                          placeholder="https://delhivery.com/track/..."
                          className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1">
                        Internal Status Note / Reason
                      </label>
                      <input
                        type="text"
                        value={statusNote}
                        onChange={(e) => setStatusNote(e.target.value)}
                        placeholder="Dispatched from Mumbai warehouse hub"
                        className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 outline-none"
                      />
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={statusUpdating}
                        className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold shadow-md shadow-amber-400/20 transition disabled:opacity-50 flex items-center gap-2"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {statusUpdating ? "Updating Status..." : "Save Status Transition"}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
