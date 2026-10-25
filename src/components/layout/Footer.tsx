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
    <footer className="bg-niyat-emerald text-white border-t border-niyat-emerald-light">
      {/* Value Pillars Banner */}
      <div className="border-b border-white/10 py-10 px-4 sm:px-6 lg:px-8 bg-black/10">
        <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-6 text-center sm:text-left">
          <div className="flex items-center space-x-3.5 justify-center sm:justify-start">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-niyat-gold flex-shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold tracking-wide">Pure Formulations</h4>
              <p className="text-xs text-white/60">Botanical & clinical efficacy</p>
            </div>
          </div>

          <div className="flex items-center space-x-3.5 justify-center sm:justify-start">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-niyat-gold flex-shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold tracking-wide">Complimentary Shipping</h4>
              <p className="text-xs text-white/60">On all orders above ₹999</p>
            </div>
          </div>

          <div className="flex items-center space-x-3.5 justify-center sm:justify-start">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-niyat-gold flex-shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold tracking-wide">100% Authentic</h4>
              <p className="text-xs text-white/60">Direct from NIYAT Labs</p>
            </div>
          </div>

          <div className="flex items-center space-x-3.5 justify-center sm:justify-start">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-niyat-gold flex-shrink-0">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold tracking-wide">Cash on Delivery</h4>
              <p className="text-xs text-white/60">Available across select PINs</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links & Newsletter */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
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
                  className="w-full h-full object-contain brightness-110 group-hover:scale-105 transition-transform"
                />
              </div>
              <div>
                <span className="font-serif text-3xl tracking-[0.2em] font-bold text-white block leading-none">
                  NIYAT
                </span>
                <span className="block text-[10px] tracking-[0.3em] uppercase text-niyat-gold font-sans font-medium mt-1">
                  Luxury Skincare
                </span>
              </div>
            </Link>
            <p className="text-sm text-white/70 max-w-sm leading-relaxed">
              NIYAT crafts premium, dermatologist-approved skincare formulations combining clinical
              potency and luxurious nourishment to unveil your skin&apos;s natural luminosity.
            </p>
            <p className="text-xs text-white/50">
              Customer Support: care@niyat.in | +91 98765 43210
            </p>
          </div>

          {/* Catalog Links */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase tracking-widest text-niyat-gold font-semibold">
              Collection
            </h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li>
                <Link href="/shop" className="hover:text-white transition-colors">
                  Shop All Products
                </Link>
              </li>
              <li>
                <Link href="/categories/face-cream" className="hover:text-white transition-colors">
                  Whitening & Face Creams
                </Link>
              </li>
              <li>
                <Link href="/categories/facial-serum" className="hover:text-white transition-colors">
                  Radiance Serums
                </Link>
              </li>
              <li>
                <Link href="/categories/facial-cleanser" className="hover:text-white transition-colors">
                  Purifying Face Wash
                </Link>
              </li>
              <li>
                <Link href="/categories/sun-protection" className="hover:text-white transition-colors">
                  Daily Sunscreen
                </Link>
              </li>
              <li>
                <Link href="/categories/body-care" className="hover:text-white transition-colors">
                  Body Care
                </Link>
              </li>
            </ul>
          </div>

          {/* Assistance & Policies */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase tracking-widest text-niyat-gold font-semibold">
              Assistance
            </h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li>
                <Link href="/orders/track" className="hover:text-white transition-colors">
                  Track Your Order
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  Our Philosophy
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/shipping-policy" className="hover:text-white transition-colors">
                  Shipping Policy
                </Link>
              </li>
              <li>
                <Link href="/refund-policy" className="hover:text-white transition-colors">
                  Return & Refund Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter Box */}
          <div className="space-y-4">
            <h4 className="text-xs uppercase tracking-widest text-niyat-gold font-semibold">
              The NIYAT Circle
            </h4>
            <p className="text-xs text-white/70 leading-relaxed">
              Subscribe to receive exclusive ritual guides, first access to new launches, and curated
              skincare privileges.
            </p>
            <form onSubmit={handleSubscribe} className="space-y-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                required
                className="w-full px-4 py-2.5 rounded-full bg-white/10 border border-white/20 text-white placeholder-white/40 text-xs focus:outline-none focus:border-niyat-gold"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full py-2.5 rounded-full bg-gold-gradient text-niyat-emerald-dark text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity"
              >
                {status === "loading" ? "Subscribing..." : "Join The Circle"}
              </button>
            </form>
            {status === "success" && (
              <p className="text-xs text-niyat-gold flex items-center gap-1 mt-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {message}
              </p>
            )}
            {status === "error" && (
              <p className="text-xs text-red-300 mt-1">{message}</p>
            )}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-white/50">
          <p>© {new Date().getFullYear()} NIYAT Skincare Private Limited. All rights reserved.</p>
          <div className="mt-4 sm:mt-0 flex space-x-6">
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms
            </Link>
            <Link href="/orders/track" className="hover:text-white transition-colors">
              Tracking
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
