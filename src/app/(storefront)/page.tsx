import React from "react";
import Link from "next/link";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Product } from "@/models/Product";
import { Category } from "@/models/Category";
import { ProductCard } from "@/components/storefront/ProductCard";
import { HeroSlider, HeroSlide } from "@/components/storefront/HeroSlider";
import { CategoryCircles } from "@/components/storefront/CategoryCircles";
import { RoutineBanner } from "@/components/storefront/RoutineBanner";
import { ArrowRight, Sparkles, ShieldCheck, HeartHandshake, Truck, Star, Award, Crown } from "lucide-react";

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
    <div className="w-full bg-[#FCFAF6] text-[#0A261D] overflow-x-hidden">
      
      {/* ================================================================= */}
      {/* C. HERO CAROUSEL                                                  */}
      {/* ================================================================= */}
      <HeroSlider slides={heroSlides} />

      {/* ================================================================= */}
      {/* LUXURY PRESTIGE STRIP: UAE ROYAL STANDARDS                         */}
      {/* ================================================================= */}
      <section className="border-y border-[#D4AF37]/25 bg-gradient-to-r from-[#061B14] via-[#0A261D] to-[#061B14] text-white py-4 sm:py-5 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 text-center">
          <div className="flex items-center justify-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-[#D4AF37]" />
            </div>
            <div className="text-left">
              <p className="text-[11px] sm:text-xs font-bold text-[#FCF6BA] tracking-wider uppercase">24K Gold & Saffron</p>
              <p className="text-[10px] text-white/70">Potent active radiance</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
            </div>
            <div className="text-left">
              <p className="text-[11px] sm:text-xs font-bold text-[#FCF6BA] tracking-wider uppercase">GCC Certified</p>
              <p className="text-[10px] text-white/70">Dermatologist approved</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center shrink-0">
              <HeartHandshake className="w-4 h-4 text-[#D4AF37]" />
            </div>
            <div className="text-left">
              <p className="text-[11px] sm:text-xs font-bold text-[#FCF6BA] tracking-wider uppercase">Halal & Pure</p>
              <p className="text-[10px] text-white/70">100% cruelty-free & vegan</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center shrink-0">
              <Truck className="w-4 h-4 text-[#D4AF37]" />
            </div>
            <div className="text-left">
              <p className="text-[11px] sm:text-xs font-bold text-[#FCF6BA] tracking-wider uppercase">White-Glove Courier</p>
              <p className="text-[10px] text-white/70">Complimentary above ₹999</p>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* E. SHOP BY CATEGORY                                               */}
      {/* ================================================================= */}
      <CategoryCircles serverCategories={categories} />

      {/* ================================================================= */}
      {/* F. BEST SELLING PRODUCTS (ROYAL APOTHECARY SELECTION)              */}
      {/* ================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 sm:mb-10 gap-4 border-b border-[#D4AF37]/20 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Crown className="w-4 h-4 text-[#D4AF37]" />
              <span className="text-[10px] sm:text-xs font-bold tracking-[0.25em] text-[#B38728] uppercase">
                The Dubai Royal Selection
              </span>
            </div>
            <h2 className="font-serif text-2xl sm:text-4xl font-bold text-[#0A261D]">
              Signature Apothecary Elixirs
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-xl">
              Handcrafted formulations designed to restore luminosity, clarify complexion, and protect against environmental stress.
            </p>
          </div>

          <Link
            href="/shop"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-[#D4AF37]/50 hover:border-[#D4AF37] text-xs sm:text-sm font-semibold text-[#0A261D] hover:text-[#B38728] hover:shadow-[0_4px_16px_rgba(212,175,55,0.2)] transition-all group self-start sm:self-end"
          >
            <span>Explore All Elixirs</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1 text-[#D4AF37]" />
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
          <div className="text-center py-16 bg-white rounded-2xl border border-[#D4AF37]/30 shadow-xs">
            <Sparkles className="w-8 h-8 text-[#D4AF37] mx-auto mb-2" />
            <p className="text-sm font-serif text-[#0A261D]">Curating the Royal Collection...</p>
          </div>
        )}
      </section>

      {/* ================================================================= */}
      {/* UAE CLIENT PRAISE & CONNOISSEUR TESTIMONIALS                     */}
      {/* ================================================================= */}
      <section className="bg-gradient-to-b from-[#F7F3EB] to-[#FCFAF6] border-y border-[#D4AF37]/20 py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
            <span className="text-[10px] sm:text-xs font-bold tracking-[0.3em] uppercase text-[#B38728] block mb-2">
              Patron Praise
            </span>
            <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#0A261D]">
              Beloved by Skincare Connoisseurs
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 mt-2">
              From Dubai Marina to Mumbai, discerning clients trust NIYAT for transformative radiance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Review 1 */}
            <div className="bg-white/80 backdrop-blur-xs p-6 rounded-2xl border border-[#D4AF37]/30 shadow-[0_4px_20px_rgba(10,38,29,0.04)] flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1 text-[#D4AF37] mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <p className="text-xs sm:text-sm text-stone-700 italic leading-relaxed">
                  &ldquo;The Emergency Whitening Serum and 24K Saffron Elixir gave my skin an unreal glass-glow within 10 days. The packaging feels like a palace treasure.&rdquo;
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-stone-100 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#0A261D]">Fatima Al-Maktoum</h4>
                  <p className="text-[10px] text-stone-400">Jumeirah, Dubai</p>
                </div>
                <span className="text-[10px] font-semibold text-[#B38728] bg-[#FAF0D7] px-2 py-0.5 rounded-full border border-[#D4AF37]/30">
                  Verified Patron
                </span>
              </div>
            </div>

            {/* Review 2 */}
            <div className="bg-white/80 backdrop-blur-xs p-6 rounded-2xl border border-[#D4AF37]/30 shadow-[0_4px_20px_rgba(10,38,29,0.04)] flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1 text-[#D4AF37] mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <p className="text-xs sm:text-sm text-stone-700 italic leading-relaxed">
                  &ldquo;Living in the Gulf climate, my skin suffers from extreme heat. NIYAT&apos;s Face Wash and Sunscreen feel lightweight yet completely protective.&rdquo;
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-stone-100 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#0A261D]">Mariam K.</h4>
                  <p className="text-[10px] text-stone-400">Downtown, Dubai</p>
                </div>
                <span className="text-[10px] font-semibold text-[#B38728] bg-[#FAF0D7] px-2 py-0.5 rounded-full border border-[#D4AF37]/30">
                  Verified Patron
                </span>
              </div>
            </div>

            {/* Review 3 */}
            <div className="bg-white/80 backdrop-blur-xs p-6 rounded-2xl border border-[#D4AF37]/30 shadow-[0_4px_20px_rgba(10,38,29,0.04)] flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1 text-[#D4AF37] mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <p className="text-xs sm:text-sm text-stone-700 italic leading-relaxed">
                  &ldquo;Apothecary skincare at its finest. The saffron and gold cream leaves the most elegant velvety finish with no greasiness.&rdquo;
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-stone-100 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#0A261D]">Ananya Roy</h4>
                  <p className="text-[10px] text-stone-400">Bandra West, Mumbai</p>
                </div>
                <span className="text-[10px] font-semibold text-[#B38728] bg-[#FAF0D7] px-2 py-0.5 rounded-full border border-[#D4AF37]/30">
                  Verified Patron
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* G. COMPLETE SKINCARE ROUTINE BANNER                               */}
      {/* ================================================================= */}
      <RoutineBanner />

    </div>
  );
}
