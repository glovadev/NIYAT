import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { RoutineBanner } from "@/components/storefront/RoutineBanner";

export interface PromoBannerData {
  id?: string;
  title?: string;
  subtitle?: string;
  imageUrl: string;
  mobileImageUrl?: string;
  imageAlt?: string;
  targetUrl?: string;
}

interface PromoBannerProps {
  banner?: PromoBannerData | null;
}

export function PromoBanner({ banner }: PromoBannerProps) {
  // If no admin promotional banner is configured, fall back to the Royal Radiance Routine banner
  if (!banner || !banner.imageUrl) {
    return <RoutineBanner />;
  }

  const hasTextOverlay = Boolean(banner.title && banner.title.trim());

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-luxury border border-[#D4AF37]/35 group bg-[#0A261D]">
        <Link
          href={banner.targetUrl || "/shop"}
          className="block relative w-full overflow-hidden"
          aria-label={banner.title || "Promotional Banner"}
        >
          {banner.mobileImageUrl ? (
            <>
              {/* Mobile View with dedicated Mobile Banner */}
              <div className="block sm:hidden relative w-full aspect-[16/9] overflow-hidden">
                <Image
                  src={banner.mobileImageUrl}
                  alt={banner.imageAlt || banner.title || "NIYAT Promotion"}
                  fill
                  sizes="100vw"
                  className="object-cover object-center group-hover:scale-[1.02] transition-transform duration-700 ease-out"
                />
              </div>

              {/* Desktop View with dedicated Desktop Banner */}
              <div className="hidden sm:block relative w-full aspect-[21/9] lg:aspect-[3/1] overflow-hidden">
                <Image
                  src={banner.imageUrl}
                  alt={banner.imageAlt || banner.title || "NIYAT Promotion"}
                  fill
                  sizes="100vw"
                  className="object-cover object-center group-hover:scale-[1.02] transition-transform duration-700 ease-out"
                />
              </div>
            </>
          ) : (
            /* Single Banner fallback with responsive aspect ratio */
            <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] lg:aspect-[3/1] overflow-hidden">
              <Image
                src={banner.imageUrl}
                alt={banner.imageAlt || banner.title || "NIYAT Promotion"}
                fill
                sizes="100vw"
                className="object-cover object-center group-hover:scale-[1.02] transition-transform duration-700 ease-out"
              />
            </div>
          )}

          {/* Optional Typography Overlay if Admin provides title/subtitle */}
          {hasTextOverlay && (
            <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent flex items-center p-6 sm:p-12 lg:p-16">
              <div className="max-w-lg text-white">
                <span className="inline-block text-[10px] sm:text-xs font-bold tracking-[0.25em] text-[#D4AF37] uppercase mb-2">
                  Exclusive Privilege
                </span>
                <h3 className="font-serif text-2xl sm:text-4xl lg:text-5xl font-bold text-white mb-2 leading-tight">
                  {banner.title}
                </h3>
                {banner.subtitle && (
                  <p className="text-xs sm:text-sm text-stone-200 mb-5 line-clamp-2 max-w-md">
                    {banner.subtitle}
                  </p>
                )}
                <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#B38728] text-slate-950 text-xs sm:text-sm font-semibold shadow-md hover:brightness-110 transition">
                  Shop Now <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          )}
        </Link>
      </div>
    </section>
  );
}

