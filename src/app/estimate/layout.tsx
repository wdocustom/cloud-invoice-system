import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free Instant Remodeling Estimate",
  description: "Get a free, AI-powered ballpark estimate for your Omaha home remodeling project in under 30 seconds. Kitchen, bathroom, basement, and whole-home renovation estimates based on current local market rates.",
  keywords: [
    "free remodeling estimate Omaha",
    "kitchen remodel cost Omaha",
    "bathroom remodel cost",
    "basement finishing cost Omaha",
    "home renovation estimate",
    "remodel cost calculator",
    "contractor estimate Omaha NE",
  ],
  openGraph: {
    title: "Free Instant Remodeling Estimate | WDO Custom",
    description: "Get a free ballpark estimate for your Omaha home remodel in under 30 seconds. No signup, no commitment.",
    url: "https://www.wdocustom.com/estimate",
    images: [{ url: "/images/og-image.png", width: 1024, height: 1024, alt: "WDO Custom Logo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Instant Remodeling Estimate | WDO Custom",
    description: "Get a free ballpark estimate for your Omaha home remodel in under 30 seconds.",
    images: ["/images/og-image.png"],
  },
  alternates: {
    canonical: "https://www.wdocustom.com/estimate",
  },
};

export default function EstimateLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
