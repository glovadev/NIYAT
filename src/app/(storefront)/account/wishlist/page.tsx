"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth/auth-context";
import { useCart } from "@/lib/cart/cart-context";
import { formatPaise } from "@/lib/utils";
import {
  Heart,
  ChevronRight,
  ShoppingBag,
  Trash2,
  PackageOpen,
  Check,
} from "lucide-react";

interface WishlistItem {
  id: string;
  name: string;
  slug: string;
  sku: string;
  sizeLabel: string;
  regularPricePaise: number;
  salePricePaise?: number | null;
  imageUrl?: string;
  inStock: boolean;
}

import { useWishlist } from "@/lib/wishlist/wishlist-context";

export default function CustomerWishlistPage() {
  const { user, loading: authLoading, refreshProfile } = useAuth();
  const { addItem } = useCart();
  const { wishlistIds, removeFromWishlist } = useWishlist();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addedMap, setAddedMap] = useState<Record<string, boolean>>({});

  const fetchWishlist = () => {
    setLoading(true);
    fetch("/api/me/wishlist")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.items) {
          setItems(data.data.items);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (user) {
      fetchWishlist();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading]);

  const handleRemove = async (productId: string) => {
    try {
      await removeFromWishlist(productId);
      setItems((prev) => prev.filter((item) => item.id !== productId));
    } catch {
      alert("Failed to remove from wishlist");
    }
  };

  const handleAddToCart = (item: WishlistItem) => {
    if (!item.inStock) return;
    addItem({
      productId: item.id,
      name: item.name,
      slug: item.slug,
      sku: item.sku,
      sizeLabel: item.sizeLabel,
      regularPricePaise: item.regularPricePaise,
      salePricePaise: item.salePricePaise,
      imageUrl: item.imageUrl,
    });
    setAddedMap((prev) => ({ ...prev, [item.id]: true }));
    setTimeout(() => {
      setAddedMap((prev) => ({ ...prev, [item.id]: false }));
    }, 1800);
  };

  if (authLoading || loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-3 border-niyat-gold border-t-niyat-emerald rounded-full animate-spin mx-auto mb-4" />
        <p className="text-xs uppercase tracking-widest text-niyat-gold">
          Opening Your Botanical Wishlist...
        </p>
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
          <span className="text-niyat-charcoal font-medium">Saved Formulations</span>
        </nav>

        {/* Header */}
        <div className="border-b border-niyat-ivory-border pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase tracking-widest text-niyat-gold font-semibold">
              Curated Favorites
            </span>
            <h1 className="font-serif text-3xl font-bold text-niyat-charcoal mt-1">
              Your Skincare Wishlist
            </h1>
          </div>
          <span className="text-xs text-niyat-muted">
            {items.length} {items.length === 1 ? "formulation" : "formulations"} saved
          </span>
        </div>

        {/* Wishlist Grid */}
        {items.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {items.map((item) => {
              const effectivePrice = item.salePricePaise || item.regularPricePaise;
              const isAdded = addedMap[item.id];

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-3xl p-5 border border-niyat-ivory-border shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-3">
                    {/* Image */}
                    <Link
                      href={`/products/${item.slug}`}
                      className="relative block aspect-square rounded-2xl overflow-hidden bg-neutral-50 border border-niyat-ivory-border/60"
                    >
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          sizes="(max-width: 640px) 100vw, 25vw"
                          className="object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-niyat-muted text-xs">
                          No Image
                        </div>
                      )}
                    </Link>

                    {/* Details */}
                    <div className="space-y-1">
                      <span className="text-[10px] text-niyat-muted uppercase tracking-wider block">
                        {item.sizeLabel}
                      </span>
                      <Link
                        href={`/products/${item.slug}`}
                        className="font-semibold text-sm text-niyat-charcoal hover:text-niyat-emerald transition-colors block line-clamp-1"
                      >
                        {item.name}
                      </Link>
                      <div className="flex items-baseline gap-2 pt-0.5">
                        <span className="font-serif font-bold text-base text-niyat-emerald">
                          {formatPaise(effectivePrice)}
                        </span>
                        {item.salePricePaise && (
                          <span className="text-xs text-niyat-muted line-through">
                            {formatPaise(item.regularPricePaise)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-niyat-ivory-border flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddToCart(item)}
                      disabled={!item.inStock || isAdded}
                      className={`flex-1 py-2.5 px-3 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                        isAdded
                          ? "bg-emerald-700 text-white"
                          : item.inStock
                          ? "bg-niyat-emerald text-white hover:bg-niyat-emerald-dark"
                          : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Added
                        </>
                      ) : item.inStock ? (
                        <>
                          <ShoppingBag className="w-3.5 h-3.5 text-niyat-gold" /> Move to Bag
                        </>
                      ) : (
                        "Out of Stock"
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemove(item.id)}
                      className="p-2.5 rounded-full hover:bg-red-50 text-neutral-400 hover:text-red-600 transition-colors"
                      title="Remove from wishlist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-niyat-ivory-border max-w-xl mx-auto space-y-4 px-6">
            <Heart className="w-12 h-12 text-niyat-gold mx-auto" />
            <h3 className="font-serif text-xl font-bold text-niyat-charcoal">
              Your Wishlist is Empty
            </h3>
            <p className="text-xs text-niyat-muted">
              Save your favorite formulations while exploring the catalog to review or purchase them later.
            </p>
            <div className="pt-2">
              <Link
                href="/shop"
                className="inline-flex items-center px-6 py-2.5 rounded-full bg-niyat-emerald text-white text-xs font-semibold uppercase tracking-wider hover:bg-niyat-emerald-dark transition-all"
              >
                Explore Formulations
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
