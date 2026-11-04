"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Leaf,
  FlaskConical,
  Heart,
  Crown,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

export interface HeroSlide {
  id: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  imageUrl: string;
  imageAlt?: string;
  targetUrl: string;
}

interface HeroSliderProps {
  slides?: HeroSlide[];
}

export function HeroSlider({ slides }: HeroSliderProps) {
  const activeSlides =
    slides && slides.length > 0
      ? slides
      : [
          {
            id: "default-1",
            eyebrow: "NATURAL • SAFE • EFFECTIVE",
            title: "Healthy Skin, Happier You",
            description:
              "Discover our range of skincare essentials made with nature's finest ingredients for glowing, healthy skin.",
            imageUrl: "/images/hero-woman.jpg",
            imageAlt: "NIYAT Natural Skincare Radiance Range",
            targetUrl: "/shop",
          },
        ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const totalSlides = activeSlides.length;

  // Auto-advance slides every 5.5 seconds unless paused on hover
  useEffect(() => {
    if (totalSlides <= 1 || isPaused) return;

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % totalSlides);
    }, 5500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [totalSlides, isPaused]);

  const handlePrev = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const handleNext = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  };

  // Touch handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > 50) {
      handleNext();
    } else if (distance < -50) {
      handlePrev();
    }
  };

  return (
    <>
      <div
        className="relative w-full overflow-hidden bg-gradient-to-r from-[#F9F5EC] via-[#F4ECE1] to-[#F9F5EC] border-b border-[#D4AF37]/30 group"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Full Width Sliding Track */}
        <div
          className="flex h-full w-full transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {activeSlides.map((slide, idx) => {
            const hasContent = Boolean(
              (slide.title && slide.title.trim()) ||
              (slide.description && slide.description.trim())
            );

            return (
              <div
                key={slide.id || idx}
                className="relative w-full min-w-full flex-shrink-0 h-[240px] sm:h-[380px] md:h-[480px] lg:h-[620px] flex items-center"
              >
                {/* 1. Full-Bleed 100% Width Image */}
                <div className="absolute inset-0 z-0 w-full h-full">
                  {/* If image-only (no text overlay), make the entire image a clickable link */}
                  {!hasContent ? (
                    <Link
                      href={slide.targetUrl || "/shop"}
                      className="relative block w-full h-full cursor-pointer"
                      title={slide.imageAlt || "View Collection"}
                    >
                      <Image
                        src={slide.imageUrl}
                        alt={slide.imageAlt || "NIYAT Luxury Skincare Banner"}
                        fill
                        priority={idx === 0}
                        sizes="100vw"
                        className="object-cover object-center"
                      />
                    </Link>
                  ) : (
                    <>
                      <Image
                        src={slide.imageUrl}
                        alt={slide.imageAlt || slide.title || "NIYAT Luxury Skincare"}
                        fill
                        priority={idx === 0}
                        sizes="100vw"
                        className="object-cover object-right sm:object-center lg:object-right"
                      />
                      {/* Subtle Luxury Gradient Overlay (Only applied when text is present) */}
                      <div className="absolute inset-0 bg-gradient-to-r from-[#F9F5EC] via-[#F9F5EC]/70 to-transparent max-w-2xl hidden sm:block pointer-events-none" />
                    </>
                  )}
                </div>

                {/* 2. Container Aligned Content Overlay (Only rendered if title/description exist) */}
                {hasContent && (
                  <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-4 sm:py-12 lg:py-20 flex flex-col justify-center h-full">
                    <div className="max-w-[70%] sm:max-w-xl space-y-2 sm:space-y-5 lg:space-y-6">
                      
                      {/* Eyebrow with UAE royal crown & gold accent */}
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/35 shadow-xs">
                        <Crown className="w-3.5 h-3.5 text-[#A5833F]" />
                        <span className="text-[9px] sm:text-xs font-bold tracking-[0.25em] text-[#8F6B20] uppercase">
                          {slide.eyebrow || "DUBAI ROYAL BOTANICALS • 24K RADIANCE"}
                        </span>
                      </div>

                      {/* Heading */}
                      {slide.title && (
                        <h1 className="font-serif text-xl sm:text-4xl lg:text-[58px] font-bold text-[#0D2B24] leading-[1.12] tracking-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)]">
                          {slide.title.includes(",") ? (
                            <>
                              {slide.title.split(",")[0]} <br className="sm:hidden" />
                              <span className="font-serif font-bold text-[#153D32]">
                                {slide.title.split(",")[1]}
                              </span>
                            </>
                          ) : (
                            slide.title
                          )}
                        </h1>
                      )}

                      {/* Description */}
                      {slide.description && (
                        <p className="text-[11px] sm:text-base text-[#172723]/85 leading-snug sm:leading-relaxed max-w-md font-normal line-clamp-2 sm:line-clamp-none">
                          {slide.description}
                        </p>
                      )}

                      {/* CTA Buttons */}
                      <div className="flex flex-wrap items-center gap-2.5 pt-1 sm:pt-2">
                        <Link
                          href={slide.targetUrl || "/shop"}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 sm:px-8 sm:py-3.5 rounded-full bg-gradient-to-r from-[#0C2920] to-[#153D32] hover:from-[#061510] hover:to-[#0C2920] text-[#F4E8C1] border border-[#D4AF37]/50 font-bold text-[11px] sm:text-sm tracking-wide shadow-lg shadow-[#D4AF37]/15 hover:shadow-xl transition-all active:scale-95 group"
                        >
                          <span>Explore Collection</span>
                          <ArrowRight className="w-3.5 h-3.5 text-[#D4AF37] group-hover:translate-x-0.5 transition-transform" />
                        </Link>

                        <Link
                          href="/shop"
                          className="hidden sm:inline-flex items-center justify-center px-6 py-3.5 rounded-full bg-white/80 hover:bg-white text-[#153D32] border border-[#D4AF37]/40 font-semibold text-xs sm:text-sm tracking-wide shadow-xs transition-all"
                        >
                          View Rituals
                        </Link>
                      </div>

                      {/* Three Benefit Indicators - Visible on Tablet and Desktop */}
                      <div className="hidden sm:grid pt-4 sm:pt-6 border-t border-[#D4AF37]/25 grid-cols-3 gap-3 sm:gap-6 max-w-md">
                        <div className="flex flex-col items-center sm:items-start text-center sm:text-left space-y-1.5">
                          <div className="w-9 h-9 rounded-full border border-[#D4AF37]/40 bg-[#FBF8F2] flex items-center justify-center shadow-xs">
                            <Crown className="w-4 h-4 text-[#D4AF37]" />
                          </div>
                          <span className="text-[11px] sm:text-xs font-semibold text-[#172723] leading-tight">
                            Royal Saffron Elixir
                          </span>
                        </div>

                        <div className="flex flex-col items-center sm:items-start text-center sm:text-left space-y-1.5">
                          <div className="w-9 h-9 rounded-full border border-[#D4AF37]/40 bg-[#FBF8F2] flex items-center justify-center shadow-xs">
                            <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                          </div>
                          <span className="text-[11px] sm:text-xs font-semibold text-[#172723] leading-tight">
                            Certified Derma GCC
                          </span>
                        </div>

                        <div className="flex flex-col items-center sm:items-start text-center sm:text-left space-y-1.5">
                          <div className="w-9 h-9 rounded-full border border-[#D4AF37]/40 bg-[#FBF8F2] flex items-center justify-center shadow-xs">
                            <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                          </div>
                          <span className="text-[11px] sm:text-xs font-semibold text-[#172723] leading-tight">
                            24K Gold Radiance
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Circular Left / Right Floating Navigation Arrows */}
        {totalSlides > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous Slide"
              className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-[#061510]/80 hover:bg-[#061510] border border-[#D4AF37]/50 text-[#F4E8C1] shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-[#D4AF37]" />
            </button>

            <button
              type="button"
              onClick={handleNext}
              aria-label="Next Slide"
              className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-[#061510]/80 hover:bg-[#061510] border border-[#D4AF37]/50 text-[#F4E8C1] shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-[#D4AF37]" />
            </button>
          </>
        )}

        {/* Bottom Pagination Indicators */}
        {totalSlides > 1 && (
          <div className="hidden sm:flex absolute bottom-2.5 sm:bottom-5 left-1/2 -translate-x-1/2 z-20 items-center gap-1.5 sm:gap-2.5">
            {activeSlides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${
                  idx === currentIndex
                    ? "w-6 sm:w-8 bg-[#D4AF37]"
                    : "w-2 sm:w-2 bg-[#D4AF37]/35 hover:bg-[#D4AF37]/60"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Mobile Benefit Indicators Strip (Below the landscape hero on phones) */}
      <div className="sm:hidden grid grid-cols-3 gap-2 px-4 py-3 bg-[#FBF8F2] border-b border-[#D4AF37]/25">
        <div className="flex flex-col items-center text-center space-y-1">
          <div className="w-7 h-7 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center">
            <Crown className="w-3.5 h-3.5 text-[#A5833F]" />
          </div>
          <span className="text-[10px] font-semibold text-[#172723] leading-tight">
            Royal Saffron
          </span>
        </div>

        <div className="flex flex-col items-center text-center space-y-1">
          <div className="w-7 h-7 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center">
            <ShieldCheck className="w-3.5 h-3.5 text-[#A5833F]" />
          </div>
          <span className="text-[10px] font-semibold text-[#172723] leading-tight">
            GCC Certified
          </span>
        </div>

        <div className="flex flex-col items-center text-center space-y-1">
          <div className="w-7 h-7 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-[#A5833F]" />
          </div>
          <span className="text-[10px] font-semibold text-[#172723] leading-tight">
            24K Radiance
          </span>
        </div>
      </div>
    </>
  );
}
