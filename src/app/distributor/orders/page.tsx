"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatPaise } from "@/lib/utils";
import {
  ShoppingBag,
  Boxes,
  FileText,
  Printer,
  ChevronRight,
  RefreshCw,
  X,
  Truck,
  CheckCircle,
  Building,
  Calendar,
  ExternalLink,
} from "lucide-react";

interface OrderItem {
  productId: string;
  productName: string;
  sku: string;
  sizeLabel: string;
  imageUrl?: string;
  unitPricePaise: number;
  quantity: number;
  lineTotalPaise: number;
}

interface DistributorOrder {
  id: string;
  orderNumber: string;
  itemsCount: number;
  items: OrderItem[];
  shippingAddress: {
    recipientName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  subtotalPaise: number;
  taxPaise: number;
  shippingPaise: number;
  totalPaise: number;
  paymentMethod: string;
  paymentStatus: string;
  fulfilmentStatus: string;
  isDistributorOrder: boolean;
  distributorInfo?: {
    companyName?: string;
    gstNumber?: string;
    poNumber?: string;
  };
  createdAt: string;
}

export default function DistributorOrdersPage() {
  const [orders, setOrders] = useState<DistributorOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<DistributorOrder | null>(null);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/distributor/orders");
      const json = await res.json();
      if (json.success && json.data) {
        setOrders(json.data.orders || []);
      }
    } catch (err) {
      console.error("Failed to load orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handlePrintInvoice = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold text-white tracking-wide">
                Wholesale Purchase Orders
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Track fulfilment, dispatch timelines, and view commercial invoice slips
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/distributor"
            className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs tracking-wide shadow-md transition flex items-center gap-2"
          >
            <Boxes className="w-4 h-4" />
            Place New Bulk Order
          </Link>
          <button
            onClick={loadOrders}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
            title="Refresh order history"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="py-20 text-center text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-400" />
          Loading wholesale orders...
        </div>
      ) : orders.length === 0 ? (
        <div className="py-20 text-center text-slate-500 bg-slate-900/30 rounded-3xl border border-slate-800/60 p-8 space-y-4">
          <ShoppingBag className="w-12 h-12 mx-auto text-slate-600" />
          <div>
            <h3 className="text-base font-semibold text-white">No Wholesale Orders Yet</h3>
            <p className="text-xs text-slate-400 mt-1">
              You haven&apos;t placed any bulk procurement orders yet.
            </p>
          </div>
          <Link
            href="/distributor"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-md transition"
          >
            Open Wholesale Catalog
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const formattedDate = new Date(order.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });

            return (
              <div
                key={order.id}
                className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition shadow-lg space-y-4"
              >
                {/* Order Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono font-bold text-sm text-white">
                      {order.orderNumber}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      {formattedDate}
                    </span>
                    {order.distributorInfo?.poNumber && (
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono border border-slate-700">
                        PO: {order.distributorInfo.poNumber}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Status badges */}
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border ${
                        order.fulfilmentStatus === "DELIVERED"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : order.fulfilmentStatus === "CANCELLED"
                          ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                          : "bg-blue-500/10 text-blue-400 border-blue-500/30"
                      }`}
                    >
                      {order.fulfilmentStatus}
                    </span>

                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border ${
                        order.paymentStatus === "PAID"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : "bg-amber-400/10 text-amber-300 border-amber-400/30"
                      }`}
                    >
                      {order.paymentStatus}
                    </span>

                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 transition"
                    >
                      <FileText className="w-3.5 h-3.5 text-amber-400" />
                      Invoice Slip
                    </button>
                  </div>
                </div>

                {/* Items preview */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {order.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80"
                    >
                      <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 overflow-hidden shrink-0 relative">
                        {item.imageUrl ? (
                          <Image
                            src={item.imageUrl}
                            alt={item.productName}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <Boxes className="w-5 h-5 text-slate-600 m-auto" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-white truncate">
                          {item.productName}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center justify-between mt-0.5">
                          <span className="font-mono">{item.quantity} units</span>
                          <span className="font-mono text-amber-300">
                            {formatPaise(item.lineTotalPaise)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Order Footer */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 text-xs text-slate-400">
                  <div className="flex items-center gap-4">
                    <span>
                      Payment: <strong className="text-slate-300">{order.paymentMethod}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Delivery: <span className="text-slate-300">{order.shippingAddress.city}, {order.shippingAddress.state}</span>
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-slate-400 text-xs">Total Invoice: </span>
                    <span className="font-mono font-bold text-base text-amber-400">
                      {formatPaise(order.totalPaise)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* COMMERCIAL INVOICE MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm print:p-0 print:bg-white">
          <div className="w-full max-w-2xl bg-slate-900 print:bg-white print:text-black border border-slate-800 rounded-3xl shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <h3 className="font-serif font-bold text-white text-base">
                  Commercial Wholesale Purchase Order Slip
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintInvoice}
                  className="px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 hover:bg-amber-300 transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print / Save PDF
                </button>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Invoice Printable Sheet */}
            <div className="p-8 space-y-6 overflow-y-auto print:p-6 text-slate-300 print:text-slate-900">
              {/* Invoice Header */}
              <div className="flex justify-between items-start border-b border-slate-800 pb-6 print:border-slate-300">
                <div>
                  <div className="font-serif font-bold text-xl text-white print:text-black tracking-wider">
                    NIYAT ORGANICS PVT. LTD.
                  </div>
                  <div className="text-xs text-slate-400 print:text-slate-600 mt-1">
                    B2B Wholesale & Distribution Division
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    GSTIN: 27AABCN9482L1ZX
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-amber-400 print:text-amber-800">
                    {selectedOrder.orderNumber}
                  </div>
                  <div className="text-xs text-slate-400 print:text-slate-600 mt-1">
                    Date: {new Date(selectedOrder.createdAt).toLocaleDateString("en-IN")}
                  </div>
                  {selectedOrder.distributorInfo?.poNumber && (
                    <div className="text-xs font-mono text-slate-400 mt-0.5">
                      PO Ref: {selectedOrder.distributorInfo.poNumber}
                    </div>
                  )}
                </div>
              </div>

              {/* Billed To / Shipped To */}
              <div className="grid grid-cols-2 gap-6 text-xs">
                <div>
                  <div className="text-slate-400 print:text-slate-600 uppercase font-semibold text-[10px] tracking-wider mb-1">
                    Purchased By (Distributor)
                  </div>
                  <div className="font-bold text-white print:text-black text-sm">
                    {selectedOrder.distributorInfo?.companyName || selectedOrder.shippingAddress.recipientName}
                  </div>
                  {selectedOrder.distributorInfo?.gstNumber && (
                    <div className="font-mono text-slate-400 mt-0.5">
                      GSTIN: {selectedOrder.distributorInfo.gstNumber}
                    </div>
                  )}
                  <div className="text-slate-400 mt-0.5">
                    Phone: {selectedOrder.shippingAddress.phone}
                  </div>
                </div>

                <div>
                  <div className="text-slate-400 print:text-slate-600 uppercase font-semibold text-[10px] tracking-wider mb-1">
                    Delivery Address
                  </div>
                  <div className="text-slate-300 print:text-slate-800">
                    {selectedOrder.shippingAddress.addressLine1}
                    {selectedOrder.shippingAddress.addressLine2 && `, ${selectedOrder.shippingAddress.addressLine2}`}
                  </div>
                  <div className="text-slate-300 print:text-slate-800">
                    {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} - {selectedOrder.shippingAddress.postalCode}
                  </div>
                  <div className="text-slate-400 mt-0.5">
                    Settlement: {selectedOrder.paymentMethod}
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="border border-slate-800 print:border-slate-300 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 print:bg-slate-100 text-slate-400 print:text-slate-700 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Item Description</th>
                      <th className="py-2.5 px-3">SKU</th>
                      <th className="py-2.5 px-3 text-right">Wholesale Rate</th>
                      <th className="py-2.5 px-3 text-right">Qty</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 print:divide-slate-200">
                    {selectedOrder.items.map((i, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 px-3 font-medium text-white print:text-black">
                          {i.productName} ({i.sizeLabel})
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                          {i.sku}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          {formatPaise(i.unitPricePaise)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold">
                          {i.quantity}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-white print:text-black">
                          {formatPaise(i.lineTotalPaise)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Invoice Totals */}
              <div className="flex justify-end pt-2 text-xs">
                <div className="w-64 space-y-1.5">
                  <div className="flex justify-between text-slate-400 print:text-slate-600">
                    <span>Wholesale Subtotal:</span>
                    <span className="font-mono text-white print:text-black">
                      {formatPaise(selectedOrder.subtotalPaise)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400 print:text-slate-600">
                    <span>B2B Priority Freight:</span>
                    <span className="text-emerald-400 print:text-emerald-700 font-bold uppercase text-[10px]">
                      FREE
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-white print:text-black pt-2 border-t border-slate-800 print:border-slate-300">
                    <span>Grand Total (INR):</span>
                    <span className="font-mono text-amber-400 print:text-amber-800 text-base">
                      {formatPaise(selectedOrder.totalPaise)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sign-off footer */}
              <div className="pt-6 border-t border-slate-800 print:border-slate-300 flex justify-between items-end text-[10px] text-slate-500">
                <div>
                  This is a computer generated commercial wholesale purchase order confirmation.
                </div>
                <div className="text-right">
                  Authorized Signatory
                  <div className="font-serif font-bold text-slate-400 mt-1">NIYAT WHOLESALE</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

