"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useCart } from "@/lib/cart/cart-context";
import { useWishlist } from "@/lib/wishlist/wishlist-context";
import { useAuth } from "@/lib/auth/auth-context";
import { AuthModal } from "@/components/auth/AuthModal";
import {
  ShoppingBag,
  User,
  Search,
  Heart,
  Menu,
  X,
  ChevronRight,
  PackageCheck,
} from "lucide-react";

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { totalCount, setIsCartOpen } = useCart();
  const { wishlistCount } = useWishlist();
  const { user, profile } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const isHomeActive = pathname === "/";
  const isShopActive = pathname.startsWith("/shop") || pathname.startsWith("/categories");
  const isOrderActive = pathname.startsWith("/orders") || pathname.startsWith("/account/orders");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/shop?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Shop All", href: "/shop" },
    { label: "Face Wash", href: "/categories/facial-cleanser" },
    { label: "Moisturizers", href: "/categories/face-cream" },
    { label: "Serums", href: "/categories/facial-serum" },
    { label: "Sunscreen", href: "/categories/sun-protection" },
    { label: "Body Care", href: "/categories/body-care" },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-[#FFFCF8]/95 backdrop-blur-md border-b border-[#EAE5DC] transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 gap-3 sm:gap-6">
            {/* Left: Brand Logo */}
            <div className="flex items-center gap-3 shrink-0">
              <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group select-none">
                <div className="relative w-8 h-8 sm:w-10 sm:h-10 shrink-0">
                  <Image
                    src="/logo.svg"
                    alt="NIYAT"
                    width={40}
                    height={40}
                    className="w-full h-full object-contain transition-transform group-hover:scale-105"
                    priority
                  />
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-serif text-2xl sm:text-3xl tracking-[0.18em] font-bold text-[#153D32] leading-none group-hover:text-[#1E5748] transition-colors">
                    NIYAT
                  </span>
                  <span className="text-[8px] sm:text-[9px] tracking-[0.32em] uppercase text-[#172723]/70 font-sans font-semibold mt-1">
                    Skincare with Purpose
                  </span>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation Links: Home, Shop, Order */}
            <nav className="hidden lg:flex items-center gap-7 shrink-0">
              <Link
                href="/"
                className={`text-sm font-medium transition-colors tracking-wide py-1 ${
                  isHomeActive
                    ? "text-[#153D32] font-semibold border-b-2 border-[#153D32]"
                    : "text-[#172723]/80 hover:text-[#153D32]"
                }`}
              >
                Home
              </Link>
              <Link
                href="/shop"
                className={`text-sm font-medium transition-colors tracking-wide py-1 ${
                  isShopActive
                    ? "text-[#153D32] font-semibold border-b-2 border-[#153D32]"
                    : "text-[#172723]/80 hover:text-[#153D32]"
                }`}
              >
                Shop
              </Link>
              <Link
                href="/orders/track"
                className={`text-sm font-medium transition-colors tracking-wide py-1 ${
                  isOrderActive
                    ? "text-[#153D32] font-semibold border-b-2 border-[#153D32]"
                    : "text-[#172723]/80 hover:text-[#153D32]"
                }`}
              >
                Order
              </Link>
            </nav>

            {/* Center: Search Bar */}
            <div className="flex-1 max-w-xl mx-2 sm:mx-6">
              <form onSubmit={handleSearchSubmit} className="relative w-full">
                <Search className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#172723]/40" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products"
                  className="w-full pl-9 sm:pl-11 pr-3 sm:pr-4 py-2 sm:py-2.5 bg-[#F5EFE8]/70 hover:bg-[#F5EFE8] focus:bg-white border border-[#E8E2D8] focus:border-[#153D32] rounded-xl text-xs sm:text-sm text-[#172723] placeholder-[#172723]/50 focus:outline-none transition-all shadow-inner/10"
                />
              </form>
            </div>

            {/* Right: Account, Wishlist, Cart with Labels */}
            <div className="flex items-center space-x-3 sm:space-x-6 text-[#172723]">
              {/* Account Button - Hidden on mobile, brought to BottomBar */}
              {user ? (
                <Link
                  href="/account"
                  className="hidden sm:flex flex-col items-center gap-0.5 text-[#172723] hover:text-[#153D32] transition-colors py-1 group"
                  title="My Account"
                >
                  <div className="w-6 h-6 rounded-full bg-[#153D32] text-white flex items-center justify-center text-[11px] font-bold uppercase shadow-sm">
                    {(profile?.name || user.displayName || user.email || "C")[0].toUpperCase()}
                  </div>
                  <span className="text-[11px] font-medium hidden sm:inline-block text-[#172723]/80 group-hover:text-[#153D32]">
                    Account
                  </span>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="hidden sm:flex flex-col items-center gap-0.5 text-[#172723] hover:text-[#153D32] transition-colors py-1 group"
                  aria-label="Sign In or Register"
                >
                  <User className="w-5 h-5 text-[#172723]/80 group-hover:text-[#153D32] transition-colors" />
                  <span className="text-[11px] font-medium hidden sm:inline-block text-[#172723]/80 group-hover:text-[#153D32]">
                    Account
                  </span>
                </button>
              )}

              {/* Wishlist Button with Live Count Badge */}
              <Link
                href="/account/wishlist"
                className="flex flex-col items-center gap-0.5 text-[#172723] hover:text-[#153D32] transition-colors py-1 relative group"
                title="Saved Wishlist"
                aria-label={`Wishlist with ${wishlistCount} items`}
              >
                <div className="relative">
                  <Heart className="w-5 h-5 text-[#172723]/80 group-hover:text-[#153D32] transition-colors" />
                  {wishlistCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-[#E0534C] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm animate-scaleIn">
                      {wishlistCount}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-medium hidden sm:inline-block text-[#172723]/80 group-hover:text-[#153D32]">
                  Wishlist
                </span>
              </Link>

              {/* Cart Button with Live Count Badge */}
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="flex flex-col items-center gap-0.5 text-[#172723] hover:text-[#153D32] transition-colors py-1 relative group"
                aria-label="Open Shopping Cart"
              >
                <div className="relative">
                  <ShoppingBag className="w-5 h-5 text-[#172723]/80 group-hover:text-[#153D32] transition-colors" />
                  {totalCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-[#E0534C] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm animate-scaleIn">
                      {totalCount}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-medium hidden sm:inline-block text-[#172723]/80 group-hover:text-[#153D32]">
                  Cart
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 w-4/5 max-w-sm bg-[#FFFCF8] shadow-2xl p-6 flex flex-col justify-between overflow-y-auto">
              <div>
                <div className="flex items-center justify-between pb-6 border-b border-[#EAE5DC]">
                  <div className="flex items-center gap-2.5">
                    <div className="relative w-8 h-8 shrink-0">
                      <Image
                        src="/logo.svg"
                        alt="NIYAT"
                        width={32}
                        height={32}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div>
                      <span className="font-serif text-2xl font-bold text-[#153D32] tracking-widest block leading-none">
                        NIYAT
                      </span>
                      <span className="text-[9px] uppercase tracking-widest text-[#172723]/60 mt-1 block">
                        Skincare with Purpose
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 text-[#172723] hover:text-[#153D32]"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="py-6 space-y-4">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center justify-between text-sm uppercase tracking-wider font-medium text-[#172723] hover:text-[#153D32] py-2 border-b border-[#EAE5DC]/60"
                    >
                      <span>{link.label}</span>
                      <ChevronRight className="w-4 h-4 text-stone-400" />
                    </Link>
                  ))}

                  <Link
                    href="/orders/track"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-between text-sm uppercase tracking-wider font-medium text-[#172723] hover:text-[#153D32] py-2 border-b border-[#EAE5DC]/60"
                  >
                    <span>Track Order</span>
                    <PackageCheck className="w-4 h-4 text-stone-400" />
                  </Link>

                  <Link
                    href="/account/wishlist"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-between text-sm uppercase tracking-wider font-medium text-[#172723] hover:text-[#153D32] py-2 border-b border-[#EAE5DC]/60"
                  >
                    <span>My Wishlist</span>
                    <div className="flex items-center gap-2">
                      {wishlistCount > 0 && (
                        <span className="bg-[#E0534C] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                          {wishlistCount}
                        </span>
                      )}
                      <Heart className="w-4 h-4 text-stone-400" />
                    </div>
                  </Link>
                </div>
              </div>

              <div className="pt-6 border-t border-[#EAE5DC] text-xs text-[#172723]/70">
                <p className="font-semibold text-[#153D32] mb-1">Customer Care</p>
                <p>Mon - Sat: 9:00 AM - 7:00 PM</p>
                <p className="mt-1">care@niyat.in | +91 98765 43210</p>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Auth Modal Integration */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </>
  );
}
