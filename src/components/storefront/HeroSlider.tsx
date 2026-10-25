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
} from "lucide-react";

export interface HeroSlide {
  id: string;
  eyebrow?: string;
  title: string;
  description: string;
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
        className="relative w-full overflow-hidden bg-[#FCE5DE] border-b border-[#F6D5CB]/40 group"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Full Width Sliding Track - Landscape height on mobile (~230px), responsive scaling on tablet & desktop */}
        <div
          className="flex h-full w-full transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {activeSlides.map((slide, idx) => (
            <div
              key={slide.id || idx}
              className="relative w-full min-w-full flex-shrink-0 h-[220px] sm:h-[360px] md:h-[460px] lg:h-[600px] flex items-center"
            >
              {/* Full-Bleed 100% Width Image */}
              <div className="absolute inset-0 z-0 w-full h-full">
                <Image
                  src={slide.imageUrl}
                  alt={slide.imageAlt || slide.title}
                  fill
                  priority={idx === 0}
                  sizes="100vw"
                  className="object-cover object-right sm:object-center lg:object-right"
                />
              </div>

              {/* Container Aligned Content Overlay */}
              <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-4 sm:py-12 lg:py-20 flex flex-col justify-center h-full">
                <div className="max-w-[65%] sm:max-w-xl space-y-1.5 sm:space-y-5 lg:space-y-6">
                  
                  {/* Eyebrow */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] sm:text-xs font-semibold tracking-[0.2em] text-[#153D32] uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,0.15)]">
                      {slide.eyebrow || "NATURAL • SAFE • EFFECTIVE"}
                    </span>
                  </div>

                  {/* Heading */}
                  <h1 className="font-serif text-lg sm:text-3xl lg:text-[56px] font-bold text-[#153D32] leading-[1.15] tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]">
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

                  {/* Description */}
                  <p className="text-[11px] sm:text-base text-[#172723] leading-snug sm:leading-relaxed max-w-md font-medium sm:font-normal line-clamp-2 sm:line-clamp-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.15)]">
                    {slide.description}
                  </p>

                  {/* CTA Button */}
                  <div className="pt-1 sm:pt-2">
                    <Link
                      href={slide.targetUrl || "/shop"}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 sm:px-8 sm:py-3.5 rounded-full bg-[#153D32] hover:bg-[#1B4D3F] text-white font-medium text-[11px] sm:text-sm tracking-wide shadow-sm hover:shadow-md transition-all active:scale-95"
                    >
                      <span>Shop Now</span>
                      <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
                    </Link>
                  </div>

                  {/* Three Benefit Indicators - Visible on Tablet and Desktop */}
                  <div className="hidden sm:grid pt-4 sm:pt-6 border-t border-[#153D32]/10 grid-cols-3 gap-3 sm:gap-6 max-w-md">
                    <div className="flex flex-col items-center sm:items-start text-center sm:text-left space-y-1.5">
                      <div className="w-9 h-9 rounded-full border border-[#153D32]/25 bg-white/70 backdrop-blur-xs flex items-center justify-center shadow-2xs">
                        <Leaf className="w-4 h-4 text-[#153D32]" />
                      </div>
                      <span className="text-[11px] sm:text-xs font-medium text-[#172723]/90 leading-tight">
                        Natural Ingredients
                      </span>
                    </div>

                    <div className="flex flex-col items-center sm:items-start text-center sm:text-left space-y-1.5">
                      <div className="w-9 h-9 rounded-full border border-[#153D32]/25 bg-white/70 backdrop-blur-xs flex items-center justify-center shadow-2xs">
                        <FlaskConical className="w-4 h-4 text-[#153D32]" />
                      </div>
                      <span className="text-[11px] sm:text-xs font-medium text-[#172723]/90 leading-tight">
                        Dermatologically Tested
                      </span>
                    </div>

                    <div className="flex flex-col items-center sm:items-start text-center sm:text-left space-y-1.5">
                      <div className="w-9 h-9 rounded-full border border-[#153D32]/25 bg-white/70 backdrop-blur-xs flex items-center justify-center shadow-2xs">
                        <Heart className="w-4 h-4 text-[#153D32]" />
                      </div>
                      <span className="text-[11px] sm:text-xs font-medium text-[#172723]/90 leading-tight">
                        Suitable For All Skin Types
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Circular Left / Right Floating Navigation Arrows */}
        {totalSlides > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous Slide"
              className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-white/90 hover:bg-white text-[#153D32] shadow-md flex items-center justify-center transition-all hover:scale-105 active:scale-95"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <button
              type="button"
              onClick={handleNext}
              aria-label="Next Slide"
              className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-white/90 hover:bg-white text-[#153D32] shadow-md flex items-center justify-center transition-all hover:scale-105 active:scale-95"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </>
        )}

        {/* Bottom Pagination Indicators - Hidden on mobile view */}
        {totalSlides > 1 && (
          <div className="hidden sm:flex absolute bottom-2.5 sm:bottom-5 left-1/2 -translate-x-1/2 z-20 items-center gap-1.5 sm:gap-2.5">
            {activeSlides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`h-1.5 sm:h-2.5 rounded-full transition-all duration-300 ${
                  idx === currentIndex
                    ? "w-5 sm:w-8 bg-[#153D32]"
                    : "w-1.5 sm:w-2.5 bg-[#153D32]/35 hover:bg-[#153D32]/60"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Mobile Benefit Indicators Strip (Below the landscape hero on phones) */}
      <div className="sm:hidden grid grid-cols-3 gap-2 px-4 py-3 bg-[#FFFCF8] border-b border-stone-200/50">
        <div className="flex flex-col items-center text-center space-y-1">
          <div className="w-7 h-7 rounded-full bg-[#153D32]/10 flex items-center justify-center">
            <Leaf className="w-3.5 h-3.5 text-[#153D32]" />
          </div>
          <span className="text-[10px] font-medium text-[#172723] leading-tight">
            Natural Ingredients
          </span>
        </div>

        <div className="flex flex-col items-center text-center space-y-1">
          <div className="w-7 h-7 rounded-full bg-[#153D32]/10 flex items-center justify-center">
            <FlaskConical className="w-3.5 h-3.5 text-[#153D32]" />
          </div>
          <span className="text-[10px] font-medium text-[#172723] leading-tight">
            Dermatologically Tested
          </span>
        </div>

        <div className="flex flex-col items-center text-center space-y-1">
          <div className="w-7 h-7 rounded-full bg-[#153D32]/10 flex items-center justify-center">
            <Heart className="w-3.5 h-3.5 text-[#153D32]" />
          </div>
          <span className="text-[10px] font-medium text-[#172723] leading-tight">
            All Skin Types
          </span>
        </div>
      </div>
    </>
  );
}
