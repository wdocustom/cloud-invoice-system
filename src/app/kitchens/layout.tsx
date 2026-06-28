import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Custom Kitchen Cabinets Omaha | IKEA & Frameless Euro Cabinetry",
  description: "Omaha's custom kitchen cabinet specialists. Semi-custom IKEA kitchens with Grayson-matched fronts and full custom frameless European cabinetry. Better than Eurowood pricing with superior craftsmanship. Free consultation.",
  keywords: [
    "custom kitchen cabinets Omaha",
    "IKEA kitchen Omaha",
    "IKEA cabinet installer Omaha",
    "frameless euro cabinets Omaha",
    "European kitchen cabinets Omaha NE",
    "Grayson cabinet fronts",
    "custom IKEA kitchen",
    "semi custom cabinets Omaha",
    "modern kitchen cabinets Omaha",
    "Eurowood alternative Omaha",
    "frameless cabinetry Nebraska",
    "custom cabinet fronts IKEA",
    "kitchen remodel Omaha NE",
    "high end kitchen cabinets Omaha",
    "slab door cabinets Omaha",
    "handleless kitchen Omaha",
  ],
  openGraph: {
    title: "Custom Kitchen Cabinets | IKEA & Frameless Euro | WDO Custom",
    description: "Semi-custom IKEA kitchens with Grayson-matched fronts and full custom frameless European cabinetry. Better pricing than Eurowood with superior craftsmanship.",
    url: "https://www.wdocustom.com/kitchens",
    images: [{ url: "/images/og-image.png", width: 1024, height: 1024, alt: "WDO Custom Kitchen Cabinets" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Custom Kitchen Cabinets Omaha | WDO Custom",
    description: "IKEA + Grayson-matched fronts and full custom frameless Euro cabinetry. Better than Eurowood pricing.",
    images: ["/images/og-image.png"],
  },
  alternates: {
    canonical: "https://www.wdocustom.com/kitchens",
  },
};

export default function KitchensLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
