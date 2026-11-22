"use client";

import React from "react";
import Link from "next/link";
import {
  Sparkles,
  Bell,
  AlertCircle,
  Truck,
  Gift,
  Info,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

export interface NoticeData {
  id?: string;
  title: string;
  message: string;
  badge?: string;
  linkUrl?: string;
  linkText?: string;
  theme?: "EMERALD" | "GOLD" | "DARK" | "AMBER";
  icon?: "SPARKLES" | "BELL" | "ALERT" | "TRUCK" | "GIFT" | "INFO";
  isActive?: boolean;
  updatedAt?: string | Date;
}

interface NoticeSectionProps {
  notice: NoticeData | null;
}

const ICONS = {
  SPARKLES: Sparkles,
  BELL: Bell,
  ALERT: AlertCircle,
  TRUCK: Truck,
  GIFT: Gift,
  INFO: Info,
};

export function NoticeSection({ notice }: NoticeSectionProps) {
  // If notice is not provided or disabled, do not render anything
  if (!notice || notice.isActive === false) {
    return null;
  }

  // Ensure title or message is present
  if (!notice.title?.trim() && !notice.message?.trim()) {
    return null;
  }

  const theme = notice.theme || "EMERALD";
  const iconKey = notice.icon || "SPARKLES";
  const Icon = ICONS[iconKey] || Sparkles;

  // Theme styling definitions
  const themeStyles = {
    EMERALD: {
      wrapper:
        "bg-gradient-to-r from-[#061B14] via-[#0A261D] to-[#04120D] text-white border-[#D4AF37]/40 shadow-[0_4px_20px_rgba(10,38,29,0.18)]",
      badge:
        "bg-[#D4AF37]/20 text-[#FCF6BA] border-[#D4AF37]/50 font-bold",
      iconBox:
        "bg-[#D4AF37]/25 border-[#D4AF37]/50 text-[#FCF6BA]",
      titleText: "text-[#FCF6BA]",
      messageText: "text-white/85",
      button:
        "bg-gradient-to-r from-[#D4AF37] via-[#E5C158] to-[#AA7C11] text-[#0A261D] hover:brightness-110",
      flair: "text-[#D4AF37]/50",
      fadeLeft: "from-[#061B14] to-transparent",
      fadeRight: "from-[#04120D] to-transparent",
    },
    GOLD: {
      wrapper:
        "bg-gradient-to-r from-[#FAF0D7] via-[#FFF9ED] to-[#F5E6C4] text-[#0A261D] border-[#D4AF37]/70 shadow-[0_4px_20px_rgba(212,175,55,0.15)]",
      badge:
        "bg-[#0A261D]/15 text-[#0A261D] border-[#0A261D]/30 font-bold",
      iconBox:
        "bg-[#D4AF37]/35 border-[#D4AF37]/70 text-[#0A261D]",
      titleText: "text-[#0A261D]",
      messageText: "text-stone-700",
      button:
        "bg-[#0A261D] text-[#FCF6BA] hover:bg-[#153D32]",
      flair: "text-[#B38728]/60",
      fadeLeft: "from-[#FAF0D7] to-transparent",
      fadeRight: "from-[#F5E6C4] to-transparent",
    },
    DARK: {
      wrapper:
        "bg-gradient-to-r from-[#0B0F19] via-[#111827] to-[#070A10] text-white border-slate-700/80 shadow-[0_4px_20px_rgba(0,0,0,0.35)]",
      badge:
        "bg-slate-800 text-amber-300 border-amber-400/40 font-bold",
      iconBox:
        "bg-amber-400/20 border-amber-400/40 text-amber-300",
      titleText: "text-amber-300",
      messageText: "text-slate-300",
      button:
        "bg-amber-400 text-slate-950 hover:bg-amber-300",
      flair: "text-amber-400/50",
      fadeLeft: "from-[#0B0F19] to-transparent",
      fadeRight: "from-[#070A10] to-transparent",
    },
    AMBER: {
      wrapper:
        "bg-gradient-to-r from-[#FFFBEB] via-[#FEF3C7] to-[#FDE68A] text-stone-900 border-amber-300/80 shadow-[0_4px_20px_rgba(245,158,11,0.12)]",
      badge:
        "bg-amber-500/25 text-amber-900 border-amber-500/50 font-bold",
      iconBox:
        "bg-amber-500/30 border-amber-500/60 text-amber-900",
      titleText: "text-amber-950 font-bold",
      messageText: "text-stone-800",
      button:
        "bg-amber-900 text-amber-50 hover:bg-amber-950",
      flair: "text-amber-700/50",
      fadeLeft: "from-[#FFFBEB] to-transparent",
      fadeRight: "from-[#FDE68A] to-transparent",
    },
  }[theme];

  const targetLink = notice.id ? `/notices/${notice.id}` : "/notices";

  return (
    <section
      aria-label="Store Notice Ticker"
      className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-3"
    >
      <div
        className={`relative overflow-hidden rounded-full border px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-3 shadow-md transition-all ${themeStyles.wrapper}`}
      >
        {/* 1. Left Pinned Badge & Icon (Fixed, does not scroll) */}
        <div className="flex items-center gap-2 shrink-0 z-10">
          <div
            className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 ${themeStyles.iconBox}`}
          >
            <Icon className="w-3 h-3" />
          </div>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold tracking-wider uppercase border shadow-2xs whitespace-nowrap ${themeStyles.badge}`}
          >
            {notice.badge || "Notice"}
          </span>
        </div>

        {/* 2. Middle Continuous Moving Marquee Line (Strictly One Line) */}
        <div className="relative flex-1 overflow-hidden select-none min-w-0">
          {/* Subtle edge fades for smooth transition */}
          <div
            className={`absolute left-0 inset-y-0 w-6 bg-gradient-to-r ${themeStyles.fadeLeft} pointer-events-none z-10`}
          />
          <div
            className={`absolute right-0 inset-y-0 w-6 bg-gradient-to-l ${themeStyles.fadeRight} pointer-events-none z-10`}
          />

          <div className="animate-marquee hover:[animation-play-state:paused] active:[animation-play-state:paused] flex items-center whitespace-nowrap py-0.5 text-xs sm:text-sm">
            {/* Set 1 */}
            <div className="flex items-center shrink-0 gap-4 pr-6">
              <span className={`font-serif font-bold tracking-wide ${themeStyles.titleText}`}>
                {notice.title}
              </span>
              {notice.message && (
                <span className={`font-light ${themeStyles.messageText}`}>
                  — {notice.message.replace(/\s+/g, " ")}
                </span>
              )}
              <span className={`select-none ${themeStyles.flair}`}>✧</span>
            </div>

            {/* Set 2 (Duplicate for continuous loop) */}
            <div className="flex items-center shrink-0 gap-4 pr-6" aria-hidden="true">
              <span className={`font-serif font-bold tracking-wide ${themeStyles.titleText}`}>
                {notice.title}
              </span>
              {notice.message && (
                <span className={`font-light ${themeStyles.messageText}`}>
                  — {notice.message.replace(/\s+/g, " ")}
                </span>
              )}
              <span className={`select-none ${themeStyles.flair}`}>✧</span>
            </div>

            {/* Set 3 (Buffer for large displays) */}
            <div className="hidden lg:flex items-center shrink-0 gap-4 pr-6" aria-hidden="true">
              <span className={`font-serif font-bold tracking-wide ${themeStyles.titleText}`}>
                {notice.title}
              </span>
              {notice.message && (
                <span className={`font-light ${themeStyles.messageText}`}>
                  — {notice.message.replace(/\s+/g, " ")}
                </span>
              )}
              <span className={`select-none ${themeStyles.flair}`}>✧</span>
            </div>
          </div>
        </div>

        {/* 3. Right Pinned Details Button (Fixed, does not scroll) */}
        <div className="shrink-0 z-10">
          <Link
            href={targetLink}
            className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-bold tracking-wider uppercase transition-all shadow-xs whitespace-nowrap group ${themeStyles.button}`}
          >
            <span>{notice.linkText?.trim() || "Details"}</span>
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
