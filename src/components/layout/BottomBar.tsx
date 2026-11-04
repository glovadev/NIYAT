"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { AuthModal } from "@/components/auth/AuthModal";
import {
  Home,
  LayoutGrid,
  Package,
  User,
} from "lucide-react";

export function BottomBar() {
  const pathname = usePathname();
  const { user, profile } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const isHomeActive = pathname === "/";
  const isShopActive = pathname.startsWith("/shop") || pathname.startsWith("/categories") || pathname.startsWith("/products");
  const isOrdersActive = pathname.startsWith("/orders") || pathname.startsWith("/account/orders");
  const isAccountActive = pathname.startsWith("/account") && !isOrdersActive;

  const handleAccountClick = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      setIsAuthModalOpen(true);
    }
  };

  return (
    <>
      <nav
        aria-label="Mobile Bottom Navigation"
        className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FFFEFC]/95 backdrop-blur-md border-t border-[#D4AF37]/35 shadow-[0_-4px_20px_rgba(10,38,29,0.08)] px-2 py-1.5"
      >
        <div className="grid grid-cols-4 items-center justify-around h-13">
          
          {/* 1. HOME */}
          <Link
            href="/"
            className={`flex flex-col items-center justify-center py-1 transition-colors ${
              isHomeActive
                ? "text-[#B38728] font-bold"
                : "text-[#0A261D]/70 hover:text-[#B38728]"
            }`}
          >
            <div className="relative">
              <Home className={`w-5 h-5 ${isHomeActive ? "stroke-[2.25] text-[#D4AF37]" : "stroke-[1.75]"}`} />
              {isHomeActive && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#D4AF37] shadow-[0_0_8px_rgba(212,175,55,0.9)]" />
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Home</span>
          </Link>

          {/* 2. SHOP */}
          <Link
            href="/shop"
            className={`flex flex-col items-center justify-center py-1 transition-colors ${
              isShopActive
                ? "text-[#B38728] font-bold"
                : "text-[#0A261D]/70 hover:text-[#B38728]"
            }`}
          >
            <div className="relative">
              <LayoutGrid className={`w-5 h-5 ${isShopActive ? "stroke-[2.25] text-[#D4AF37]" : "stroke-[1.75]"}`} />
              {isShopActive && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#D4AF37] shadow-[0_0_8px_rgba(212,175,55,0.9)]" />
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Collection</span>
          </Link>

          {/* 3. ORDER */}
          <Link
            href="/orders/track"
            className={`flex flex-col items-center justify-center py-1 transition-colors ${
              isOrdersActive
                ? "text-[#B38728] font-bold"
                : "text-[#0A261D]/70 hover:text-[#B38728]"
            }`}
          >
            <div className="relative">
              <Package className={`w-5 h-5 ${isOrdersActive ? "stroke-[2.25] text-[#D4AF37]" : "stroke-[1.75]"}`} />
              {isOrdersActive && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#D4AF37] shadow-[0_0_8px_rgba(212,175,55,0.9)]" />
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Courier</span>
          </Link>

          {/* 4. ACCOUNT (Brought from navbar) */}
          {user ? (
            <Link
              href="/account"
              className={`flex flex-col items-center justify-center py-1 transition-colors ${
                isAccountActive
                  ? "text-[#B38728] font-bold"
                  : "text-[#0A261D]/70 hover:text-[#B38728]"
              }`}
            >
              <div className="relative">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#0A261D] to-[#153D32] border border-[#D4AF37]/50 text-[#FCF6BA] flex items-center justify-center text-[10px] font-bold uppercase shadow-2xs">
                  {(profile?.name || user.displayName || user.email || "C")[0].toUpperCase()}
                </div>
                {isAccountActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#D4AF37] shadow-[0_0_8px_rgba(212,175,55,0.9)]" />
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">Account</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleAccountClick}
              className={`flex flex-col items-center justify-center py-1 transition-colors ${
                isAccountActive
                  ? "text-[#B38728] font-bold"
                  : "text-[#0A261D]/70 hover:text-[#B38728]"
              }`}
              aria-label="Account Login or Registration"
            >
              <div className="relative">
                <User className={`w-5 h-5 ${isAccountActive ? "stroke-[2.25] text-[#D4AF37]" : "stroke-[1.75]"}`} />
                {isAccountActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#D4AF37] shadow-[0_0_8px_rgba(212,175,55,0.9)]" />
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">Account</span>
            </button>
          )}

        </div>
      </nav>

      {/* Auth Modal for Guests */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </>
  );
}
