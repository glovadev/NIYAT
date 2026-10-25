import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

interface RoutineBannerProps {
  heading?: string;
  description?: string;
  ctaText?: string;
  ctaUrl?: string;
  imageUrl?: string;
}

export function RoutineBanner({
  heading = "Complete Skincare Routine",
  description = "Build your perfect routine with NIYAT",
  ctaText = "Shop Full Range",
  ctaUrl = "/shop",
  imageUrl = "/images/routine-banner.jpg",
}: RoutineBannerProps) {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="relative rounded-[28px] sm:rounded-[36px] bg-[#DCE6D4] overflow-hidden border border-[#C9D6C0]/60 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-12 items-center min-h-[320px] sm:min-h-[360px]">
          
          {/* Left Content */}
          <div className="md:col-span-5 p-8 sm:p-12 lg:p-16 z-10 flex flex-col justify-center space-y-4 sm:space-y-6">
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#153D32] leading-tight">
              {heading}
            </h2>
            
            <p className="text-sm sm:text-base text-[#172723]/80 font-light">
              {description}
            </p>

            <div className="pt-2">
              <Link
                href={ctaUrl}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-[#153D32] hover:bg-[#1B4D3F] text-white font-medium text-xs sm:text-sm tracking-wide shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <span>{ctaText}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Right Image */}
          <div className="md:col-span-7 relative w-full h-[260px] sm:h-[340px] md:h-[380px] flex items-center justify-end overflow-hidden">
            <div className="relative w-full h-full">
              <Image
                src={imageUrl}
                alt={heading}
                fill
                sizes="(max-width: 768px) 100vw, 60vw"
                className="object-cover md:object-contain object-center md:object-right"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
