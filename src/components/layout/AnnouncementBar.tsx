"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, X } from "lucide-react";

interface AnnouncementBarProps {
  text?: string;
  link?: string;
  badge?: string;
  enabled?: boolean;
}

export function AnnouncementBar({
  text = "Complimentary courier dispatch on orders above ₹999 | Discover Pure UAE Radiance",
  link = "/notices",
  badge,
  enabled = true,
}: AnnouncementBarProps) {
  const [dismissed, setDismissed] = useState(false);

  if (!enabled || dismissed || !text?.trim()) {
    return null;
  }

  const cleanText = text.replace(/\s+/g, " ");

  return (
    <aside
      aria-label="Announcement Bar"
      className="relative z-50 w-full bg-gradient-to-r from-[#061B14] via-[#0A261D] to-[#061B14] border-b border-[#D4AF37]/30 text-white text-[11px] sm:text-xs py-1.5 px-3 sm:px-4 overflow-hidden select-none"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Left Pinned Badge */}
        {badge && (
          <div className="shrink-0 flex items-center gap-1.5 z-10">
            <span className="hidden sm:flex items-center justify-center w-4 h-4 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 shrink-0">
              <Sparkles className="w-2.5 h-2.5 text-[#D4AF37]" />
            </span>
            <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase bg-[#D4AF37]/25 text-[#FCF6BA] border border-[#D4AF37]/40 whitespace-nowrap">
              {badge}
            </span>
          </div>
        )}

        {/* Center Continuous Moving Line (Guaranteed Strictly 1 Line) */}
        <div className="relative flex-1 overflow-hidden min-w-0">
          <div className="absolute left-0 inset-y-0 w-6 bg-gradient-to-r from-[#061B14] to-transparent pointer-events-none z-10" />
          <div className="absolute right-0 inset-y-0 w-6 bg-gradient-to-l from-[#061B14] to-transparent pointer-events-none z-10" />

          <div className="animate-marquee hover:[animation-play-state:paused] active:[animation-play-state:paused] flex items-center whitespace-nowrap py-0.5">
            {/* Set 1 */}
            <div className="flex items-center shrink-0 gap-6 pr-6">
              <span className="text-[#FCF6BA] font-medium tracking-wide">
                {cleanText}
              </span>
              <span className="text-[#D4AF37]/40 text-xs">✧</span>
            </div>

            {/* Set 2 (Duplicate for continuous loop) */}
            <div className="flex items-center shrink-0 gap-6 pr-6" aria-hidden="true">
              <span className="text-[#FCF6BA] font-medium tracking-wide">
                {cleanText}
              </span>
              <span className="text-[#D4AF37]/40 text-xs">✧</span>
            </div>

            {/* Set 3 (Buffer) */}
            <div className="hidden md:flex items-center shrink-0 gap-6 pr-6" aria-hidden="true">
              <span className="text-[#FCF6BA] font-medium tracking-wide">
                {cleanText}
              </span>
              <span className="text-[#D4AF37]/40 text-xs">✧</span>
            </div>
          </div>
        </div>

        {/* Right Pinned Details & Dismiss Button */}
        <div className="shrink-0 flex items-center gap-2.5 z-10">
          <Link
            href={link || "/notices"}
            className="inline-flex items-center gap-1 font-semibold text-white hover:text-[#D4AF37] underline decoration-[#D4AF37]/50 underline-offset-2 text-[11px] transition-colors whitespace-nowrap"
          >
            <span>Details</span>
            <ArrowRight className="w-3 h-3" />
          </Link>

          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss announcement"
            className="p-1 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
