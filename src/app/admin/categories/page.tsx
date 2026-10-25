"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  FolderTree,
  Plus,
  RefreshCw,
  Search,
  ExternalLink,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  Package,
} from "lucide-react";
import { ImageUploader } from "@/components/admin/ImageUploader";

interface AdminCategoryItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  image?: {
    url: string;
    publicId: string;
    alt: string;
  };
  sortOrder: number;
  status: "ACTIVE" | "ARCHIVED";
  productCount: number;
  createdAt: string;
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<AdminCategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form Fields
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formSortOrder, setFormSortOrder] = useState("0");
  const [formStatus, setFormStatus] = useState<"ACTIVE" | "ARCHIVED">("ACTIVE");

  const adminFetch = (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    if (process.env.NODE_ENV === "development") {
      headers.set("x-dev-admin", "true");
      headers.set("Authorization", "Bearer dev-admin-session");
    }
    return fetch(url, { ...options, headers });
  };

  const loadCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/categories");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to load categories");
      }
      setCategories(json.data.items || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error fetching categories";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const openCreateModal = () => {
    setEditingCategoryId(null);
    setFormName("");
    setFormSlug("");
    setFormDescription("");
    setFormImageUrl("");
    setFormSortOrder(String(categories.length));
    setFormStatus("ACTIVE");
    setModalError(null);
    setModalOpen(true);
  };

  const openEditModal = (cat: AdminCategoryItem) => {
    setEditingCategoryId(cat.id);
    setFormName(cat.name);
    setFormSlug(cat.slug);
    setFormDescription(cat.description || "");
    setFormImageUrl(cat.image?.url || "");
    setFormSortOrder(String(cat.sortOrder ?? 0));
    setFormStatus(cat.status);
    setModalError(null);
    setModalOpen(true);
  };

  const handleNameChange = (val: string) => {
    setFormName(val);
    if (!editingCategoryId) {
      // Auto-generate slug for new category
      const autoSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setFormSlug(autoSlug);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setSubmitting(true);

    try {
      if (!formName.trim()) {
        throw new Error("Category name is required");
      }

      const sortOrder = parseInt(formSortOrder, 10) || 0;

      if (editingCategoryId) {
        // Update existing category
        const res = await adminFetch(`/api/admin/categories/${editingCategoryId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName.trim(),
            slug: formSlug.trim(),
            description: formDescription.trim() || null,
            imageUrl: formImageUrl.trim() || null,
            sortOrder,
            status: formStatus,
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || "Failed to update category");
        }
      } else {
        // Create new category
        const res = await adminFetch("/api/admin/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName.trim(),
            slug: formSlug.trim() || undefined,
            description: formDescription.trim() || undefined,
            imageUrl: formImageUrl.trim() || undefined,
            sortOrder,
            status: formStatus,
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || "Failed to create category");
        }
      }

      setModalOpen(false);
      loadCategories();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving category";
      setModalError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (cat: AdminCategoryItem) => {
    try {
      const nextStatus = cat.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE";
      const res = await adminFetch(`/api/admin/categories/${cat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to toggle status");
      }
      loadCategories();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to toggle status");
    }
  };

  const handleDelete = async (cat: AdminCategoryItem) => {
    if (
      !confirm(
        cat.productCount > 0
          ? `This category has ${cat.productCount} products. It will be archived instead of deleted. Continue?`
          : `Are you sure you want to delete category "${cat.name}"?`
      )
    ) {
      return;
    }

    try {
      const res = await adminFetch(`/api/admin/categories/${cat.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to delete category");
      }
      loadCategories();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Deletion failed");
    }
  };

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-white tracking-wide">
            Product Categories
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage your store's categories. All categories synchronize across the homepage and shop filters in real-time.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadCategories}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition"
            title="Refresh Categories"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-semibold shadow-md shadow-amber-400/20 transition"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 p-3 rounded-2xl">
        <Search className="w-4 h-4 text-slate-500 ml-2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search categories by name or slug..."
          className="bg-transparent border-none text-xs text-white placeholder-slate-500 focus:outline-none flex-1"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="text-xs text-slate-400 hover:text-white mr-2"
          >
            Clear
          </button>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Categories Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 border-b border-slate-800 uppercase tracking-wider text-[10px] text-slate-400">
              <tr>
                <th className="py-3.5 px-4">Image</th>
                <th className="py-3.5 px-4">Category Name</th>
                <th className="py-3.5 px-4">Slug</th>
                <th className="py-3.5 px-4">Products</th>
                <th className="py-3.5 px-4">Sort Order</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                      <span>Loading categories...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    <FolderTree className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p>No categories found.</p>
                  </td>
                </tr>
              ) : (
                filteredCategories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-800/40 transition">
                    {/* Image */}
                    <td className="py-3 px-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700/60 overflow-hidden relative flex items-center justify-center">
                        {cat.image?.url ? (
                          <Image
                            src={cat.image.url}
                            alt={cat.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <FolderTree className="w-5 h-5 text-slate-500" />
                        )}
                      </div>
                    </td>

                    {/* Name */}
                    <td className="py-3 px-4 font-semibold text-white">
                      <div>{cat.name}</div>
                      {cat.description && (
                        <div className="text-[11px] text-slate-400 font-normal line-clamp-1 mt-0.5">
                          {cat.description}
                        </div>
                      )}
                    </td>

                    {/* Slug */}
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                      {cat.slug}
                    </td>

                    {/* Products */}
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-[10px]">
                        <Package className="w-3 h-3 text-amber-400" />
                        {cat.productCount} products
                      </span>
                    </td>

                    {/* Sort Order */}
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {cat.sortOrder ?? 0}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <button
                        onClick={() => toggleStatus(cat)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition ${
                          cat.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                            : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            cat.status === "ACTIVE" ? "bg-emerald-400" : "bg-slate-500"
                          }`}
                        />
                        {cat.status}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/shop?category=${cat.slug}`}
                          target="_blank"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                          title="View Category on Storefront"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => openEditModal(cat)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition"
                          title="Edit Category"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(cat)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                          title="Delete Category"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create or Edit Category */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={() => setModalOpen(false)}
          />

          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="font-serif text-lg font-bold text-white">
                  {editingCategoryId ? "Edit Category" : "Add New Category"}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Category will instantly show on Homepage and Shop filters.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Error */}
            {modalError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleFormSubmit} className="mt-6 space-y-4">
              {/* Category Name */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Face Wash, Serums, Moisturizers"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
                />
              </div>

              {/* Category Slug */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  URL Slug *
                </label>
                <input
                  type="text"
                  required
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  placeholder="e.g. face-wash"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition font-mono"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Brief description for customer discovery and SEO"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition resize-none"
                />
              </div>

              {/* Image Uploader */}
              <div>
                <ImageUploader
                  value={formImageUrl}
                  onChange={(url) => setFormImageUrl(url)}
                  folder="categories"
                  label="Category Circle Image"
                  aspectHint="Recommended: Square image up to 1 MB"
                />
              </div>

              {/* Sort Order & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={formSortOrder}
                    onChange={(e) => setFormSortOrder(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-400 transition font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as "ACTIVE" | "ARCHIVED")}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-400 transition"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-semibold shadow-md shadow-amber-400/20 transition disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingCategoryId ? "Update Category" : "Create Category"}</span>
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
