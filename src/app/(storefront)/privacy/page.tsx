import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import { 
  ShieldCheck, 
  Lock, 
  EyeOff, 
  FileText, 
  CheckCircle2, 
  HelpCircle, 
  Mail, 
  ChevronRight, 
  Sparkles,
  Scale,
  Database,
  Globe2
} from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy & Confidentiality Policy | NIYAT Luxury Skincare",
  description: "Learn how NIYAT protects, handles, and honors your personal data with royal confidentiality across India, the UAE, and worldwide.",
};

export default function PrivacyPolicyPage() {
  const lastUpdated = "November 2026";

  const keyPrinciples = [
    {
      icon: EyeOff,
      title: "Zero Data Selling",
      desc: "We never monetize, rent, or sell your personal details to third-party data brokers.",
    },
    {
      icon: Lock,
      title: "Bank-Grade Encryption",
      desc: "All transactions and payment tokens are secured using 256-bit SSL encryption & PCI-DSS standards.",
    },
    {
      icon: Scale,
      title: "UAE & DPDP Compliant",
      desc: "Fully aligned with India's DPDP Act 2023 and UAE Federal Decree-Law No. 45/2021 on Personal Data Protection.",
    },
    {
      icon: Database,
      title: "Patron Sovereignty",
      desc: "You have complete authority to request, correct, export, or permanently delete your account data.",
    },
  ];

  return (
    <div className="w-full bg-[#FCFAF6] text-[#0A261D] min-h-screen py-8 sm:py-14">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-stone-500">
          <Link href="/" className="hover:text-[#B38728] transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
          <span className="text-[#0A261D] font-semibold">Privacy Policy</span>
        </nav>

        {/* Hero Header */}
        <div className="bg-gradient-to-br from-[#061B14] via-[#0A261D] to-[#04110C] rounded-2xl sm:rounded-3xl p-6 sm:p-12 text-white border border-[#D4AF37]/45 shadow-[0_16px_40px_rgba(6,27,20,0.35)] relative overflow-hidden mb-10 sm:mb-14">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[radial-gradient(circle,rgba(212,175,55,0.15),transparent_70%)] pointer-events-none" />
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 mb-3.5">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="text-[10px] sm:text-xs font-semibold tracking-[0.2em] text-[#FCF6BA] uppercase">
                Royal Trust & Confidentiality
              </span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white mb-4">
              Privacy Policy
            </h1>
            <p className="text-sm sm:text-base text-[#FCF6BA]/85 font-light leading-relaxed mb-6">
              At NIYAT, your trust is cherished as deeply as our finest apothecary formulations. 
              We are dedicated to safeguarding your personal privacy with uncompromising dignity, transparency, and military-grade security.
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-white/60">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                Version 2.4 • Effective Date: {lastUpdated}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Globe2 className="w-4 h-4 text-[#D4AF37]" />
                Jurisdiction: India & United Arab Emirates
              </span>
            </div>
          </div>
        </div>

        {/* 4 Pillars Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12 sm:mb-16">
          {keyPrinciples.map((principle, index) => {
            const Icon = principle.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-2xl p-5 border border-[#D4AF37]/25 shadow-xs hover:border-[#D4AF37]/60 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#B38728] mb-3.5">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-serif font-bold text-sm text-[#0A261D] mb-1">
                  {principle.title}
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  {principle.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* Policy Body */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#D4AF37]/25 p-6 sm:p-12 shadow-[0_4px_24px_rgba(10,38,29,0.04)] space-y-10 sm:space-y-12">
          
          {/* Section 1 */}
          <section className="space-y-3.5">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-[#FAF0D7] border border-[#D4AF37]/40 text-[#9A6B1F] font-bold text-xs flex items-center justify-center">
                1
              </span>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#0A261D]">
                Information We Collect
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
              When you interact with NIYAT through our digital boutique, mobile experience, or distributor portal, we collect only the necessary information essential to provide our bespoke products and customer concierge:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-stone-200/80">
                <h4 className="font-semibold text-xs text-[#0A261D] mb-1.5">Direct Personal Identifiers</h4>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Name, phone number, email address, physical delivery addresses, PIN / postal codes, and distributor enterprise credentials.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-stone-200/80">
                <h4 className="font-semibold text-xs text-[#0A261D] mb-1.5">Order & Transaction Logs</h4>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Order history, items purchased, preferred skincare regimens, courier tracking numbers, and transaction IDs (we never store card credentials).
                </p>
              </div>
              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-stone-200/80">
                <h4 className="font-semibold text-xs text-[#0A261D] mb-1.5">Device & Diagnostic Telemetry</h4>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Browser type, IP address, screen resolution, operating system, and anonymous usage patterns to optimize user experience.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-stone-200/80">
                <h4 className="font-semibold text-xs text-[#0A261D] mb-1.5">Concierge Communications</h4>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Records of consultations, support tickets, feedback, product reviews, and communications with our VIP care team.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section className="space-y-3.5 border-t border-stone-100 pt-8 sm:pt-10">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-[#FAF0D7] border border-[#D4AF37]/40 text-[#9A6B1F] font-bold text-xs flex items-center justify-center">
                2
              </span>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#0A261D]">
                How We Use Your Personal Data
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
              Every fragment of information entrusted to NIYAT is utilized solely for legitimate operational and luxury service fulfillment:
            </p>
            <ul className="space-y-2 text-xs sm:text-sm text-stone-700">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                <span><strong>Order Fulfillment & Logistics:</strong> Processing, packing, and dispatching orders via our authorized white-glove logistics partners.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                <span><strong>Wholesale & Distributor Verifications:</strong> Authenticating B2B distributor credentials, minimum order quantity rules, and business invoices.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                <span><strong>Customer Concierge:</strong> Answering inquiries regarding formulations, application rituals, order delivery tracking, or replacement claims.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                <span><strong>Security & Fraud Prevention:</strong> Detecting fraudulent transactions, unauthorized account logins, and bot interactions.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                <span><strong>The NIYAT Circle (With Consent):</strong> Curated launch announcements and VIP invitations, strictly with your opt-in consent and one-click unsubscribe.</span>
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3.5 border-t border-stone-100 pt-8 sm:pt-10">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-[#FAF0D7] border border-[#D4AF37]/40 text-[#9A6B1F] font-bold text-xs flex items-center justify-center">
                3
              </span>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#0A261D]">
                Payment Security & Tokenization
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
              NIYAT adheres to the highest level of payment data integrity. <strong>We do not capture, record, or store complete credit card, debit card, or CVV credentials</strong> on our internal databases.
            </p>
            <div className="p-4 rounded-xl bg-gradient-to-r from-[#FAF8F5] to-[#F5EFE6] border border-[#D4AF37]/35 flex items-start gap-3.5">
              <Lock className="w-5 h-5 text-[#B38728] shrink-0 mt-0.5" />
              <div className="text-xs text-stone-700 leading-relaxed">
                All digital transactions are routed through certified Payment Card Industry Data Security Standard (PCI-DSS Level 1) compliant partners (including Razorpay & Cashfree). Transactions employ Transport Layer Security (TLS 1.3) with 256-bit cryptographic encryption.
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section className="space-y-3.5 border-t border-stone-100 pt-8 sm:pt-10">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-[#FAF0D7] border border-[#D4AF37]/40 text-[#9A6B1F] font-bold text-xs flex items-center justify-center">
                4
              </span>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#0A261D]">
                Cookies & Essential Cache
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
              Our boutique utilizes cookies and session tokens to preserve your shopping experience:
            </p>
            <ul className="space-y-2 text-xs sm:text-sm text-stone-700 list-disc pl-5">
              <li><strong>Essential Session Cookies:</strong> Maintain your active shopping bag, wishlist items, and authenticated sessions across page reloads.</li>
              <li><strong>Security Cookies:</strong> Protect against Cross-Site Request Forgery (CSRF) and bot intrusions.</li>
              <li><strong>Performance Telemetry:</strong> Anonymized metrics to optimize page load speeds across desktop and mobile devices.</li>
            </ul>
            <p className="text-xs text-stone-500 italic">
              You may modify your browser settings to decline non-essential cookies at any time, though some interactive shopping features may require active session state.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3.5 border-t border-stone-100 pt-8 sm:pt-10">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-[#FAF0D7] border border-[#D4AF37]/40 text-[#9A6B1F] font-bold text-xs flex items-center justify-center">
                5
              </span>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#0A261D]">
                Information Sharing & Disclosure
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
              We never disclose your personal information, except strictly necessary to deliver our services under enforceable non-disclosure contracts:
            </p>
            <div className="space-y-2.5 text-xs sm:text-sm text-stone-700">
              <p>• <strong>Approved Courier & Freight Partners:</strong> Only shipping name, delivery address, and contact number are provided to trusted logistics providers (e.g. Shiprocket, Bluedart, DHL) to effect delivery.</p>
              <p>• <strong>Legal & Regulatory Mandates:</strong> In the rare circumstance where disclosure is compelled by lawful court order, statutory regulation, or law enforcement investigation in accordance with applicable Indian and UAE law.</p>
              <p>• <strong>Corporate Transfers:</strong> In the event of a merger, acquisition, or brand reorganization, patron privacy safeguards will remain legally binding on any successor entity.</p>
            </div>
          </section>

          {/* Section 6 */}
          <section className="space-y-3.5 border-t border-stone-100 pt-8 sm:pt-10">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-[#FAF0D7] border border-[#D4AF37]/40 text-[#9A6B1F] font-bold text-xs flex items-center justify-center">
                6
              </span>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#0A261D]">
                Your Rights as a NIYAT Patron
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
              Under Indian DPDP Act 2023, UAE Data Protection Law, and international consumer privacy guidelines, you hold the following rights:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-lg border border-stone-200 bg-white">
                <h5 className="font-semibold text-xs text-[#0A261D]">Right to Access & Copy</h5>
                <p className="text-xs text-stone-600 mt-1">Request a copy of all personal records maintained by NIYAT.</p>
              </div>
              <div className="p-3.5 rounded-lg border border-stone-200 bg-white">
                <h5 className="font-semibold text-xs text-[#0A261D]">Right to Rectification</h5>
                <p className="text-xs text-stone-600 mt-1">Correct or update any inaccurate address, phone number, or details.</p>
              </div>
              <div className="p-3.5 rounded-lg border border-stone-200 bg-white">
                <h5 className="font-semibold text-xs text-[#0A261D]">Right to Erasure</h5>
                <p className="text-xs text-stone-600 mt-1">Request permanent deletion of your profile (subject to statutory tax retention rules).</p>
              </div>
              <div className="p-3.5 rounded-lg border border-stone-200 bg-white">
                <h5 className="font-semibold text-xs text-[#0A261D]">Right to Withdraw Consent</h5>
                <p className="text-xs text-stone-600 mt-1">Revoke marketing communications or newsletter privileges instantly.</p>
              </div>
            </div>
          </section>

          {/* Section 7 */}
          <section className="space-y-3.5 border-t border-stone-100 pt-8 sm:pt-10">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-[#FAF0D7] border border-[#D4AF37]/40 text-[#9A6B1F] font-bold text-xs flex items-center justify-center">
                7
              </span>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#0A261D]">
                Data Retention & Archival
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
              We retain personal data only for as long as necessary to fulfill the purposes for which it was gathered, including satisfying legal, tax, accounting, or regulatory requirements. Order history and GST / VAT tax invoices are archived for statutory durations as required by commercial law, after which they are securely purged.
            </p>
          </section>

          {/* Section 8 */}
          <section className="space-y-3.5 border-t border-stone-100 pt-8 sm:pt-10">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-[#FAF0D7] border border-[#D4AF37]/40 text-[#9A6B1F] font-bold text-xs flex items-center justify-center">
                8
              </span>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#0A261D]">
                Grievance Officer & Data Protection Concierge
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
              For any questions regarding this Privacy Policy, data subject access requests, or to exercise your privacy rights, our designated Data Protection & Grievance Officer is at your service:
            </p>
            
            <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-[#061B14] to-[#0A261D] text-white border border-[#D4AF37]/40 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-[#D4AF37] font-semibold mb-1">
                    Grievance Officer & DPO
                  </p>
                  <p className="font-serif font-bold text-base text-white">NIYAT Data Protection Bureau</p>
                  <p className="text-stone-300 mt-1">NIYAT Skincare Private Limited</p>
                  <p className="text-stone-300">Mumbai • Dubai</p>
                </div>
                <div className="space-y-1.5 md:border-l md:border-white/10 md:pl-6 flex flex-col justify-center">
                  <p className="flex items-center gap-2 text-stone-200">
                    <Mail className="w-4 h-4 text-[#D4AF37]" />
                    <span>Email: <a href="mailto:privacy@niyat.in" className="text-[#FCF6BA] hover:underline font-medium">privacy@niyat.in</a></span>
                  </p>
                  <p className="flex items-center gap-2 text-stone-200">
                    <HelpCircle className="w-4 h-4 text-[#D4AF37]" />
                    <span>Concierge: <a href="mailto:care@niyat.in" className="text-[#FCF6BA] hover:underline font-medium">care@niyat.in</a></span>
                  </p>
                  <p className="text-[11px] text-stone-400 mt-1">
                    Response time: Within 48 business hours
                  </p>
                </div>
              </div>
            </div>
          </section>

        </div>

        {/* Footer Navigation helper */}
        <div className="mt-8 text-center text-xs text-stone-500">
          <p>
            Looking for other policies? Visit our{" "}
            <Link href="/terms" className="text-[#0A261D] hover:text-[#B38728] font-semibold underline underline-offset-2">
              Terms & Conditions
            </Link>{" "}
            or{" "}
            <Link href="/shipping-policy" className="text-[#0A261D] hover:text-[#B38728] font-semibold underline underline-offset-2">
              Shipping & Delivery Policy
            </Link>.
          </p>
        </div>

      </div>
    </div>
  );
}

