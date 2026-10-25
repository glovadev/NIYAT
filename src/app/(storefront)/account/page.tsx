"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { AuthModal } from "@/components/auth/AuthModal";
import { formatPaise } from "@/lib/utils";
import {
  User,
  Package,
  MapPin,
  Heart,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Phone,
  Mail,
  Edit2,
  Check,
} from "lucide-react";

export default function AccountPage() {
  const { user, profile, loading, logout, refreshProfile } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [addressCount, setAddressCount] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setPhone(profile.phone || "");

      // Fetch recent orders
      fetch("/api/me/orders?limit=3")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data?.items) {
            setRecentOrders(data.data.items);
          }
        })
        .catch(() => {});

      // Fetch address count
      fetch("/api/me/addresses")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data?.items) {
            setAddressCount(data.data.items.length);
          }
        })
        .catch(() => {});
    }
  }, [profile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setIsEditing(false);
        await refreshProfile();
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-3 border-niyat-gold border-t-niyat-emerald rounded-full animate-spin mx-auto mb-4" />
        <p className="text-xs uppercase tracking-widest text-niyat-gold">
          Consulting Sanctuary Archives...
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="py-20 max-w-xl mx-auto px-4 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-white border border-niyat-ivory-border flex items-center justify-center mx-auto text-niyat-gold shadow-sm">
          <User className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="font-serif text-3xl font-bold text-niyat-charcoal">
            Customer Sanctuary
          </h2>
          <p className="text-sm text-niyat-muted font-light">
            Sign in to access your personal dashboard, track shipments, review orders, and manage
            your saved botanical rituals.
          </p>
        </div>
        <div>
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="px-8 py-3.5 rounded-full bg-niyat-emerald text-white text-xs font-semibold uppercase tracking-wider hover:bg-niyat-emerald-dark shadow-md transition-all"
          >
            Sign In to Account
          </button>
        </div>
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-niyat-muted">
          <Link href="/" className="hover:text-niyat-emerald transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-niyat-charcoal font-medium">My Account</span>
        </nav>

        {/* Profile Welcome Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-niyat-emerald-dark via-niyat-emerald to-niyat-emerald-dark text-white p-8 sm:p-10 shadow-xl border border-niyat-gold/20">
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-niyat-gold text-white font-serif text-2xl font-bold flex items-center justify-center shadow-md">
                {(profile?.name || user.displayName || user.email || "C")[0].toUpperCase()}
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-niyat-gold text-[10px] font-semibold uppercase tracking-widest">
                  <Sparkles className="w-3 h-3" />
                  {profile?.role === "ADMIN" ? "Administrator" : "Patron Member"}
                </div>
                <h1 className="font-serif text-2xl sm:text-3xl font-bold mt-1">
                  {profile?.name || user.displayName || "Valued Customer"}
                </h1>
                <p className="text-xs text-white/80 font-light">{user.email}</p>
              </div>
            </div>

            <button
              onClick={logout}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-all border border-white/20"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>

          <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-niyat-gold/20 blur-3xl pointer-events-none" />
        </div>

        {/* Quick Navigation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Link
            href="/account/orders"
            className="group p-6 rounded-2xl bg-white border border-niyat-ivory-border hover:border-niyat-gold shadow-sm hover:shadow-md transition-all space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-niyat-ivory flex items-center justify-center text-niyat-emerald group-hover:bg-niyat-emerald group-hover:text-white transition-all">
                <Package className="w-5 h-5" />
              </div>
              <ChevronRight className="w-4 h-4 text-niyat-muted group-hover:text-niyat-emerald transition-colors" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-niyat-charcoal">My Orders</h3>
              <p className="text-xs text-niyat-muted mt-0.5">
                {recentOrders.length} recent {recentOrders.length === 1 ? "order" : "orders"}
              </p>
            </div>
          </Link>

          <Link
            href="/account/addresses"
            className="group p-6 rounded-2xl bg-white border border-niyat-ivory-border hover:border-niyat-gold shadow-sm hover:shadow-md transition-all space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-niyat-ivory flex items-center justify-center text-niyat-emerald group-hover:bg-niyat-emerald group-hover:text-white transition-all">
                <MapPin className="w-5 h-5" />
              </div>
              <ChevronRight className="w-4 h-4 text-niyat-muted group-hover:text-niyat-emerald transition-colors" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-niyat-charcoal">Saved Addresses</h3>
              <p className="text-xs text-niyat-muted mt-0.5">
                {addressCount} {addressCount === 1 ? "address" : "addresses"} saved
              </p>
            </div>
          </Link>

          <Link
            href="/account/wishlist"
            className="group p-6 rounded-2xl bg-white border border-niyat-ivory-border hover:border-niyat-gold shadow-sm hover:shadow-md transition-all space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-niyat-ivory flex items-center justify-center text-niyat-emerald group-hover:bg-niyat-emerald group-hover:text-white transition-all">
                <Heart className="w-5 h-5" />
              </div>
              <ChevronRight className="w-4 h-4 text-niyat-muted group-hover:text-niyat-emerald transition-colors" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-niyat-charcoal">My Wishlist</h3>
              <p className="text-xs text-niyat-muted mt-0.5">
                {profile?.wishlist?.length || 0} saved formulations
              </p>
            </div>
          </Link>
        </div>

        {/* Profile Details & Recent Orders Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Personal Details Card */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-8 border border-niyat-ivory-border shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-niyat-ivory-border">
              <h3 className="font-serif text-lg font-bold text-niyat-charcoal">
                Personal Information
              </h3>
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="text-xs font-semibold text-niyat-gold-dark hover:underline flex items-center gap-1"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-niyat-charcoal">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-niyat-ivory-border text-xs sm:text-sm text-niyat-charcoal focus:outline-none focus:border-niyat-gold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-niyat-charcoal">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="9876543210"
                    maxLength={10}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-niyat-ivory-border text-xs sm:text-sm text-niyat-charcoal focus:outline-none focus:border-niyat-gold"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2.5 rounded-full bg-niyat-emerald text-white text-xs font-semibold uppercase tracking-wider hover:bg-niyat-emerald-dark transition-all disabled:opacity-50"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2.5 rounded-full text-xs text-niyat-muted hover:text-niyat-charcoal transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 text-xs sm:text-sm">
                <div className="flex items-center gap-3 text-niyat-charcoal">
                  <User className="w-4 h-4 text-niyat-gold flex-shrink-0" />
                  <div>
                    <span className="text-[11px] text-niyat-muted block">Name</span>
                    <span className="font-medium">{profile?.name || "Not specified"}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-niyat-charcoal">
                  <Mail className="w-4 h-4 text-niyat-gold flex-shrink-0" />
                  <div>
                    <span className="text-[11px] text-niyat-muted block">Email</span>
                    <span className="font-medium">{user.email}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-niyat-charcoal">
                  <Phone className="w-4 h-4 text-niyat-gold flex-shrink-0" />
                  <div>
                    <span className="text-[11px] text-niyat-muted block">Mobile</span>
                    <span className="font-medium">{profile?.phone || "Not linked"}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-niyat-muted flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-niyat-emerald flex-shrink-0" />
                    <span>Your data is protected under our strict privacy policies.</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Recent Orders Overview */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-niyat-ivory-border shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-niyat-ivory-border">
              <h3 className="font-serif text-lg font-bold text-niyat-charcoal">
                Recent Orders
              </h3>
              <Link
                href="/account/orders"
                className="text-xs font-semibold text-niyat-gold-dark hover:underline"
              >
                View All
              </Link>
            </div>

            {recentOrders.length > 0 ? (
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <span className="font-mono text-xs font-bold text-niyat-charcoal block">
                        {order.orderNumber}
                      </span>
                      <p className="text-[11px] text-niyat-muted mt-0.5">
                        {new Date(order.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}{" "}
                        • {order.itemCount} items
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-niyat-gold-subtle text-niyat-gold-dark border border-niyat-gold/30 uppercase">
                        {order.fulfilmentStatus.replace(/_/g, " ")}
                      </span>
                      <span className="font-semibold text-xs text-niyat-charcoal">
                        {formatPaise(order.totalPaise)}
                      </span>
                      <Link
                        href={`/account/orders`}
                        className="p-1.5 rounded-lg hover:bg-neutral-200 text-niyat-charcoal transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-niyat-muted space-y-2">
                <Package className="w-8 h-8 text-neutral-300 mx-auto" />
                <p>You haven&apos;t placed any orders yet.</p>
                <Link
                  href="/shop"
                  className="inline-block mt-2 font-semibold text-niyat-emerald hover:underline"
                >
                  Explore formulations
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
