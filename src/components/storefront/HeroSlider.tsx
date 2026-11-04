"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
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
  mobileImageUrl?: string;
  imageAlt?: string;
  targetUrl: string;
  textShadow?: "NONE" | "SOFT" | "CRISP" | "STRONG";
  textSize?: "MD" | "LG" | "XL";
  textColor?: "DARK" | "LIGHT" | "GOLD";
  textBackdrop?: "FROSTED_LIGHT" | "FROSTED_DARK" | "SUBTLE_GRADIENT" | "NONE";
  mobileFit?: "CONTAIN" | "COVER";
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
        className="relative w-full overflow-hidden bg-gradient-to-r from-[#F9F5EC] via-[#F4ECE1] to-[#F9F5EC] border-b border-[#D4AF37]/30 group aspect-[16/9] sm:aspect-[3/1]"
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
            return (
              <div
                key={slide.id || idx}
                className="relative w-full min-w-full flex-shrink-0 h-full flex items-center"
              >
                {/* 100% Full-Bleed Clean Image Banner */}
                <Link
                  href={slide.targetUrl || "/shop"}
                  className="relative block w-full h-full cursor-pointer z-0 overflow-hidden"
                  title={slide.imageAlt || "View Collection"}
                >
                  {slide.mobileImageUrl ? (
                    <>
                      {/* Mobile Dedicated Image */}
                      <div className="block sm:hidden relative w-full h-full">
                        <Image
                          src={slide.mobileImageUrl}
                          alt={slide.imageAlt || "NIYAT Luxury Skincare Banner Mobile"}
                          fill
                          priority={idx === 0}
                          sizes="100vw"
                          className={
                            slide.mobileFit === "CONTAIN"
                              ? "object-contain object-center"
                              : "object-cover object-center"
                          }
                        />
                      </div>
                      {/* Desktop Image (3:1 Panoramic Zero Cropping with Ambient Luxury Glow) */}
                      <div className="hidden sm:block relative w-full h-full">
                        {/* Ambient luxury blurred glow behind banner */}
                        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
                          <Image
                            src={slide.imageUrl}
                            alt=""
                            fill
                            className="object-cover blur-2xl opacity-35 scale-105"
                          />
                        </div>
                        <Image
                          src={slide.imageUrl}
                          alt={slide.imageAlt || "NIYAT Luxury Skincare Banner"}
                          fill
                          priority={idx === 0}
                          sizes="100vw"
                          className="object-contain object-center"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Mobile Dedicated View */}
                      <div className="block sm:hidden relative w-full h-full">
                        <Image
                          src={slide.imageUrl}
                          alt={slide.imageAlt || "NIYAT Luxury Skincare Banner"}
                          fill
                          priority={idx === 0}
                          sizes="100vw"
                          className={
                            slide.mobileFit === "CONTAIN"
                              ? "object-contain object-center"
                              : "object-cover object-center"
                          }
                        />
                      </div>
                      {/* Desktop View (3:1 Panoramic Zero Cropping with Ambient Luxury Glow) */}
                      <div className="hidden sm:block relative w-full h-full">
                        {/* Ambient luxury blurred glow behind banner */}
                        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
                          <Image
                            src={slide.imageUrl}
                            alt=""
                            fill
                            className="object-cover blur-2xl opacity-35 scale-105"
                          />
                        </div>
                        <Image
                          src={slide.imageUrl}
                          alt={slide.imageAlt || "NIYAT Luxury Skincare Banner"}
                          fill
                          priority={idx === 0}
                          sizes="100vw"
                          className="object-contain object-center"
                        />
                      </div>
                    </>
                  )}
                </Link>
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
