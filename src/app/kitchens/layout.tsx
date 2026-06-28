import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Custom IKEA Kitchens Omaha | Grain-Matched Fronts & Custom Cabinets",
  description: "Omaha's IKEA kitchen customization specialists. Grain-matched cabinet fronts, custom colors, custom sizes — transform IKEA SEKTION frames into luxury cabinetry. Better than big-box, better than showroom pricing. Free consultation.",
  keywords: [
    "custom IKEA kitchen Omaha",
    "IKEA kitchen Omaha",
    "IKEA cabinet installer Omaha",
    "grain matched cabinet fronts",
    "custom IKEA cabinet fronts",
    "IKEA SEKTION custom fronts",
    "custom cabinet fronts IKEA",
    "IKEA kitchen remodel Omaha NE",
    "custom kitchen cabinets Omaha",
    "modern kitchen cabinets Omaha",
    "slab door cabinets Omaha",
    "handleless kitchen Omaha",
    "custom IKEA cabinet colors",
    "IKEA kitchen installer Nebraska",
    "high end IKEA kitchen",
    "semi custom cabinets Omaha",
  ],
  openGraph: {
    title: "Custom IKEA Kitchens | Grain-Matched Fronts | WDO Custom",
    description: "We customize IKEA kitchens with grain-matched fronts, custom colors, and premium finishes. IKEA's 25-year frames with the look of $80k cabinetry.",
    url: "https://www.wdocustom.com/kitchens",
    images: [{ url: "/images/og-image.png", width: 1024, height: 1024, alt: "WDO Custom IKEA Kitchen" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Custom IKEA Kitchens Omaha | WDO Custom",
    description: "Grain-matched fronts, custom colors & finishes on IKEA SEKTION frames. Luxury look, smart pricing.",
    images: ["/images/og-image.png"],
  },
  alternates: {
    canonical: "https://www.wdocustom.com/kitchens",
  },
};

export default function KitchensLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
