import React from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { BottomBar } from "@/components/layout/BottomBar";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { CartProvider } from "@/lib/cart/cart-context";
import { WishlistProvider } from "@/lib/wishlist/wishlist-context";
import { AuthProvider } from "@/lib/auth/auth-context";

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <WishlistProvider>
        <CartProvider>
          <div className="min-h-screen flex flex-col bg-niyat-ivory text-niyat-charcoal font-sans antialiased selection:bg-niyat-gold/20 selection:text-niyat-emerald">
            <Navbar />
            <CartDrawer />
            <div className="flex-1 flex flex-col pb-16 sm:pb-0">{children}</div>
            <Footer />
            <BottomBar />
          </div>
        </CartProvider>
      </WishlistProvider>
    </AuthProvider>
  );
}
