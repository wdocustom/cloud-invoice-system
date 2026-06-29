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
            <span className="text-[9px] font-black uppercase tracking-widest text-luxury-gold bg-luxury-gold/10 px-2.5 py-1 rounded-full">Kitchens</span>
            <span className="text-[10px] font-bold text-white/25">8 min read</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-[1.15]">
            The $150K Kitchen Look for a Fraction of the Price: Why Omaha Homeowners Are Upgrading IKEA Kitchens
          </h1>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-5 py-12 md:py-16">
        <div className="prose-wdo">

          <p className="text-base text-brand-muted leading-relaxed mb-6">
            Walk into a luxury Omaha kitchen showroom and you&apos;ll see stunning handleless cabinetry, grain-matched wood fronts, and seamless lines that look like they belong in an architectural magazine. The price tag? $60,000 to $150,000 for cabinets alone.
          </p>
          <p className="text-base text-brand-muted leading-relaxed mb-6">
            Now walk into one of our recently completed kitchens in Elkhorn. Same grain-matched continuous wood grain flow across every door and drawer. Same premium soft-close hardware. Same clean, frameless European aesthetic. The difference? The cabinet system cost roughly half — because the bones of the kitchen are IKEA SEKTION frames.
          </p>

          <h2 className="text-xl font-black text-brand-charcoal tracking-tight mt-10 mb-4">Why IKEA Frames Are the Best-Kept Secret in Custom Kitchens</h2>
          <p className="text-sm text-brand-muted leading-relaxed mb-4">
            Most people think of IKEA kitchens as budget, flat-pack, DIY-assembly projects. That reputation is outdated. The IKEA SEKTION system is genuinely overengineered:
          </p>
          <ul className="space-y-2 mb-6">
            {[
              "Steel rail mounting system — cabinets hang on industrial steel rails bolted to wall studs, not individual screws. Stronger than 90% of \"custom\" cabinet installations.",
              "Moisture-resistant particle board — engineered specifically for kitchen humidity. Won't swell or delaminate like cheap MDF.",
              "Metric precision manufacturing — tolerances measured in fractions of a millimeter. Every box is dead-square out of the package.",
              "25-year warranty — covers frames, hinges, drawer rails, and internal hardware. Try getting that from a custom cabinet shop.",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <svg className="w-4 h-4 text-luxury-gold flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.403 12.652a3 3 0 000-5.304 3 3 0 00-3.75-3.751 3 3 0 00-5.305 0 3 3 0 00-3.751 3.75 3 3 0 000 5.305 3 3 0 003.75 3.751 3 3 0 005.305 0 3 3 0 003.751-3.75zm-2.546-4.46a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
                <span className="text-sm text-brand-charcoal font-medium leading-snug">{item}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-brand-muted leading-relaxed mb-6">
            The frames are the hidden backbone. Nobody sees them once the kitchen is installed. What people <em>do</em> see — and what determines whether your kitchen looks like $20,000 or $100,000 — are the fronts, the hardware, and the finishing details.
          </p>

          <h2 className="text-xl font-black text-brand-charcoal tracking-tight mt-10 mb-4">What &quot;Grain-Matched&quot; Actually Means — and Why It Matters</h2>
          <p className="text-sm text-brand-muted leading-relaxed mb-4">
            Standard cabinet doors — even on expensive custom cabinets — have random grain patterns. Open two adjacent doors and the wood grain runs different directions. It&apos;s subtle, but it&apos;s what makes most kitchens look &quot;fine&quot; instead of &quot;stunning.&quot;
          </p>
          <p className="text-sm text-brand-muted leading-relaxed mb-4">
            <strong className="text-brand-charcoal">Grain-matching</strong> means every visible front is cut and arranged so the grain flows continuously across your entire kitchen — door to door, drawer to drawer. It creates visual coherence that your eye registers as &quot;high-end&quot; even if you can&apos;t immediately articulate why.
          </p>
          <p className="text-sm text-brand-muted leading-relaxed mb-6">
            This is standard on every WDO Custom IKEA kitchen build. We don&apos;t charge extra for it — it&apos;s just how we do it.
          </p>

          <div className="bg-luxury-soft/40 rounded-xl p-5 border border-luxury-champagne/50 mb-8">
            <p className="text-[10px] font-black text-luxury-ochre uppercase tracking-widest mb-2">What You Get with a WDO Custom IKEA Kitchen</p>
            <ul className="space-y-1.5">
              {[
                "IKEA SEKTION frames with 25-year warranty",
                "Grain-matched custom fronts in any color, finish, or profile",
                "Custom sizing — non-standard widths to eliminate filler strips and awkward gaps",
                "Premium soft-close hinges and full-extension drawer slides",
                "Handleless systems (push-to-open, J-pull) or any hardware you choose",
                "Custom crown molding, filler panels, and trim work",
                "Full-scope structural work: permits, plumbing, electrical, drywall",
                "Professional installation — level, plumb, and perfect",
              ].map((item) => (
                <li key={item} className="text-xs text-brand-charcoal font-medium flex items-start gap-2">
                  <span className="text-luxury-gold mt-0.5">&#10003;</span> {item}
                </li>
              ))}
            </ul>
          </div>

          <h2 className="text-xl font-black text-brand-charcoal tracking-tight mt-10 mb-4">Full-Scope Remodeling Across the Omaha Metro</h2>
          <p className="text-sm text-brand-muted leading-relaxed mb-4">
            We don&apos;t just swap cabinet doors. When we take on a kitchen project in Elkhorn, Bennington, Papillion, or anywhere in the Omaha metro, we handle the entire scope:
          </p>
          <ul className="space-y-1.5 mb-6">
            {[
              "Demolition and haul-off of existing cabinetry",
              "Structural modifications — wall removal, header beams, load-bearing changes (engineered and permitted per IRC/IBC building codes)",
              "Plumbing relocation for sinks, dishwashers, and gas lines",
              "Electrical panel work, dedicated circuits for appliances, and undercabinet lighting",
              "Countertop templating and installation (quartz, granite, butcher block)",
              "Custom tile backsplashes",
              "Flooring transitions and refinishing",
            ].map((item) => (
              <li key={item} className="text-xs text-brand-muted flex items-start gap-2">
                <span className="text-brand-charcoal">—</span> {item}
              </li>
            ))}
          </ul>
          <p className="text-sm text-brand-muted leading-relaxed mb-6">
            One contractor, one timeline, one point of contact. No juggling three subcontractors who don&apos;t communicate. We&apos;re licensed (NE #LIC-1901422), insured, and we stand behind every project with a 1-year workmanship warranty.
          </p>

          <h2 className="text-xl font-black text-brand-charcoal tracking-tight mt-10 mb-4">What Does a Custom IKEA Kitchen Actually Cost in Omaha?</h2>
          <p className="text-sm text-brand-muted leading-relaxed mb-4">
            For a typical 10x10 kitchen (the industry standard comparison size):
          </p>
          <div className="bg-white rounded-xl border border-brand-stone/20 p-5 mb-6">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">Cabinets + Fronts + Install</p>
                <p className="text-xl font-black text-brand-charcoal mt-1">$18K — $45K</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">Full Kitchen Remodel</p>
                <p className="text-xl font-black text-brand-charcoal mt-1">$35K — $80K</p>
              </div>
            </div>
            <p className="text-[10px] text-brand-muted text-center mt-3">Ranges depend on kitchen size, finish level, and scope of structural work.</p>
          </div>
          <p className="text-sm text-brand-muted leading-relaxed mb-6">
            Compare that to $60K-$150K for a comparable showroom kitchen with traditional custom cabinetry. You&apos;re getting the same aesthetic result — the same grain-matched fronts, the same premium hardware, the same clean lines — built on a frame system that&apos;s arguably <em>more</em> durable.
          </p>

          <h2 className="text-xl font-black text-brand-charcoal tracking-tight mt-10 mb-4">Key Takeaways</h2>
          <ul className="space-y-2 mb-8">
            {[
              "IKEA SEKTION frames are overengineered — steel rails, 25-year warranty, metric precision",
              "The fronts are where luxury happens — grain-matched, custom colors, custom sizing",
              "You get a $100K+ kitchen look at roughly half the price",
              "WDO Custom handles full-scope structural work (permits, plumbing, electrical)",
              "One licensed contractor from demo through final walkthrough",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <svg className="w-4 h-4 text-sage-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                <span className="text-sm text-brand-charcoal font-medium">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <CTABox
          heading="Skip the Guessing Game."
          body="Use our 30-Second AI Estimator to see what your custom IKEA kitchen would cost based on real Omaha market rates. No signup. No obligation."
          buttonText="Get My Kitchen Estimate"
          buttonHref="/estimate"
        />
      </article>

      <BlogFooter />
    </div>
  );
}

function CTABox({ heading, body, buttonText, buttonHref }: { heading: string; body: string; buttonText: string; buttonHref: string }) {
  return (
    <div className="bg-brand-charcoal rounded-2xl p-6 sm:p-8 mt-10 text-center relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-luxury-gold/5 rounded-full blur-[40px]" />
      <div className="relative z-10">
        <h3 className="text-xl font-black text-white tracking-tight mb-2">{heading}</h3>
        <p className="text-sm text-white/40 font-medium mb-6 max-w-md mx-auto">{body}</p>
        <Link href={buttonHref} className="inline-block bg-luxury-gold hover:bg-luxury-ochre text-brand-charcoal font-black text-sm tracking-wide uppercase px-8 py-4 rounded-xl transition-all shadow-glow-gold active:scale-[0.98]">
          {buttonText}
        </Link>
        <p className="text-[10px] text-white/20 font-medium mt-4">Just honest pricing from a licensed Omaha contractor.</p>
      </div>
    </div>
  );
}
