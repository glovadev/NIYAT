"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Boxes,
  Star,
  TicketPercent,
  ExternalLink,
  LogOut,
  Menu,
  X,
  ShieldAlert,
  Sparkles,
  SlidersHorizontal,
  FolderTree,
  ArrowRight,
  Bell,
  CheckCircle2,
  Lock,
  Building2,
  Truck,
} from "lucide-react";

interface AdminShellProps {
  children: React.ReactNode;
}

const navLinks = [
  { name: "Overview", href: "/admin", icon: LayoutDashboard },
  { name: "Hero Banners", href: "/admin/banners", icon: SlidersHorizontal },
  { name: "Products", href: "/admin/products", icon: Package },
  { name: "Categories", href: "/admin/categories", icon: FolderTree },
  { name: "Distributors", href: "/admin/distributors", icon: Building2 },
  { name: "Orders & Shipments", href: "/admin/orders", icon: ShoppingBag },
  { name: "Inventory Control", href: "/admin/inventory", icon: Boxes },
  { name: "Customer Reviews", href: "/admin/reviews", icon: Star },
  { name: "Promotions & Coupons", href: "/admin/coupons", icon: TicketPercent },
  { name: "Shipping & Delivery", href: "/admin/shipping", icon: Truck },
];

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();
  const { user, profile, loading, loginWithGoogle, loginWithEmail, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [initTimeout, setInitTimeout] = useState(false);
  const [serverAdmin, setServerAdmin] = useState<{
    name: string;
    email: string;
    role: string;
  } | null>(null);

  // Safety timer so loading state never hangs
  useEffect(() => {
    const timer = setTimeout(() => setInitTimeout(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  // Check if session cookie is already active on the server or in client storage
  useEffect(() => {
    try {
      const cachedAdmin = localStorage.getItem("niyat_admin_session");
      if (cachedAdmin) {
        const parsed = JSON.parse(cachedAdmin);
        if (parsed && (parsed.role === "ADMIN" || parsed.role === "STAFF")) {
          setServerAdmin(parsed);
        }
      }
    } catch (_) {}

    if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
      try {
        const cached = localStorage.getItem("niyat_dev_admin");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && (parsed.role === "ADMIN" || parsed.role === "STAFF")) {
            setServerAdmin(parsed);
            document.cookie = "__session=dev-admin-session; path=/; max-age=604800; SameSite=Lax";
          }
        }
      } catch (_) {}
    }

    const checkServerSession = async () => {
      try {
        const { adminRawFetch } = await import("@/lib/api/admin-client");
        const res = await adminRawFetch("/api/me");
        const json = await res.json();
        if (json.success && (json.data?.role === "ADMIN" || json.data?.role === "STAFF")) {
          setServerAdmin(json.data);
          try {
            localStorage.setItem("niyat_admin_session", JSON.stringify(json.data));
          } catch (_) {}
          if (process.env.NODE_ENV === "development") {
            try {
              localStorage.setItem("niyat_dev_admin", JSON.stringify(json.data));
              document.cookie = "__session=dev-admin-session; path=/; max-age=604800; SameSite=Lax";
            } catch (_) {}
          }
        } else {
          // Stale or unauthenticated session: clear from client storage
          try {
            localStorage.removeItem("niyat_admin_session");
            localStorage.removeItem("niyat_admin_token");
          } catch (_) {}
          setServerAdmin(null);
        }
      } catch (_) {}
    };
    checkServerSession();
  }, []);

  // Quick login form states for unauthenticated admins
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSubmitting(true);
    try {
      // 1. Direct server admin login first (instant access with Master password)
      const res = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail.trim(), password: adminPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        try {
          localStorage.setItem("niyat_admin_session", JSON.stringify(data.data.profile));
          if (data.data.token) {
            localStorage.setItem("niyat_admin_token", data.data.token);
          }
        } catch (_) {}
        setServerAdmin(data.data.profile);
        window.location.reload();
        return;
      }

      if (data?.error?.message) {
        throw new Error(data.error.message);
      }

      // 2. Fallback to Firebase client login
      await loginWithEmail(adminEmail.trim(), adminPassword);
      window.location.reload();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      setAuthError(msg);
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError(null);
    setAuthSubmitting(true);
    try {
      await loginWithGoogle();
      window.location.reload();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Google sign in failed";
      setAuthError(msg);
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleDevLogin = async () => {
    setAuthSubmitting(true);
    setAuthError(null);
    try {
      const res = await fetch("/api/auth/dev-admin-login", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Dev login failed");
      }
      try {
        localStorage.setItem("niyat_dev_admin", JSON.stringify(json.data.profile));
        document.cookie = "__session=dev-admin-session; path=/; max-age=604800; SameSite=Lax";
      } catch (_) {}
      setServerAdmin(json.data.profile);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed dev login";
      setAuthError(msg);
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    setServerAdmin(null);
    try {
      localStorage.removeItem("niyat_admin_session");
      localStorage.removeItem("niyat_admin_token");
      localStorage.removeItem("niyat_dev_admin");
      document.cookie = "__session=; path=/; max-age=0;";
    } catch (_) {}
    try {
      await logout();
    } catch (_) {}
    try {
      await fetch("/api/auth/session", { method: "DELETE" });
    } catch (_) {}
    window.location.href = "/admin";
  };

  const isOwnerEmail =
    (user?.email &&
      (user.email.toLowerCase() === "mainhasan553@gmail.com" ||
        user.email.toLowerCase() === "niyatadmin@gmail.com" ||
        user.email.toLowerCase() === "admin@niyat.com" ||
        user.email.toLowerCase() === "operations@niyat.com")) ||
    (serverAdmin?.email &&
      (serverAdmin.email.toLowerCase() === "mainhasan553@gmail.com" ||
        serverAdmin.email.toLowerCase() === "niyatadmin@gmail.com" ||
        serverAdmin.email.toLowerCase() === "admin@niyat.com" ||
        serverAdmin.email.toLowerCase() === "operations@niyat.com"));

  const isAdminRole =
    profile?.role === "ADMIN" ||
    profile?.role === "STAFF" ||
    serverAdmin?.role === "ADMIN" ||
    serverAdmin?.role === "STAFF" ||
    Boolean(isOwnerEmail);

  const isAuthenticated = Boolean((user || serverAdmin) && isAdminRole);

  // If user is not logged in, show polished Admin Sign In view
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 py-12 text-slate-100">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          {/* Subtle gold gradient accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-amber-300 to-amber-500" />

          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-amber-400 mb-4 shadow-inner">
              <Sparkles className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-white tracking-wide">
              NIYAT BACKOFFICE
            </h1>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">
              Staff & Operations Portal
            </p>
          </div>

          {authError && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          {/* Quick Dev Access Button in Development Mode */}
          {process.env.NODE_ENV === "development" && (
            <button
              type="button"
              onClick={handleDevLogin}
              disabled={authSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 mb-6 transition"
            >
              <Sparkles className="w-4 h-4" />
              Quick Enter as Store Admin (Dev Mode)
            </button>
          )}

          <button
            type="button"
            disabled={authSubmitting}
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-white border border-slate-700 hover:border-slate-600 transition text-sm font-medium shadow-sm mb-6 disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Sign in with Google
          </button>

          <div className="relative flex items-center justify-center mb-6">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-slate-900 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-widest relative">
              Or email password
            </span>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Admin Email Address
              </label>
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="operations@niyat.com"
                className="w-full bg-slate-800/80 border border-slate-700 focus:border-amber-400 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Security Password
              </label>
              <input
                type="password"
                required
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-800/80 border border-slate-700 focus:border-amber-400 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition"
              />
            </div>
            <button
              type="submit"
              disabled={authSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-sm transition shadow-lg shadow-amber-400/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {authSubmitting ? "Authenticating..." : "Enter Portal"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-8 text-center pt-6 border-t border-slate-800/80">
            <Link
              href="/"
              className="text-xs text-slate-400 hover:text-amber-400 transition inline-flex items-center gap-1.5"
            >
              ← Return to NIYAT Boutique Storefront
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentAdminName = profile?.name || serverAdmin?.name || user?.displayName || "Store Administrator";
  const currentAdminEmail = profile?.email || serverAdmin?.email || user?.email || "admin@niyat.com";
  const currentAdminRole = profile?.role || serverAdmin?.role || "ADMIN";

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col md:flex-row font-sans selection:bg-amber-400/20 selection:text-amber-300">
      {/* Mobile Top Header */}
      <div className="md:hidden bg-slate-950 border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <Link href="/admin" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/20 p-1 flex items-center justify-center shrink-0">
            <Image src="/logo.svg" alt="NIYAT" width={24} height={24} className="w-full h-full object-contain" />
          </div>
          <span className="font-serif font-bold text-lg tracking-wider text-white">
            NIYAT
          </span>
          <span className="text-[10px] bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded font-mono font-medium">
            ADMIN
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-950 border-r border-slate-800 flex flex-col transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-6 border-b border-slate-800/80">
          <Link
            href="/admin"
            className="flex items-center gap-3 group"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-amber-400/30 p-1.5 flex items-center justify-center shadow-lg shadow-amber-500/10 group-hover:scale-105 transition-transform shrink-0">
              <Image src="/logo.svg" alt="NIYAT" width={32} height={32} className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="font-serif font-bold text-lg text-white tracking-wider flex items-center gap-2">
                NIYAT
                <span className="text-[9px] uppercase tracking-wider bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded font-sans font-bold border border-amber-400/30">
                  PORTAL
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Store Management Engine</p>
            </div>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-amber-400/10 text-amber-300 border border-amber-400/30 shadow-sm"
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-900 border border-transparent"
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? "text-amber-400" : "text-slate-400"
                  }`}
                />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800/80 space-y-3">
          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white text-xs font-medium border border-slate-800 transition"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
              View Live Storefront
            </span>
            <span className="text-[10px] text-slate-400">↗</span>
          </Link>

          {/* User Profile Badge */}
          <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-850 flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <div className="text-xs font-medium text-white truncate">
                {currentAdminName}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {currentAdminEmail}
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Sign out of Admin"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Executive App Bar */}
        <header className="hidden md:flex h-16 bg-slate-950/80 backdrop-blur border-b border-slate-800 items-center justify-between px-8 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs font-medium text-slate-300">
              MongoDB Atlas Live
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-xs text-amber-300/80 font-mono">
              ROLE: {currentAdminRole}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/"
              target="_blank"
              className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-amber-400 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Live Store
            </Link>
            <div className="h-4 w-px bg-slate-800" />
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-400 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </header>

        {/* Sub-view Content */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
