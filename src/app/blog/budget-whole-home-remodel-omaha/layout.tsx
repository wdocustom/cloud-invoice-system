import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How to Budget for a Whole-Home Remodel in Omaha Without Hidden Fees | WDO Custom Blog",
  description: "Transparent pricing, line-itemed proposals, and a Digital Homeowner Portal. How Omaha homeowners are eliminating surprise change orders and contractor ghosting.",
  keywords: ["whole home remodel Omaha cost", "home renovation budget Nebraska", "remodeling contractor Omaha NE", "transparent pricing contractor Omaha", "home remodel no hidden fees", "Omaha renovation budget guide"],
  openGraph: {
    title: "How to Budget for a Whole-Home Remodel in Omaha Without Hidden Fees",
    description: "Eliminate surprise change orders with transparent, line-itemed pricing and a digital project portal.",
    url: "https://www.wdocustom.com/blog/budget-whole-home-remodel-omaha",
  },
  alternates: { canonical: "https://www.wdocustom.com/blog/budget-whole-home-remodel-omaha" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
