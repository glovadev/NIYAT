import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

export interface CategoryCircleItem {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
  bgColor: string;
}

const PASTEL_COLORS = [
  "bg-[#E3EFE9]", // soft mint
  "bg-[#FBE8E5]", // soft blush
  "bg-[#FBEFE3]", // soft peach
  "bg-[#FCF5E3]", // soft butter yellow
  "bg-[#E6EFE4]", // soft sage green
  "bg-[#FCECEE]", // soft rose
  "bg-[#E4ECE7]", // soft cool sage
  "bg-[#FDEFE9]", // soft warm cream
];

interface CategoryCirclesProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serverCategories?: any[];
}

export function CategoryCircles({ serverCategories }: CategoryCirclesProps) {
  // Purely database-driven: categories come directly from MongoDB Category collection
  const categories: CategoryCircleItem[] = (serverCategories && serverCategories.length > 0)
    ? serverCategories.map((cat, idx) => ({
        id: String(cat._id || cat.id),
        name: cat.name,
        slug: cat.slug,
        imageUrl: cat.image?.url || `/images/categories/${cat.slug}.jpg` || "/images/categories/face-wash.jpg",
        bgColor: PASTEL_COLORS[idx % PASTEL_COLORS.length],
      }))
    : [];

  if (categories.length === 0) {
    return null;
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#172723]">
          Shop by Category
        </h2>
        <Link
          href="/shop"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#153D32] hover:text-[#1B4D3F] transition-colors group"
        >
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* Horizontal Alignment (8 in a row on desktop, smooth horizontal scroll on mobile) */}
      <div className="flex items-start justify-between gap-3 sm:gap-4 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/shop?category=${cat.slug}`}
            className="group flex flex-col items-center flex-shrink-0 w-[84px] sm:w-[100px] lg:w-[110px] text-center"
          >
            {/* Circle Container */}
            <div
              className={`w-[78px] h-[78px] sm:w-[94px] sm:h-[94px] lg:w-[104px] lg:h-[104px] rounded-full ${cat.bgColor} p-2 flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:scale-105 group-hover:shadow-md relative`}
            >
              <div className="relative w-full h-full rounded-full overflow-hidden">
                <Image
                  src={cat.imageUrl}
                  alt={cat.name}
                  fill
                  sizes="(max-width: 640px) 80px, 110px"
                  className="object-cover object-center group-hover:scale-110 transition-transform duration-500"
                />
              </div>
            </div>

            {/* Category Label */}
            <span className="mt-2.5 text-xs sm:text-[13px] font-medium text-[#172723] group-hover:text-[#153D32] transition-colors leading-tight">
              {cat.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
