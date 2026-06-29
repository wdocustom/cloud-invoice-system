import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Home Remodeling Blog | WDO Custom — Omaha, NE",
  description: "Expert remodeling insights for Omaha homeowners. Custom IKEA kitchens, whole-home renovations, basement finishing, and budgeting tips from a licensed Nebraska contractor.",
  keywords: [
    "Omaha remodeling blog",
    "kitchen remodel tips Omaha",
    "custom IKEA kitchen guide",
    "home renovation budget Nebraska",
    "basement finishing Omaha",
    "remodeling contractor blog Omaha NE",
    "whole home remodel Omaha",
    "home addition vs basement Omaha",
  ],
  openGraph: {
    title: "Remodeling Blog | WDO Custom — Omaha, NE",
    description: "Expert home remodeling insights, cost breakdowns, and project guides for Omaha-area homeowners.",
    url: "https://www.wdocustom.com/blog",
    images: [{ url: "/images/og-image.png", width: 1024, height: 1024, alt: "WDO Custom Blog" }],
  },
  alternates: { canonical: "https://www.wdocustom.com/blog" },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
