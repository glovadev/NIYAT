import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Product } from "@/models/Product";
import { Review } from "@/models/Review";
import { ProductInteractive } from "@/components/storefront/ProductInteractive";
import { formatPaise } from "@/lib/utils";
import {
  ChevronRight,
  Star,
  ShieldCheck,
  CheckCircle2,
  Droplets,
  AlertTriangle,
  Info,
  Sparkles,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  await connectToDatabase();
  const { slug } = await params;
  const product = await Product.findOne({ slug, status: "PUBLISHED" }).lean();

  if (!product) {
    return {
      title: "Product Not Found — NIYAT Skincare",
    };
  }

  const primaryImage = product.images?.[0]?.url;

  return {
    title: `${product.name} — ${product.sizeLabel} | NIYAT Skincare`,
    description:
      product.shortDescription ||
      `Discover NIYAT's ${product.name}, formulated with clinically verified botanicals for healthy radiance.`,
    openGraph: {
      title: product.name,
      description: product.shortDescription,
      images: primaryImage ? [{ url: primaryImage }] : [],
    },
  };
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  await connectToDatabase();
  const { slug } = await params;

  const product = await Product.findOne({ slug, status: "PUBLISHED" })
    .populate("categoryId", "name slug")
    .lean();

  if (!product) {
    notFound();
  }

  // Load approved reviews
  const reviews = await Review.find({
    productId: product._id,
    moderationStatus: "APPROVED",
  })
    .populate("userId", "name")
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const category = product.categoryId as any;
  const effectivePrice = product.salePricePaise || product.regularPricePaise;
  const primaryImageUrl = product.images?.[0]?.url;

  // JSON-LD structured data for Google Rich Results
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.images?.map((img) => img.url) || [],
    description: product.description || product.shortDescription,
    sku: product.sku,
    brand: {
      "@type": "Brand",
      name: "NIYAT",
    },
    offers: {
      "@type": "Offer",
      url: `https://niyat.in/products/${product.slug}`,
      priceCurrency: product.currency || "INR",
      price: (effectivePrice / 100).toFixed(2),
      availability:
        product.stockQuantity > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
    ...(product.ratingCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.ratingAverage,
            reviewCount: product.ratingCount,
          },
        }
      : {}),
  };

  const interactiveProduct = {
    id: String(product._id),
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    sizeLabel: product.sizeLabel,
    regularPricePaise: product.regularPricePaise,
    salePricePaise: product.salePricePaise,
    inStock: product.stockQuantity > 0,
    stockQuantity: product.stockQuantity,
    images: product.images || [],
    description: product.description,
    shortDescription: product.shortDescription,
    category: category ? { name: category.name, slug: category.slug } : null,
    ratingAverage: product.ratingAverage,
    ratingCount: product.ratingCount,
  };

  return (
    <div className="py-8 sm:py-12">
      {/* Inject Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-niyat-muted">
          <Link href="/" className="hover:text-niyat-emerald transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3 h-3" />
          <Link href="/shop" className="hover:text-niyat-emerald transition-colors">
            Shop All
          </Link>
          {category && (
            <>
              <ChevronRight className="w-3 h-3" />
              <Link
                href={`/categories/${category.slug}`}
                className="hover:text-niyat-emerald transition-colors capitalize"
              >
                {category.name}
              </Link>
            </>
          )}
          <ChevronRight className="w-3 h-3" />
          <span className="text-niyat-charcoal font-medium truncate max-w-[200px]">
            {product.name}
          </span>
        </nav>

        {/* Interactive Gallery & Details / Purchasing Section */}
        <ProductInteractive product={interactiveProduct} />

        {/* ================================================================= */}
        {/* DETAILED FORMULATION ACCORDIONS / TABS                            */}
        {/* ================================================================= */}
        <div className="pt-12 border-t border-niyat-ivory-border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
            {/* 1. Verified Benefits */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-niyat-ivory-border space-y-4 shadow-sm">
              <div className="flex items-center gap-2.5 text-niyat-emerald">
                <Sparkles className="w-5 h-5 text-niyat-gold" />
                <h3 className="font-serif text-xl font-bold text-niyat-charcoal">
                  Verified Benefits
                </h3>
              </div>
              {product.verifiedBenefits && product.verifiedBenefits.length > 0 ? (
                <ul className="space-y-3 text-xs sm:text-sm text-niyat-charcoal/90">
                  {product.verifiedBenefits.map((benefit, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-niyat-emerald flex-shrink-0 mt-0.5" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs sm:text-sm text-niyat-muted">
                  Designed to hydrate, soothe, and fortify the natural skin barrier.
                </p>
              )}
            </div>

            {/* 2. Full Ingredients (INCI List) */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-niyat-ivory-border space-y-4 shadow-sm">
              <div className="flex items-center gap-2.5 text-niyat-emerald">
                <Droplets className="w-5 h-5 text-niyat-gold" />
                <h3 className="font-serif text-xl font-bold text-niyat-charcoal">
                  Key Ingredients &amp; Formula
                </h3>
              </div>
              {product.ingredients && product.ingredients.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {product.ingredients.map((ing, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-full bg-niyat-ivory border border-niyat-ivory-border text-xs text-niyat-charcoal font-medium"
                      >
                        {ing}
                      </span>
                    ))}
                  </div>
                  <p className="text-[11px] text-niyat-muted italic pt-1">
                    Free from harmful parabens, artificial dyes, and harsh sulfates.
                  </p>
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-niyat-muted">
                  Formulated with botanical extracts and essential skin-replenishing lipids.
                </p>
              )}
            </div>

            {/* 3. The Ritual / How to Use */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-niyat-ivory-border space-y-4 shadow-sm">
              <div className="flex items-center gap-2.5 text-niyat-emerald">
                <Info className="w-5 h-5 text-niyat-gold" />
                <h3 className="font-serif text-xl font-bold text-niyat-charcoal">
                  The Daily Ritual
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-niyat-charcoal/80 leading-relaxed">
                {product.directions ||
                  "Dispense an appropriate amount onto cleansed skin. Gently massage in upward circular motions until fully absorbed. Follow with moisturizer or sunscreen as part of your morning or evening routine."}
              </p>
            </div>

            {/* 4. Safety & Precautions */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-niyat-ivory-border space-y-4 shadow-sm">
              <div className="flex items-center gap-2.5 text-niyat-emerald">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h3 className="font-serif text-xl font-bold text-niyat-charcoal">
                  Safety &amp; Storage
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-niyat-charcoal/80 leading-relaxed">
                {product.warnings ||
                  "For external use only. Perform a 24-hour patch test before initial use. Avoid direct contact with eyes. Store in a cool, dry place away from direct sunlight. Keep out of reach of children."}
              </p>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* APPROVED CUSTOMER REVIEWS                                         */}
        {/* ================================================================= */}
        <div className="pt-12 border-t border-niyat-ivory-border space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs uppercase tracking-widest text-niyat-gold font-semibold">
                Customer Testimonials
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-niyat-charcoal mt-1">
                Verified Buyer Experiences
              </h2>
            </div>
            <div className="text-xs text-niyat-muted bg-white px-4 py-2 rounded-full border border-niyat-ivory-border inline-flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-niyat-emerald" />
              <span>Reviews verified post-delivery only</span>
            </div>
          </div>

          {reviews && reviews.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reviews.map((rev) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const user = rev.userId as any;
                const author = user?.name ? `${user.name.split(" ")[0]}...` : "Verified Customer";
                return (
                  <div
                    key={String(rev._id)}
                    className="bg-white rounded-2xl p-6 border border-niyat-ivory-border space-y-3 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-niyat-gold">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < rev.rating
                                ? "fill-niyat-gold text-niyat-gold"
                                : "text-neutral-300"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[11px] text-niyat-muted">
                        {new Date(rev.createdAt).toLocaleDateString("en-IN", {
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    {rev.title && (
                      <h4 className="font-semibold text-sm text-niyat-charcoal">
                        {rev.title}
                      </h4>
                    )}

                    <p className="text-xs text-niyat-charcoal/80 leading-relaxed font-light">
                      &ldquo;{rev.body}&rdquo;
                    </p>

                    <div className="pt-2 flex items-center justify-between text-[11px] text-niyat-muted border-t border-niyat-ivory-border/60">
                      <span className="font-medium text-niyat-charcoal">{author}</span>
                      <span className="text-emerald-700 font-medium inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Verified Purchase
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-niyat-ivory-border max-w-xl mx-auto space-y-3 px-6">
              <Star className="w-8 h-8 text-niyat-gold mx-auto" />
              <h4 className="font-serif text-lg font-bold text-niyat-charcoal">
                Be the First to Experience
              </h4>
              <p className="text-xs text-niyat-muted">
                This newly released formulation has not yet accumulated verified public reviews.
                Purchase this product to receive an invitation to share your verified review.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
