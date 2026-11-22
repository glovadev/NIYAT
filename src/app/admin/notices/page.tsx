"use client";

import React, { useEffect, useState } from "react";
import { adminRawFetch as adminFetch } from "@/lib/api/admin-client";
import { NoticeSection, NoticeData } from "@/components/storefront/NoticeSection";
import {
  Megaphone,
  Sparkles,
  Bell,
  AlertCircle,
  Truck,
  Gift,
  Info,
  CheckCircle2,
  RefreshCw,
  Plus,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  Save,
  Power,
  ExternalLink,
  Layers,
  ArrowRight,
} from "lucide-react";

interface AdminNoticeItem {
  id: string;
  title: string;
  message: string;
  badge: string;
  linkUrl: string;
  linkText: string;
  theme: "EMERALD" | "GOLD" | "DARK" | "AMBER";
  icon: "SPARKLES" | "BELL" | "ALERT" | "TRUCK" | "GIFT" | "INFO";
  isActive: boolean;
  showOnTopBar: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

const THEMES = [
  {
    id: "EMERALD" as const,
    label: "Royal Emerald",
    desc: "Signature UAE Deep Forest Green with 24K Gold accents",
    colorBox: "bg-emerald-950 border-emerald-700 text-emerald-300",
  },
  {
    id: "GOLD" as const,
    label: "24K Festive Gold",
    desc: "Warm radiant festive cream & gold with royal typography",
    colorBox: "bg-amber-100 border-amber-300 text-amber-900",
  },
  {
    id: "DARK" as const,
    label: "Midnight Noir",
    desc: "Luxurious obsidian dark background with champagne shimmer",
    colorBox: "bg-slate-900 border-slate-700 text-slate-100",
  },
  {
    id: "AMBER" as const,
    label: "Warm Advisory",
    desc: "Attention-grabbing amber alert for weather, courier, or stock updates",
    colorBox: "bg-amber-50 border-amber-200 text-amber-800",
  },
];

const ICONS = [
  { id: "SPARKLES" as const, label: "Sparkles", Icon: Sparkles },
  { id: "BELL" as const, label: "Announcement Bell", Icon: Bell },
  { id: "ALERT" as const, label: "Important Alert", Icon: AlertCircle },
  { id: "TRUCK" as const, label: "Courier / Delivery", Icon: Truck },
  { id: "GIFT" as const, label: "Special Offer", Icon: Gift },
  { id: "INFO" as const, label: "General Info", Icon: Info },
];

export default function AdminNoticesPage() {
  const [notices, setNotices] = useState<AdminNoticeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("Holiday Express Dispatch & White-Glove Delivery Notice");
  const [message, setMessage] = useState(
    "All orders placed before 3:00 PM are prepared with certified tamper-proof apothecary seals and dispatched same-day via white-glove express courier."
  );
  const [badge, setBadge] = useState("Notice & Update");
  const [linkUrl, setLinkUrl] = useState("/shop");
  const [linkText, setLinkText] = useState("Explore The Collection");
  const [theme, setTheme] = useState<"EMERALD" | "GOLD" | "DARK" | "AMBER">("EMERALD");
  const [icon, setIcon] = useState<"SPARKLES" | "BELL" | "ALERT" | "TRUCK" | "GIFT" | "INFO">("SPARKLES");
  const [isActive, setIsActive] = useState(false);
  const [showOnTopBar, setShowOnTopBar] = useState(false);

  // Active notice item in database
  const activeNotice = notices.find((n) => n.isActive) || null;

  const loadNotices = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/notices");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to load notices");
      }

      const items: AdminNoticeItem[] = json.data.items || [];
      setNotices(items);

      // If there is an active notice and nothing is currently being edited, load it into the form
      const currentActive = items.find((n) => n.isActive);
      if (currentActive && !editingId) {
        setEditingId(currentActive.id);
        setTitle(currentActive.title);
        setMessage(currentActive.message);
        setBadge(currentActive.badge);
        setLinkUrl(currentActive.linkUrl);
        setLinkText(currentActive.linkText);
        setTheme(currentActive.theme);
        setIcon(currentActive.icon);
        setIsActive(Boolean(currentActive.isActive));
        setShowOnTopBar(Boolean(currentActive.showOnTopBar));
      } else if (items.length > 0 && !editingId) {
        const first = items[0];
        setEditingId(first.id);
        setTitle(first.title);
        setMessage(first.message);
        setBadge(first.badge);
        setLinkUrl(first.linkUrl);
        setLinkText(first.linkText);
        setTheme(first.theme);
        setIcon(first.icon);
        setIsActive(Boolean(first.isActive));
        setShowOnTopBar(Boolean(first.showOnTopBar));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error loading notices";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotices();
  }, []);

  // Quick Master Toggle: Enable / Disable current notice
  const handleToggleMasterActive = async () => {
    setError(null);
    setSuccessMsg(null);
    setSaving(true);

    try {
      if (editingId) {
        const nextState = !isActive;
        const res = await adminFetch(`/api/admin/notices/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: nextState }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || "Failed to toggle status");
        }
        setIsActive(nextState);
        setSuccessMsg(
          nextState
            ? "Notice section is now ACTIVE and visible on the storefront!"
            : "Notice section is now DISABLED and hidden from the storefront."
        );
        await loadNotices();
      } else {
        // If creating new
        setIsActive(!isActive);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to toggle notice";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotice = async (activateNow: boolean) => {
    if (!title.trim() || !message.trim()) {
      setError("Please provide both a Title and a Message for the notice.");
      return;
    }

    setError(null);
    setSuccessMsg(null);
    setSaving(true);

    const payload = {
      title: title.trim(),
      message: message.trim(),
      badge: badge.trim() || "Notice & Update",
      linkUrl: linkUrl.trim(),
      linkText: linkText.trim(),
      theme,
      icon,
      isActive: activateNow,
      showOnTopBar,
    };

    try {
      if (editingId) {
        const res = await adminFetch(`/api/admin/notices/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || "Failed to update notice");
        }
        setIsActive(activateNow);
        setSuccessMsg(
          activateNow
            ? "Notice updated and PUBLISHED to the live storefront!"
            : "Notice updated and saved as DISABLED (hidden)."
        );
      } else {
        const res = await adminFetch("/api/admin/notices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || "Failed to create notice");
        }
        setEditingId(json.data.id);
        setIsActive(activateNow);
        setSuccessMsg(
          activateNow
            ? "New notice created and PUBLISHED to the live storefront!"
            : "New notice saved as DISABLED (hidden)."
        );
      }
      await loadNotices();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving notice";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleEditNotice = (item: AdminNoticeItem) => {
    setEditingId(item.id);
    setTitle(item.title);
    setMessage(item.message);
    setBadge(item.badge);
    setLinkUrl(item.linkUrl);
    setLinkText(item.linkText);
    setTheme(item.theme);
    setIcon(item.icon);
    setIsActive(Boolean(item.isActive));
    setShowOnTopBar(Boolean(item.showOnTopBar));
    setError(null);
    setSuccessMsg(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteNotice = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this notice?")) return;

    setError(null);
    setSuccessMsg(null);
    try {
      const res = await adminFetch(`/api/admin/notices/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to delete notice");
      }
      setSuccessMsg("Notice deleted successfully.");
      if (editingId === id) {
        setEditingId(null);
        setTitle("");
        setMessage("");
        setIsActive(false);
      }
      await loadNotices();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error deleting notice";
      setError(msg);
    }
  };

  const handleCreateNew = () => {
    setEditingId(null);
    setTitle("");
    setMessage("");
    setBadge("Notice & Update");
    setLinkUrl("/shop");
    setLinkText("Explore The Collection");
    setTheme("EMERALD");
    setIcon("SPARKLES");
    setIsActive(false);
    setShowOnTopBar(false);
    setError(null);
    setSuccessMsg(null);
  };

  // Live preview notice data constructed from form state
  const previewNotice: NoticeData = {
    title: title || "Your Notice Headline Appears Here",
    message:
      message ||
      "Enter your announcement or update message in the editor to see it rendered live here.",
    badge: badge || "Official Notice",
    linkUrl: linkUrl || "",
    linkText: linkText || "Learn More",
    theme,
    icon,
    isActive: true, // Always show in preview box
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded-md bg-amber-400/10 text-amber-400 border border-amber-400/20">
              <Megaphone className="w-4 h-4" />
            </span>
            <span className="text-xs font-semibold tracking-wider uppercase text-amber-400">
              Storefront Announcements & Advisories
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-wide">
            Notice & Update Manager
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Give any update or announcement for your patrons. When enabled, it appears prominently
            on the storefront; when disabled, it is completely hidden.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/notices"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition"
          >
            <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
            <span>View Dedicated Page</span>
          </a>
          <button
            type="button"
            onClick={loadNotices}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={handleCreateNew}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-semibold shadow-md shadow-amber-400/20 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            New Notice
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* MASTER TOGGLE CARD */}
      <div
        className={`rounded-2xl border p-6 transition-all relative overflow-hidden ${
          isActive
            ? "bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-950 border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.15)]"
            : "bg-slate-950/80 border-slate-800 shadow-md"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            <div
              className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 transition-colors ${
                isActive
                  ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-inner"
                  : "bg-slate-800/80 border-slate-700 text-slate-400"
              }`}
            >
              <Power className={`w-6 h-6 ${isActive ? "text-emerald-400" : "text-slate-500"}`} />
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide uppercase border ${
                    isActive
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : "bg-slate-800 text-slate-400 border-slate-700"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isActive ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
                    }`}
                  />
                  {isActive ? "LIVE ON STOREFRONT" : "SECTION IS DISABLED & HIDDEN"}
                </span>

                {editingId && (
                  <span className="text-xs text-slate-400 hidden sm:inline">
                    Editing ID: <code className="text-slate-300 font-mono">{editingId.slice(-6)}</code>
                  </span>
                )}
              </div>

              <h2 className="text-lg font-serif font-bold text-white mt-1">
                {isActive
                  ? "Store Notice is currently Active and visible to all visitors."
                  : "Store Notice is currently Disabled (customers cannot see this section)."}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Use the master switch below to instantly show or hide this section on the storefront.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleMasterActive}
            disabled={saving}
            className={`px-5 py-3 rounded-xl font-semibold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 shrink-0 ${
              isActive
                ? "bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 shadow-sm"
                : "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 font-bold"
            }`}
          >
            <Power className="w-4 h-4" />
            <span>{isActive ? "Disable Notice Section" : "Enable & Show On Storefront"}</span>
          </button>
        </div>
      </div>

      {/* TWO COLUMN GRID: EDITOR FORM (LEFT) & LIVE PREVIEW (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: NOTICE EDITOR */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-amber-400" />
                <h3 className="font-serif font-bold text-base text-white">
                  {editingId ? "Edit Notice Content" : "Create New Store Notice"}
                </h3>
              </div>
              <span className="text-xs text-slate-400">All fields update live</span>
            </div>

            {/* Notice Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Headline / Title <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Grand Festive Dispatch & Courier Update"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
              />
            </div>

            {/* Notice Message */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Body Message <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write the full update or notice text for patrons..."
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-400 transition resize-y"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Supports multiple paragraphs and clean line breaks.
              </p>
            </div>

            {/* Badge & Icon Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Badge / Tag Label
                </label>
                <input
                  type="text"
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  placeholder="e.g., Notice & Update, Special Announcement"
                  className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Accompanying Icon
                </label>
                <div className="grid grid-cols-6 gap-1.5">
                  {ICONS.map((item) => {
                    const IconComp = item.Icon;
                    const isSelected = icon === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setIcon(item.id)}
                        title={item.label}
                        className={`h-10 rounded-xl border flex items-center justify-center transition-all ${
                          isSelected
                            ? "bg-amber-400 text-slate-950 border-amber-300 shadow-md shadow-amber-400/20"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                        }`}
                      >
                        <IconComp className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Color Theme Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                Visual Styling Theme
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {THEMES.map((t) => {
                  const isSelected = theme === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTheme(t.id)}
                      className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                        isSelected
                          ? "bg-slate-800/90 border-amber-400 shadow-md shadow-amber-400/10"
                          : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-md border shrink-0 mt-0.5 flex items-center justify-center ${t.colorBox}`}
                      >
                        {isSelected && <div className="w-2 h-2 rounded-full bg-current" />}
                      </div>
                      <div>
                        <div
                          className={`text-xs font-bold ${
                            isSelected ? "text-amber-300" : "text-white"
                          }`}
                        >
                          {t.label}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                          {t.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Call to Action Button */}
            <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-3">
              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Optional Call To Action Button
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Button Target Link (e.g. /shop, /categories/face-cream)
                  </label>
                  <input
                    type="text"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="/shop"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-750 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Button Label Text
                  </label>
                  <input
                    type="text"
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    placeholder="Explore Collection"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-750 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
                  />
                </div>
              </div>
            </div>

            {/* Top Bar Checkbox */}
            <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/40 border border-slate-800 cursor-pointer hover:border-slate-700 transition">
              <input
                type="checkbox"
                checked={showOnTopBar}
                onChange={(e) => setShowOnTopBar(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 text-amber-400 focus:ring-amber-400 bg-slate-900"
              />
              <div className="text-xs">
                <span className="text-white font-medium">
                  Also mirror as top announcement ribbon on all pages
                </span>
                <span className="block text-slate-400 text-[11px] mt-0.5">
                  Displays a sleek, dismissible top banner above the main navigation bar.
                </span>
              </div>
            </label>

            {/* Submit & Save Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={() => handleSaveNotice(true)}
                disabled={saving}
                className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs tracking-wide uppercase shadow-lg shadow-amber-400/20 transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? "Saving..." : "Save & Make Active (Live)"}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveNotice(false)}
                disabled={saving}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 font-semibold text-xs tracking-wide uppercase transition disabled:opacity-50"
              >
                <EyeOff className="w-4 h-4" />
                <span>Save as Disabled</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: REAL-TIME STOREFRONT PREVIEW */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-400" />
                <h3 className="font-serif font-bold text-sm text-white">
                  Live Storefront Preview
                </h3>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                Interactive
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              This preview matches the exact responsive styling that your customer patrons will see
              on the homepage when this notice is enabled:
            </p>

            {/* Live Component Preview Container */}
            <div className="rounded-2xl bg-[#FCFAF6] p-2 sm:p-4 border border-[#D4AF37]/30 shadow-inner">
              <div className="text-[10px] font-mono text-stone-400 uppercase tracking-widest text-center mb-2 select-none">
                — Home Page Section Rendering —
              </div>
              <NoticeSection notice={previewNotice} />
            </div>

            {/* Preview Status Note */}
            <div className="mt-4 p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center justify-between text-slate-300 font-medium">
                <span>Current Section State:</span>
                <span className={isActive ? "text-emerald-400 font-bold" : "text-slate-400"}>
                  {isActive ? "Visible to Customers" : "Hidden (Disabled)"}
                </span>
              </div>
              <p>
                When disabled, this section is completely removed from the homepage and occupies zero space.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* NOTICE HISTORY & SAVED ARCHIVE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <h2 className="font-serif font-bold text-base text-white">
              Notice History & Saved Updates ({notices.length})
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            Switch between pre-saved notices with 1 click
          </span>
        </div>

        {notices.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs">
            No notices saved yet. Create your first announcement above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Headline</th>
                  <th className="py-3 px-4">Badge / Tag</th>
                  <th className="py-3 px-4">Theme</th>
                  <th className="py-3 px-4">Last Updated</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {notices.map((item) => {
                  const isCurrentEditing = editingId === item.id;
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-850/60 transition ${
                        isCurrentEditing ? "bg-slate-800/40" : ""
                      }`}
                    >
                      <td className="py-3 px-4">
                        {item.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase bg-slate-800 text-slate-400 border border-slate-700">
                            Disabled
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-medium text-white max-w-xs truncate">
                        {item.title}
                      </td>
                      <td className="py-3 px-4 text-slate-400">{item.badge}</td>
                      <td className="py-3 px-4">
                        <span className="text-[11px] font-mono text-amber-300">{item.theme}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {new Date(item.updatedAt).toLocaleDateString("en-IN", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          {!item.isActive && (
                            <button
                              type="button"
                              onClick={async () => {
                                const res = await adminFetch(`/api/admin/notices/${item.id}`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ isActive: true }),
                                });
                                if (res.ok) {
                                  setSuccessMsg(`"${item.title}" is now LIVE!`);
                                  await loadNotices();
                                }
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-medium transition"
                            >
                              Activate
                            </button>
                          )}
                          {item.isActive && (
                            <button
                              type="button"
                              onClick={async () => {
                                const res = await adminFetch(`/api/admin/notices/${item.id}`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ isActive: false }),
                                });
                                if (res.ok) {
                                  setSuccessMsg(`Notice disabled.`);
                                  await loadNotices();
                                }
                              }}
                              className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-[11px] font-medium transition"
                            >
                              Deactivate
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleEditNotice(item)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                            title="Edit notice"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteNotice(item.id)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition"
                            title="Delete notice"
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
    </div>
  );
}
