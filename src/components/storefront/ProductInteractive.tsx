"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/lib/cart/cart-context";
import { formatPaise, calculateDiscountPercent } from "@/lib/utils";
import {
  ShoppingBag,
  Check,
  Plus,
  Minus,
  ShieldCheck,
  Truck,
  Sparkles,
  AlertCircle,
  Star,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface ProductInteractiveProps {
  product: {
    id: string;
    name: string;
    slug: string;
    sku: string;
    sizeLabel: string;
    regularPricePaise: number;
    salePricePaise?: number | null;
    inStock: boolean;
    stockQuantity: number;
    images: Array<{ url: string; alt?: string; sortOrder?: number }>;
    description?: string;
    shortDescription?: string;
    category?: {
      name: string;
      slug: string;
    } | null;
    ratingAverage?: number;
    ratingCount?: number;
  };
}

export function ProductInteractive({ product }: ProductInteractiveProps) {
  const { addItem } = useCart();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  const images =
    product.images && product.images.length > 0
      ? product.images
      : [{ url: "/images/product-placeholder.jpg", alt: product.name }];

  const activeImage = images[selectedImageIndex] || images[0];

  const effectivePrice = product.salePricePaise || product.regularPricePaise;
  const hasDiscount =
    product.salePricePaise && product.salePricePaise < product.regularPricePaise;
  const discountPercent = hasDiscount
    ? calculateDiscountPercent(product.regularPricePaise, product.salePricePaise!)
    : 0;

  const maxPurchasable = Math.min(product.stockQuantity || 1, 10);

  // Description expansion calculation
  const fullDescription = product.description || product.shortDescription || "";
  const isLongDescription = fullDescription.length > 200;
  const truncatedDescription = isLongDescription
    ? fullDescription.slice(0, 180).replace(/\s+\S*$/, "") + "..."
    : fullDescription;

  const handleAddToCart = () => {
    if (!product.inStock) return;
    addItem(
      {
        productId: product.id,
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        sizeLabel: product.sizeLabel,
        regularPricePaise: product.regularPricePaise,
        salePricePaise: product.salePricePaise,
        imageUrl: activeImage.url,
      },
      quantity
    );
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2200);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
      {/* =================================================================== */}
      {/* 1. PRODUCT GALLERY (LEFT on Desktop, FIRST on Mobile)              */}
      {/* =================================================================== */}
      <div className="lg:col-span-6 space-y-4">
        {/* Main Image */}
        <div className="relative aspect-square w-full rounded-2xl sm:rounded-3xl overflow-hidden bg-white border border-niyat-ivory-border shadow-md group">
          <Image
            src={activeImage.url}
            alt={activeImage.alt || product.name}
            fill
            unoptimized
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority
            className="object-contain p-6 transition-transform duration-500 group-hover:scale-105"
          />

          {/* Badges on Gallery */}
          <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-10">
            {hasDiscount && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-niyat-gold text-white uppercase tracking-wider shadow">
                Save {discountPercent}%
              </span>
            )}
            {!product.inStock && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-neutral-800 text-white uppercase tracking-wider">
                Out of Stock
              </span>
            )}
            {product.inStock && product.stockQuantity <= 5 && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-600 text-white uppercase tracking-wider">
                Only {product.stockQuantity} Left
              </span>
            )}
          </div>
        </div>

        {/* Thumbnail Strip */}
        {images.length > 1 && (
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
            {images.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedImageIndex(idx)}
                className={`relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-white border-2 transition-all cursor-pointer ${
                  selectedImageIndex === idx
                    ? "border-niyat-gold shadow-md scale-95"
                    : "border-niyat-ivory-border hover:border-niyat-muted/50 opacity-70 hover:opacity-100"
                }`}
              >
                <Image
                  src={img.url}
                  alt={img.alt || `${product.name} view ${idx + 1}`}
                  fill
                  unoptimized
                  sizes="80px"
                  className="object-contain p-1.5"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* 2. PRODUCT DETAILS & PURCHASE CONTROLS (RIGHT on Desktop, 2nd Mobile) */}
      {/* =================================================================== */}
      <div className="lg:col-span-6 space-y-5">
        {/* Category & Title */}
        <div className="space-y-2">
          {product.category && (
            <Link
              href={`/categories/${product.category.slug}`}
              className="text-xs uppercase tracking-widest text-niyat-gold font-semibold hover:underline inline-block"
            >
              {product.category.name} Formulation
            </Link>
          )}

          <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-niyat-charcoal leading-tight">
            {product.name}
          </h1>

          {/* Rating, Reviews & Genuine Badge */}
          <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-niyat-charcoal">
              <div className="flex items-center text-niyat-gold">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3.5 h-3.5 ${
                      i < Math.floor(product.ratingAverage || 5)
                        ? "fill-niyat-gold text-niyat-gold"
                        : "text-neutral-300"
                    }`}
                  />
                ))}
              </div>
              <span>{(product.ratingAverage || 5).toFixed(1)}</span>
            </div>

            <span className="text-niyat-muted text-xs">•</span>

            <span className="text-xs text-niyat-muted">
              {product.ratingCount || 0}{" "}
              {(product.ratingCount || 0) === 1 ? "Customer Review" : "Customer Reviews"}
            </span>

            <span className="text-niyat-muted text-xs">•</span>

            <span className="inline-flex items-center gap-1 text-xs text-niyat-emerald font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-niyat-emerald" /> 100% Genuine
            </span>
          </div>
        </div>

        {/* Price & Size display */}
        <div className="space-y-2 pt-2 border-t border-niyat-ivory-border/70">
          <div className="flex items-baseline gap-3">
            <span className="font-serif text-2xl sm:text-3xl font-bold text-niyat-emerald">
              {formatPaise(effectivePrice)}
            </span>
            {hasDiscount && (
              <span className="text-base text-niyat-muted line-through font-normal">
                {formatPaise(product.regularPricePaise)}
              </span>
            )}
            {hasDiscount && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                Save {discountPercent}%
              </span>
            )}
            <span className="text-xs text-niyat-muted font-light">
              (Inclusive of all taxes)
            </span>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-niyat-ivory-border/60 text-xs font-medium text-niyat-charcoal">
            <span>Net Volume: {product.sizeLabel}</span>
            <span className="text-niyat-muted">•</span>
            <span className="text-niyat-muted">SKU: {product.sku}</span>
          </div>
        </div>

        {/* Product Description with Read More Option */}
        {fullDescription && (
          <div className="space-y-1.5 py-2 text-xs sm:text-sm text-niyat-charcoal/85 leading-relaxed border-t border-niyat-ivory-border/70">
            <p className="whitespace-pre-line font-light">
              {isDescriptionExpanded || !isLongDescription
                ? fullDescription
                : truncatedDescription}
            </p>
            {isLongDescription && (
              <button
                type="button"
                onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-niyat-gold hover:text-niyat-gold-dark transition-colors pt-1 cursor-pointer"
              >
                {isDescriptionExpanded ? (
                  <>
                    Read Less <ChevronUp className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    Read More <ChevronDown className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Stock Status Notification */}
        {product.inStock ? (
          <div className="flex items-center gap-2 text-xs text-emerald-800 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            In stock &amp; ready to dispatch within 24 hours
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-red-600 font-medium bg-red-50 p-3 rounded-lg border border-red-200">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            Currently out of stock. We are restocking this batch shortly.
          </div>
        )}

        {/* Quantity and Add to Bag */}
        {product.inStock && (
          <div className="space-y-4 pt-1">
            <div className="flex items-center gap-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-niyat-charcoal">
                Quantity
              </span>
              <div className="flex items-center border border-niyat-ivory-border rounded-full bg-white shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  className="w-9 h-9 flex items-center justify-center text-niyat-charcoal hover:bg-niyat-ivory disabled:opacity-40 transition-colors cursor-pointer"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-10 text-center font-semibold text-sm text-niyat-charcoal">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(maxPurchasable, q + 1))}
                  disabled={quantity >= maxPurchasable}
                  className="w-9 h-9 flex items-center justify-center text-niyat-charcoal hover:bg-niyat-ivory disabled:opacity-40 transition-colors cursor-pointer"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Main Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isAdded}
                className={`flex-1 py-4 px-6 rounded-full font-semibold text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                  isAdded
                    ? "bg-emerald-700 text-white scale-[0.99]"
                    : "bg-niyat-emerald text-white hover:bg-niyat-emerald-dark active:scale-[0.98]"
                }`}
              >
                {isAdded ? (
                  <>
                    <Check className="w-4 h-4" /> Added to Bag
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4 text-niyat-gold" /> Add to Bag
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  handleAddToCart();
                }}
                className="sm:w-auto px-8 py-4 rounded-full font-semibold text-sm uppercase tracking-wider border-2 border-niyat-gold text-niyat-gold-dark hover:bg-niyat-gold hover:text-white transition-all text-center cursor-pointer"
              >
                Instant Bag
              </button>
            </div>
          </div>
        )}

        {/* Reassurance Badges */}
        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-niyat-ivory-border">
          <div className="flex items-center gap-2.5 text-xs text-niyat-charcoal/80">
            <Truck className="w-4 h-4 text-niyat-gold flex-shrink-0" />
            <span>Complimentary delivery on orders ₹999+</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-niyat-charcoal/80">
            <ShieldCheck className="w-4 h-4 text-niyat-gold flex-shrink-0" />
            <span>100% Authentic Indian Formulations</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-niyat-charcoal/80">
            <Sparkles className="w-4 h-4 text-niyat-gold flex-shrink-0" />
            <span>Dermatologically Evaluated</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-niyat-charcoal/80">
            <Check className="w-4 h-4 text-niyat-gold flex-shrink-0" />
            <span>Cash on Delivery (COD) Available</span>
          </div>
        </div>
      </div>
    </div>
  );
}
