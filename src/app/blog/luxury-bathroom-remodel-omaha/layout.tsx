import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "High-End Bathroom Remodel in Omaha: What $30K-$70K Actually Gets You | WDO Custom",
  description: "Walk-in showers, heated tile floors, freestanding tubs, and frameless glass — what a luxury bathroom remodel actually costs in the Omaha metro and why Elkhorn and West Omaha homeowners are investing now.",
  keywords: ["luxury bathroom remodel Omaha", "high end bathroom Omaha NE", "walk in shower remodel Elkhorn", "bathroom renovation Papillion", "master bathroom remodel Omaha", "heated floor bathroom Nebraska", "frameless glass shower Omaha", "bathroom contractor Omaha"],
  openGraph: {
    title: "High-End Bathroom Remodel in Omaha: What $30K-$70K Actually Gets You",
    description: "What luxury bathroom renovations actually cost in Elkhorn, West Omaha, and Papillion — and what separates a $30K remodel from a $70K one.",
    url: "https://www.wdocustom.com/blog/luxury-bathroom-remodel-omaha",
  },
  alternates: { canonical: "https://www.wdocustom.com/blog/luxury-bathroom-remodel-omaha" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
