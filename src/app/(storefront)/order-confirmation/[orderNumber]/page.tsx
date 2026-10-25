import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Order } from "@/models/Order";
import { formatPaise } from "@/lib/utils";
import {
  CheckCircle2,
  Package,
  Truck,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  MapPin,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface OrderConfirmationPageProps {
  params: Promise<{ orderNumber: string }>;
}

export default async function OrderConfirmationPage({
  params,
}: OrderConfirmationPageProps) {
  await connectToDatabase();
  const { orderNumber } = await params;

  const order = await Order.findOne({ orderNumber }).lean();
  if (!order) {
    notFound();
  }

  return (
    <div className="py-12 sm:py-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Celebration Header */}
        <div className="text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-500 flex items-center justify-center mx-auto text-emerald-600 shadow-md">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-1">
            <span className="text-xs uppercase tracking-widest text-niyat-gold font-semibold">
              Thank You for Your Order
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-niyat-charcoal">
              Order Confirmed
            </h1>
            <p className="text-sm text-niyat-muted font-light max-w-md mx-auto">
              We have received your order and our laboratory team is preparing your botanical
              formulations for shipment.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-niyat-ivory-border shadow-sm text-xs">
            <span className="text-niyat-muted">Order Reference:</span>
            <span className="font-mono font-bold text-niyat-charcoal">{order.orderNumber}</span>
          </div>
        </div>

        {/* Order Details Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-niyat-ivory-border shadow-sm space-y-8">
          {/* Status Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-niyat-ivory-border">
            <div className="space-y-1">
              <span className="text-[11px] text-niyat-muted uppercase tracking-wider block">
                Fulfillment Status
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-niyat-gold-subtle text-niyat-gold-dark border border-niyat-gold/30 uppercase inline-block">
                {order.fulfilmentStatus.replace(/_/g, " ")}
              </span>
            </div>

            <div className="space-y-1 sm:text-right">
              <span className="text-[11px] text-niyat-muted uppercase tracking-wider block">
                Payment ({order.paymentMethod})
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase inline-block">
                {order.paymentStatus}
              </span>
            </div>
          </div>

          {/* Ordered Formulations */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-niyat-charcoal">
              Formulations in this Order
            </h3>

            <div className="divide-y divide-niyat-ivory-border/60">
              {order.items.map((item, idx) => (
                <div key={idx} className="py-3.5 flex items-center justify-between gap-4 text-xs">
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

          {/* Address & Logistics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-niyat-ivory-border">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-niyat-charcoal">
                <MapPin className="w-4 h-4 text-niyat-gold" />
                <span>Shipping Address</span>
              </div>
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 text-xs text-niyat-charcoal/80 space-y-1">
                <p className="font-bold text-niyat-charcoal">{order.shippingAddress.recipientName}</p>
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
                <span>Financial Summary</span>
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
                  <span>Total Paid / Due:</span>
                  <span className="font-serif text-base text-niyat-emerald">
                    {formatPaise(order.totalPaise)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-niyat-ivory-border">
            <Link
              href="/orders/track"
              className="w-full sm:w-auto px-6 py-3 rounded-full bg-niyat-emerald text-white text-xs font-semibold uppercase tracking-wider hover:bg-niyat-emerald-dark transition-all text-center flex items-center justify-center gap-2 shadow-sm"
            >
              <Truck className="w-4 h-4 text-niyat-gold" /> Track Shipment
            </Link>

            <Link
              href="/shop"
              className="w-full sm:w-auto px-6 py-3 rounded-full border border-niyat-ivory-border hover:border-niyat-gold text-xs font-semibold uppercase tracking-wider text-niyat-charcoal hover:text-niyat-emerald transition-all text-center flex items-center justify-center gap-1.5"
            >
              <span>Continue Shopping</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Security badge */}
        <div className="text-center text-xs text-niyat-muted flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-niyat-emerald" />
          <span>Confirmation email and dispatch updates sent automatically.</span>
        </div>
      </div>
    </div>
  );
}
