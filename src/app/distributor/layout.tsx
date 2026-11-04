"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  Package,
  ShoppingBag,
  LogOut,
  Sparkles,
  Boxes,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

interface DistributorProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  companyName: string;
  gstNumber: string;
  role: string;
  status: string;
}

export default function DistributorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [distributor, setDistributor] = useState<DistributorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // If on login page, don't wrap with portal chrome
  const isLoginPage = pathname === "/distributor/login";

  useEffect(() => {
    if (isLoginPage) {
      setLoading(false);
      return;
    }

    // Check cached distributor
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("niyat_distributor");
        if (cached) {
          setDistributor(JSON.parse(cached));
        }
      } catch (_) {}
    }

    // Verify session with server
    fetch("/api/distributor/auth/me")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data?.distributor) {
          setDistributor(json.data.distributor);
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem("niyat_distributor", JSON.stringify(json.data.distributor));
            } catch (_) {}
          }
        } else {
          // Redirect to login if unauthenticated
          router.push("/distributor/login");
        }
      })
      .catch(() => {
        router.push("/distributor/login");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [pathname, isLoginPage, router]);

  const handleLogout = async () => {
    try {
      await fetch("/api/distributor/auth/logout", { method: "POST" });
    } catch (_) {}
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("niyat_distributor");
      } catch (_) {}
    }
    router.push("/distributor/login");
  };

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading && !distributor) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <div className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/20 p-2 flex items-center justify-center text-amber-400 mb-4 animate-pulse">
          <Building2 className="w-6 h-6" />
        </div>
        <div className="text-sm font-medium">Verifying Distributor Session...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-400/20 selection:text-amber-300">
      {/* Top B2B Announcement Strip */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-400/10 to-amber-500/10 border-b border-amber-400/20 px-4 py-2 text-xs text-amber-300 flex items-center justify-between">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium">
              Authorized B2B Portal: All prices reflect your negotiated wholesale tier
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-[11px] text-amber-400/80">
            <span>Free Shipping on all Bulk Shipments</span>
            <span>•</span>
            <span>Net 30 & Bank Transfer Invoicing available</span>
          </div>
        </div>
      </div>

      {/* Main Distributor Header */}
      <header className="bg-slate-900/90 backdrop-blur border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Portal Badge */}
          <div className="flex items-center gap-3">
            <Link href="/distributor" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-slate-950 border border-amber-400/30 p-1.5 flex items-center justify-center shadow-lg shadow-amber-500/10">
                <Image
                  src="/logo.svg"
                  alt="NIYAT"
                  width={28}
                  height={28}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <div className="font-serif font-bold text-base tracking-wider text-white flex items-center gap-1.5">
                  NIYAT
                  <span className="text-[9px] uppercase tracking-wider bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded font-sans font-bold border border-amber-400/30">
                    WHOLESALE
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium truncate max-w-[150px] sm:max-w-xs">
                  {distributor?.companyName || "Distributor Partner"}
                </div>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/distributor"
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold transition ${
                pathname === "/distributor"
                  ? "bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
            >
              <Boxes className="w-4 h-4" />
              <span>Catalog & Order</span>
            </Link>

            <Link
              href="/distributor/orders"
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold transition ${
                pathname === "/distributor/orders"
                  ? "bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>My Orders</span>
            </Link>
          </nav>

          {/* User info & Logout */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-medium text-white">
                {distributor?.name}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {distributor?.gstNumber ? `GST: ${distributor.gstNumber}` : distributor?.email}
              </span>
            </div>

            <button
              onClick={handleLogout}
              title="Sign Out of Distributor Portal"
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700/60 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Portal View */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Distributor Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 NIYAT Organics Pvt. Ltd. All rights reserved. B2B Wholesale Distribution.</p>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Wholesale Support: wholesale@niyat.com</span>
            <span>•</span>
            <Link href="/" target="_blank" className="hover:text-amber-400 transition">
              Live Boutique Store ↗
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

