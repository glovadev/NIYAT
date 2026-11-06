"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatPaise } from "@/lib/utils";
import {
  Package,
  Plus,
  Search,
  CheckCircle,
  Archive,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  X,
  Sparkles,
  Tag,
  Edit2,
  Trash2,
  AlertTriangle,
  Image as ImageIcon,
} from "lucide-react";
import { ImageUploader } from "@/components/admin/ImageUploader";

interface AdminProductItem {
  id: string;
  name: string;
  slug: string;
  sku: string;
  sizeLabel: string;
  regularPricePaise: number;
  salePricePaise: number | null;
  currency: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  stockQuantity: number;
  lowStockThreshold: number;
  isFeatured: boolean;
  categoryId?: string;
  categoryName: string;
  shortDescription?: string;
  description?: string;
  imageUrl?: string;
  images?: Array<{ url: string; publicId?: string; alt?: string; sortOrder?: number }>;
  ratingAverage: number;
  ratingCount: number;
  createdAt: string;
}

interface CategoryOption {
  id: string;
  name: string;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<AdminProductItem[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Create / Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form Fields
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formSku, setFormSku] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formSize, setFormSize] = useState("50 ml");
  const [formRegularPrice, setFormRegularPrice] = useState("799");
  const [formSalePrice, setFormSalePrice] = useState("649");
  const [formStock, setFormStock] = useState("50");
  const [formLowStock, setFormLowStock] = useState("10");
  const [formShortDesc, setFormShortDesc] = useState("");
  const [formImage1, setFormImage1] = useState("");
  const [formImage2, setFormImage2] = useState("");
  const [formImage3, setFormImage3] = useState("");
  const [formStatus, setFormStatus] = useState<"PUBLISHED" | "DRAFT">("PUBLISHED");
  const [formFeatured, setFormFeatured] = useState(false);

  // Delete Modal State
  const [deletingProduct, setDeletingProduct] = useState<AdminProductItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const adminFetch = (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    if (process.env.NODE_ENV === "development") {
      headers.set("x-dev-admin", "true");
      headers.set("Authorization", "Bearer dev-admin-session");
    }
    return fetch(url, { ...options, headers });
  };

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (searchQuery.trim()) params.set("q", searchQuery.trim());

      const res = await adminFetch(`/api/admin/products?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to load products");
      }
      setProducts(json.data.items || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error fetching products";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      const json = await res.json();
      if (json.success && json.data?.items) {
        setCategories(
          json.data.items.map((c: { id: string; name: string }) => ({
            id: c.id,
            name: c.name,
          }))
        );
        if (json.data.items[0]?.id && !formCategory) {
          setFormCategory(json.data.items[0].id);
        }
      }
    } catch (err) {
      console.error("Could not fetch categories:", err);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProducts();
    }, 200);
    return () => clearTimeout(timer);
  }, [statusFilter, searchQuery]);

  const handleNameChange = (name: string) => {
    setFormName(name);
    if (!editingProductId) {
      // Auto-generate slug and SKU for new products
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      setFormSlug(slug);

      if (!formSku) {
        const initials = name
          .split(" ")
          .map((w) => w[0])
          .join("")
          .toUpperCase()
          .slice(0, 4);
        setFormSku(`NY-${initials || "PROD"}-${Math.floor(100 + Math.random() * 900)}`);
      }
    }
  };

  const openCreateModal = () => {
    setEditingProductId(null);
    setFormName("");
    setFormSlug("");
    setFormSku("");
    setFormCategory(categories[0]?.id || "");
    setFormSize("50 ml");
    setFormRegularPrice("799");
    setFormSalePrice("649");
    setFormStock("50");
    setFormLowStock("10");
    setFormShortDesc("");
    setFormImage1("");
    setFormImage2("");
    setFormImage3("");
    setFormStatus("PUBLISHED");
    setFormFeatured(false);
    setModalError(null);
    setModalOpen(true);
  };

  const openEditModal = (p: AdminProductItem) => {
    setEditingProductId(p.id);
    setFormName(p.name);
    setFormSlug(p.slug);
    setFormSku(p.sku);
    // Find matching category ID
    const matchedCat = categories.find(
      (c) => c.id === p.categoryId || c.name.toLowerCase() === p.categoryName.toLowerCase()
    );
    setFormCategory(matchedCat?.id || p.categoryId || categories[0]?.id || "");
    setFormSize(p.sizeLabel || "50 ml");
    setFormRegularPrice((p.regularPricePaise / 100).toFixed(0));
    setFormSalePrice(p.salePricePaise ? (p.salePricePaise / 100).toFixed(0) : "");
    setFormStock(String(p.stockQuantity ?? 50));
    setFormLowStock(String(p.lowStockThreshold ?? 10));
    setFormShortDesc(p.description || p.shortDescription || "");

    // Load up to 3 images from p.images or fallback to p.imageUrl
    const existingImages =
      p.images && p.images.length > 0
        ? p.images.map((img) => img.url)
        : p.imageUrl
        ? [p.imageUrl]
        : [];

    setFormImage1(existingImages[0] || "");
    setFormImage2(existingImages[1] || "");
    setFormImage3(existingImages[2] || "");

    setFormStatus(p.status === "ARCHIVED" ? "DRAFT" : p.status);
    setFormFeatured(Boolean(p.isFeatured));
    setModalError(null);
    setModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setSubmitting(true);

    try {
      const regularPricePaise = Math.round(parseFloat(formRegularPrice) * 100);
      const salePricePaise = formSalePrice && formSalePrice.trim() !== ""
        ? Math.round(parseFloat(formSalePrice) * 100)
        : null;

      if (isNaN(regularPricePaise) || regularPricePaise <= 0) {
        throw new Error("Regular price must be a valid positive number");
      }

      // Collect up to 3 photos
      // Photo 1 is MANDATORY; Photos 2 and 3 are OPTIONAL
      if (!formImage1.trim()) {
        throw new Error("Photo 1 (Primary Cover) is mandatory. Please upload at least one photo.");
      }

      const uploadedPhotos = [formImage1.trim(), formImage2.trim(), formImage3.trim()].filter(
        (url) => Boolean(url)
      );

      if (uploadedPhotos.length === 0) {
        throw new Error("At least one product photo is mandatory.");
      }

      const preparedImages = uploadedPhotos.map((url, index) => ({
        url,
        publicId: `prod_${Date.now()}_${index}`,
        alt: `${formName.trim()} photo ${index + 1}`,
        sortOrder: index,
      }));

      if (editingProductId) {
        // Edit / Update Existing Product
        const updateBody = {
          name: formName.trim(),
          slug: formSlug.trim(),
          sku: formSku.trim(),
          categoryId: formCategory || undefined,
          sizeLabel: formSize.trim(),
          regularPricePaise,
          salePricePaise,
          stockQuantity: parseInt(formStock, 10) || 0,
          lowStockThreshold: parseInt(formLowStock, 10) || 5,
          status: formStatus,
          isFeatured: formFeatured,
          shortDescription: formShortDesc.trim() || undefined,
          description: formShortDesc.trim() || undefined,
          images: preparedImages,
        };

        const res = await adminFetch(`/api/admin/products/${editingProductId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateBody),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || "Failed to update product");
        }
      } else {
        // Create New Product
        const createBody = {
          name: formName.trim(),
          slug: formSlug.trim(),
          sku: formSku.trim(),
          categoryId: formCategory || categories[0]?.id,
          sizeLabel: formSize.trim(),
          regularPricePaise,
          salePricePaise,
          stockQuantity: parseInt(formStock, 10) || 0,
          lowStockThreshold: parseInt(formLowStock, 10) || 5,
          status: formStatus,
          isFeatured: formFeatured,
          shortDescription: formShortDesc.trim() || undefined,
          description: formShortDesc.trim() || undefined,
          images: preparedImages,
        };

        const res = await adminFetch("/api/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(createBody),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || "Failed to create product");
        }
      }

      setModalOpen(false);
      loadProducts();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving product";
      setModalError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (productId: string, currentStatus: string) => {
    try {
      const endpoint =
        currentStatus === "PUBLISHED"
          ? `/api/admin/products/${productId}/archive`
          : `/api/admin/products/${productId}/publish`;

      const res = await adminFetch(endpoint, { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Status change failed");
      }
      loadProducts();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to toggle status");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingProduct) return;
    setIsDeleting(true);
    try {
      const res = await adminFetch(`/api/admin/products/${deletingProduct.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to delete product");
      }
      setDeletingProduct(null);
      loadProducts();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete product");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-white tracking-wide">
            Product Catalog
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage formulations, pricing, sizes, and storefront publishing.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadProducts}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition"
            title="Refresh Products"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-semibold shadow-md shadow-amber-400/20 transition"
          >
            <Plus className="w-4 h-4" />
            Add New Product
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between bg-slate-950/60 border border-slate-800 p-4 rounded-2xl">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {["ALL", "PUBLISHED", "DRAFT", "ARCHIVED"].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
                statusFilter === tab
                  ? "bg-amber-400 text-slate-950 font-semibold"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, SKU, slug..."
            className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl pl-9 pr-4 py-1.5 text-xs text-white placeholder-slate-500 outline-none transition"
          />
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-6 h-6 text-amber-400 animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Loading catalog formulations...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <Package className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-semibold text-white">No products found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No skincare items match your query. Clear filters or add a new formulation to the
              catalog.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-6">Product</th>
                  <th className="py-3.5 px-6">Category</th>
                  <th className="py-3.5 px-6">Price</th>
                  <th className="py-3.5 px-6">Stock</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {products.map((p) => {
                  const effectivePaise = p.salePricePaise || p.regularPricePaise;
                  const hasDiscount = p.salePricePaise && p.salePricePaise < p.regularPricePaise;

                  return (
                    <tr key={p.id} className="hover:bg-slate-900/40 transition">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3.5">
                          <div className="relative w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shrink-0">
                            {p.imageUrl ? (
                              <Image
                                src={p.imageUrl}
                                alt={p.name}
                                fill
                                sizes="48px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-600">
                                <Package className="w-5 h-5" />
                              </div>
                            )}
                            {p.images && p.images.length > 1 && (
                              <span
                                className="absolute bottom-0 right-0 bg-slate-950/90 text-[9px] font-bold text-amber-400 px-1 py-0.5 rounded-tl border-t border-l border-amber-400/30"
                                title={`${p.images.length} photos uploaded`}
                              >
                                {p.images.length}📷
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-white text-sm hover:text-amber-400 transition">
                              <Link href={`/products/${p.slug}`} target="_blank">
                                {p.name}
                              </Link>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-slate-400 text-[11px]">
                              <span className="font-mono text-slate-400">{p.sku}</span>
                              <span>•</span>
                              <span>{p.sizeLabel}</span>
                              {p.isFeatured && (
                                <>
                                  <span>•</span>
                                  <span className="text-amber-400 font-medium flex items-center gap-0.5">
                                    <Sparkles className="w-3 h-3" /> Featured
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-[11px] font-medium">
                          <Tag className="w-3 h-3 text-amber-400/80" />
                          {p.categoryName}
                        </span>
                      </td>

                      <td className="py-4 px-6">
                        <div className="font-semibold text-white text-xs">
                          {formatPaise(effectivePaise)}
                        </div>
                        {hasDiscount && (
                          <div className="line-through text-slate-500 text-[10px]">
                            {formatPaise(p.regularPricePaise)}
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-6">
                        <div className="font-mono font-medium">
                          {p.stockQuantity}{" "}
                          <span className="text-[10px] text-slate-500 font-sans">units</span>
                        </div>
                        {p.stockQuantity <= p.lowStockThreshold && (
                          <span className="inline-block mt-0.5 text-[9px] text-rose-400 font-semibold uppercase tracking-wider">
                            Low Stock
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                            p.status === "PUBLISHED"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                              : p.status === "DRAFT"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                              : "bg-slate-800 text-slate-400 border border-slate-700"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Storefront View */}
                          <Link
                            href={`/products/${p.slug}`}
                            target="_blank"
                            title="View on Storefront"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>

                          {/* Edit Product */}
                          <button
                            type="button"
                            onClick={() => openEditModal(p)}
                            title="Edit Product Details"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-400/20 text-slate-300 hover:text-amber-400 transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Quick Publish / Archive Toggle */}
                          {p.status === "PUBLISHED" ? (
                            <button
                              type="button"
                              onClick={() => toggleStatus(p.id, p.status)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-amber-900/30 text-slate-400 hover:text-amber-300 transition text-[11px] font-medium"
                              title="Archive from Storefront"
                            >
                              Archive
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => toggleStatus(p.id, p.status)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 font-semibold transition text-[11px]"
                              title="Publish Live to Storefront"
                            >
                              Publish
                            </button>
                          )}

                          {/* Delete Product */}
                          <button
                            type="button"
                            onClick={() => setDeletingProduct(p)}
                            title="Delete Product"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/30 text-slate-400 hover:text-rose-400 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Pinned Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="font-serif font-bold text-base sm:text-lg text-white">
                  {editingProductId ? "Edit Formulation Details" : "Add New NIYAT Formulation"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="mx-4 sm:mx-6 mt-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2 shrink-0">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {/* Scrollable Form Body */}
            <form onSubmit={handleFormSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Product Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="e.g. 24K Radiant Gold Elixir"
                      className="w-full bg-slate-800 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Slug *
                    </label>
                    <input
                      type="text"
                      required
                      value={formSlug}
                      onChange={(e) => setFormSlug(e.target.value)}
                      placeholder="24k-radiant-gold-elixir"
                      className="w-full bg-slate-800 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2 text-white font-mono placeholder-slate-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      SKU Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={formSku}
                      onChange={(e) => setFormSku(e.target.value.toUpperCase())}
                      placeholder="NY-SERUM-01"
                      className="w-full bg-slate-800 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2 text-white font-mono placeholder-slate-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Category *
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-white outline-none cursor-pointer"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Size Label *
                    </label>
                    <input
                      type="text"
                      required
                      value={formSize}
                      onChange={(e) => setFormSize(e.target.value)}
                      placeholder="50 ml / 1.7 fl oz"
                      className="w-full bg-slate-800 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Regular Price (₹ INR) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formRegularPrice}
                      onChange={(e) => setFormRegularPrice(e.target.value)}
                      placeholder="799"
                      className="w-full bg-slate-800 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Sale Price (₹ INR, optional)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formSalePrice}
                      onChange={(e) => setFormSalePrice(e.target.value)}
                      placeholder="649 (Leave empty if no sale discount)"
                      className="w-full bg-slate-800 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Initial Stock Count
                    </label>
                    <input
                      type="number"
                      value={formStock}
                      onChange={(e) => setFormStock(e.target.value)}
                      placeholder="50"
                      className="w-full bg-slate-800 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2 text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Low Stock Alert
                    </label>
                    <input
                      type="number"
                      value={formLowStock}
                      onChange={(e) => setFormLowStock(e.target.value)}
                      placeholder="10"
                      className="w-full bg-slate-800 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2 text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Publish Status
                    </label>
                    <select
                      value={formStatus}
                      onChange={(e) =>
                        setFormStatus(e.target.value as "PUBLISHED" | "DRAFT")
                      }
                      className="w-full bg-slate-800 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-white outline-none cursor-pointer"
                    >
                      <option value="PUBLISHED">PUBLISHED (Live on Store)</option>
                      <option value="DRAFT">DRAFT (Hidden from Store)</option>
                    </select>
                  </div>
                </div>

                {/* Featured Badge Option */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="formFeatured"
                    checked={formFeatured}
                    onChange={(e) => setFormFeatured(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-400 bg-slate-800 border-slate-700 focus:ring-amber-400 cursor-pointer"
                  />
                  <label htmlFor="formFeatured" className="text-slate-300 text-xs cursor-pointer select-none">
                    Mark as Featured Product (Highlight on Homepage)
                  </label>
                </div>

                {/* Product Photos Gallery (Up to 3 Photos) */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-amber-400 font-semibold text-xs flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5" />
                      Product Gallery (Photo 1 Mandatory, Photos 2 &amp; 3 Optional) *
                    </label>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {[formImage1, formImage2, formImage3].filter(Boolean).length}/3 photos added
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    <span className="text-amber-300 font-semibold">Photo 1 (Primary Cover) is mandatory</span> for storefront product cards and catalog views. Photos 2 and 3 are optional.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                    <div>
                      <ImageUploader
                        value={formImage1}
                        onChange={(url) => setFormImage1(url)}
                        folder="products"
                        label="Photo 1 (Primary Cover) *"
                        aspectHint="Mandatory • Square (800x800)"
                      />
                    </div>

                    <div>
                      <ImageUploader
                        value={formImage2}
                        onChange={(url) => setFormImage2(url)}
                        folder="products"
                        label="Photo 2 (Angle / Texture)"
                        aspectHint="Optional • Secondary view"
                      />
                    </div>

                    <div>
                      <ImageUploader
                        value={formImage3}
                        onChange={(url) => setFormImage3(url)}
                        folder="products"
                        label="Photo 3 (Packaging / Details)"
                        aspectHint="Optional • Packaging/detail"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-300 font-medium">
                      Product Description
                    </label>
                    <span className="text-[10px] text-slate-500">
                      No character limit
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={formShortDesc}
                    onChange={(e) => setFormShortDesc(e.target.value)}
                    placeholder="Enter full formulation description, key benefits, active botanical extracts, and application ritual..."
                    className="w-full bg-slate-800 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 outline-none leading-relaxed"
                  />
                </div>
              </div>

              {/* Pinned Modal Footer */}
              <div className="p-4 sm:p-5 border-t border-slate-800 flex items-center justify-end gap-3 shrink-0 bg-slate-900/95">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition font-medium text-xs sm:text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold shadow-md shadow-amber-400/20 transition disabled:opacity-50 text-xs sm:text-sm"
                >
                  {submitting ? "Saving..." : editingProductId ? "Update Product" : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg text-white">Delete Product</h3>
                <p className="text-xs text-slate-400">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-white">&quot;{deletingProduct.name}&quot;</span>?
              If this product has existing customer orders, it will be safely archived instead of
              corrupting order histories.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingProduct(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold transition text-xs shadow-md shadow-rose-500/20 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
