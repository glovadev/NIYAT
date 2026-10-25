import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Order } from "@/models/Order";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { formatPaise } from "@/lib/utils";
import {
  ChevronRight,
  Package,
  Truck,
  MapPin,
  CreditCard,
  Clock,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface OrderDetailPageProps {
  params: Promise<{ orderNumber: string }>;
}

export default async function CustomerOrderDetailPage({
  params,
}: OrderDetailPageProps) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    notFound();
  }

  await connectToDatabase();
  const { orderNumber } = await params;

  const order = await Order.findOne({
    orderNumber,
    userId: auth.profile._id,
  }).lean();

  if (!order) {
    notFound();
  }

  return (
    <div className="py-8 sm:py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
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
          <Link href="/account/orders" className="hover:text-niyat-emerald transition-colors">
            Orders
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-niyat-charcoal font-medium">{order.orderNumber}</span>
        </nav>

        {/* Header */}
        <div className="border-b border-niyat-ivory-border pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase tracking-widest text-niyat-gold font-semibold">
              Order Details
            </span>
            <h1 className="font-serif text-3xl font-bold text-niyat-charcoal mt-1">
              {order.orderNumber}
            </h1>
            <p className="text-xs text-niyat-muted mt-0.5">
              Placed on{" "}
              {new Date(order.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-niyat-gold-subtle text-niyat-gold-dark border border-niyat-gold/30 uppercase">
              {order.fulfilmentStatus.replace(/_/g, " ")}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase">
              {order.paymentStatus}
            </span>
          </div>
        </div>

        {/* Main Details Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-niyat-ivory-border shadow-sm space-y-8">
          {/* Items */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-niyat-charcoal">
              Formulations Ordered
            </h3>

            <div className="divide-y divide-niyat-ivory-border/60">
              {order.items.map((item, idx) => (
                <div key={idx} className="py-4 flex items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-xl bg-neutral-50 border border-neutral-200 overflow-hidden flex-shrink-0">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.productName}
                          fill
                          sizes="48px"
                          className="object-contain p-1"
                        />
                      ) : (
                        <Package className="w-5 h-5 text-niyat-gold m-auto" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold text-niyat-charcoal">{item.productName}</h4>
                      <p className="text-niyat-muted text-[11px]">
                        Qty: {item.quantity} • {item.sizeLabel}
                      </p>
                    </div>
                  </div>

                  <span className="font-serif font-bold text-niyat-charcoal text-sm">
                    {formatPaise(item.lineTotalPaise)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Shipping & Financial Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-niyat-ivory-border">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-niyat-charcoal">
                <MapPin className="w-4 h-4 text-niyat-gold" />
                <span>Shipping Destination</span>
              </div>
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 text-xs text-niyat-charcoal space-y-1">
                <p className="font-bold">{order.shippingAddress.recipientName}</p>
                <p>{order.shippingAddress.addressLine1}</p>
                {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
                <p>
                  {order.shippingAddress.city}, {order.shippingAddress.state} -{" "}
                  {order.shippingAddress.postalCode}
                </p>
                <p className="text-niyat-muted mt-1">Phone: +91 {order.shippingAddress.phone}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-niyat-charcoal">
                <CreditCard className="w-4 h-4 text-niyat-gold" />
                <span>Payment &amp; Financials</span>
              </div>
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 text-xs space-y-2">
                <div className="flex justify-between text-niyat-charcoal/80">
                  <span>Subtotal:</span>
                  <span>{formatPaise(order.subtotalPaise)}</span>
                </div>
                {order.discountPaise > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Coupon Discount:</span>
                    <span>- {formatPaise(order.discountPaise)}</span>
                  </div>
                )}
                <div className="flex justify-between text-niyat-charcoal/80">
                  <span>Shipping:</span>
                  <span>
                    {order.shippingPaise === 0
                      ? "Complimentary Free"
                      : formatPaise(order.shippingPaise)}
                  </span>
                </div>
                <div className="flex justify-between text-niyat-muted text-[11px]">
                  <span>Itemized GST (18% inclusive):</span>
                  <span>{formatPaise(order.taxPaise)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-neutral-200 font-bold text-sm text-niyat-charcoal">
                  <span>Grand Total:</span>
                  <span className="font-serif text-base text-niyat-emerald">
                    {formatPaise(order.totalPaise)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Shipment Tracking info (if dispatched) */}
          {order.shipment && (
            <div className="p-5 rounded-2xl bg-niyat-ivory border border-niyat-ivory-border space-y-2 text-xs">
              <div className="flex items-center gap-2 text-niyat-emerald font-semibold uppercase tracking-wider">
                <Truck className="w-4 h-4 text-niyat-gold" />
                <span>Courier Shipment Information</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <span className="text-niyat-muted block">Carrier:</span>
                  <span className="font-medium text-niyat-charcoal">
                    {order.shipment.carrier || "BlueDart Express"}
                  </span>
                </div>
                <div>
                  <span className="text-niyat-muted block">Tracking Number:</span>
                  <span className="font-mono font-medium text-niyat-charcoal">
                    {order.shipment.trackingNumber || "Assigned"}
                  </span>
                </div>
                <div>
                  {order.shipment.trackingUrl && (
                    <a
                      href={order.shipment.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-1 px-4 py-1.5 rounded-lg bg-niyat-emerald text-white text-xs font-medium hover:bg-niyat-emerald-dark"
                    >
                      Carrier Portal
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
