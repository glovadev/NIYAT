"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Sparkles, ShieldCheck, Heart, Truck, CheckCircle2 } from "lucide-react";

export function Footer() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setStatus("success");
        setMessage(json.data.message || "Thank you for subscribing to NIYAT.");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(json.error?.message || "Failed to subscribe. Please try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  };

  return (
    <footer className="bg-gradient-to-b from-[#061B14] via-[#04110C] to-[#020705] text-white border-t border-[#D4AF37]/40">
      {/* Value Pillars Banner */}
      <div className="border-b border-[#D4AF37]/20 py-8 px-4 sm:px-6 lg:px-8 bg-black/30">
        <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-6 text-center sm:text-left">
          <div className="flex items-center space-x-3.5 justify-center sm:justify-start">
            <div className="w-10 h-10 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] flex-shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-semibold tracking-wider text-[#FCF6BA] uppercase">24K Gold & Saffron</h4>
              <p className="text-[11px] text-white/70">Potent active radiance</p>
            </div>
          </div>

          <div className="flex items-center space-x-3.5 justify-center sm:justify-start">
            <div className="w-10 h-10 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] flex-shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-semibold tracking-wider text-[#FCF6BA] uppercase">White-Glove Courier</h4>
              <p className="text-[11px] text-white/70">Complimentary on orders above ₹999</p>
            </div>
          </div>

          <div className="flex items-center space-x-3.5 justify-center sm:justify-start">
            <div className="w-10 h-10 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] flex-shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-semibold tracking-wider text-[#FCF6BA] uppercase">GCC Certified</h4>
              <p className="text-[11px] text-white/70">Authentic Dubai Apothecary</p>
            </div>
          </div>

          <div className="flex items-center space-x-3.5 justify-center sm:justify-start">
            <div className="w-10 h-10 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] flex-shrink-0">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-semibold tracking-wider text-[#FCF6BA] uppercase">Halal & Pure</h4>
              <p className="text-[11px] text-white/70">Cruelty-free & dermatologist tested</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links & Newsletter */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <div className="relative w-10 h-10 shrink-0">
                <Image
                  src="/logo.svg"
                  alt="NIYAT"
                  width={40}
                  height={40}
                  className="w-full h-full object-contain brightness-125 group-hover:scale-105 transition-transform"
                />
              </div>
              <div>
                <span className="font-serif text-3xl tracking-[0.25em] font-bold text-white block leading-none">
                  NIYAT
                </span>
                <span className="block text-[10px] tracking-[0.35em] uppercase text-[#D4AF37] font-sans font-semibold mt-1">
                  DUBAI • PARIS • MUMBAI
                </span>
              </div>
            </Link>
            
            {/* Arabic Royal Calligraphy & Motto */}
            <div className="pt-1 space-y-1">
              <p className="text-base sm:text-lg text-[#FCF6BA] font-serif tracking-normal leading-relaxed" dir="rtl" lang="ar">
                « نِيَّة » — سرّ الإشراقة الملكية والجمال الخالد
              </p>
              <p className="text-[10px] tracking-[0.25em] text-[#D4AF37] uppercase font-semibold">
                ✧ Pure Intention • Royal Dubai Radiance ✧
              </p>
            </div>

            <p className="text-xs sm:text-sm text-stone-300 max-w-sm leading-relaxed">
              NIYAT crafts royal apothecary skincare combining rare 24K nano-gold, Kashmiri saffron,
              and clinical bio-actives to unveil timeless skin luminosity.
            </p>
            <div className="text-[11px] text-[#FCF6BA]/80 space-y-1">
              <p>👑 VIP Concierge: <span className="text-[#D4AF37] font-medium">concierge@niyat.com</span></p>
              <p>📍 Dubai Flagship: Alserkal Avenue, Dubai, UAE</p>
            </div>
          </div>

          {/* Catalog Links */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase tracking-[0.2em] text-[#D4AF37] font-bold">
              The Royal Collection
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-stone-300">
              <li>
                <Link href="/shop" className="hover:text-[#FCF6BA] transition-colors">
                  Shop All Formulations
                </Link>
              </li>
              <li>
                <Link href="/categories/face-cream" className="hover:text-[#FCF6BA] transition-colors">
                  Whitening & Saffron Creams
                </Link>
              </li>
              <li>
                <Link href="/categories/facial-serum" className="hover:text-[#FCF6BA] transition-colors">
                  24K Radiance Serums
                </Link>
              </li>
              <li>
                <Link href="/categories/facial-cleanser" className="hover:text-[#FCF6BA] transition-colors">
                  Purifying Face Wash
                </Link>
              </li>
              <li>
                <Link href="/categories/sun-protection" className="hover:text-[#FCF6BA] transition-colors">
                  Desert Shield Sun Protection
                </Link>
              </li>
              <li>
                <Link href="/categories/body-care" className="hover:text-[#FCF6BA] transition-colors">
                  Royal Velvet Body Elixirs
                </Link>
              </li>
            </ul>
          </div>

          {/* Assistance & Policies */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase tracking-[0.2em] text-[#D4AF37] font-bold">
              Royal Concierge
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-stone-300">
              <li>
                <Link href="/orders/track" className="hover:text-[#FCF6BA] transition-colors">
                  Track Your Courier
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-[#FCF6BA] transition-colors">
                  The NIYAT Heritage
                </Link>
              </li>
              <li>
                <Link href="/distributor/login" className="hover:text-[#FCF6BA] text-[#D4AF37] font-medium transition-colors">
                  Wholesale & Distributor Portal
                </Link>
              </li>
              <li>
                <Link href="/shipping-policy" className="hover:text-[#FCF6BA] transition-colors">
                  Shipping Policy
                </Link>
              </li>
              <li>
                <Link href="/refund-policy" className="hover:text-[#FCF6BA] transition-colors">
                  White-Glove Guarantee
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-[#FCF6BA] transition-colors">
                  Terms of Privilege
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter Box */}
          <div className="space-y-4">
            <h4 className="text-xs uppercase tracking-[0.2em] text-[#D4AF37] font-bold">
              The Royal Circle
            </h4>
            <p className="text-xs text-stone-300 leading-relaxed">
              Join the private circle to receive seasonal formulation reserves, Dubai apothecary rituals, and exclusive patron rewards.
            </p>
            <form onSubmit={handleSubscribe} className="space-y-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your VIP email"
                required
                className="w-full px-4 py-2.5 rounded-full bg-white/10 border border-[#D4AF37]/30 text-white placeholder-white/40 text-xs focus:outline-none focus:border-[#D4AF37]"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full py-2.5 rounded-full bg-gradient-to-r from-[#D4AF37] via-[#F4E8C1] to-[#AA771C] text-[#0A261D] text-xs font-bold uppercase tracking-wider hover:opacity-95 shadow-[0_4px_16px_rgba(212,175,55,0.3)] transition-all"
              >
                {status === "loading" ? "Entering The Circle..." : "Enter The Circle"}
              </button>
            </form>
            {status === "success" && (
              <p className="text-xs text-[#FCF6BA] flex items-center gap-1 mt-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#D4AF37]" /> {message}
              </p>
            )}
            {status === "error" && (
              <p className="text-xs text-red-300 mt-1">{message}</p>
            )}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-14 pt-8 border-t border-[#D4AF37]/20 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-400">
          <p>© {new Date().getFullYear()} NIYAT Skincare • Dubai • Paris • Mumbai. All rights reserved.</p>
          <div className="mt-4 sm:mt-0 flex items-center space-x-6">
            <Link href="/distributor/login" className="text-[#D4AF37] hover:text-white transition-colors font-semibold flex items-center gap-1">
              <span>Distributor Portal</span>
            </Link>
            <Link href="/privacy" className="hover:text-[#FCF6BA] transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-[#FCF6BA] transition-colors">
              Terms
            </Link>
            <Link href="/orders/track" className="hover:text-[#FCF6BA] transition-colors">
              Tracking
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
