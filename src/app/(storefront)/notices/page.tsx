import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Notice, INotice } from "@/models/Notice";
import {
  Sparkles,
  Bell,
  AlertCircle,
  Truck,
  Gift,
  Info,
  ChevronRight,
  ShieldCheck,
  Calendar,
  Clock,
  ArrowRight,
  ExternalLink,
  ArrowLeft,
  CheckCircle2,
  Megaphone,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Store Notices & Updates | NIYAT Luxury Skincare",
  description:
    "Official notices, courier advisories, festive dispatch schedules, and announcements from NIYAT Royal Apothecary.",
};

const ICONS = {
  SPARKLES: Sparkles,
  BELL: Bell,
  ALERT: AlertCircle,
  TRUCK: Truck,
  GIFT: Gift,
  INFO: Info,
};

type ThemeKey = "EMERALD" | "GOLD" | "DARK" | "AMBER";

const THEME_STYLES: Record<
  ThemeKey,
  {
    wrapper: string;
    badge: string;
    iconBox: string;
    title: string;
    body: string;
    cta: string;
    flair: string;
    meta: string;
  }
> = {
  EMERALD: {
    wrapper:
      "bg-gradient-to-br from-[#061B14] via-[#0A261D] to-[#04120D] text-white border-[#D4AF37]/40 shadow-[0_16px_50px_rgba(10,38,29,0.25)]",
    badge: "bg-[#D4AF37]/20 text-[#FCF6BA] border-[#D4AF37]/40",
    iconBox: "bg-[#D4AF37]/20 border-[#D4AF37]/50 text-[#FCF6BA]",
    title: "text-white",
    body: "text-white/90",
    cta: "bg-gradient-to-r from-[#D4AF37] via-[#E5C158] to-[#AA7C11] text-[#0A261D] hover:shadow-[0_6px_25px_rgba(212,175,55,0.4)]",
    flair: "text-[#D4AF37]/50",
    meta: "text-[#FCF6BA]/70",
  },
  GOLD: {
    wrapper:
      "bg-gradient-to-br from-[#FAF0D7] via-[#FFF9ED] to-[#F5E6C4] text-[#0A261D] border-[#D4AF37]/60 shadow-[0_16px_50px_rgba(212,175,55,0.18)]",
    badge: "bg-[#0A261D]/10 text-[#0A261D] border-[#0A261D]/25 font-bold",
    iconBox: "bg-[#D4AF37]/30 border-[#D4AF37]/70 text-[#0A261D]",
    title: "text-[#0A261D]",
    body: "text-stone-800",
    cta: "bg-[#0A261D] text-[#FCF6BA] hover:bg-[#153D32] hover:shadow-[0_6px_25px_rgba(10,38,29,0.3)]",
    flair: "text-[#B38728]/50",
    meta: "text-stone-600",
  },
  DARK: {
    wrapper:
      "bg-gradient-to-br from-[#0B0F19] via-[#111827] to-[#070A10] text-white border-slate-700/80 shadow-[0_16px_50px_rgba(0,0,0,0.4)]",
    badge: "bg-slate-800 text-amber-300 border-amber-400/30",
    iconBox: "bg-amber-400/15 border-amber-400/40 text-amber-300",
    title: "text-white",
    body: "text-slate-200",
    cta: "bg-amber-400 text-slate-950 hover:bg-amber-300 hover:shadow-[0_6px_25px_rgba(251,191,36,0.3)] font-semibold",
    flair: "text-amber-400/40",
    meta: "text-slate-400",
  },
  AMBER: {
    wrapper:
      "bg-gradient-to-br from-[#FFFBEB] via-[#FEF3C7] to-[#FDE68A] text-stone-900 border-amber-300/80 shadow-[0_16px_50px_rgba(245,158,11,0.15)]",
    badge: "bg-amber-500/20 text-amber-900 border-amber-400/50 font-bold",
    iconBox: "bg-amber-500/25 border-amber-500/60 text-amber-900",
    title: "text-stone-900",
    body: "text-stone-800",
    cta: "bg-amber-900 text-amber-50 hover:bg-amber-950 hover:shadow-[0_6px_25px_rgba(120,53,15,0.3)] font-semibold",
    flair: "text-amber-600/40",
    meta: "text-stone-600",
  },
};

interface PageProps {
  searchParams: Promise<{ id?: string }>;
}

export default async function NoticesPage({ searchParams }: PageProps) {
  const { id: queryId } = await searchParams;

  let featuredNotice: any = null;
  let otherNotices: any[] = [];

  try {
    await connectToDatabase();

    if (queryId) {
      featuredNotice = await Notice.findById(queryId).lean();
    }

    if (!featuredNotice) {
      featuredNotice = await Notice.findOne({ isActive: true })
        .sort({ sortOrder: 1, updatedAt: -1 })
        .lean();
    }

    // Fetch archive of other notices
    const allNotices = await Notice.find()
      .sort({ isActive: -1, updatedAt: -1 })
      .limit(10)
      .lean();

    otherNotices = allNotices.filter(
      (n) => String(n._id) !== (featuredNotice ? String(featuredNotice._id) : "")
    );
  } catch (error) {
    console.error("NoticesPage: Failed to fetch notices from database:", error);
  }

  const rawTheme = String(featuredNotice?.theme || "EMERALD");
  const theme: ThemeKey =
    rawTheme === "GOLD" || rawTheme === "DARK" || rawTheme === "AMBER"
      ? (rawTheme as ThemeKey)
      : "EMERALD";
  const iconKey = (featuredNotice?.icon || "SPARKLES") as keyof typeof ICONS;
  const IconComp = ICONS[iconKey] || Sparkles;

  const themeStyles = THEME_STYLES[theme];

  const hasLink = Boolean(featuredNotice?.linkUrl && featuredNotice.linkUrl.trim());
  const isExternal =
    hasLink &&
    (featuredNotice.linkUrl.startsWith("http://") ||
      featuredNotice.linkUrl.startsWith("https://"));

  return (
    <div className="w-full bg-[#FCFAF6] text-[#0A261D] min-h-screen py-8 sm:py-14">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-stone-500">
          <Link href="/" className="hover:text-[#B38728] transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
          <span className="text-[#0A261D] font-semibold">Store Notices & Updates</span>
        </nav>

        {/* Hero Header */}
        <div className="bg-gradient-to-br from-[#061B14] via-[#0A261D] to-[#04110C] rounded-2xl sm:rounded-3xl p-6 sm:p-10 text-white border border-[#D4AF37]/45 shadow-[0_16px_40px_rgba(6,27,20,0.35)] relative overflow-hidden mb-8 sm:mb-12">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[radial-gradient(circle,rgba(212,175,55,0.15),transparent_70%)] pointer-events-none" />
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 mb-3.5">
              <Megaphone className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="text-[10px] sm:text-xs font-semibold tracking-[0.2em] text-[#FCF6BA] uppercase">
                Official Royal Dispatch
              </span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white mb-3">
              Store Notices & Updates
            </h1>
            <p className="text-sm sm:text-base text-[#FCF6BA]/85 font-light leading-relaxed">
              Timely announcements regarding collection drops, courier schedules, festive
              dispatch dates, and royal apothecary advisories.
            </p>
          </div>
        </div>

        {/* MAIN FEATURED NOTICE */}
        {featuredNotice ? (
          <div className="space-y-8 mb-12">
            <article
              className={`relative overflow-hidden rounded-2xl sm:rounded-3xl border p-6 sm:p-10 transition-all ${themeStyles.wrapper}`}
            >
              {/* Corner Decorative Flares */}
              <div
                aria-hidden="true"
                className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-radial from-amber-400/15 to-transparent pointer-events-none blur-3xl"
              />

              <div className="relative z-10 space-y-6">
                {/* Header: Badge, Icon, Dates */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <div
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 shadow-xs ${themeStyles.iconBox}`}
                    >
                      <IconComp className="w-4 h-4" />
                    </div>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase border shadow-2xs ${themeStyles.badge}`}
                    >
                      {featuredNotice.badge || "Official Notice"}
                    </span>
                    {featuredNotice.isActive && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Active Advisory
                      </span>
                    )}
                  </div>

                  {/* Date & Time Metadata */}
                  <div className={`flex items-center gap-4 text-xs ${themeStyles.meta}`}>
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(featuredNotice.updatedAt || featuredNotice.createdAt).toLocaleDateString(
                        "en-IN",
                        {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        }
                      )}
                    </span>
                  </div>
                </div>

                {/* Notice Title */}
                <h2
                  className={`font-serif text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight leading-tight ${themeStyles.title}`}
                >
                  {featuredNotice.title}
                </h2>

                {/* Notice Full Message Body */}
                <div
                  className={`text-sm sm:text-base leading-relaxed whitespace-pre-line space-y-4 font-light ${themeStyles.body}`}
                >
                  {featuredNotice.message}
                </div>

                {/* Footer: Official Authenticity Seal & Optional CTA Link */}
                <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs text-white/70">
                    <ShieldCheck className="w-4 h-4 text-[#D4AF37] shrink-0" />
                    <span className="tracking-wide">
                      Official Communication • Verified NIYAT Operations Team
                    </span>
                  </div>

                  {hasLink && (
                    <div>
                      {isExternal ? (
                        <a
                          href={featuredNotice.linkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center gap-2 px-6 py-3 rounded-full text-xs sm:text-sm font-semibold tracking-wide transition-all group ${themeStyles.cta}`}
                        >
                          <span>{featuredNotice.linkText || "Explore Details"}</span>
                          <ExternalLink className="w-3.5 h-3.5 transition-transform group-hover:scale-110" />
                        </a>
                      ) : (
                        <Link
                          href={featuredNotice.linkUrl}
                          className={`inline-flex items-center gap-2 px-6 py-3 rounded-full text-xs sm:text-sm font-semibold tracking-wide transition-all group ${themeStyles.cta}`}
                        >
                          <span>{featuredNotice.linkText || "Explore Details"}</span>
                          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </article>

            {/* Back Button */}
            <div className="flex items-center justify-between pt-2">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-xs font-semibold text-stone-600 hover:text-[#0A261D] transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Storefront</span>
              </Link>

              <Link
                href="/shop"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-[#D4AF37]/50 hover:border-[#D4AF37] text-xs font-semibold text-[#0A261D] hover:text-[#B38728] transition shadow-xs"
              >
                <span>Browse The Collection</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          /* EMPTY STATE WHEN NO NOTICES ACTIVE */
          <div className="bg-white rounded-3xl border border-[#D4AF37]/30 p-8 sm:p-14 text-center shadow-xs mb-12">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#0A261D] mb-2">
              All Operations Normal
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto leading-relaxed mb-6">
              There are currently no active advisories or urgent updates. All standard courier
              dispatches, order processing, and white-glove customer services are running seamlessly.
            </p>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#0A261D] hover:bg-[#153D32] text-[#FCF6BA] font-semibold text-xs tracking-wide uppercase transition shadow-md"
            >
              <span>Explore The Collection</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* OTHER ANNOUNCEMENTS & ARCHIVE */}
        {otherNotices.length > 0 && (
          <section className="space-y-4 pt-6 border-t border-[#D4AF37]/20">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#0A261D]">
                  Recent Announcements & Archive
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Browse previous communications and archived updates.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {otherNotices.map((item) => (
                <Link
                  key={String(item._id)}
                  href={`/notices?id=${String(item._id)}`}
                  className="p-5 rounded-2xl bg-white border border-[#D4AF37]/25 hover:border-[#D4AF37] hover:shadow-md transition-all group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600">
                        {item.badge || "Notice"}
                      </span>
                      <span className="text-[10px] text-stone-400">
                        {new Date(item.updatedAt || item.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    <h4 className="font-serif font-bold text-base text-[#0A261D] group-hover:text-[#B38728] transition-colors leading-snug">
                      {item.title}
                    </h4>

                    <p className="text-xs text-stone-600 line-clamp-2 mt-2 leading-relaxed">
                      {item.message}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-semibold text-[#0A261D] group-hover:text-[#B38728]">
                    <span>Read Full Notice</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1 text-[#D4AF37]" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
