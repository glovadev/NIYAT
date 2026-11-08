"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Loader2, X, ArrowRight, Tag, Sparkles } from "lucide-react";
import { formatPaise } from "@/lib/utils";
import type {
  ProductSuggestionItem,
  CategorySuggestionItem,
} from "@/app/api/products/suggestions/route";

export function SearchAutocomplete() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<{
    products: ProductSuggestionItem[];
    categories: CategorySuggestionItem[];
  }>({ products: [], categories: [] });
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  // Debounced live fetch
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSuggestions({ products: [], categories: [] });
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/products/suggestions?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal }
        );
        const json = await res.json();
        if (json.success && json.data) {
          setSuggestions({
            products: json.data.products || [],
            categories: json.data.categories || [],
          });
          setIsOpen(true);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          // aborted, ignore
        }
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setIsOpen(false);
      router.push(`/shop?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleClear = () => {
    setQuery("");
    setSuggestions({ products: [], categories: [] });
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleSelectProduct = () => {
    setIsOpen(false);
  };

  const handleSelectCategory = (slug: string) => {
    setIsOpen(false);
    router.push(`/categories/${slug}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const hasResults =
    suggestions.products.length > 0 || suggestions.categories.length > 0;

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={handleSubmit} className="relative w-full">
        <Search className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D4AF37] pointer-events-none" />

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.trim().length > 0) {
              setIsOpen(true);
            }
          }}
          onFocus={() => {
            if (query.trim().length > 0) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search pure saffron, 24K gold creams, serums..."
          aria-label="Search products and categories"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          className="w-full pl-9 sm:pl-11 pr-9 sm:pr-10 py-2 sm:py-2.5 bg-[#FAF6EE]/80 hover:bg-[#FAF6EE] focus:bg-white border border-[#D4AF37]/30 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/20 rounded-xl text-xs sm:text-sm text-[#172723] placeholder-[#172723]/50 focus:outline-none transition-all shadow-inner/10"
        />

        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {loading && (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D4AF37]" />
          )}

          {query.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 transition-colors"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </form>

      {/* Live Suggestions Dropdown */}
      {isOpen && query.trim().length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-[#FFFCF8] border border-[#D4AF37]/40 rounded-2xl shadow-2xl overflow-hidden z-50 backdrop-blur-md animate-in fade-in slide-in-from-top-1 duration-150">
          {/* 1. Category Suggestions */}
          {suggestions.categories.length > 0 && (
            <div className="px-4 py-2.5 bg-[#FAF6EE]/60 border-b border-[#EAE5DC]/70">
              <span className="text-[10px] uppercase tracking-wider font-bold text-[#8F6B20] flex items-center gap-1 mb-1.5">
                <Tag className="w-3 h-3 text-[#D4AF37]" />
                Categories
              </span>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSelectCategory(cat.slug)}
                    className="px-2.5 py-1 rounded-full bg-white hover:bg-[#D4AF37]/15 text-[#153D32] hover:text-[#0D2B24] border border-[#D4AF37]/30 text-xs font-medium transition-all shadow-xs"
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 2. Product Suggestions */}
          {suggestions.products.length > 0 && (
            <div>
              <div className="px-4 pt-3 pb-1 flex items-center justify-between text-[10px] uppercase tracking-wider font-bold text-[#8F6B20]">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                  Products
                </span>
                <span className="text-stone-400 font-normal">
                  {suggestions.products.length} found
                </span>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-[#EAE5DC]/40 px-2 py-1">
                {suggestions.products.map((p) => {
                  const effectivePrice =
                    p.salePricePaise && p.salePricePaise < p.regularPricePaise
                      ? p.salePricePaise
                      : p.regularPricePaise;
                  const hasDiscount =
                    p.salePricePaise && p.salePricePaise < p.regularPricePaise;

                  return (
                    <Link
                      key={p.id}
                      href={`/products/${p.slug}`}
                      onClick={handleSelectProduct}
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#FAF6EE] transition-all group"
                    >
                      {/* Product Thumbnail */}
                      <div className="relative w-12 h-12 rounded-xl bg-stone-100 border border-[#D4AF37]/20 overflow-hidden shrink-0">
                        <Image
                          src={p.imageUrl}
                          alt={p.name}
                          fill
                          sizes="48px"
                          unoptimized
                          className="object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>

                      {/* Product Information */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs sm:text-sm font-serif font-bold text-[#153D32] group-hover:text-[#B38728] truncate transition-colors">
                            {p.name}
                          </h4>
                          {p.sizeLabel && (
                            <span className="text-[10px] text-stone-400 font-sans shrink-0">
                              • {p.sizeLabel}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-0.5">
                          {p.categoryName && (
                            <span className="text-[10px] text-[#8F6B20] font-sans truncate">
                              {p.categoryName}
                            </span>
                          )}
                          {!p.inStock && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-rose-50 text-rose-600 font-semibold uppercase">
                              Out of Stock
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Price */}
                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold font-price text-[#153D32]">
                          {formatPaise(effectivePrice)}
                        </div>
                        {hasDiscount && (
                          <div className="text-[10px] font-price text-stone-400 line-through">
                            {formatPaise(p.regularPricePaise)}
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Empty State */}
          {!loading && !hasResults && (
            <div className="p-8 text-center space-y-1.5">
              <p className="text-xs font-serif text-[#153D32] font-semibold">
                No matching products found for &ldquo;{query}&rdquo;
              </p>
              <p className="text-[11px] text-stone-400">
                Try searching for face wash, body lotion, serum, or whitening cream.
              </p>
            </div>
          )}

          {/* 4. Bottom View All Results CTA */}
          <div className="p-2.5 bg-[#FAF6EE] border-t border-[#EAE5DC]/80">
            <button
              type="button"
              onClick={handleSubmit}
              className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-white hover:bg-[#D4AF37]/10 text-xs font-bold text-[#153D32] hover:text-[#0D2B24] border border-[#D4AF37]/30 transition-all shadow-xs group"
            >
              <span>
                View all results for &ldquo;<span className="text-[#B38728]">{query}</span>&rdquo;
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-[#D4AF37] group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

