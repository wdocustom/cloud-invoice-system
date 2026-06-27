import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Schedule a Free In-Home Consultation",
  description: "Book a free, no-obligation in-home consultation with Skyler from WDO Custom. We'll measure your space, discuss your vision, and deliver a detailed quote within 48 hours.",
  keywords: [
    "free remodeling consultation Omaha",
    "home remodel quote Omaha",
    "kitchen remodel consultation",
    "bathroom remodel consultation",
    "contractor consultation Omaha NE",
  ],
  openGraph: {
    title: "Schedule a Free In-Home Consultation | WDO Custom",
    description: "Book a free consultation with Skyler. We come to you, measure your space, and deliver a detailed quote within 48 hours.",
    url: "https://www.wdocustom.com/consultation",
    images: [{ url: "/images/og-image.png", width: 1024, height: 1024, alt: "WDO Custom Logo" }],
  },
  alternates: {
    canonical: "https://www.wdocustom.com/consultation",
  },
};

export default function ConsultationLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
