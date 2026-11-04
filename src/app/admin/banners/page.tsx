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
  Image as ImageIcon,
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
  mobileImage?: {
    url: string;
    publicId?: string;
    alt?: string;
  };
  targetUrl: string;
  placement: "HOME_HERO" | "HOME_PROMO" | "CATEGORY";
  textShadow?: "NONE" | "SOFT" | "CRISP" | "STRONG";
  textSize?: "MD" | "LG" | "XL";
  textColor?: "DARK" | "LIGHT" | "GOLD";
  textBackdrop?: "FROSTED_LIGHT" | "FROSTED_DARK" | "SUBTLE_GRADIENT" | "NONE";
  mobileFit?: "CONTAIN" | "COVER";
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
  const [formMobileImageUrl, setFormMobileImageUrl] = useState("");
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
  const [formMobileFit, setFormMobileFit] = useState<"CONTAIN" | "COVER">("CONTAIN");
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
    setFormMobileImageUrl("");
    setFormImageAlt("");
    setFormTargetUrl("/products/");
    setFormSelectedProductSlug("");
    setFormSortOrder(String(banners.length));
    setFormStatus("ACTIVE");
    setFormTextShadow("CRISP");
    setFormTextSize("LG");
    setFormTextColor("DARK");
    setFormTextBackdrop("FROSTED_LIGHT");
    setFormMobileFit("CONTAIN");
    setPreviewDevice("DESKTOP");
    setModalError(null);
    setModalOpen(true);
  };

  const openEditModal = (banner: AdminBannerItem) => {
    setEditingBannerId(banner.id);
    setFormTitle(banner.title);
    setFormSubtitle(banner.subtitle || "");
    setFormImageUrl(banner.image.url);
    setFormMobileImageUrl(banner.mobileImage?.url || "");
    setFormImageAlt(banner.image.alt || "");
    setFormTargetUrl(banner.targetUrl);
    setFormSortOrder(String(banner.sortOrder));
    setFormStatus(banner.status === "ACTIVE" ? "ACTIVE" : "DRAFT");
    setFormTextShadow(banner.textShadow || "CRISP");
    setFormTextSize(banner.textSize || "LG");
    setFormTextColor(banner.textColor || "DARK");
    setFormTextBackdrop(banner.textBackdrop || "FROSTED_LIGHT");
    setFormMobileFit(banner.mobileFit || "CONTAIN");
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
            mobileImageUrl: formMobileImageUrl.trim() || null,
            imageAlt: formImageAlt.trim() || formTitle.trim() || "NIYAT Hero Slide",
            targetUrl: formTargetUrl.trim(),
            textShadow: formTextShadow,
            textSize: formTextSize,
            textColor: formTextColor,
            textBackdrop: formTextBackdrop,
            mobileFit: formMobileFit,
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
            mobileImageUrl: formMobileImageUrl.trim() || undefined,
            imageAlt: formImageAlt.trim() || formTitle.trim() || "NIYAT Hero Slide",
            targetUrl: formTargetUrl.trim(),
            placement: "HOME_HERO",
            textShadow: formTextShadow,
            textSize: formTextSize,
            textColor: formTextColor,
            textBackdrop: formTextBackdrop,
            mobileFit: formMobileFit,
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
                  <th className="py-3.5 px-6">Imagery (Desktop & Mobile)</th>
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
                    {/* Image Preview: Desktop & Mobile */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        {/* Desktop Image */}
                        <div>
                          <div className="relative w-20 h-10 rounded-lg bg-slate-800 border border-slate-700 overflow-hidden shrink-0 shadow-sm" title="Desktop 3:1 Banner">
                            <Image
                              src={b.image.url}
                              alt={b.image.alt || b.title}
                              fill
                              sizes="80px"
                              className="object-cover"
                            />
                          </div>
                          <span className="text-[9px] text-slate-400 font-medium block text-center mt-0.5">
                            🖥️ Desktop
                          </span>
                        </div>

                        {/* Mobile Image */}
                        <div>
                          {b.mobileImage?.url ? (
                            <div className="relative w-8 h-12 rounded-lg bg-slate-800 border border-amber-400/50 overflow-hidden shrink-0 shadow-sm ring-1 ring-amber-400/20" title="Dedicated Mobile Portrait Banner">
                              <Image
                                src={b.mobileImage.url}
                                alt="Mobile Banner"
                                fill
                                sizes="32px"
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-8 h-12 rounded-lg bg-slate-900/90 border border-dashed border-slate-700 flex flex-col items-center justify-center text-[7px] text-slate-500 text-center px-0.5" title="Uses Desktop image on phones">
                              Auto
                            </div>
                          )}
                          <span className="text-[9px] text-slate-400 font-medium block text-center mt-0.5">
                            📱 Mobile
                          </span>
                        </div>
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

                  {/* Image Uploaders Section with Dedicated Desktop & Mobile Tabs */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                    {/* Mode Navigation Tabs */}
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div>
                        <span className="font-semibold text-white text-xs flex items-center gap-1.5">
                          <ImageIcon className="w-4 h-4 text-amber-400" />
                          Banner Imagery (Desktop & Mobile)
                        </span>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Upload separate images tailored for widescreen computers and vertical smartphones.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPreviewDevice("DESKTOP")}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                            previewDevice === "DESKTOP"
                              ? "bg-amber-400 text-slate-950 shadow-xs"
                              : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                          }`}
                        >
                          <Monitor className="w-3.5 h-3.5" />
                          <span>Preview Desktop</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewDevice("MOBILE")}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                            previewDevice === "MOBILE"
                              ? "bg-amber-400 text-slate-950 shadow-xs"
                              : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                          }`}
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                          <span>Preview Mobile</span>
                        </button>
                      </div>
                    </div>

                    {/* 1. DESKTOP IMAGE UPLOADER */}
                    <div className="space-y-2.5 p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                          <Monitor className="w-4 h-4 text-amber-400" />
                          🖥️ 1. Desktop Banner Image (3:1 Widescreen) *
                        </span>
                        <span className="text-[10px] text-amber-400 font-medium bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                          Desktop PCs & Laptops • 1920×640
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Displayed on desktop PCs, laptops, and wide monitors.
                      </p>

                      <ImageUploader
                        value={formImageUrl}
                        onChange={(url) => {
                          setFormImageUrl(url);
                          setPreviewDevice("DESKTOP");
                          if (modalError) setModalError(null);
                        }}
                        folder="hero_banners"
                        label="Select or Upload Desktop Image"
                        aspectHint="Recommended: 1920x640 or 2100x700 (3:1 Panoramic format, Max 1 MB)"
                      />
                    </div>

                    {/* 2. MOBILE IMAGE UPLOADER */}
                    <div className="space-y-2.5 p-3.5 rounded-xl bg-amber-400/[0.03] border border-amber-400/30">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                          <Smartphone className="w-4 h-4 text-amber-400" />
                          📱 2. Mobile Banner Image (Separate Smartphone View)
                        </span>
                        {formMobileImageUrl ? (
                          <span className="text-[10px] text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Mobile Image Active
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                            Optional • Fallback to Desktop
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Displayed on mobile phones. Upload a vertical portrait image (Recommended: 3:4 or 9:16, e.g. 1086×1448 or 1080×1920).
                      </p>

                      <ImageUploader
                        value={formMobileImageUrl}
                        onChange={(url) => {
                          setFormMobileImageUrl(url);
                          setPreviewDevice("MOBILE");
                        }}
                        folder="hero_banners"
                        label="Select or Upload Mobile Image"
                        aspectHint="Recommended: 1086x1448 or 1080x1920 (Portrait format, Max 1 MB)"
                      />

                      {formMobileImageUrl && (
                        <div className="flex items-center justify-between pt-1 text-xs">
                          <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                            ✓ Mobile shoppers will see this dedicated portrait graphic.
                          </span>
                          <button
                            type="button"
                            onClick={() => setFormMobileImageUrl("")}
                            className="text-[11px] text-rose-400 hover:text-rose-300 underline font-medium"
                          >
                            Remove mobile image
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Banner Title / Admin Reference */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="font-semibold text-white text-xs flex items-center gap-1.5">
                        <Type className="w-4 h-4 text-amber-400" />
                        Slide Title & Label
                      </span>
                      <span className="text-[10px] text-emerald-400 font-medium">
                        Pure Image Banner
                      </span>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1 flex items-center justify-between">
                        <span>Slide Title / Identification</span>
                        <span className="text-[10px] text-slate-400">For admin reference & image alt</span>
                      </label>
                      <input
                        type="text"
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        placeholder="e.g. Whitening Cream Royal Radiance Hero"
                        className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 outline-none"
                      />
                    </div>

                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-2.5 text-[11px] text-emerald-300">
                      <Sparkles className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                      <div className="space-y-0.5">
                        <p className="font-semibold text-white">Clean Graphic Banner (No Text Overlay)</p>
                        <p className="text-slate-300 leading-relaxed">
                          Your uploaded image will be displayed completely clean and unblocked on both Desktop and Mobile. All headlines, product bottles, and offers designed into the image will be 100% visible and fully clickable to your redirect target.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Sort Order & Status */}





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
                      /* DESKTOP PREVIEW FRAME (3:1 PANORAMIC ZERO CROPPING) */
                      <div className="relative w-full aspect-[3/1] rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shadow-xl flex items-center justify-center">
                        {/* Background Image: Ambient Blur + Zero Cropping */}
                        <div className="absolute inset-0 overflow-hidden">
                          {formImageUrl ? (
                            <>
                              <Image
                                src={formImageUrl}
                                alt="Ambient Glow"
                                fill
                                className="object-cover blur-xl opacity-35 scale-105"
                                unoptimized
                              />
                              <Image
                                src={formImageUrl}
                                alt="Preview"
                                fill
                                className="object-contain object-center"
                                unoptimized
                              />
                            </>
                          ) : (
                            <div className="w-full h-full bg-gradient-to-r from-amber-900/20 to-slate-900 flex items-center justify-center text-slate-600 text-xs">
                              Upload an image to preview
                            </div>
                          )}
                        </div>

                        {/* Clean Graphic indicator badge */}
                        <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-xs text-[10px] text-amber-300 px-2.5 py-1 rounded-lg border border-amber-400/30">
                          ✨ 100% Totally Viewed on Desktop (Zero Cropping)
                        </div>
                      </div>
                    ) : (

                      /* MOBILE SMARTPHONE MOCK FRAME */
                      <div className="flex flex-col items-center">
                        <div className="text-[10px] text-center mb-1.5 text-slate-400">
                          {formMobileImageUrl ? (
                            <span className="text-emerald-400 font-medium">✓ Dedicated Mobile Image Active</span>
                          ) : formMobileFit === "CONTAIN" ? (
                            <span className="text-amber-300 font-medium flex items-center justify-center gap-1">
                              <Sparkles className="w-3 h-3 text-amber-400" />
                              100% Desktop Image Totally Viewed (No Cropping)
                            </span>
                          ) : (
                            <span className="text-slate-500">Desktop Image (Cover)</span>
                          )}
                        </div>

                        <div className="relative w-[230px] aspect-[9/16] rounded-[24px] border-4 border-slate-700 overflow-hidden bg-slate-900 shadow-2xl flex items-center justify-center">
                          {/* Background Image: Supports Total View (Contain) with Luxury Ambient Glow or Full Bleed */}
                          <div className="absolute inset-0 overflow-hidden">
                            {(formMobileImageUrl || formImageUrl) ? (
                              <>
                                {formMobileFit === "CONTAIN" && (
                                  <Image
                                    src={formMobileImageUrl || formImageUrl}
                                    alt="Ambient Glow"
                                    fill
                                    className="object-cover blur-xl opacity-35 scale-110"
                                    unoptimized
                                  />
                                )}
                                <Image
                                  src={formMobileImageUrl || formImageUrl}
                                  alt="Mobile Preview"
                                  fill
                                  className={
                                    formMobileFit === "CONTAIN"
                                      ? "object-contain object-center"
                                      : "object-cover object-center"
                                  }
                                  unoptimized
                                />
                              </>
                            ) : (
                              <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-500 text-[10px] p-2 text-center">
                                Upload image
                              </div>
                            )}
                          </div>

                        {/* Clean Graphic indicator badge */}
                        <div className="absolute bottom-2 left-2 right-2 bg-black/65 backdrop-blur-xs text-center text-[9px] text-amber-300 py-1 rounded-md border border-amber-400/25">
                          ✨ Clean Graphic Banner
                        </div>
                      </div>

                      {/* Direct Status directly under phone mockup */}
                      <div className="mt-3 w-full flex flex-col items-center gap-1.5">
                        <span className="text-xs text-amber-300 font-medium">
                          {formMobileImageUrl ? "📱 Previewing Dedicated Mobile Image" : "📱 Previewing with Desktop Image Fallback"}
                        </span>

                        {formMobileImageUrl ? (
                          <button
                            type="button"
                            onClick={() => setFormMobileImageUrl("")}
                            className="text-[11px] text-rose-400 hover:text-rose-300 underline font-medium transition"
                          >
                            Remove Mobile Image (Use Desktop Fallback)
                          </button>
                        ) : (
                          <p className="text-[10px] text-slate-400 text-center">
                            Currently previewing with desktop image as fallback.
                          </p>
                        )}
                      </div>
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
