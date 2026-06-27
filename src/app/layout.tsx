import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import ClientProviders from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-editorial",
  display: "swap",
});

export const metadata: Metadata = {
  title: "WDO Custom | Omaha's Premier Remodeling Contractor",
  description: "Licensed Nebraska general contractor specializing in kitchen, bathroom, basement, and whole-home remodeling across the Omaha metro. Free estimates, transparent pricing, and craftsmanship guaranteed.",
  keywords: ["Omaha remodeling", "kitchen remodel Omaha", "bathroom remodel Omaha", "basement finishing Omaha", "general contractor Omaha NE", "home renovation Omaha", "WDO Custom"],
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "WDO Custom | Omaha's Premier Remodeling Contractor",
    description: "Licensed Nebraska general contractor. Kitchen, bathroom, basement, and whole-home remodeling with transparent pricing and craftsmanship guaranteed.",
    type: "website",
    locale: "en_US",
    siteName: "WDO Custom",
    images: [{ url: "/images/og-image.png", width: 1024, height: 1024, alt: "WDO Custom Logo" }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.variable} ${spaceGrotesk.variable} font-sans bg-brand-alabaster text-brand-charcoal antialiased`}>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}