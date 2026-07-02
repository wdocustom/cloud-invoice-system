import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Finishing the Basement in Your New Build: A Guide for Elkhorn & Bennington Homeowners | WDO Custom",
  description: "Just closed on a new construction home in Elkhorn, Bennington, or Gretna with an unfinished basement? Here's what it costs, what to watch for, and why waiting 12 months is costing you money.",
  keywords: ["basement finishing Elkhorn NE", "new construction basement Bennington", "basement remodel Gretna", "finish basement new home Omaha", "basement contractor Elkhorn", "new build basement finishing Nebraska", "basement finishing cost Omaha", "unfinished basement new construction"],
  openGraph: {
    title: "Finishing the Basement in Your New Build: Elkhorn & Bennington Guide",
    description: "What it actually costs to finish the basement in a new construction home in Elkhorn, Bennington, or Gretna — and what the builder didn't tell you.",
    url: "https://www.wdocustom.com/blog/new-construction-basement-finishing-elkhorn",
  },
  alternates: { canonical: "https://www.wdocustom.com/blog/new-construction-basement-finishing-elkhorn" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
