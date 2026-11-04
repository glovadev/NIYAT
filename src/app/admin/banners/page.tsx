"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  SlidersHorizontal,
  Plus,
  RefreshCw,
  Search,
  ExternalLink,
  Edit2,
  Trash2,
  X,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Link as LinkIcon,
  Eye,
  Monitor,
  Smartphone,
  Type,
  Sun,
  Moon,
  Crown,
  ArrowRight,
} from "lucide-react";
import { ImageUploader } from "@/components/admin/ImageUploader";

interface AdminBannerItem {
  id: string;
  title: string;
  subtitle?: string;
  image: {
    url: string;
    publicId: string;
    alt: string;
  };
  targetUrl: string;
  placement: "HOME_HERO" | "HOME_PROMO" | "CATEGORY";
  textShadow?: "NONE" | "SOFT" | "CRISP" | "STRONG";
  textSize?: "MD" | "LG" | "XL";
  textColor?: "DARK" | "LIGHT" | "GOLD";
  textBackdrop?: "FROSTED_LIGHT" | "FROSTED_DARK" | "SUBTLE_GRADIENT" | "NONE";
  sortOrder: number;
  status: "ACTIVE" | "DRAFT" | "ARCHIVED";
  createdAt: string;
}

interface ProductOption {
  id: string;
  name: string;
  slug: string;
  sku: string;
  imageUrl?: string;
}

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<AdminBannerItem[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState("");
  const [formSubtitle, setFormSubtitle] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formImageAlt, setFormImageAlt] = useState("");
  const [formTargetUrl, setFormTargetUrl] = useState("/products/");
  const [formSelectedProductSlug, setFormSelectedProductSlug] = useState("");
  const [formSortOrder, setFormSortOrder] = useState("0");
  const [formStatus, setFormStatus] = useState<"ACTIVE" | "DRAFT">("ACTIVE");

  // Visual Styling & Typography Customization
  const [formTextShadow, setFormTextShadow] = useState<"NONE" | "SOFT" | "CRISP" | "STRONG">("CRISP");
  const [formTextSize, setFormTextSize] = useState<"MD" | "LG" | "XL">("LG");
  const [formTextColor, setFormTextColor] = useState<"DARK" | "LIGHT" | "GOLD">("DARK");
  const [formTextBackdrop, setFormTextBackdrop] = useState<"FROSTED_LIGHT" | "FROSTED_DARK" | "SUBTLE_GRADIENT" | "NONE">("FROSTED_LIGHT");
  const [previewDevice, setPreviewDevice] = useState<"DESKTOP" | "MOBILE">("DESKTOP");

  const adminFetch = (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    if (process.env.NODE_ENV === "development") {
      headers.set("x-dev-admin", "true");
      headers.set("Authorization", "Bearer dev-admin-session");
    }
    return fetch(url, { ...options, headers });
  };

  const loadBanners = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/banners?placement=HOME_HERO");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to load hero banners");
      }
      setBanners(json.data.items || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error fetching banners";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const res = await adminFetch("/api/admin/products?limit=50");
      const json = await res.json();
      if (json.success && json.data?.items) {
        setProducts(
          json.data.items.map((p: any) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            sku: p.sku,
            imageUrl: p.imageUrl,
          }))
        );
      }
    } catch (err) {
      console.error("Could not fetch products for dropdown:", err);
    }
  };

  useEffect(() => {
    loadBanners();
    loadProducts();
  }, []);

  const openCreateModal = () => {
    setEditingBannerId(null);
    setFormTitle("");
    setFormSubtitle("");
    setFormImageUrl("");
    setFormImageAlt("");
    setFormTargetUrl("/products/");
    setFormSelectedProductSlug("");
    setFormSortOrder(String(banners.length));
    setFormStatus("ACTIVE");
    setFormTextShadow("CRISP");
    setFormTextSize("LG");
    setFormTextColor("DARK");
    setFormTextBackdrop("FROSTED_LIGHT");
    setPreviewDevice("DESKTOP");
    setModalError(null);
    setModalOpen(true);
  };

  const openEditModal = (banner: AdminBannerItem) => {
    setEditingBannerId(banner.id);
    setFormTitle(banner.title);
    setFormSubtitle(banner.subtitle || "");
    setFormImageUrl(banner.image.url);
    setFormImageAlt(banner.image.alt || "");
    setFormTargetUrl(banner.targetUrl);
    setFormSortOrder(String(banner.sortOrder));
    setFormStatus(banner.status === "ACTIVE" ? "ACTIVE" : "DRAFT");
    setFormTextShadow(banner.textShadow || "CRISP");
    setFormTextSize(banner.textSize || "LG");
    setFormTextColor(banner.textColor || "DARK");
    setFormTextBackdrop(banner.textBackdrop || "FROSTED_LIGHT");
    setPreviewDevice("DESKTOP");

    // Match if it points to a product slug
    const matched = products.find((p) => `/products/${p.slug}` === banner.targetUrl);
    setFormSelectedProductSlug(matched ? matched.slug : "CUSTOM");
    setModalError(null);
    setModalOpen(true);
  };

  const handleProductSelect = (slug: string) => {
    setFormSelectedProductSlug(slug);
    if (slug === "CUSTOM") {
      setFormTargetUrl("/products/");
    } else {
      const found = products.find((p) => p.slug === slug);
      if (found) {
        setFormTargetUrl(`/products/${found.slug}`);
        if (!formTitle.trim()) {
          setFormTitle(found.name);
        }
        if (!formImageUrl.trim() && found.imageUrl) {
          setFormImageUrl(found.imageUrl);
        }
      }
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setSubmitting(true);

    try {
      if (!formImageUrl.trim()) {
        throw new Error("Please provide a valid image URL for the slide");
      }
      if (!formTargetUrl.trim()) {
        throw new Error("Please specify the product or page target link");
      }

      const sortOrder = parseInt(formSortOrder, 10) || 0;

      if (editingBannerId) {
        // PATCH existing
        const res = await adminFetch(`/api/admin/banners/${editingBannerId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: formTitle.trim(),
            subtitle: formSubtitle.trim() || null,
            imageUrl: formImageUrl.trim(),
            imageAlt: formImageAlt.trim() || formTitle.trim() || "NIYAT Hero Slide",
            targetUrl: formTargetUrl.trim(),
            textShadow: formTextShadow,
            textSize: formTextSize,
            textColor: formTextColor,
            textBackdrop: formTextBackdrop,
            sortOrder,
            status: formStatus,
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || "Failed to update banner");
        }
      } else {
        // POST new
        const res = await adminFetch("/api/admin/banners", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: formTitle.trim(),
            subtitle: formSubtitle.trim() || undefined,
            imageUrl: formImageUrl.trim(),
            imageAlt: formImageAlt.trim() || formTitle.trim() || "NIYAT Hero Slide",
            targetUrl: formTargetUrl.trim(),
            placement: "HOME_HERO",
            textShadow: formTextShadow,
            textSize: formTextSize,
            textColor: formTextColor,
            textBackdrop: formTextBackdrop,
            sortOrder,
            status: formStatus,
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || "Failed to create hero banner");
        }
      }

      setModalOpen(false);
      loadBanners();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving banner slide";
      setModalError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (banner: AdminBannerItem) => {
    try {
      const nextStatus = banner.status === "ACTIVE" ? "DRAFT" : "ACTIVE";
      const res = await adminFetch(`/api/admin/banners/${banner.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to toggle status");
      }
      loadBanners();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to toggle status");
    }
  };

  const handleDelete = async (bannerId: string) => {
    if (!confirm("Are you sure you want to delete this hero slide?")) return;
    try {
      const res = await adminFetch(`/api/admin/banners/${bannerId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to delete banner");
      }
      loadBanners();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Deletion failed");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-white tracking-wide">
            Hero Sliding Carousel
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Curate the storefront homepage hero slider. Add one or multiple slides with attached product links.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadBanners}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-semibold shadow-md shadow-amber-400/20 transition"
          >
            <Plus className="w-4 h-4" />
            Add Hero Slide
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* Info Notice Box */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 space-y-1">
          <p className="font-semibold text-white">How the Hero Slider Works</p>
          <p className="text-slate-400 leading-relaxed">
            All <span className="text-emerald-400 font-medium">ACTIVE</span> slides display in your storefront hero showcase in order of their sequence number. When a customer clicks on the slide image or the spotlight button, they will be navigated directly to the attached product details page.
          </p>
        </div>
      </div>

      {/* Slides Table & Preview Grid */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl overflow-hidden">
        {banners.length === 0 ? (
          <div className="p-16 text-center text-slate-500 text-sm">
            {loading ? (
              "Loading hero slides..."
            ) : (
              <div>
                <p className="mb-4">No custom hero slides created yet. The storefront is currently using default showcase slides.</p>
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-semibold shadow-md transition"
                >
                  Create Your First Hero Slide
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-6">Slide Showcase</th>
                  <th className="py-3.5 px-6">Title & Subtitle</th>
                  <th className="py-3.5 px-6">Attached Product / Target Link</th>
                  <th className="py-3.5 px-6">Order</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {banners.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-900/40 transition">
                    {/* Image Preview */}
                    <td className="py-4 px-6">
                      <div className="relative w-20 h-14 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden shrink-0 shadow-sm">
                        <Image
                          src={b.image.url}
                          alt={b.image.alt || b.title}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      </div>
                    </td>

                    {/* Title */}
                    <td className="py-4 px-6">
                      {b.title ? (
                        <>
                          <div className="text-white font-semibold text-sm">
                            {b.title}
                          </div>
                          {b.subtitle && (
                            <div className="text-slate-400 text-xs mt-0.5 line-clamp-1 max-w-xs">
                              {b.subtitle}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-300 font-medium">Image-Only Slide</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/30 font-semibold tracking-wider uppercase">
                            No Text Overlay
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Attached Product Link */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <Link
                          href={b.targetUrl}
                          target="_blank"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-750 text-amber-400 hover:text-amber-300 font-mono text-[11px] border border-slate-700 transition"
                        >
                          <LinkIcon className="w-3 h-3 text-amber-400" />
                          <span className="truncate max-w-[180px]">{b.targetUrl}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </Link>
                      </div>
                    </td>

                    {/* Order */}
                    <td className="py-4 px-6 font-mono text-slate-300 font-medium">
                      #{b.sortOrder}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-6">
                      <button
                        type="button"
                        onClick={() => toggleStatus(b)}
                        title="Click to toggle status"
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider transition ${
                          b.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                            : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-750"
                        }`}
                      >
                        {b.status}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(b)}
                          title="Edit Slide"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(b.id)}
                          title="Delete Slide"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/30 text-slate-400 hover:text-rose-400 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Slide Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden my-4 sm:my-8 flex flex-col max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/90 backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <SlidersHorizontal className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-serif font-bold text-lg sm:text-xl text-white">
                    {editingBannerId ? "Edit Hero Slide & Typography" : "Create New Hero Slide"}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Customize imagery, live typography, contrast shadow, and device previews.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {/* Modal Content: 2-Column Grid (Form on Left, Live Device Preview on Right) */}
            <form onSubmit={handleFormSubmit} className="p-4 sm:p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* ============================================================== */}
                {/* LEFT COLUMN: FORM CONTROLS                                    */}
                {/* ============================================================== */}
                <div className="lg:col-span-7 space-y-4 text-xs">
                  
                  {/* Product Link Selector */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                    <label className="block text-amber-400 font-semibold text-xs flex items-center gap-1.5">
                      <LinkIcon className="w-3.5 h-3.5" />
                      Attach Product Link (Redirect Target) *
                    </label>
                    <p className="text-[11px] text-slate-400">
                      Select a product from your catalog to automatically link this slide to its details page.
                    </p>

                    <select
                      value={formSelectedProductSlug}
                      onChange={(e) => handleProductSelect(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-white outline-none"
                    >
                      <option value="">-- Choose a Product from Catalog --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.slug}>
                          {p.name} ({p.sku})
                        </option>
                      ))}
                      <option value="CUSTOM">Custom URL / Page Link</option>
                    </select>

                    <div>
                      <label className="block text-slate-400 font-medium mb-1 mt-2">
                        Exact Redirect URL Path
                      </label>
                      <input
                        type="text"
                        required
                        value={formTargetUrl}
                        onChange={(e) => setFormTargetUrl(e.target.value)}
                        placeholder="/products/whitening-cream"
                        className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2 text-white font-mono placeholder-slate-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Image Uploader */}
                  <div>
                    <ImageUploader
                      value={formImageUrl}
                      onChange={(url) => {
                        setFormImageUrl(url);
                        if (modalError) setModalError(null);
                      }}
                      folder="hero_banners"
                      label="Hero Banner Image *"
                      aspectHint="Edge-to-edge format (Recommended: 1920x1080 or 16:9)"
                    />
                  </div>

                  {/* Title & Subtitle */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="font-semibold text-white text-xs flex items-center gap-1.5">
                        <Type className="w-4 h-4 text-amber-400" />
                        Text Overlay & Headlines
                      </span>
                      <span className="text-[10px] text-amber-400/90 font-medium">
                        Optional (Leave blank for Image-Only)
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-slate-300 font-medium mb-1 flex items-center justify-between">
                          <span>Slide Headline / Title</span>
                          <span className="text-[10px] text-slate-400">Comma adds split styling</span>
                        </label>
                        <input
                          type="text"
                          value={formTitle}
                          onChange={(e) => setFormTitle(e.target.value)}
                          placeholder="e.g. Whitening Cream, Royal Radiance"
                          className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-300 font-medium mb-1">
                          Subtitle / Paragraph Description
                        </label>
                        <textarea
                          rows={2}
                          value={formSubtitle}
                          onChange={(e) => setFormSubtitle(e.target.value)}
                          placeholder="Signature botanical radiance formulation with 24-hour nourishment..."
                          className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 outline-none resize-none"
                        />
                      </div>
                    </div>

                    {!formTitle.trim() && !formSubtitle.trim() && (
                      <div className="p-2.5 rounded-lg bg-amber-400/10 border border-amber-400/25 flex items-center gap-2 text-[11px] text-amber-300">
                        <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                        <span>
                          <strong>Image-Only Slide:</strong> Since headline & paragraph are empty, this slide will display your image full-bleed without text overlays.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Visual Typography & Contrast Controls (When Text is Present) */}
                  {(formTitle.trim() || formSubtitle.trim()) && (
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="font-semibold text-amber-400 text-xs flex items-center gap-1.5">
                          <Crown className="w-3.5 h-3.5" />
                          Eye-Catching Legibility & Contrast Styling
                        </span>
                        <span className="text-[10px] text-emerald-400 font-medium">Live Applied</span>
                      </div>

                      {/* 1. Heading Size Control */}
                      <div>
                        <label className="block text-slate-300 font-medium mb-1.5">
                          1. Headline Font Size
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => setFormTextSize("MD")}
                            className={`py-2 px-2.5 rounded-xl border text-center transition font-semibold ${
                              formTextSize === "MD"
                                ? "bg-amber-400/15 border-amber-400 text-amber-300 shadow-xs"
                                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                            }`}
                          >
                            <span className="block text-xs">Medium (MD)</span>
                            <span className="block text-[10px] text-slate-500 font-normal">Compact</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setFormTextSize("LG")}
                            className={`py-2 px-2.5 rounded-xl border text-center transition font-semibold ${
                              formTextSize === "LG"
                                ? "bg-amber-400/15 border-amber-400 text-amber-300 shadow-xs"
                                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                            }`}
                          >
                            <span className="block text-xs">Large (LG) ⭐</span>
                            <span className="block text-[10px] text-slate-500 font-normal">Recommended</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setFormTextSize("XL")}
                            className={`py-2 px-2.5 rounded-xl border text-center transition font-semibold ${
                              formTextSize === "XL"
                                ? "bg-amber-400/15 border-amber-400 text-amber-300 shadow-xs"
                                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                            }`}
                          >
                            <span className="block text-xs">Majestic (XL)</span>
                            <span className="block text-[10px] text-slate-500 font-normal">Maximum Impact</span>
                          </button>
                        </div>
                      </div>

                      {/* 2. Text Shadow Intensity */}
                      <div>
                        <label className="block text-slate-300 font-medium mb-1.5">
                          2. Text Shadow / 3D Pop
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { id: "NONE", label: "None", sub: "Flat" },
                            { id: "SOFT", label: "Soft Glow", sub: "Subtle" },
                            { id: "CRISP", label: "Crisp ⭐", sub: "High Contrast" },
                            { id: "STRONG", label: "Strong", sub: "Deep 3D" },
                          ].map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setFormTextShadow(item.id as any)}
                              className={`py-1.5 px-2 rounded-xl border text-center transition font-medium ${
                                formTextShadow === item.id
                                  ? "bg-amber-400/15 border-amber-400 text-amber-300 shadow-xs"
                                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                              }`}
                            >
                              <span className="block text-xs font-semibold">{item.label}</span>
                              <span className="block text-[9px] text-slate-500">{item.sub}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 3. Text Tone & Color */}
                      <div>
                        <label className="block text-slate-300 font-medium mb-1.5">
                          3. Text Tone / Color
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => setFormTextColor("DARK")}
                            className={`py-2 px-2.5 rounded-xl border text-center transition font-semibold ${
                              formTextColor === "DARK"
                                ? "bg-amber-400/15 border-amber-400 text-amber-300 shadow-xs"
                                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                            }`}
                          >
                            <span className="block text-xs">Deep Emerald</span>
                            <span className="block text-[10px] text-slate-500 font-normal">Best on Light Photos</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setFormTextColor("LIGHT")}
                            className={`py-2 px-2.5 rounded-xl border text-center transition font-semibold ${
                              formTextColor === "LIGHT"
                                ? "bg-amber-400/15 border-amber-400 text-amber-300 shadow-xs"
                                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                            }`}
                          >
                            <span className="block text-xs">Crisp White</span>
                            <span className="block text-[10px] text-slate-500 font-normal">Best on Dark Photos</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setFormTextColor("GOLD")}
                            className={`py-2 px-2.5 rounded-xl border text-center transition font-semibold ${
                              formTextColor === "GOLD"
                                ? "bg-amber-400/15 border-amber-400 text-amber-300 shadow-xs"
                                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                            }`}
                          >
                            <span className="block text-xs">24K Royal Gold</span>
                            <span className="block text-[10px] text-slate-500 font-normal">Metallic Shimmer</span>
                          </button>
                        </div>
                      </div>

                      {/* 4. Text Legibility Card (Frosted Glass) */}
                      <div>
                        <label className="block text-slate-300 font-medium mb-1.5">
                          4. Legibility Backing Card (Frosted Glass)
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { id: "FROSTED_LIGHT", label: "Ivory Glass ⭐", sub: "Recommended" },
                            { id: "FROSTED_DARK", label: "Night Velvet", sub: "Deep Contrast" },
                            { id: "SUBTLE_GRADIENT", label: "Soft Gradient", sub: "Edge Blend" },
                            { id: "NONE", label: "No Card", sub: "Transparent" },
                          ].map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setFormTextBackdrop(item.id as any)}
                              className={`py-2 px-2 rounded-xl border text-center transition font-medium ${
                                formTextBackdrop === item.id
                                  ? "bg-amber-400/15 border-amber-400 text-amber-300 shadow-xs"
                                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                              }`}
                            >
                              <span className="block text-xs font-semibold">{item.label}</span>
                              <span className="block text-[9px] text-slate-500">{item.sub}</span>
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1.5">
                          💡 <strong>Ivory Glass</strong> adds a gentle luxury frosted glass backdrop under your text so it is never washed out by bright white or busy product jars!
                        </p>
                      </div>

                    </div>
                  )}

                  {/* Sort Order & Status */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">
                        Slide Sequence (Sort Order)
                      </label>
                      <input
                        type="number"
                        value={formSortOrder}
                        onChange={(e) => setFormSortOrder(e.target.value)}
                        placeholder="0"
                        className="w-full bg-slate-800 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2 text-white font-mono outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1">
                        Display Status
                      </label>
                      <select
                        value={formStatus}
                        onChange={(e) =>
                          setFormStatus(e.target.value as "ACTIVE" | "DRAFT")
                        }
                        className="w-full bg-slate-800 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-white outline-none"
                      >
                        <option value="ACTIVE">ACTIVE (Display in Hero)</option>
                        <option value="DRAFT">DRAFT (Hidden)</option>
                      </select>
                    </div>
                  </div>

                </div>

                {/* ============================================================== */}
                {/* RIGHT COLUMN: LIVE INTERACTIVE PREVIEW (DESKTOP & MOBILE)     */}
                {/* ============================================================== */}
                <div className="lg:col-span-5 flex flex-col bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-800 sticky top-2">
                  
                  {/* Viewport Switcher Toolbar */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                    <div className="flex items-center gap-1.5">
                      <Eye className="w-4 h-4 text-amber-400" />
                      <span className="font-semibold text-white text-xs">Live Device Simulation</span>
                    </div>

                    <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setPreviewDevice("DESKTOP")}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                          previewDevice === "DESKTOP"
                            ? "bg-amber-400 text-slate-950 shadow-xs"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        <Monitor className="w-3.5 h-3.5" />
                        <span>Desktop</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPreviewDevice("MOBILE")}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                          previewDevice === "MOBILE"
                            ? "bg-amber-400 text-slate-950 shadow-xs"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>Mobile</span>
                      </button>
                    </div>
                  </div>

                  {/* Preview Container Frame */}
                  <div className="w-full flex items-center justify-center py-2 min-h-[300px]">
                    {previewDevice === "DESKTOP" ? (
                      /* DESKTOP 16:9 PREVIEW FRAME */
                      <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shadow-xl flex items-center">
                        {/* Background Image */}
                        <div className="absolute inset-0">
                          {formImageUrl ? (
                            <Image
                              src={formImageUrl}
                              alt="Preview"
                              fill
                              className="object-cover object-center"
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-r from-amber-900/20 to-slate-900 flex items-center justify-center text-slate-600 text-xs">
                              Upload an image to preview
                            </div>
                          )}
                        </div>

                        {/* If text is present, render card & text */}
                        {(formTitle.trim() || formSubtitle.trim()) ? (
                          <div className="relative z-10 p-3 sm:p-4 max-w-[85%]">
                            <div
                              className={`space-y-1.5 transition-all ${
                                formTextBackdrop === "FROSTED_DARK"
                                  ? "bg-[#061B14]/90 backdrop-blur-md p-3.5 rounded-2xl border border-[#D4AF37]/50 shadow-xl"
                                  : formTextBackdrop === "SUBTLE_GRADIENT"
                                  ? "p-2 bg-gradient-to-r from-[#FFFEFC]/95 to-transparent rounded-xl"
                                  : formTextBackdrop === "NONE"
                                  ? "p-1"
                                  : "bg-[#FFFEFC]/90 backdrop-blur-md p-3.5 rounded-2xl border border-[#D4AF37]/40 shadow-xl"
                              }`}
                            >
                              {/* Eyebrow */}
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/35 w-fit">
                                <Crown className="w-2.5 h-2.5 text-[#A5833F]" />
                                <span className="text-[8px] font-bold tracking-widest text-[#8F6B20] uppercase">
                                  DUBAI ROYAL BOTANICALS
                                </span>
                              </div>

                              {/* Title */}
                              {formTitle && (
                                <h4
                                  className={`font-serif tracking-tight leading-tight ${
                                    formTextSize === "XL"
                                      ? "text-lg font-black"
                                      : formTextSize === "MD"
                                      ? "text-sm font-bold"
                                      : "text-base font-bold"
                                  } ${
                                    formTextColor === "LIGHT" || formTextBackdrop === "FROSTED_DARK"
                                      ? "text-white"
                                      : formTextColor === "GOLD"
                                      ? "text-amber-500 font-extrabold"
                                      : "text-[#061B14]"
                                  } ${
                                    formTextShadow === "STRONG"
                                      ? "drop-shadow-[0_3px_8px_rgba(0,0,0,0.7)]"
                                      : formTextShadow === "SOFT"
                                      ? "drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
                                      : formTextShadow === "NONE"
                                      ? ""
                                      : "drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]"
                                  }`}
                                >
                                  {formTitle}
                                </h4>
                              )}

                              {/* Subtitle */}
                              {formSubtitle && (
                                <p
                                  className={`text-[9px] line-clamp-2 leading-relaxed ${
                                    formTextColor === "LIGHT" || formTextBackdrop === "FROSTED_DARK"
                                      ? "text-[#F4E8C1]/90"
                                      : "text-[#0D2B24] font-medium"
                                  }`}
                                >
                                  {formSubtitle}
                                </p>
                              )}

                              {/* CTA Button preview */}
                              <div className="pt-1 flex items-center gap-1.5">
                                <span className="px-3 py-1 rounded-full bg-[#0C2920] text-[#F4E8C1] border border-[#D4AF37]/50 text-[9px] font-bold inline-flex items-center gap-1">
                                  <span>Explore Collection</span>
                                  <ArrowRight className="w-2.5 h-2.5 text-[#D4AF37]" />
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="absolute bottom-2 left-2 right-2 bg-black/70 backdrop-blur-xs text-center text-[10px] text-amber-300 py-1 rounded-lg border border-amber-400/30">
                            🖼️ Image-Only Banner (Full Bleed - No Overlays)
                          </div>
                        )}
                      </div>
                    ) : (
                      /* MOBILE SMARTPHONE MOCK FRAME */
                      <div className="relative w-[230px] aspect-[9/16] rounded-[24px] border-4 border-slate-700 overflow-hidden bg-slate-900 shadow-2xl flex items-center justify-center">
                        {/* Background Image */}
                        <div className="absolute inset-0">
                          {formImageUrl ? (
                            <Image
                              src={formImageUrl}
                              alt="Mobile Preview"
                              fill
                              className="object-cover object-center"
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-500 text-[10px] p-2 text-center">
                              Upload image
                            </div>
                          )}
                        </div>

                        {/* Mobile Text Card */}
                        {(formTitle.trim() || formSubtitle.trim()) ? (
                          <div className="relative z-10 p-2.5 w-[92%]">
                            <div
                              className={`space-y-1.5 transition-all ${
                                formTextBackdrop === "FROSTED_DARK"
                                  ? "bg-[#061B14]/92 backdrop-blur-md p-3 rounded-xl border border-[#D4AF37]/50 shadow-xl"
                                  : formTextBackdrop === "SUBTLE_GRADIENT"
                                  ? "p-2 bg-gradient-to-r from-[#FFFEFC]/95 to-transparent rounded-xl"
                                  : formTextBackdrop === "NONE"
                                  ? "p-1"
                                  : "bg-[#FFFEFC]/92 backdrop-blur-md p-3 rounded-xl border border-[#D4AF37]/40 shadow-xl"
                              }`}
                            >
                              <div className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/35 w-fit">
                                <Crown className="w-2 h-2 text-[#A5833F]" />
                                <span className="text-[7px] font-bold tracking-wider text-[#8F6B20] uppercase">
                                  DUBAI ROYAL
                                </span>
                              </div>

                              {formTitle && (
                                <h4
                                  className={`font-serif tracking-tight leading-tight ${
                                    formTextSize === "XL"
                                      ? "text-sm font-black"
                                      : "text-xs font-bold"
                                  } ${
                                    formTextColor === "LIGHT" || formTextBackdrop === "FROSTED_DARK"
                                      ? "text-white"
                                      : formTextColor === "GOLD"
                                      ? "text-amber-500 font-extrabold"
                                      : "text-[#061B14]"
                                  } ${
                                    formTextShadow === "STRONG"
                                      ? "drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]"
                                      : formTextShadow === "SOFT"
                                      ? "drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
                                      : formTextShadow === "NONE"
                                      ? ""
                                      : "drop-shadow-[0_2px_3px_rgba(0,0,0,0.35)]"
                                  }`}
                                >
                                  {formTitle}
                                </h4>
                              )}

                              {formSubtitle && (
                                <p
                                  className={`text-[8px] line-clamp-2 leading-tight ${
                                    formTextColor === "LIGHT" || formTextBackdrop === "FROSTED_DARK"
                                      ? "text-[#F4E8C1]/90"
                                      : "text-[#0D2B24]"
                                  }`}
                                >
                                  {formSubtitle}
                                </p>
                              )}

                              <div className="pt-0.5">
                                <span className="px-2 py-0.5 rounded-full bg-[#0C2920] text-[#F4E8C1] border border-[#D4AF37]/50 text-[8px] font-bold inline-flex items-center gap-1">
                                  Explore <ArrowRight className="w-2 h-2 text-[#D4AF37]" />
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="absolute bottom-2 left-2 right-2 bg-black/75 text-center text-[9px] text-amber-300 py-1 rounded-md">
                            Full-Bleed Image
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Simulation Helper Note */}
                  <div className="mt-2 text-[10px] text-slate-400 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                    <p className="flex items-center gap-1 text-slate-300 font-medium mb-0.5">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      Live Customizer Active
                    </p>
                    <span>
                      Adjust font size, shadow pop, and backing glass on the left — see the change immediately above in Desktop or Mobile mode.
                    </span>
                  </div>

                </div>

              </div>

              {/* Modal Actions */}
              <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold shadow-md shadow-amber-400/20 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{editingBannerId ? "Save Slide Changes" : "Create Hero Slide"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}
