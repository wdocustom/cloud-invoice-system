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
  metadataBase: new URL("https://www.wdocustom.com"),
  title: {
    default: "WDO Custom | Omaha's Premier Remodeling Contractor",
    template: "%s | WDO Custom",
  },
  description: "Licensed Nebraska general contractor specializing in kitchen, bathroom, basement, and whole-home remodeling across the Omaha metro. Free estimates, transparent pricing, and craftsmanship guaranteed.",
  keywords: [
    "Omaha remodeling",
    "kitchen remodel Omaha",
    "bathroom remodel Omaha",
    "basement finishing Omaha",
    "general contractor Omaha NE",
    "home renovation Omaha",
    "WDO Custom",
    "remodeling contractor near me",
    "home remodel Omaha Nebraska",
    "kitchen renovation Omaha",
    "bathroom renovation Omaha",
    "basement remodel Omaha",
    "licensed contractor Omaha",
    "Elkhorn remodeling",
    "Papillion contractor",
    "La Vista home renovation",
  ],
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
    url: "https://www.wdocustom.com",
    images: [{ url: "/images/og-image.png", width: 1024, height: 1024, alt: "WDO Custom Logo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "WDO Custom | Omaha's Premier Remodeling Contractor",
    description: "Licensed Nebraska general contractor. Kitchen, bathroom, basement, and whole-home remodeling with transparent pricing and craftsmanship guaranteed.",
    images: ["/images/og-image.png"],
  },
  alternates: {
    canonical: "https://www.wdocustom.com",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    // Add your Google Search Console verification code here when ready
    // google: "your-verification-code",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "HomeAndConstructionBusiness",
  "@id": "https://www.wdocustom.com/#business",
  name: "WDO Custom",
  legalName: "WDO Custom LLC",
  description: "Licensed Nebraska general contractor specializing in residential remodeling — kitchens, bathrooms, basements, and whole-home renovations across the Omaha metro area.",
  url: "https://www.wdocustom.com",
  telephone: "+14028198558",
  email: "skyler@wdocustom.com",
  image: "https://www.wdocustom.com/images/logo.png",
  logo: "https://www.wdocustom.com/images/logo.png",
  foundingLocation: "Omaha, NE",
  priceRange: "$$-$$$$",
  currenciesAccepted: "USD",
  paymentAccepted: "Credit Card, Check, Bank Transfer",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Omaha",
    addressRegion: "NE",
    addressCountry: "US",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 41.2565,
    longitude: -95.9345,
  },
  areaServed: [
    { "@type": "City", name: "Omaha", addressRegion: "NE" },
    { "@type": "City", name: "Elkhorn", addressRegion: "NE" },
    { "@type": "City", name: "Gretna", addressRegion: "NE" },
    { "@type": "City", name: "Papillion", addressRegion: "NE" },
    { "@type": "City", name: "La Vista", addressRegion: "NE" },
    { "@type": "City", name: "Bellevue", addressRegion: "NE" },
    { "@type": "City", name: "Bennington", addressRegion: "NE" },
    { "@type": "City", name: "Ralston", addressRegion: "NE" },
    { "@type": "City", name: "Council Bluffs", addressRegion: "IA" },
    { "@type": "City", name: "Waterloo", addressRegion: "NE" },
  ],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Remodeling Services",
    itemListElement: [
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "Kitchen Remodeling", description: "Complete kitchen transformations — custom cabinetry, countertops, backsplash, lighting, and layout redesign." } },
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "Bathroom Remodeling", description: "Spa-quality bathrooms with tile work, walk-in showers, vanities, heated floors, and modern fixtures." } },
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "Basement Finishing", description: "Transform unused space into living areas, home theaters, bars, offices, and guest suites." } },
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "Whole-Home Renovation", description: "Full-scale remodels from floor plan reconfiguration to finishes." } },
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "Room Additions", description: "Room additions, bump-outs, and structural expansions." } },
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "Outdoor Living", description: "Decks, patios, pergolas, and outdoor kitchens." } },
    ],
  },
  founder: {
    "@type": "Person",
    name: "Skyler Camacho",
    jobTitle: "Owner & General Contractor",
  },
  sameAs: [
    "https://www.facebook.com/wdocustom",
    "https://www.instagram.com/wdocustom",
  ],
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "5.0",
    reviewCount: "50",
    bestRating: "5",
    worstRating: "1",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.variable} ${spaceGrotesk.variable} font-sans bg-brand-alabaster text-brand-charcoal antialiased`}>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
