"use client";

import React, { useState } from "react";
import { Truck, ShieldCheck, Tag, X } from "lucide-react";

export function AnnouncementBar() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="bg-[#F9D5D2] text-[#172723] text-[11px] sm:text-xs py-2 px-4 relative z-40 border-b border-[#F5C2BE] font-medium">
      <div className="max-w-7xl mx-auto flex items-center justify-between sm:justify-around gap-4 text-center pr-6 overflow-x-auto no-scrollbar">
        {/* Item 1 */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Truck className="w-3.5 h-3.5 text-[#153D32]" />
          <span>Free Shipping on Orders Above ₹499</span>
        </div>

        {/* Divider dot */}
        <span className="hidden md:inline-block text-[#172723]/30">•</span>

        {/* Item 2 */}
        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
          <ShieldCheck className="w-3.5 h-3.5 text-[#153D32]" />
          <span>100% Original Products</span>
        </div>

        {/* Divider dot */}
        <span className="hidden md:inline-block text-[#172723]/30">•</span>

        {/* Item 3 */}
        <div className="flex items-center gap-1.5 shrink-0 font-semibold">
          <Tag className="w-3.5 h-3.5 text-[#153D32]" />
          <span>Extra 10% Off on First Order | Use: <span className="underline decoration-[#153D32] tracking-wider">NIYAT10</span></span>
        </div>
      </div>

      <button
        onClick={() => setIsVisible(false)}
        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 text-[#172723]/60 hover:text-[#172723] p-1 transition-colors"
        aria-label="Dismiss announcement"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
