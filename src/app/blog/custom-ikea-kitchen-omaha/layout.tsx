import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The $150K Kitchen Look for a Fraction of the Price | WDO Custom Blog",
  description: "How Omaha homeowners are getting luxury custom kitchens using IKEA SEKTION frames with grain-matched fronts, custom colors, and premium hardware — installed by a licensed contractor.",
  keywords: ["custom IKEA kitchen Omaha", "IKEA SEKTION custom fronts", "grain matched cabinet fronts Omaha", "kitchen remodel Omaha cost", "custom kitchen cabinets Omaha NE", "IKEA kitchen upgrade Nebraska"],
  openGraph: {
    title: "The $150K Kitchen Look for a Fraction of the Price",
    description: "Why Omaha homeowners are choosing custom IKEA kitchens with grain-matched fronts over big-box and showroom alternatives.",
    url: "https://www.wdocustom.com/blog/custom-ikea-kitchen-omaha",
  },
  alternates: { canonical: "https://www.wdocustom.com/blog/custom-ikea-kitchen-omaha" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
