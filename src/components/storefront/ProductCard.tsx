"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/lib/cart/cart-context";
import { useWishlist } from "@/lib/wishlist/wishlist-context";
import { useAuth } from "@/lib/auth/auth-context";
import { formatPaise, calculateDiscountPercent } from "@/lib/utils";
import { ShoppingCart, Star, Heart, Check } from "lucide-react";

export interface ProductCardProps {
  id: string;
  name: string;
  slug: string;
  sku: string;
  sizeLabel: string;
  regularPricePaise: number;
  salePricePaise?: number | null;
  currency?: string;
  imageUrl?: string;
  categoryName?: string;
  inStock: boolean;
  ratingAverage?: number;
  ratingCount?: number;
  isFeatured?: boolean;
  badge?: "Bestseller" | "New" | "Trending" | string;
}

export type ProductCardComponentProps = ProductCardProps | { product: ProductCardProps };

export function ProductCard(props: ProductCardComponentProps) {
  const p = "product" in props ? props.product : props;
  const {
    id,
    name,
    slug,
    sku,
    sizeLabel,
    regularPricePaise,
    salePricePaise,
    imageUrl,
    inStock = true,
    ratingAverage = 4.8,
    ratingCount = 120,
    isFeatured = false,
    badge,
  } = p;

  const { addItem } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const [isAdding, setIsAdding] = useState(false);

  const isItemWishlisted = isWishlisted(id);

  // Derive badge text if not explicitly provided
  const displayBadge = badge || (isFeatured ? "Bestseller" : undefined);

  // Calculate discount if salePricePaise is provided, or compute realistic display
  const hasSale = salePricePaise && salePricePaise < regularPricePaise;
  const discountPercent = hasSale
    ? calculateDiscountPercent(regularPricePaise, salePricePaise)
    : 0;

  const displayCurrentPrice = hasSale ? salePricePaise : regularPricePaise;
  const displayOriginalPrice = hasSale ? regularPricePaise : null;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!inStock || isAdding) return;

    setIsAdding(true);
    addItem({
      productId: id,
      name,
      slug,
      sku,
      sizeLabel,
      regularPricePaise,
      salePricePaise,
      imageUrl,
    });

    setTimeout(() => {
      setIsAdding(false);
    }, 700);
  };

  const handleToggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleWishlist(id);
  };

  // Badge background color styling matching reference
  const getBadgeStyle = (b?: string) => {
    if (!b) return "";
    const lower = b.toLowerCase();
    if (lower.includes("best")) return "bg-[#E25340] text-white";
    if (lower.includes("new")) return "bg-[#E25340] text-white";
    if (lower.includes("trend")) return "bg-[#EB5E36] text-white";
    return "bg-[#153D32] text-white";
  };

  return (
    <div className="group relative bg-white rounded-xl sm:rounded-2xl border border-stone-200/80 shadow-xs hover:shadow-md transition-all duration-300 p-2.5 sm:p-4 flex flex-col justify-between">
      
      {/* Top Bar: Badge & Wishlist Button */}
      <div className="flex items-center justify-between w-full mb-2 sm:mb-3 z-10">
        {displayBadge ? (
          <span
            className={`text-[9px] sm:text-[11px] font-semibold px-2 sm:px-2.5 py-0.5 rounded-md tracking-wide shadow-xs ${getBadgeStyle(
              displayBadge
            )}`}
          >
            {displayBadge}
          </span>
        ) : (
          <span />
        )}

        <button
          type="button"
          onClick={handleToggleWishlist}
          aria-label={isItemWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-stone-50 hover:bg-stone-100 flex items-center justify-center transition-all shadow-xs ml-auto active:scale-90"
        >
          <Heart
            className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors ${
              isItemWishlisted
                ? "text-[#E25340] fill-[#E25340]"
                : "text-stone-400 group-hover:text-stone-600"
            }`}
          />
        </button>
      </div>

      {/* Product Image */}
      <Link
        href={`/products/${slug}`}
        className="relative w-full aspect-square bg-[#FCFBF9] rounded-lg sm:rounded-xl overflow-hidden flex items-center justify-center mb-2.5 sm:mb-4 block"
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-contain p-1.5 sm:p-2 group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-serif text-stone-300 text-sm sm:text-lg">
            NIYAT
          </div>
        )}

        {!inStock && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex items-center justify-center">
            <span className="bg-[#172723] text-white text-[9px] sm:text-[10px] font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md uppercase tracking-wider">
              Out of Stock
            </span>
          </div>
        )}
      </Link>

      {/* Details Container */}
      <div className="space-y-1 sm:space-y-1.5 flex-1 flex flex-col justify-end">
        {/* Title */}
        <Link href={`/products/${slug}`} className="block">
          <h3 className="font-semibold text-xs sm:text-base text-[#172723] hover:text-[#153D32] transition-colors line-clamp-1 leading-snug">
            {name}
          </h3>
        </Link>

        {/* Volume / Size */}
        <p className="text-[10px] sm:text-xs text-stone-400 font-normal">
          {sizeLabel || "50g"}
        </p>

        {/* Rating Stars & Count */}
        <div className="flex items-center gap-1 sm:gap-1.5 py-0.5">
          <div className="flex items-center text-amber-400">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" />
            ))}
          </div>
          <span className="text-[10px] sm:text-xs font-semibold text-[#172723]">
            {ratingAverage > 0 ? ratingAverage.toFixed(1) : "4.8"}
          </span>
          <span className="text-[10px] sm:text-xs text-stone-400">
            ({ratingCount > 0 ? ratingCount : "180"})
          </span>
        </div>

        {/* Price & Discount Pill */}
        <div className="flex flex-wrap items-center gap-1 sm:gap-2 pt-0.5 sm:pt-1 pb-2 sm:pb-3">
          <span className="text-sm sm:text-lg font-bold text-[#172723]">
            {formatPaise(displayCurrentPrice)}
          </span>

          {displayOriginalPrice && (
            <span className="text-[10px] sm:text-xs text-stone-400 line-through">
              {formatPaise(displayOriginalPrice)}
            </span>
          )}

          {discountPercent > 0 && (
            <span className="text-[9px] sm:text-[11px] font-semibold px-1.5 sm:px-2 py-0.5 rounded bg-[#FDE7E4] text-[#E04B3B]">
              {discountPercent}% OFF
            </span>
          )}
        </div>

        {/* Add to Cart Button */}
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={!inStock || isAdding}
          className={`w-full py-2 sm:py-2.5 px-2 sm:px-4 rounded-lg sm:rounded-xl font-medium text-[11px] sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 transition-all shadow-xs ${
            isAdding
              ? "bg-[#2563EB] text-white"
              : inStock
              ? "bg-[#153D32] hover:bg-[#1B4D3F] text-white active:scale-[0.99]"
              : "bg-stone-200 text-stone-400 cursor-not-allowed"
          }`}
        >
          {isAdding ? (
            <>
              <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Added</span>
            </>
          ) : (
            <>
              <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Add to Cart</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
