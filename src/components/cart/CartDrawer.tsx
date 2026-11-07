"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/lib/cart/cart-context";
import { formatPaise } from "@/lib/utils";
import { X, Plus, Minus, ShoppingBag, ArrowRight } from "lucide-react";

export function CartDrawer() {
  const { items, removeItem, updateQuantity, isCartOpen, setIsCartOpen, subtotalPaise, totalCount } =
    useCart();

  const [shippingPolicy, setShippingPolicy] = React.useState<{
    freeShippingThresholdPaise: number;
    standardShippingFeePaise: number;
    isFreeDeliveryOfferActive: boolean;
    freeDeliveryBannerText?: string;
  }>({
    freeShippingThresholdPaise: 99900,
    standardShippingFeePaise: 9900,
    isFreeDeliveryOfferActive: false,
  });

  React.useEffect(() => {
    fetch("/api/site-settings/public")
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data?.data) {
          setShippingPolicy({
            freeShippingThresholdPaise: data.data.freeShippingThresholdPaise ?? 99900,
            standardShippingFeePaise: data.data.standardShippingFeePaise ?? 9900,
            isFreeDeliveryOfferActive: Boolean(data.data.isFreeDeliveryOfferActive),
            freeDeliveryBannerText: data.data.freeDeliveryBannerText,
          });
        }
      })
      .catch(() => {});
  }, []);

  if (!isCartOpen) return null;

  const isFreeOffer = shippingPolicy.isFreeDeliveryOfferActive;
  const freeShippingThreshold = shippingPolicy.freeShippingThresholdPaise;
  const amountNeeded = isFreeOffer ? 0 : Math.max(0, freeShippingThreshold - subtotalPaise);
  const freeShippingPercent = isFreeOffer
    ? 100
    : Math.min(100, Math.round((subtotalPaise / freeShippingThreshold) * 100));

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="px-6 py-5 border-b border-niyat-ivory-border flex items-center justify-between bg-niyat-ivory">
            <div className="flex items-center space-x-2">
              <ShoppingBag className="w-5 h-5 text-niyat-emerald" />
              <h2 className="text-xl font-serif font-bold text-niyat-emerald">Your Shopping Bag</h2>
              <span className="text-xs bg-niyat-emerald/10 text-niyat-emerald px-2 py-0.5 rounded-full font-medium">
                {totalCount}
              </span>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-1 rounded-full text-niyat-charcoal-muted hover:text-niyat-charcoal hover:bg-stone-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Shipping Progress */}
          <div className="px-6 py-3 bg-niyat-gold-subtle border-b border-niyat-gold/20 text-xs">
            {isFreeOffer ? (
              <p className="font-semibold text-niyat-emerald flex items-center">
                ✨ {shippingPolicy.freeDeliveryBannerText || "Special Promotion: Free Delivery Active on All Orders!"}
              </p>
            ) : amountNeeded > 0 ? (
              <p className="text-niyat-charcoal">
                Add <span className="font-bold text-niyat-emerald">{formatPaise(amountNeeded)}</span> more to unlock{" "}
                <span className="font-semibold text-niyat-gold-dark">Free Complimentary Shipping</span>
              </p>
            ) : (
              <p className="font-semibold text-niyat-emerald flex items-center">
                ✨ You have unlocked Free Complimentary Shipping!
              </p>
            )}
            <div className="w-full bg-stone-200 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-gold-gradient h-full transition-all duration-500 rounded-full"
                style={{ width: `${freeShippingPercent}%` }}
              />
            </div>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto px-6 py-4 divide-y divide-niyat-ivory-border">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <div className="w-16 h-16 rounded-full bg-niyat-emerald-subtle flex items-center justify-center text-niyat-emerald mb-4">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-serif font-semibold text-niyat-emerald">Your bag is empty</h3>
                <p className="text-sm text-niyat-charcoal-muted mt-1 max-w-xs">
                  Discover our pure botanical skincare range crafted for luminous skin.
                </p>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="mt-6 px-6 py-2.5 rounded-full bg-niyat-emerald text-white text-sm font-medium hover:bg-niyat-emerald-light transition-all shadow-md"
                >
                  Explore Products
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.productId} className="py-4 flex gap-4">
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-niyat-ivory flex-shrink-0 border border-niyat-ivory-border">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        unoptimized
                        className="object-cover"
                        sizes="80px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-stone-400">
                        NIYAT
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <h4 className="text-sm font-medium text-niyat-charcoal truncate pr-2">
                          {item.name}
                        </h4>
                        <button
                          onClick={() => removeItem(item.productId)}
                          className="text-stone-400 hover:text-red-500 transition-colors p-0.5"
                          title="Remove item"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-niyat-charcoal-muted mt-0.5">{item.sizeLabel}</p>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center border border-niyat-ivory-border rounded-md bg-niyat-ivory">
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          className="p-1 text-niyat-charcoal hover:bg-stone-200 transition-colors rounded-l"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2.5 text-xs font-semibold text-niyat-charcoal">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="p-1 text-niyat-charcoal hover:bg-stone-200 transition-colors rounded-r"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-semibold text-niyat-emerald">
                          {formatPaise(item.effectivePricePaise * item.quantity)}
                        </span>
                        {item.salePricePaise && item.salePricePaise < item.regularPricePaise && (
                          <span className="block text-xs text-stone-400 line-through">
                            {formatPaise(item.regularPricePaise * item.quantity)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Checkout CTA */}
          {items.length > 0 && (
            <div className="px-6 py-5 border-t border-niyat-ivory-border bg-niyat-ivory">
              <div className="flex justify-between text-sm mb-1 text-niyat-charcoal-muted">
                <span>Subtotal</span>
                <span className="font-medium text-niyat-charcoal">{formatPaise(subtotalPaise)}</span>
              </div>
              <div className="flex justify-between text-xs text-niyat-charcoal-muted mb-4">
                <span>Estimated Shipping</span>
                <span>{isFreeOffer || subtotalPaise >= freeShippingThreshold ? "Free" : "Calculated at checkout"}</span>
              </div>

              <Link
                href="/checkout"
                onClick={() => setIsCartOpen(false)}
                className="w-full py-3.5 px-4 rounded-full bg-emerald-gradient text-white font-medium text-sm flex items-center justify-center gap-2 hover:shadow-lg transition-all"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
