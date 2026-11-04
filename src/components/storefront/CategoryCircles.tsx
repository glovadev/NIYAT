import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkles } from "lucide-react";

export interface CategoryCircleItem {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
  bgColor?: string;
}

interface CategoryCirclesProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serverCategories?: any[];
}

export function CategoryCircles({ serverCategories }: CategoryCirclesProps) {
  // Purely database-driven: categories come directly from MongoDB Category collection
  const categories: CategoryCircleItem[] = (serverCategories && serverCategories.length > 0)
    ? serverCategories.map((cat) => ({
        id: String(cat._id || cat.id),
        name: cat.name,
        slug: cat.slug,
        imageUrl: cat.image?.url || `/images/categories/${cat.slug}.jpg` || "/images/categories/face-wash.jpg",
      }))
    : [];

  if (categories.length === 0) {
    return null;
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Header */}
      <div className="flex items-end justify-between mb-6 sm:mb-8 pb-3 border-b border-[#D4AF37]/25">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.25em] uppercase text-[#A5833F] mb-1">
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Curated Formulations</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#0D2B24]">
            Shop by Royal Category
          </h2>
        </div>
        <Link
          href="/shop"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#153D32] hover:text-[#A5833F] transition-colors group"
        >
          <span>Explore All</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1 text-[#D4AF37]" />
        </Link>
      </div>

      {/* Horizontal Alignment with Royal Gold Medallion Ring */}
      <div className="flex items-start justify-between gap-3 sm:gap-6 overflow-x-auto pt-3 sm:pt-4 pb-4 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-2">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/shop?category=${cat.slug}`}
            className="group flex flex-col items-center flex-shrink-0 w-[88px] sm:w-[104px] lg:w-[115px] text-center py-1"
          >
            {/* Medallion Circle Double-Ring Container */}
            <div className="relative p-1 rounded-full border border-[#D4AF37]/45 bg-[#FFFDF9] shadow-[0_2px_10px_rgba(212,175,55,0.12)] transition-all duration-300 group-hover:border-[#D4AF37] group-hover:shadow-[0_6px_22px_rgba(212,175,55,0.28)] group-hover:scale-105">
              <div className="w-[76px] h-[76px] sm:w-[92px] sm:h-[92px] lg:w-[102px] lg:h-[102px] rounded-full p-1 border border-[#D4AF37]/30 bg-gradient-to-br from-[#FFFDF9] via-[#FAF6ED] to-[#EFE2C3] flex items-center justify-center">
                <div className="relative w-full h-full rounded-full overflow-hidden border border-[#D4AF37]/25 bg-white">
                  <Image
                    src={cat.imageUrl}
                    alt={cat.name}
                    fill
                    sizes="(max-width: 640px) 85px, 115px"
                    className="object-cover object-center group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
              </div>
            </div>

            {/* Category Label */}
            <span className="mt-2 text-xs sm:text-[13px] font-semibold text-[#172723] group-hover:text-[#A5833F] transition-colors leading-tight">
              {cat.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
