import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Product } from "@/models/Product";
import { Category } from "@/models/Category";
import { ProductCard } from "@/components/storefront/ProductCard";
import { ShopFilters } from "@/components/storefront/ShopFilters";
import { ChevronRight, PackageOpen } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shop All Formulations — NIYAT Skincare",
  description:
    "Explore our complete range of dermatologically formulated skincare treatments, serums, and cleansers crafted for radiant resilience.",
};

interface ShopPageProps {
  searchParams: Promise<{
    category?: string;
    sort?: string;
    q?: string;
    inStock?: string;
  }>;
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const params = await searchParams;

  const currentCategorySlug = params.category;
  const currentSort = params.sort || "newest";
  const currentQ = params.q?.trim();
  const currentInStock = params.inStock === "true";

  let categoriesDocs: any[] = [];
  let productsDocs: any[] = [];

  try {
    await connectToDatabase();
    // Load all active categories for filters
    categoriesDocs = await Category.find({ status: "ACTIVE" }).sort({ sortOrder: 1, name: 1 }).lean();

    // Build MongoDB query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = { status: "PUBLISHED" };

    if (currentCategorySlug) {
      const selectedCat = categoriesDocs.find((c) => c.slug === currentCategorySlug);
      if (selectedCat) {
        query.categoryId = selectedCat._id;
      }
    }

    if (currentInStock) {
      query.stockQuantity = { $gt: 0 };
    }

    if (currentQ) {
      query.$or = [
        { name: { $regex: currentQ, $options: "i" } },
        { shortDescription: { $regex: currentQ, $options: "i" } },
        { ingredients: { $regex: currentQ, $options: "i" } },
        { verifiedBenefits: { $regex: currentQ, $options: "i" } },
      ];
    }

    // Sort mapping
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let sortOption: any = { isFeatured: -1, createdAt: -1 };
    if (currentSort === "price_asc") {
      sortOption = { regularPricePaise: 1 };
    } else if (currentSort === "price_desc") {
      sortOption = { regularPricePaise: -1 };
    } else if (currentSort === "name_asc") {
      sortOption = { name: 1 };
    }

    productsDocs = await Product.find(query)
      .populate("categoryId", "name slug")
      .sort(sortOption)
      .lean();
  } catch (err) {
    console.error("ShopPage: Database error:", err);
  }

  const categoryOptions = categoriesDocs.map((c) => ({
    id: String(c._id),
    name: c.name,
    slug: c.slug,
  }));

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

  const products = productsDocs.map((p) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cat = p.categoryId as any;
    return {
      id: String(p._id),
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      sizeLabel: p.sizeLabel,
      regularPricePaise: p.regularPricePaise,
      salePricePaise: p.salePricePaise,
      currency: p.currency,
      imageUrl: getProductImage(p.slug, p.images?.[0]?.url),
      categoryName: cat?.name,
      inStock: p.stockQuantity > 0,
      ratingAverage: p.ratingAverage,
      ratingCount: p.ratingCount,
      isFeatured: p.isFeatured,
    };
  });

  return (
    <div className="py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-niyat-muted">
          <Link href="/" className="hover:text-niyat-emerald transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-niyat-charcoal font-medium">Shop All</span>
          {currentCategorySlug && (
            <>
              <ChevronRight className="w-3 h-3" />
              <span className="text-niyat-gold-dark font-medium capitalize">
                {categoryOptions.find((c) => c.slug === currentCategorySlug)?.name || currentCategorySlug}
              </span>
            </>
          )}
        </nav>

        {/* Page Header */}
        <div className="border-b border-niyat-ivory-border pb-8">
          <span className="text-xs uppercase tracking-widest text-niyat-gold font-semibold">
            Catalog &amp; Formulations
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold text-niyat-charcoal mt-2">
            The Skincare Collection
          </h1>
          <p className="text-sm sm:text-base text-niyat-muted mt-2 max-w-2xl font-light">
            Every formula is rigorously curated with dermatologically backed bio-actives to nurture,
            hydrate, and renew skin resilience.
          </p>
        </div>

        {/* Filter Bar */}
        <ShopFilters categories={categoryOptions} totalCount={products.length} />

        {/* Product Grid or Empty State */}
        {products.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 pt-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-niyat-ivory-border max-w-xl mx-auto space-y-4 px-6">
            <div className="w-16 h-16 rounded-full bg-niyat-ivory flex items-center justify-center mx-auto text-niyat-gold">
              <PackageOpen className="w-8 h-8" />
            </div>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-niyat-charcoal">
              No Formulations Found
            </h3>
            <p className="text-xs sm:text-sm text-niyat-muted">
              We couldn&apos;t find any products matching your selected filters. Try broadening your
              search criteria or resetting all filters.
            </p>
            <div className="pt-2">
              <Link
                href="/shop"
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-niyat-emerald text-white text-xs font-semibold hover:bg-niyat-emerald-dark transition-all"
              >
                Reset All Filters
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
