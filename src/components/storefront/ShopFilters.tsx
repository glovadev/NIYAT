"use client";

import React, { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

interface ShopFiltersProps {
  categories: CategoryOption[];
  totalCount: number;
}

export function ShopFilters({ categories, totalCount }: ShopFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentCategory = searchParams.get("category") || "";
  const currentSort = searchParams.get("sort") || "newest";
  const currentInStock = searchParams.get("inStock") === "true";
  const currentQ = searchParams.get("q") || "";

  const [searchTerm, setSearchTerm] = React.useState(currentQ);

  const updateParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // Reset to page 1 on filter changes
    params.delete("page");

    startTransition(() => {
      router.push(`/shop?${params.toString()}`);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParam("q", searchTerm.trim());
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    startTransition(() => {
      router.push("/shop");
    });
  };

  const hasActiveFilters =
    Boolean(currentCategory) ||
    currentSort !== "newest" ||
    currentInStock ||
    Boolean(currentQ);

  return (
    <div className="space-y-6">
      {/* Top Filter Bar: Search, In Stock Toggle, Sort */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between pb-6 border-b border-niyat-ivory-border">
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search active ingredients, concerns, or products..."
            className="w-full pl-10 pr-10 py-2.5 rounded-full border border-niyat-ivory-border bg-white text-xs sm:text-sm text-niyat-charcoal placeholder:text-niyat-muted focus:outline-none focus:border-niyat-gold focus:ring-1 focus:ring-niyat-gold shadow-sm transition-all"
          />
          <Search className="w-4 h-4 text-niyat-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                updateParam("q", null);
              }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-niyat-muted hover:text-niyat-charcoal transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>

        {/* Right Controls: In Stock & Sort Dropdown */}
        <div className="flex flex-wrap items-center gap-4 justify-between md:justify-end">
          {/* In Stock Only Checkbox */}
          <label className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm text-niyat-charcoal select-none">
            <input
              type="checkbox"
              checked={currentInStock}
              onChange={(e) => updateParam("inStock", e.target.checked ? "true" : null)}
              className="w-4 h-4 rounded text-niyat-emerald border-niyat-ivory-border focus:ring-niyat-gold"
            />
            <span>In stock only</span>
          </label>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-niyat-muted" />
            <select
              value={currentSort}
              onChange={(e) => updateParam("sort", e.target.value)}
              className="text-xs sm:text-sm bg-white border border-niyat-ivory-border rounded-lg px-3 py-2 text-niyat-charcoal focus:outline-none focus:border-niyat-gold cursor-pointer shadow-sm"
            >
              <option value="newest">Featured / Newest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="name_asc">Name: A to Z</option>
            </select>
          </div>
        </div>
      </div>

      {/* Category Pills & Results Counter */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => updateParam("category", null)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium tracking-wide transition-all ${
              !currentCategory
                ? "bg-niyat-emerald text-white shadow-sm"
                : "bg-white text-niyat-charcoal/80 border border-niyat-ivory-border hover:border-niyat-gold"
            }`}
          >
            All Formulations
          </button>
          {categories.map((cat) => {
            const isActive = currentCategory === cat.slug;
            return (
              <button
                key={cat.id}
                onClick={() => updateParam("category", isActive ? null : cat.slug)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium tracking-wide transition-all ${
                  isActive
                    ? "bg-niyat-emerald text-white shadow-sm"
                    : "bg-white text-niyat-charcoal/80 border border-niyat-ivory-border hover:border-niyat-gold"
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* Counter and Clear Filters */}
        <div className="flex items-center gap-3 text-xs text-niyat-muted">
          <span>
            {isPending ? "Updating catalog..." : `Showing ${totalCount} ${totalCount === 1 ? "product" : "products"}`}
          </span>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="text-niyat-gold-dark hover:underline font-medium inline-flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Clear filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
