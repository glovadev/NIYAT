import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Crown, Sparkles, ShieldCheck } from "lucide-react";

interface RoutineBannerProps {
  heading?: string;
  description?: string;
  ctaText?: string;
  ctaUrl?: string;
  imageUrl?: string;
}

export function RoutineBanner({
  heading = "The Royal Radiance Ritual",
  description = "A curated 4-step apothecary regimen infused with rare saffron, Bulgarian damask rose, and 24K gold elixirs to unveil timeless luminosity.",
  ctaText = "Explore The Royal Ritual",
  ctaUrl = "/shop",
  imageUrl = "/images/routine-banner.jpg",
}: RoutineBannerProps) {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      <div className="relative rounded-[28px] sm:rounded-[36px] bg-gradient-to-br from-[#061B14] via-[#0A261D] to-[#04110C] overflow-hidden border border-[#D4AF37]/50 shadow-[0_20px_60px_rgba(6,27,20,0.45)]">
        
        {/* Subtle arabesque background glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(212,175,55,0.18),transparent_60%)] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[radial-gradient(circle,rgba(212,175,55,0.12),transparent_70%)] pointer-events-none" />

        <div className="grid grid-cols-1 md:grid-cols-12 items-center min-h-[380px] sm:min-h-[420px]">
          
          {/* Left Content */}
          <div className="md:col-span-6 p-8 sm:p-12 lg:p-16 z-10 flex flex-col justify-center space-y-4 sm:space-y-6">
            
            {/* Eyebrow badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 w-fit backdrop-blur-xs">
              <Crown className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="text-[10px] sm:text-xs font-semibold tracking-[0.22em] text-[#FCF6BA] uppercase">
                DUBAI APOTHECARY • ROYAL RITUAL
              </span>
            </div>

            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
              {heading.includes("Royal") ? (
                <>
                  The <span className="text-gold-shimmer">Royal Radiance</span> Ritual
                </>
              ) : (
                heading
              )}
            </h2>
            
            <p className="text-sm sm:text-base text-[#F4E8C1]/80 font-light leading-relaxed max-w-xl">
              {description}
            </p>

            {/* 4 Steps Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 pb-1">
              <div className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-[#D4AF37]/20 text-center">
                <span className="block text-[9px] text-[#D4AF37] font-semibold tracking-wider">STEP 01</span>
                <span className="block text-[11px] text-white/90 font-medium truncate">Purify & Cleanse</span>
              </div>
              <div className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-[#D4AF37]/20 text-center">
                <span className="block text-[9px] text-[#D4AF37] font-semibold tracking-wider">STEP 02</span>
                <span className="block text-[11px] text-white/90 font-medium truncate">Gold Elixir</span>
              </div>
              <div className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-[#D4AF37]/20 text-center">
                <span className="block text-[9px] text-[#D4AF37] font-semibold tracking-wider">STEP 03</span>
                <span className="block text-[11px] text-white/90 font-medium truncate">Royal Cream</span>
              </div>
              <div className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-[#D4AF37]/20 text-center">
                <span className="block text-[9px] text-[#D4AF37] font-semibold tracking-wider">STEP 04</span>
                <span className="block text-[11px] text-white/90 font-medium truncate">Desert Shield</span>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href={ctaUrl}
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-gradient-to-r from-[#D4AF37] via-[#F4E8C1] to-[#AA771C] text-[#0A261D] font-bold text-xs sm:text-sm tracking-wider uppercase shadow-[0_4px_24px_rgba(212,175,55,0.4)] hover:shadow-[0_6px_30px_rgba(212,175,55,0.6)] transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <span>{ctaText}</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </Link>
            </div>
          </div>

          {/* Right Image */}
          <div className="md:col-span-6 relative w-full h-[280px] sm:h-[360px] md:h-[440px] flex items-center justify-center md:justify-end overflow-hidden p-4 sm:p-8">
            <div className="relative w-full h-full rounded-2xl overflow-hidden border border-[#D4AF37]/30 shadow-2xl">
              <Image
                src={imageUrl}
                alt={heading}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover object-center transform hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#061B14]/80 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-[#FCF6BA] text-xs">
                <span className="flex items-center gap-1.5 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                  24K Gold & Saffron Enriched
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
                  GCC Certified
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
