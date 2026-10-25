import type { Metadata } from "next";
import { Cormorant_Garamond, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: {
    template: "%s | NIYAT Premium Skincare",
    default: "NIYAT — Luxury Skincare & Radiant Formulations",
  },
  description:
    "Official online boutique for NIYAT. Discover luxury skincare, clinical purity, and botanical radiance tailored for glowing, revitalized skin.",
  keywords: ["skincare", "niyat", "face cream", "face wash", "sunscreen", "body lotion", "whitening serum"],
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "NIYAT Skincare",
  },
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${cormorant.variable} ${jakarta.variable} scroll-smooth`}>
      <body className="antialiased min-h-screen bg-niyat-ivory text-niyat-charcoal flex flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
