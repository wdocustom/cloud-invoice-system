"use client";
import { useState } from "react";
import Link from "next/link";
import { Nav, BlogFooter } from "../components";

export default function Article() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="min-h-screen bg-brand-alabaster text-brand-charcoal font-sans antialiased selection:bg-luxury-gold/15">
      <Nav menuOpen={menuOpen} setMenuOpen={setMenuOpen} />

      <header className="pt-16 bg-brand-charcoal">
        <div className="max-w-3xl mx-auto px-5 py-14 md:py-20">
          <Link href="/blog" className="inline-flex items-center gap-1.5 text-white/30 hover:text-white/60 text-[11px] font-bold uppercase tracking-wider transition-colors mb-6">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
            Back to Blog
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[9px] font-black uppercase tracking-widest text-luxury-gold bg-luxury-gold/10 px-2.5 py-1 rounded-full">Planning</span>
            <span className="text-[10px] font-bold text-white/25">9 min read</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-[1.15]">
            Maximizing Square Footage: Basement Finishing vs. Structural Additions for Omaha Homes
          </h1>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-5 py-12 md:py-16">
        <div className="prose-wdo">

          <p className="text-base text-brand-muted leading-relaxed mb-6">
            You need more space. Maybe the family has outgrown the main floor. Maybe you want a dedicated home theater, a guest suite, or a home office that isn&apos;t a corner of the dining room. In the Omaha metro, you&apos;ve got two primary options: finish the basement you already have, or build a structural addition.
          </p>
          <p className="text-base text-brand-muted leading-relaxed mb-6">
            Both are legitimate paths. Neither is universally &quot;better.&quot; The right answer depends on your budget, your lot, your foundation, and how you actually plan to use the space. Here&apos;s the honest breakdown.
          </p>

          <h2 className="text-xl font-black text-brand-charcoal tracking-tight mt-10 mb-4">Basement Finishing: Unlocking Existing Square Footage</h2>
          <p className="text-sm text-brand-muted leading-relaxed mb-4">
            Most Omaha-area homes built after 1970 have full unfinished basements with 8-foot (or taller) poured concrete foundations. That&apos;s 800–1,500+ square feet of usable space that&apos;s already enclosed, already climate-controlled by your existing HVAC system, and already structurally sound.
          </p>

          <div className="bg-white rounded-xl border border-brand-stone/20 p-5 mb-6">
            <p className="text-[10px] font-black text-brand-charcoal uppercase tracking-widest mb-3">Basement Finishing — Cost Ranges (Omaha Metro)</p>
            <div className="space-y-2">
              {[
                { scope: "Basic finish (framing, drywall, flooring, lighting)", range: "$25 — $45 / sq ft" },
                { scope: "Mid-range (bathroom, wet bar, LVP flooring, custom trim)", range: "$45 — $75 / sq ft" },
                { scope: "High-end (home theater, full bar, guest suite, heated floors)", range: "$75 — $120+ / sq ft" },
              ].map((row) => (
                <div key={row.scope} className="flex items-start justify-between py-2 border-b border-brand-stone/10 last:border-0 gap-4">
                  <span className="text-xs text-brand-muted font-medium">{row.scope}</span>
                  <span className="text-sm font-black text-brand-charcoal whitespace-nowrap">{row.range}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-sm text-brand-muted leading-relaxed mb-4">
            <strong className="text-brand-charcoal">Why basements make sense in Nebraska:</strong> Omaha&apos;s four-season climate — with temperatures ranging from -10&deg;F in January to 100&deg;F+ in July — means maximizing <em>indoor</em> living space has outsized value. A finished basement stays naturally cool in summer and warm in winter (earth-sheltered construction), reducing HVAC load compared to above-grade additions.
          </p>

          <h3 className="text-base font-black text-brand-charcoal tracking-tight mt-8 mb-3">Common Omaha Basement Projects</h3>
          <ul className="space-y-1.5 mb-6">
            {[
              "Home theaters with sound isolation, tiered seating, and dedicated AV circuits",
              "Walk-behind bars with plumbing, refrigeration, and custom cabinetry",
              "Guest suites with egress windows (required by IRC for sleeping rooms), full bathroom, and closet",
              "Home offices and study rooms with independent HVAC zones",
              "Kids' playrooms and rec areas with impact-resistant LVP flooring",
              "Home gyms with rubber flooring, ventilation, and reinforced ceiling mounts",
            ].map((item) => (
              <li key={item} className="text-xs text-brand-muted flex items-start gap-2">
                <span className="text-brand-charcoal">—</span> {item}
              </li>
            ))}
          </ul>

          <div className="bg-luxury-soft/40 rounded-xl p-5 border border-luxury-champagne/50 mb-6">
            <p className="text-[10px] font-black text-luxury-ochre uppercase tracking-widest mb-2">Basement Moisture — The Nebraska Reality</p>
            <p className="text-xs text-brand-muted leading-relaxed">
              Nebraska&apos;s clay-heavy soil and seasonal water table fluctuations mean moisture management is non-negotiable for any basement finish. At minimum, you need a verified waterproofing system (interior drain tile or exterior membrane), a properly sized sump pump with battery backup, and a dehumidifier rated for the space. We assess all of this during our free in-home consultation before quoting a number. Skipping moisture mitigation is how you end up tearing out a $40,000 basement in three years.
            </p>
          </div>

          <h2 className="text-xl font-black text-brand-charcoal tracking-tight mt-10 mb-4">Structural Additions: Building New Square Footage</h2>
          <p className="text-sm text-brand-muted leading-relaxed mb-4">
            When the basement isn&apos;t an option — or when you specifically need above-grade, natural-light living space — a structural addition is the path. This includes bump-outs, full room additions, and second-story additions.
          </p>

          <div className="bg-white rounded-xl border border-brand-stone/20 p-5 mb-6">
            <p className="text-[10px] font-black text-brand-charcoal uppercase tracking-widest mb-3">Structural Additions — Cost Ranges (Omaha Metro)</p>
            <div className="space-y-2">
              {[
                { scope: "Small bump-out (50-100 sq ft, no foundation)", range: "$150 — $250 / sq ft" },
                { scope: "Room addition on new foundation (200-500 sq ft)", range: "$200 — $350 / sq ft" },
                { scope: "Second-story addition (structural reinforcement + build)", range: "$250 — $400+ / sq ft" },
              ].map((row) => (
                <div key={row.scope} className="flex items-start justify-between py-2 border-b border-brand-stone/10 last:border-0 gap-4">
                  <span className="text-xs text-brand-muted font-medium">{row.scope}</span>
                  <span className="text-sm font-black text-brand-charcoal whitespace-nowrap">{row.range}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-sm text-brand-muted leading-relaxed mb-4">
            Additions cost 3-5x more per square foot than basement finishing. That&apos;s because you&apos;re building everything from scratch — foundation, framing, roofing, siding, insulation, HVAC extension, and tying into the existing structure seamlessly.
          </p>

          <h3 className="text-base font-black text-brand-charcoal tracking-tight mt-8 mb-3">When an Addition Makes More Sense</h3>
          <ul className="space-y-2 mb-6">
            {[
              "Your basement has low ceilings (under 7 feet), chronic moisture issues, or mechanical equipment that can't be relocated",
              "You need main-floor living space (aging in place, accessibility requirements)",
              "You need natural light and exterior views — bedrooms, sunrooms, or expanded kitchens",
              "Your lot and zoning allow it (setback requirements, lot coverage maximums per Omaha/Sarpy/Douglas County codes)",
              "You're expanding the kitchen or adding a primary suite — projects that architecturally belong on the main floor",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <svg className="w-4 h-4 text-luxury-gold flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.403 12.652a3 3 0 000-5.304 3 3 0 00-3.75-3.751 3 3 0 00-5.305 0 3 3 0 00-3.751 3.75 3 3 0 000 5.305 3 3 0 003.75 3.751 3 3 0 005.305 0 3 3 0 003.751-3.75zm-2.546-4.46a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
                <span className="text-sm text-brand-charcoal font-medium leading-snug">{item}</span>
              </li>
            ))}
          </ul>

          <h2 className="text-xl font-black text-brand-charcoal tracking-tight mt-10 mb-4">Side-by-Side Comparison</h2>
          <div className="overflow-x-auto mb-8">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b-2 border-brand-charcoal/10">
                  <th className="py-3 pr-4 text-[10px] font-black text-brand-muted uppercase tracking-widest">Factor</th>
                  <th className="py-3 px-4 text-[10px] font-black text-luxury-gold uppercase tracking-widest text-center">Basement</th>
                  <th className="py-3 pl-4 text-[10px] font-black text-luxury-gold uppercase tracking-widest text-center">Addition</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {[
                  { factor: "Cost per sq ft", basement: "$25–$120", addition: "$150–$400+" },
                  { factor: "Permit timeline", basement: "1–3 weeks", addition: "4–8 weeks" },
                  { factor: "Construction timeline", basement: "4–8 weeks", addition: "3–6 months" },
                  { factor: "Foundation work", basement: "None (existing)", addition: "New pour required" },
                  { factor: "Natural light", basement: "Limited (egress windows)", addition: "Full windows" },
                  { factor: "Climate efficiency", basement: "Excellent (earth-sheltered)", addition: "Standard" },
                  { factor: "Resale ROI (Omaha avg)", basement: "70–75%", addition: "50–65%" },
                  { factor: "Zoning approval", basement: "Rarely needed", addition: "Usually required" },
                ].map((row) => (
                  <tr key={row.factor} className="border-b border-brand-stone/15">
                    <td className="py-3 pr-4 font-semibold text-brand-charcoal">{row.factor}</td>
                    <td className="py-3 px-4 text-center font-medium text-brand-muted">{row.basement}</td>
                    <td className="py-3 pl-4 text-center font-medium text-brand-muted">{row.addition}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="text-xl font-black text-brand-charcoal tracking-tight mt-10 mb-4">Permits and Code Compliance in Omaha</h2>
          <p className="text-sm text-brand-muted leading-relaxed mb-4">
            Both basement finishing and additions require building permits in the Omaha metro. Key code requirements that affect your project:
          </p>
          <ul className="space-y-1.5 mb-6">
            {[
              "Egress windows required in all sleeping rooms (IRC R310) — minimum 5.7 sq ft opening, max 44\" sill height",
              "Minimum ceiling height of 7 feet for habitable space (IRC R305)",
              "Smoke and CO detectors on every level and in sleeping rooms",
              "GFCI protection in all basement outlets (NEC 210.8)",
              "Structural additions require engineered plans stamped by a Nebraska PE",
              "Setback requirements vary by zoning district — check with Douglas/Sarpy County before planning",
            ].map((item) => (
              <li key={item} className="text-xs text-brand-muted flex items-start gap-2">
                <span className="text-brand-charcoal">—</span> {item}
              </li>
            ))}
          </ul>
          <p className="text-sm text-brand-muted leading-relaxed mb-6">
            We handle all permitting and inspections. It&apos;s part of the scope on every WDO Custom project — you never have to set foot in a county office.
          </p>

          <h2 className="text-xl font-black text-brand-charcoal tracking-tight mt-10 mb-4">Key Takeaways</h2>
          <ul className="space-y-2 mb-8">
            {[
              "Basement finishing is 3-5x cheaper per square foot than additions",
              "Nebraska's climate makes below-grade space exceptionally efficient",
              "Additions make sense when you need main-floor, natural-light space",
              "Both require permits — egress windows, minimum ceiling heights, and electrical code are non-negotiable",
              "Basement ROI typically outperforms additions in the Omaha resale market",
              "Moisture management is critical for any basement project in Nebraska's clay soil",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <svg className="w-4 h-4 text-sage-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                <span className="text-sm text-brand-charcoal font-medium">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-brand-charcoal rounded-2xl p-6 sm:p-8 mt-10 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-luxury-gold/5 rounded-full blur-[40px]" />
          <div className="relative z-10">
            <h3 className="text-xl font-black text-white tracking-tight mb-2">Got a Basement or Addition Project in Mind?</h3>
            <p className="text-sm text-white/40 font-medium mb-6 max-w-md mx-auto">Input your project dimensions into our Instant AI Estimator for an immediate market-rate ballpark. No signup, no obligation — just honest numbers.</p>
            <Link href="/estimate" className="inline-block bg-luxury-gold hover:bg-luxury-ochre text-brand-charcoal font-black text-sm tracking-wide uppercase px-8 py-4 rounded-xl transition-all shadow-glow-gold active:scale-[0.98]">
              Estimate My Project
            </Link>
            <p className="text-[10px] text-white/20 font-medium mt-4">Just honest pricing from a licensed Omaha contractor.</p>
          </div>
        </div>
      </article>

      <BlogFooter />
    </div>
  );
}
