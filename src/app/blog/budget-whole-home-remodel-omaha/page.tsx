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
            <span className="text-[9px] font-black uppercase tracking-widest text-luxury-gold bg-luxury-gold/10 px-2.5 py-1 rounded-full">Budgeting</span>
            <span className="text-[10px] font-bold text-white/25">7 min read</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-[1.15]">
            How to Budget for a Whole-Home Remodel in Omaha Without Hidden Fees
          </h1>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-5 py-12 md:py-16">
        <div className="prose-wdo">

          <p className="text-base text-brand-muted leading-relaxed mb-6">
            Every homeowner in the Omaha metro has heard the horror story. A neighbor signs a $75,000 remodeling contract, and six months later they&apos;re $30,000 over budget with an unfinished kitchen and a contractor who stopped returning calls.
          </p>
          <p className="text-base text-brand-muted leading-relaxed mb-6">
            It doesn&apos;t have to work that way. Here&apos;s how we approach whole-home remodeling at WDO Custom — and how you can protect yourself regardless of who you hire.
          </p>

          <h2 className="text-xl font-black text-brand-charcoal tracking-tight mt-10 mb-4">The Real Cost of a Whole-Home Remodel in Omaha</h2>
          <p className="text-sm text-brand-muted leading-relaxed mb-4">
            Let&apos;s start with honest numbers. For a typical 1,500–2,500 sq ft home in the Omaha metro (Elkhorn, Papillion, Bennington, Gretna, La Vista), a comprehensive whole-home remodel generally falls in these ranges:
          </p>
          <div className="bg-white rounded-xl border border-brand-stone/20 p-5 mb-6">
            <div className="space-y-3">
              {[
                { scope: "Cosmetic refresh (paint, fixtures, flooring)", range: "$25K — $50K" },
                { scope: "Mid-range renovation (kitchen, 1-2 baths, flooring)", range: "$75K — $150K" },
                { scope: "Full gut remodel (structural changes, all rooms)", range: "$150K — $350K+" },
              ].map((row) => (
                <div key={row.scope} className="flex items-center justify-between py-2 border-b border-brand-stone/10 last:border-0">
                  <span className="text-xs text-brand-muted font-medium">{row.scope}</span>
                  <span className="text-sm font-black text-brand-charcoal whitespace-nowrap ml-4">{row.range}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-brand-muted mt-3">Based on 2024-2025 Omaha metro market rates. Ranges vary by finish level and structural complexity.</p>
          </div>

          <h2 className="text-xl font-black text-brand-charcoal tracking-tight mt-10 mb-4">Why Contractors Ghost — and How to Avoid It</h2>
          <p className="text-sm text-brand-muted leading-relaxed mb-4">
            The #1 reason contractors disappear mid-project isn&apos;t malice — it&apos;s cash flow. They underbid to win the job, collect a large upfront deposit, use that deposit to finish a <em>previous</em> client&apos;s project, and then run out of money before they finish yours. It&apos;s a cycle that collapses eventually.
          </p>
          <p className="text-sm text-brand-muted leading-relaxed mb-4">
            <strong className="text-brand-charcoal">How to protect yourself:</strong>
          </p>
          <ul className="space-y-2 mb-6">
            {[
              "Never pay more than 20% upfront as a deposit — and never before materials are ordered",
              "Tie payments to completed milestones, not calendar dates",
              "Require a line-itemed proposal — not a lump sum. If a contractor can't tell you exactly what each dollar covers, that's a red flag.",
              "Verify their Nebraska contractor license (ours is #LIC-1901422) and confirm active insurance",
              "Ask for a written timeline with defined phases — and what happens if they miss deadlines",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <svg className="w-4 h-4 text-luxury-gold flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.403 12.652a3 3 0 000-5.304 3 3 0 00-3.75-3.751 3 3 0 00-5.305 0 3 3 0 00-3.751 3.75 3 3 0 000 5.305 3 3 0 003.75 3.751 3 3 0 005.305 0 3 3 0 003.751-3.75zm-2.546-4.46a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
                <span className="text-sm text-brand-charcoal font-medium leading-snug">{item}</span>
              </li>
            ))}
          </ul>

          <h2 className="text-xl font-black text-brand-charcoal tracking-tight mt-10 mb-4">Our Approach: Transparent, Line-Itemed, Trackable</h2>
          <p className="text-sm text-brand-muted leading-relaxed mb-4">
            At WDO Custom, every proposal is built with complete transparency:
          </p>

          <div className="bg-luxury-soft/40 rounded-xl p-5 border border-luxury-champagne/50 mb-6">
            <p className="text-[10px] font-black text-luxury-ochre uppercase tracking-widest mb-3">What&apos;s in Every WDO Custom Proposal</p>
            <ul className="space-y-1.5">
              {[
                "Line-itemed pricing — every material, every labor hour, every permit fee listed separately",
                "Phased payment schedule tied to milestones (20% deposit → framing → drywall → final)",
                "Digital Homeowner Portal with daily photo logs, milestone tracking, and real-time project status",
                "Written scope of work with detailed specifications — not vague descriptions",
                "1-year workmanship warranty on all labor",
                "Fully IBC code-compliant — structural, electrical, plumbing, and mechanical inspections",
              ].map((item) => (
                <li key={item} className="text-xs text-brand-charcoal font-medium flex items-start gap-2">
                  <span className="text-luxury-gold mt-0.5">&#10003;</span> {item}
                </li>
              ))}
            </ul>
          </div>

          <h2 className="text-xl font-black text-brand-charcoal tracking-tight mt-10 mb-4">The Digital Homeowner Portal</h2>
          <p className="text-sm text-brand-muted leading-relaxed mb-4">
            This is something we built specifically because we were tired of the &quot;when will my project be done?&quot; anxiety that homeowners deal with. Every WDO Custom client gets access to a private project portal where they can:
          </p>
          <ul className="space-y-1.5 mb-6">
            {[
              "See their complete proposal with line-item pricing",
              "Track which payment milestones are complete",
              "View daily progress photos uploaded by our crew",
              "Review and approve material selections",
              "Access their project timeline and upcoming milestones",
            ].map((item) => (
              <li key={item} className="text-xs text-brand-muted flex items-start gap-2">
                <span className="text-brand-charcoal">—</span> {item}
              </li>
            ))}
          </ul>
          <p className="text-sm text-brand-muted leading-relaxed mb-6">
            No more wondering what&apos;s happening at your house while you&apos;re at work. No more &quot;I left a voicemail three days ago.&quot; Everything is documented, timestamped, and accessible 24/7.
          </p>

          <h2 className="text-xl font-black text-brand-charcoal tracking-tight mt-10 mb-4">How to Avoid Surprise Change Orders</h2>
          <p className="text-sm text-brand-muted leading-relaxed mb-4">
            Change orders are the #1 source of budget overruns. Some are legitimate (you open a wall and find knob-and-tube wiring that needs replacing). Some are not (the contractor &quot;forgot&quot; to include trim in the original bid).
          </p>
          <p className="text-sm text-brand-muted leading-relaxed mb-4">
            <strong className="text-brand-charcoal">Our rule:</strong> If we missed it in the proposal, we eat the cost — not you. Legitimate discoveries (hidden structural issues, outdated wiring) are documented with photos and priced transparently before any additional work begins. You approve or decline. Period.
          </p>

          <h2 className="text-xl font-black text-brand-charcoal tracking-tight mt-10 mb-4">Key Takeaways for Omaha Homeowners</h2>
          <ul className="space-y-2 mb-8">
            {[
              "Get a line-itemed proposal — not a lump sum bid",
              "Tie payments to milestones, not dates. Never pay more than 20% upfront.",
              "Verify license and insurance before signing anything",
              "Demand a written scope of work with specifications",
              "Use a contractor who provides a digital project portal or regular photo updates",
              "Budget 10-15% contingency for legitimate discoveries behind walls",
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
            <h3 className="text-xl font-black text-white tracking-tight mb-2">Want a Ballpark Figure Before Your First Call?</h3>
            <p className="text-sm text-white/40 font-medium mb-6 max-w-md mx-auto">Try our Free, Instant Budget Estimator — no signup required. Real Omaha market rates, powered by AI, delivered in 30 seconds.</p>
            <Link href="/estimate" className="inline-block bg-luxury-gold hover:bg-luxury-ochre text-brand-charcoal font-black text-sm tracking-wide uppercase px-8 py-4 rounded-xl transition-all shadow-glow-gold active:scale-[0.98]">
              Try the Free Estimator
            </Link>
            <p className="text-[10px] text-white/20 font-medium mt-4">Just honest advice from a licensed contractor.</p>
          </div>
        </div>
      </article>

      <BlogFooter />
    </div>
  );
}
