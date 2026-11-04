"use client";

import React, { useState } from "react";
import { Sparkles, Crown, Truck, ShieldCheck, Tag, X } from "lucide-react";

export function AnnouncementBar() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="bg-gradient-to-r from-[#061510] via-[#0B251D] to-[#061510] text-[#F4E8C1] text-[11px] sm:text-xs py-2 px-4 relative z-40 border-b border-[#D4AF37]/30 font-medium shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between sm:justify-center gap-4 sm:gap-8 text-center pr-6 overflow-x-auto no-scrollbar">
        {/* Item 1: Dubai Formulation Heritage */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Crown className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span className="tracking-wide">
            <strong className="text-white font-semibold">DUBAI LUXURY FORMULATION</strong> • Pure Royal Saffron & Rose
          </span>
        </div>

        {/* Divider star */}
        <span className="hidden md:inline-block text-[#D4AF37]/60">✧</span>

        {/* Item 2: Free Shipping */}
        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
          <Truck className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span>Complimentary White-Glove Shipping Above ₹499</span>
        </div>

        {/* Divider star */}
        <span className="hidden md:inline-block text-[#D4AF37]/60">✧</span>

        {/* Item 3: Coupon Code */}
        <div className="flex items-center gap-1.5 shrink-0 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span>
            Royal Privilege: 10% Off First Order with code{" "}
            <span className="inline-block bg-gradient-to-r from-[#D4AF37] to-[#B38728] text-slate-950 font-bold px-2 py-0.5 rounded text-[10px] tracking-wider ml-1 shadow-xs">
              NIYAT10
            </span>
          </span>
        </div>
      </div>

      <button
        onClick={() => setIsVisible(false)}
        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 text-[#F4E8C1]/60 hover:text-white p-1 transition-colors"
        aria-label="Dismiss announcement"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
