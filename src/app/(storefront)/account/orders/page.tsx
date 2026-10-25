"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { formatPaise } from "@/lib/utils";
import {
  Package,
  ChevronRight,
  Clock,
  Truck,
  AlertCircle,
  CheckCircle,
  XCircle,
  Search,
} from "lucide-react";

interface OrderListItem {
  id: string;
  orderNumber: string;
  createdAt: string;
  totalPaise: number;
  currency: string;
  fulfilmentStatus: string;
  paymentStatus: string;
  paymentMethod: string;
  itemCount: number;
  firstItem?: {
    name: string;
    imageUrl?: string;
    sizeLabel: string;
  } | null;
}

export default function CustomerOrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelModalOrder, setCancelModalOrder] = useState<OrderListItem | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const fetchOrders = () => {
    setLoading(true);
    fetch("/api/me/orders")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.items) {
          setOrders(data.data.items);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (user) {
      fetchOrders();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading]);

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalOrder) return;

    setCancellingId(cancelModalOrder.id);
    try {
      const res = await fetch(`/api/me/orders/${cancelModalOrder.id}/cancel-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedbackMsg(`Cancellation requested for order ${cancelModalOrder.orderNumber}`);
        setCancelModalOrder(null);
        setCancelReason("");
        fetchOrders();
      } else {
        alert(data.error?.message || "Failed to submit cancellation request");
      }
    } finally {
      setCancellingId(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-3 border-niyat-gold border-t-niyat-emerald rounded-full animate-spin mx-auto mb-4" />
        <p className="text-xs uppercase tracking-widest text-niyat-gold">
          Retrieving order archives...
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="py-20 text-center max-w-md mx-auto space-y-4 px-4">
        <Package className="w-12 h-12 text-niyat-gold mx-auto" />
        <h2 className="font-serif text-2xl font-bold text-niyat-charcoal">Sign In Required</h2>
        <p className="text-xs text-niyat-muted">
          Please sign in to your customer account to view your purchase history.
        </p>
        <Link
          href="/account"
          className="inline-block px-6 py-2.5 rounded-full bg-niyat-emerald text-white text-xs font-semibold uppercase tracking-wider"
        >
          Go to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-niyat-muted">
          <Link href="/" className="hover:text-niyat-emerald transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3 h-3" />
          <Link href="/account" className="hover:text-niyat-emerald transition-colors">
            My Account
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-niyat-charcoal font-medium">Order History</span>
        </nav>

        {/* Header */}
        <div className="border-b border-niyat-ivory-border pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase tracking-widest text-niyat-gold font-semibold">
              Fulfillment &amp; Archives
            </span>
            <h1 className="font-serif text-3xl font-bold text-niyat-charcoal mt-1">
              Your Order History
            </h1>
          </div>
          <Link
            href="/orders/track"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-niyat-ivory-border text-xs font-semibold text-niyat-charcoal hover:border-niyat-gold shadow-sm transition-all"
          >
            <Truck className="w-4 h-4 text-niyat-gold" /> Track by Order Number
          </Link>
        </div>

        {feedbackMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
            <span>{feedbackMsg}</span>
            <button
              onClick={() => setFeedbackMsg(null)}
              className="text-emerald-600 font-bold ml-4"
            >
              ×
            </button>
          </div>
        )}

        {/* Orders List */}
        {orders.length > 0 ? (
          <div className="space-y-6">
            {orders.map((order) => {
              const cancellable = [
                "PENDING_PAYMENT",
                "CONFIRMED",
                "PROCESSING",
              ].includes(order.fulfilmentStatus);

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-3xl p-6 sm:p-8 border border-niyat-ivory-border shadow-sm space-y-6 transition-all hover:shadow-md"
                >
                  {/* Order Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-niyat-ivory-border">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-bold text-niyat-charcoal">
                          {order.orderNumber}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-niyat-gold-subtle text-niyat-gold-dark border border-niyat-gold/30 uppercase">
                          {order.fulfilmentStatus.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="text-xs text-niyat-muted">
                        Placed on{" "}
                        {new Date(order.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-[11px] text-niyat-muted block uppercase tracking-wider">
                          Grand Total
                        </span>
                        <span className="font-serif text-lg font-bold text-niyat-emerald">
                          {formatPaise(order.totalPaise)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Summary row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                    <div className="text-niyat-charcoal/80">
                      {order.firstItem ? (
                        <span>
                          Includes: <strong className="font-semibold">{order.firstItem.name}</strong>
                          {order.itemCount > 1 ? ` and ${order.itemCount - 1} other item(s)` : ""}
                        </span>
                      ) : (
                        <span>{order.itemCount} items ordered</span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <Link
                        href={`/orders/track`}
                        className="px-4 py-2 rounded-xl bg-niyat-ivory border border-niyat-ivory-border text-xs font-medium text-niyat-charcoal hover:bg-white hover:border-niyat-gold transition-all"
                      >
                        Live Tracking
                      </Link>

                      {cancellable && (
                        <button
                          type="button"
                          onClick={() => setCancelModalOrder(order)}
                          className="px-4 py-2 rounded-xl text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                        >
                          Request Cancellation
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-niyat-ivory-border max-w-xl mx-auto space-y-4 px-6">
            <Package className="w-12 h-12 text-niyat-gold mx-auto" />
            <h3 className="font-serif text-xl font-bold text-niyat-charcoal">
              No Previous Orders Found
            </h3>
            <p className="text-xs text-niyat-muted">
              You haven&apos;t placed any orders yet. Explore our curated formulations to begin your ritual.
            </p>
            <div className="pt-2">
              <Link
                href="/shop"
                className="inline-flex items-center px-6 py-2.5 rounded-full bg-niyat-emerald text-white text-xs font-semibold uppercase tracking-wider hover:bg-niyat-emerald-dark transition-all"
              >
                Browse Catalog
              </Link>
            </div>
          </div>
        )}

        {/* Cancellation Modal */}
        {cancelModalOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl border border-niyat-ivory-border">
              <div className="flex items-center justify-between pb-3 border-b border-niyat-ivory-border">
                <h3 className="font-serif text-lg font-bold text-niyat-charcoal">
                  Cancel Order {cancelModalOrder.orderNumber}
                </h3>
                <button
                  onClick={() => setCancelModalOrder(null)}
                  className="text-niyat-muted hover:text-niyat-charcoal text-lg"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-niyat-muted leading-relaxed">
                Orders can be cancelled before fulfillment dispatch. Please let us know the reason
                for your cancellation request.
              </p>

              <form onSubmit={handleCancelSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-niyat-charcoal">
                    Cancellation Reason
                  </label>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="e.g. Changed my mind, ordered incorrect product, wrong address"
                    required
                    rows={3}
                    className="w-full p-3 rounded-xl border border-niyat-ivory-border text-xs text-niyat-charcoal focus:outline-none focus:border-niyat-gold"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setCancelModalOrder(null)}
                    className="px-4 py-2 rounded-full text-xs text-niyat-muted hover:text-niyat-charcoal"
                  >
                    Keep Order
                  </button>
                  <button
                    type="submit"
                    disabled={Boolean(cancellingId)}
                    className="px-6 py-2 rounded-full bg-red-600 text-white text-xs font-semibold uppercase tracking-wider hover:bg-red-700 disabled:opacity-50"
                  >
                    {cancellingId ? "Submitting..." : "Confirm Cancel Request"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
