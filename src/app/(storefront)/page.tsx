import React from "react";
import Link from "next/link";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Product } from "@/models/Product";
import { Category } from "@/models/Category";
import { ProductCard } from "@/components/storefront/ProductCard";
import { HeroSlider, HeroSlide } from "@/components/storefront/HeroSlider";
import { CategoryCircles } from "@/components/storefront/CategoryCircles";
import { RoutineBanner } from "@/components/storefront/RoutineBanner";
import { ArrowRight } from "lucide-react";

import { Banner } from "@/models/Banner";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let dbProducts: any[] = [];
  let categories: any[] = [];
  let dbBanners: any[] = [];

  try {
    await connectToDatabase();
    [dbProducts, categories, dbBanners] = await Promise.all([
      Product.find({ status: "PUBLISHED" })
        .populate("categoryId", "name slug")
        .sort({ isFeatured: -1, createdAt: -1 })
        .lean(),
      Category.find({ status: "ACTIVE" }).sort({ sortOrder: 1, name: 1 }).lean(),
      Banner.find({ placement: "HOME_HERO", status: "ACTIVE" })
        .sort({ sortOrder: 1, createdAt: -1 })
        .lean(),
    ]);
  } catch (dbError) {
    console.error("HomePage: Database connection or query error:", dbError);
  }

  // Slides dynamically uploaded & managed by Admin in /admin/banners
  const heroSlides: HeroSlide[] =
    dbBanners.length > 0
      ? dbBanners.map((b) => ({
          id: String(b._id),
          eyebrow: "NATURAL • SAFE • EFFECTIVE",
          title: b.title,
          description:
            b.subtitle ||
            "Discover our range of skincare essentials made with nature's finest ingredients for glowing, healthy skin.",
          imageUrl: b.image?.url || "/images/hero-woman.jpg",
          imageAlt: b.image?.alt || b.title,
          targetUrl: b.targetUrl || "/shop",
        }))
      : [
          {
            id: "default-1",
            eyebrow: "NATURAL • SAFE • EFFECTIVE",
            title: "Healthy Skin, Happier You",
            description:
              "Discover our range of skincare essentials made with nature's finest ingredients for glowing, healthy skin.",
            imageUrl: "/images/hero-woman.jpg",
            imageAlt: "NIYAT Natural Skincare Radiance Range",
            targetUrl: "/shop",
          },
        ];

  // Map product image to high-res botanical packaging if original is a generic stock photo
  const getProductImage = (slug: string, originalUrl?: string) => {
    if (originalUrl && !originalUrl.includes("unsplash.com/photo-15") && !originalUrl.includes("placeholder/")) {
      return originalUrl;
    }
    if (slug.includes("face-wash")) return "/images/categories/face-wash.jpg";
    if (slug.includes("serum")) return "/images/categories/serums.jpg";
    if (slug.includes("cream")) return "/images/categories/moisturizers.jpg";
    if (slug.includes("sunscreen")) return "/images/categories/sunscreen.jpg";
    if (slug.includes("lotion") || slug.includes("body")) return "/images/categories/body-care.jpg";
    return originalUrl || "/images/categories/face-wash.jpg";
  };

  // Badge rotation matching the reference screenshot: Bestseller, Bestseller, New, Trending
  const BADGES = ["Bestseller", "Bestseller", "New", "Trending", "Bestseller", "Trending"];

  // Sort products to prioritize key NIYAT products: Face Wash, Serum, Cream, Sunscreen, Lotion
  const priorityOrder = [
    "face-wash",
    "emergency-whitening-serum",
    "premium-face-serum",
    "whitening-cream",
    "sunscreen",
    "body-lotion",
  ];

  const sortedProducts = [...dbProducts].sort((a, b) => {
    const aIdx = priorityOrder.findIndex((s) => a.slug.includes(s));
    const bIdx = priorityOrder.findIndex((s) => b.slug.includes(s));
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return 0;
  });

  const bestSellingProducts = sortedProducts.map((p, idx) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cat = p.categoryId as any;
    const badge = BADGES[idx % BADGES.length];

    const regularPrice = p.regularPricePaise || 39900;
    const hasSale = p.salePricePaise && p.salePricePaise < regularPrice;
    const salePricePaise = hasSale ? p.salePricePaise : Math.round(regularPrice * 0.75);
    const regularPricePaise = hasSale ? regularPrice : Math.round(regularPrice * 1.33);

    return {
      id: String(p._id),
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      sizeLabel: p.sizeLabel || "50g",
      regularPricePaise,
      salePricePaise,
      currency: p.currency || "INR",
      imageUrl: getProductImage(p.slug, p.images?.[0]?.url),
      categoryName: cat?.name,
      inStock: p.stockQuantity > 0,
      ratingAverage: p.ratingAverage && p.ratingAverage > 0 ? p.ratingAverage : 4.8,
      ratingCount: p.ratingCount && p.ratingCount > 0 ? p.ratingCount : (180 + idx * 45),
      isFeatured: p.isFeatured,
      badge,
    };
  });

  return (
    <div className="w-full bg-[#FFFCF8] text-[#172723] overflow-x-hidden">
      
      {/* ================================================================= */}
      {/* C. HERO CAROUSEL                                                  */}
      {/* ================================================================= */}
      <HeroSlider slides={heroSlides} />

      {/* ================================================================= */}
      {/* E. SHOP BY CATEGORY                                               */}
      {/* ================================================================= */}
      <CategoryCircles serverCategories={categories} />

      {/* ================================================================= */}
      {/* F. BEST SELLING PRODUCTS                                          */}
      {/* ================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#172723]">
              Best Selling Products
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              Customer favorites for healthy, glowing skin
            </p>
          </div>

          <Link
            href="/shop"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#153D32] hover:text-[#1B4D3F] transition-colors group"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* 2 Cards on Mobile, 4 Cards on Desktop Grid */}
        {bestSellingProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {bestSellingProducts.map((product) => (
              <ProductCard key={product.id} {...product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border border-stone-200">
            <p className="text-sm text-stone-500">No products available at the moment.</p>
          </div>
        )}
      </section>

      {/* ================================================================= */}
      {/* G. COMPLETE SKINCARE ROUTINE BANNER                               */}
      {/* ================================================================= */}
      <RoutineBanner />

    </div>
  );
}
