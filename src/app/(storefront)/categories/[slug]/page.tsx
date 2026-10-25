import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Category } from "@/models/Category";
import { Product } from "@/models/Product";
import { ProductCard } from "@/components/storefront/ProductCard";
import { ChevronRight, Sparkles, PackageOpen } from "lucide-react";

export const dynamic = "force-dynamic";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string; inStock?: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  await connectToDatabase();
  const { slug } = await params;
  const category = await Category.findOne({ slug, status: "ACTIVE" }).lean();

  if (!category) {
    return {
      title: "Category Not Found — NIYAT Skincare",
    };
  }

  return {
    title: `${category.name} — Luxury Formulations | NIYAT Skincare`,
    description:
      category.description ||
      `Discover NIYAT's premium ${category.name} skincare collection. Dermatologically formulated for visible radiance.`,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  await connectToDatabase();
  const { slug } = await params;
  const sParams = await searchParams;

  const category = await Category.findOne({ slug, status: "ACTIVE" }).lean();
  if (!category) {
    notFound();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: any = {
    categoryId: category._id,
    status: "PUBLISHED",
  };

  if (sParams.inStock === "true") {
    query.stockQuantity = { $gt: 0 };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let sortOption: any = { isFeatured: -1, createdAt: -1 };
  if (sParams.sort === "price_asc") {
    sortOption = { regularPricePaise: 1 };
  } else if (sParams.sort === "price_desc") {
    sortOption = { regularPricePaise: -1 };
  } else if (sParams.sort === "name_asc") {
    sortOption = { name: 1 };
  }

  const productsDocs = await Product.find(query)
    .populate("categoryId", "name slug")
    .sort(sortOption)
    .lean();

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
      imageUrl: p.images?.[0]?.url,
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
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-niyat-muted">
          <Link href="/" className="hover:text-niyat-emerald transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3 h-3" />
          <Link href="/shop" className="hover:text-niyat-emerald transition-colors">
            Shop All
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-niyat-charcoal font-medium">{category.name}</span>
        </nav>

        {/* Category Header Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-niyat-emerald-dark via-niyat-emerald to-niyat-emerald-dark text-white p-8 sm:p-12 border border-niyat-gold/20 shadow-xl">
          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-niyat-gold text-xs font-semibold uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5" />
              Category Formulation
            </div>
            <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight">
              {category.name}
            </h1>
            {category.description && (
              <p className="text-sm sm:text-base text-white/80 font-light leading-relaxed">
                {category.description}
              </p>
            )}
            <div className="pt-2 text-xs text-niyat-gold font-medium">
              Showing {products.length} {products.length === 1 ? "formulation" : "formulations"}
            </div>
          </div>

          {/* Decorative background glow */}
          <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-niyat-gold/20 blur-3xl pointer-events-none" />
        </div>

        {/* Product Grid */}
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
              No Products in this Category
            </h3>
            <p className="text-xs sm:text-sm text-niyat-muted">
              We are currently preparing newly approved formulations for this collection. Please check
              back soon or explore other collections.
            </p>
            <div className="pt-2">
              <Link
                href="/shop"
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-niyat-emerald text-white text-xs font-semibold hover:bg-niyat-emerald-dark transition-all"
              >
                Explore All Products
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
