import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Basement Finishing vs. Structural Additions for Omaha Homes | WDO Custom Blog",
  description: "Compare basement finishing vs. room additions in Omaha: cost per square foot, permit timelines, Nebraska climate considerations, and ROI for metro-area homeowners.",
  keywords: ["basement finishing Omaha", "home addition Omaha NE", "basement vs addition cost", "basement remodel Elkhorn", "room addition Papillion", "home addition Nebraska cost", "Omaha basement finishing contractor"],
  openGraph: {
    title: "Basement Finishing vs. Structural Additions for Omaha Homes",
    description: "Cost per square foot, permit timelines, and ROI comparison for Omaha-area homeowners weighing basement finishing against structural additions.",
    url: "https://www.wdocustom.com/blog/basement-vs-addition-omaha",
  },
  alternates: { canonical: "https://www.wdocustom.com/blog/basement-vs-addition-omaha" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
