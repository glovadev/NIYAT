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

  // Badge background color styling matching UAE Royal aesthetic
  const getBadgeStyle = (b?: string) => {
    if (!b) return "";
    const lower = b.toLowerCase();
    if (lower.includes("best")) {
      return "bg-gradient-to-r from-[#D4AF37] via-[#F4E8C1] to-[#AA771C] text-[#0A261D] font-bold border border-[#D4AF37]/60 shadow-[0_2px_8px_rgba(212,175,55,0.3)]";
    }
    if (lower.includes("new")) {
      return "bg-gradient-to-r from-[#061B14] to-[#153D32] text-[#FCF6BA] border border-[#D4AF37]/50 shadow-xs";
    }
    if (lower.includes("trend")) {
      return "bg-gradient-to-r from-[#8C1D40] to-[#B8860B] text-white border border-[#D4AF37]/40 shadow-xs";
    }
    return "bg-[#0A261D] text-[#FCF6BA] border border-[#D4AF37]/40";
  };

  return (
    <div className="group relative bg-[#FFFEFC] rounded-xl sm:rounded-2xl border border-[#D4AF37]/25 hover:border-[#D4AF37]/80 shadow-[0_2px_10px_rgba(10,38,29,0.03)] hover:shadow-[0_12px_32px_rgba(212,175,55,0.16)] transition-all duration-300 p-2.5 sm:p-4 flex flex-col justify-between overflow-hidden">
      
      {/* Subtle luxury gold corner accent */}
      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-[#D4AF37]/10 via-transparent to-transparent pointer-events-none rounded-tr-xl sm:rounded-tr-2xl" />

      {/* Top Bar: Badge & Wishlist Button */}
      <div className="flex items-center justify-between w-full mb-2 sm:mb-3 z-10">
        {displayBadge ? (
          <span
            className={`text-[9px] sm:text-[10px] tracking-wider uppercase px-2 sm:px-2.5 py-0.5 rounded-full ${getBadgeStyle(
              displayBadge
            )}`}
          >
            ✧ {displayBadge}
          </span>
        ) : (
          <span className="text-[9px] font-medium tracking-widest text-[#B38728] uppercase">
            DUBAI • ELIXIR
          </span>
        )}

        <button
          type="button"
          onClick={handleToggleWishlist}
          aria-label={isItemWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#FAF8F5] hover:bg-[#F3ECE0] border border-[#D4AF37]/25 flex items-center justify-center transition-all shadow-xs ml-auto active:scale-90"
        >
          <Heart
            className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors ${
              isItemWishlisted
                ? "text-[#D4AF37] fill-[#D4AF37]"
                : "text-stone-400 group-hover:text-[#B38728]"
            }`}
          />
        </button>
      </div>

      {/* Product Image */}
      <Link
        href={`/products/${slug}`}
        className="relative w-full aspect-square bg-gradient-to-b from-[#FAF8F5] to-[#F5EFE6] border border-[#D4AF37]/15 rounded-lg sm:rounded-xl overflow-hidden flex items-center justify-center mb-2.5 sm:mb-4 block group-hover:border-[#D4AF37]/40 transition-colors"
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-contain p-2 sm:p-3 group-hover:scale-108 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center font-serif text-[#B38728]/50 text-sm sm:text-base">
            <span className="text-xl sm:text-2xl font-bold tracking-widest text-gold-shimmer">NIYAT</span>
            <span className="text-[9px] tracking-[0.25em] text-[#B38728]/70 mt-1 uppercase">Dubai Royal</span>
          </div>
        )}

        {!inStock && (
          <div className="absolute inset-0 bg-[#061B14]/70 backdrop-blur-xs flex items-center justify-center">
            <span className="bg-[#0A261D] text-[#FCF6BA] border border-[#D4AF37]/50 text-[9px] sm:text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-widest">
              Sold Out
            </span>
          </div>
        )}
      </Link>

      {/* Details Container */}
      <div className="space-y-1 sm:space-y-1.5 flex-1 flex flex-col justify-end">
        {/* Category / Origin Pill */}
        <p className="text-[9px] sm:text-[10px] tracking-widest text-[#B38728] uppercase font-medium">
          Royal Radiance • {sizeLabel || "50g"}
        </p>

        {/* Title */}
        <Link href={`/products/${slug}`} className="block">
          <h3 className="font-serif font-semibold text-xs sm:text-[15px] text-[#0A261D] group-hover:text-[#B38728] transition-colors line-clamp-1 leading-snug">
            {name}
          </h3>
        </Link>

        {/* Rating Stars & Count */}
        <div className="flex items-center gap-1 sm:gap-1.5 py-0.5">
          <div className="flex items-center text-[#D4AF37]">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" />
            ))}
          </div>
          <span className="text-[10px] sm:text-xs font-semibold text-[#0A261D]">
            {ratingAverage > 0 ? ratingAverage.toFixed(1) : "4.9"}
          </span>
          <span className="text-[10px] sm:text-xs text-stone-400">
            ({ratingCount > 0 ? ratingCount : "180"})
          </span>
        </div>

        {/* Price & Discount Pill */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-0.5 sm:pt-1 pb-2 sm:pb-3">
          <span className="text-sm sm:text-lg font-bold font-serif text-[#0A261D]">
            {formatPaise(displayCurrentPrice)}
          </span>

          {displayOriginalPrice && (
            <span className="text-[10px] sm:text-xs text-stone-400 line-through">
              {formatPaise(displayOriginalPrice)}
            </span>
          )}

          {discountPercent > 0 && (
            <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-[#FAF0D7] text-[#9A6B1F] border border-[#D4AF37]/40 tracking-wider">
              {discountPercent}% OFF
            </span>
          )}
        </div>

        {/* Add to Cart Button */}
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={!inStock || isAdding}
          className={`w-full py-2 sm:py-2.5 px-2 sm:px-4 rounded-lg sm:rounded-xl font-medium text-[11px] sm:text-xs tracking-wider uppercase flex items-center justify-center gap-1.5 sm:gap-2 transition-all shadow-xs ${
            isAdding
              ? "bg-gradient-to-r from-[#D4AF37] to-[#AA771C] text-[#0A261D] font-bold shadow-md"
              : inStock
              ? "bg-gradient-to-r from-[#0A261D] via-[#0F3529] to-[#0A261D] hover:from-[#123E30] hover:to-[#174A3A] text-[#FCF6BA] border border-[#D4AF37]/50 hover:border-[#D4AF37] hover:shadow-[0_4px_16px_rgba(212,175,55,0.25)] active:scale-[0.99]"
              : "bg-stone-200 text-stone-400 cursor-not-allowed"
          }`}
        >
          {isAdding ? (
            <>
              <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
              <span>Added to Cart</span>
            </>
          ) : (
            <>
              <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#D4AF37]" />
              <span>Add to Cart</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
