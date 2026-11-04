"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/api/admin-client";
import {
  Star,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Trash2,
  ExternalLink,
  ShieldCheck,
  MessageSquare,
} from "lucide-react";

interface AdminReviewItem {
  id: string;
  productName: string;
  productSlug?: string;
  customerName: string;
  customerEmail?: string;
  rating: number;
  title: string;
  body: string;
  moderationStatus: "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
  verificationStatus: "VERIFIED_PURCHASE" | "UNVERIFIED";
  createdAt: string;
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<AdminReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const loadReviews = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);

      const res = await adminFetch<{ items: AdminReviewItem[] }>(
        `/api/admin/reviews?${params.toString()}`
      );
      if (!res.ok || !res.data) {
        throw new Error(res.error?.message || "Failed to load reviews");
      }
      setReviews(res.data.items || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error fetching reviews";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [statusFilter]);

  const handleModerate = async (
    reviewId: string,
    status: "APPROVED" | "REJECTED"
  ) => {
    setActionInProgress(reviewId);
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Moderation action failed");
      }
      loadReviews();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!confirm("Are you sure you want to permanently delete this customer review?"))
      return;
    setActionInProgress(reviewId);
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Deletion failed");
      }
      loadReviews();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete review");
    } finally {
      setActionInProgress(null);
    }
  };

  const pendingCount = reviews.filter(
    (r) => r.moderationStatus === "PENDING_APPROVAL"
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-white tracking-wide">
            Customer Reviews Moderation Queue
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Approve verified buyer feedback, filter spam, and maintain brand authenticity.
          </p>
        </div>
        <button
          type="button"
          onClick={loadReviews}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Queue
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 bg-slate-950/60 border border-slate-800 p-2 rounded-2xl overflow-x-auto">
        {[
          { id: "ALL", label: "All Reviews" },
          { id: "PENDING_APPROVAL", label: `Pending (${pendingCount})` },
          { id: "APPROVED", label: "Approved (Public)" },
          { id: "REJECTED", label: "Rejected" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setStatusFilter(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition whitespace-nowrap ${
              statusFilter === tab.id
                ? "bg-amber-400 text-slate-950 font-semibold shadow-md shadow-amber-400/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-16 text-center text-slate-500 text-sm">
            {loading ? "Loading moderation queue..." : "No reviews found in this view."}
          </div>
        ) : (
          reviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 transition hover:border-slate-700 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {/* Star Rating */}
                  <div className="flex items-center gap-0.5 text-amber-400">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= rev.rating ? "fill-amber-400 text-amber-400" : "text-slate-700"
                        }`}
                      />
                    ))}
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                      rev.moderationStatus === "APPROVED"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        : rev.moderationStatus === "REJECTED"
                        ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                        : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                    }`}
                  >
                    {rev.moderationStatus}
                  </span>

                  {rev.verificationStatus === "VERIFIED_PURCHASE" && (
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      <ShieldCheck className="w-3 h-3" />
                      Verified Purchase
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-slate-500">
                  Submitted {new Date(rev.createdAt).toLocaleDateString("en-IN", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
              </div>

              {/* Review Title & Body */}
              <div>
                <h4 className="text-white font-semibold text-sm mb-1">{rev.title}</h4>
                <p className="text-slate-300 text-xs leading-relaxed">{rev.body}</p>
              </div>

              {/* Meta & Actions Bar */}
              <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="text-slate-300 font-medium">{rev.customerName}</span>
                  {rev.customerEmail && (
                    <span className="text-slate-500 text-[11px]">({rev.customerEmail})</span>
                  )}
                  <span>•</span>
                  <span>Product:</span>
                  <Link
                    href={`/products/${rev.productSlug}`}
                    target="_blank"
                    className="text-amber-400 hover:underline inline-flex items-center gap-1 font-medium"
                  >
                    {rev.productName}
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>

                <div className="flex items-center gap-2">
                  {rev.moderationStatus !== "APPROVED" && (
                    <button
                      type="button"
                      disabled={actionInProgress === rev.id}
                      onClick={() => handleModerate(rev.id, "APPROVED")}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Approve
                    </button>
                  )}

                  {rev.moderationStatus !== "REJECTED" && (
                    <button
                      type="button"
                      disabled={actionInProgress === rev.id}
                      onClick={() => handleModerate(rev.id, "REJECTED")}
                      className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/30 text-slate-400 hover:text-rose-300 border border-slate-700 text-xs font-medium transition flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reject
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={actionInProgress === rev.id}
                    onClick={() => handleDelete(rev.id)}
                    title="Delete review"
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-500 hover:text-rose-400 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
