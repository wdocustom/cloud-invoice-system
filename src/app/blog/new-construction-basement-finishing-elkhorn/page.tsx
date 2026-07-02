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
            <span className="text-[9px] font-black uppercase tracking-widest text-luxury-gold bg-luxury-gold/10 px-2.5 py-1 rounded-full">Basements</span>
            <span className="text-[10px] font-bold text-white/25">9 min read</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-[1.15]">
            Finishing the Basement in Your New Build: A Guide for Elkhorn &amp; Bennington Homeowners
          </h1>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-5 py-12 md:py-16">
        <div className="prose-wdo">

          <p className="text-base text-brand-muted leading-relaxed mb-6">
            You just closed on a new construction home in Elkhorn. Or maybe Bennington, Gretna, or one of the developments going up along Highway 36 or south of Platteview Road. The house is beautiful upstairs. Downstairs? Bare concrete, framed walls with no drywall, stubbed-out plumbing, and a builder who quoted you $40K to finish it before handing you the keys.
          </p>
          <p className="text-base text-brand-muted leading-relaxed mb-6">
            You passed on that quote — most people do — and now you&apos;re sitting on 800 to 1,200 square feet of unusable space. Here&apos;s the thing: every month that basement sits unfinished, you&apos;re paying a mortgage on square footage you can&apos;t use. That&apos;s not a sunk cost — it&apos;s an ongoing one.
          </p>

          <h2 className="text-xl font-black text-brand-charcoal tracking-tight mt-10 mb-4">Why the Builder&apos;s Quote Was So High</h2>
          <p className="text-sm text-brand-muted leading-relaxed mb-4">
            New construction builders in the Omaha metro — the nationals like Toll Brothers, Richmond American, and D.R. Horton, plus the local production builders — price basement finishing at a premium for a simple reason: it&apos;s not their core operation. They&apos;re optimized for framing, roofing, and closing homes on schedule. Basement finishing is a change order to them, not a specialty.
          </p>
          <p className="text-sm text-brand-muted leading-relaxed mb-6">
            That $40K to $55K builder quote for a basic basement finish (bedroom, bathroom, living area, wet bar) typically includes a 30% to 40% markup over what a dedicated remodeling contractor would charge for the same work. The builder subs it out anyway — they&apos;re just adding margin on top of the sub&apos;s price.
          </p>

          <h2 className="text-xl font-black text-brand-charcoal tracking-tight mt-10 mb-4">What Basement Finishing Actually Costs in Elkhorn and Bennington</h2>
          <p className="text-sm text-brand-muted leading-relaxed mb-4">
            For a new construction basement with pre-framed walls and stubbed plumbing — which is what most Elkhorn and Bennington new builds come with — here&apos;s what the real numbers look like:
          </p>
          <div className="bg-white rounded-xl border border-brand-stone/20 p-5 mb-6">
            <div className="space-y-4">
              {[
                { level: "Budget / Builder Grade", range: "$25K – $35K", detail: "LVP flooring, basic carpet in bedrooms, painted drywall, standard vanity, fiberglass shower, basic lighting" },
                { level: "Mid-Range", range: "$35K – $50K", detail: "Tile floors in wet areas, upgraded carpet or LVP, custom wet bar, tile shower, nicer vanity/fixtures, recessed lighting throughout" },
                { level: "High-End / Custom", range: "$50K – $75K+", detail: "Large-format tile, custom built-ins, home theater pre-wire, heated bathroom floor, frameless glass shower, wet bar with dishwasher and beverage cooler" },
              ].map((tier) => (
                <div key={tier.level} className="border-b border-brand-stone/15 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-bold text-brand-charcoal">{tier.level}</p>
                    <p className="text-sm font-black text-luxury-ochre">{tier.range}</p>
                  </div>
                  <p className="text-xs text-brand-muted">{tier.detail}</p>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-brand-muted mt-3">Based on 900–1,100 sq ft basement with one bedroom, one bathroom, and open living area. Costs current as of mid-2025 Omaha metro rates.</p>
          </div>
          <p className="text-sm text-brand-muted leading-relaxed mb-6">
            These ranges assume the builder already framed the walls and stubbed the plumbing and HVAC — which is standard in most new construction in the Elkhorn Crossing, Eagle Hills, Sagewood, and Bennington developments. If your basement is completely unframed (slab and block only), add $5K to $10K for framing and insulation.
          </p>

          <h2 className="text-xl font-black text-brand-charcoal tracking-tight mt-10 mb-4">The &quot;Wait 12 Months&quot; Myth</h2>
          <p className="text-sm text-brand-muted leading-relaxed mb-4">
            You&apos;ll hear this from builders, real estate agents, and well-meaning neighbors: &quot;Wait at least a year before finishing the basement. The concrete needs to cure and settle.&quot;
          </p>
          <p className="text-sm text-brand-muted leading-relaxed mb-4">
            Here&apos;s the reality: modern concrete reaches 95% of its compressive strength within 28 days of being poured. The foundation in a new construction home built in Elkhorn or Bennington was poured months before you closed — typically during the excavation phase, which is 4 to 6 months before your closing date. By the time you have the keys, the concrete has been curing for half a year or more.
          </p>
          <p className="text-sm text-brand-muted leading-relaxed mb-6">
            The real question isn&apos;t concrete curing — it&apos;s moisture. A responsible contractor tests the slab for moisture (calcium chloride test or relative humidity probe) before installing any flooring. If the slab reads within acceptable levels, you&apos;re good to go. If it&apos;s high, you install a vapor barrier and use appropriate flooring (LVP, tile, or engineered hardwood — never solid hardwood on a basement slab). We test every slab before starting work. Period.
          </p>

          <div className="bg-luxury-soft/40 rounded-xl p-5 border border-luxury-champagne/50 mb-8">
            <p className="text-[10px] font-black text-luxury-ochre uppercase tracking-widest mb-2">What New Construction Builders Typically Pre-Install</p>
            <ul className="space-y-1.5">
              {[
                "Framed exterior walls with fiberglass batt insulation",
                "Interior partition wall framing (sometimes — varies by builder)",
                "Plumbing stubs for bathroom (drain, supply lines, vent stack)",
                "HVAC ductwork roughed in with register locations",
                "Electrical panel with capacity for basement circuits",
                "Egress window rough opening (required by IRC for any bedroom)",
                "Sump pump and/or radon mitigation rough-in",
              ].map((item) => (
                <li key={item} className="text-xs text-brand-charcoal font-medium flex items-start gap-2">
                  <span className="text-luxury-gold mt-0.5">&#10003;</span> {item}
                </li>
              ))}
            </ul>
          </div>

          <h2 className="text-xl font-black text-brand-charcoal tracking-tight mt-10 mb-4">Egress Windows: Not Optional in Nebraska</h2>
          <p className="text-sm text-brand-muted leading-relaxed mb-4">
            If your basement has a bedroom — and most finished basements do — Nebraska building code requires an egress window in that room. The IRC (International Residential Code, which Nebraska adopts) specifies a minimum 5.7 square foot opening, with a minimum 20&quot; width and 24&quot; height, and a maximum 44&quot; sill height from the finished floor.
          </p>
          <p className="text-sm text-brand-muted leading-relaxed mb-6">
            The good news: most new construction in Elkhorn and Bennington already has egress windows roughed in during the build. The builder installed the well and the window — all that&apos;s needed is trim, drywall, and finishing around it. If your home somehow doesn&apos;t have one and you want a legal bedroom, cutting in an egress window after the fact runs $3,000 to $5,000 including the well, window, and excavation.
          </p>

          <h2 className="text-xl font-black text-brand-charcoal tracking-tight mt-10 mb-4">What We See in Gretna, Papillion, and Springfield New Builds</h2>
          <p className="text-sm text-brand-muted leading-relaxed mb-4">
            South of Omaha, the new construction market in Gretna, Papillion, and Springfield tends to skew toward slightly larger lots and slightly more finished builder packages. Some of the newer Gretna developments (near 168th and Platteview, for example) come with partially finished basements — drywall hung but not taped, or bathroom rough-in but no framing for the bedroom.
          </p>
          <p className="text-sm text-brand-muted leading-relaxed mb-6">
            This partial completion can actually save you $3,000 to $7,000 depending on what&apos;s already done. But it can also create headaches if the builder&apos;s framing isn&apos;t square or the drywall work is sloppy and needs to be redone. We evaluate what&apos;s there, keep what&apos;s good, and fix what isn&apos;t — you don&apos;t pay to redo work that was done correctly.
          </p>

          <h2 className="text-xl font-black text-brand-charcoal tracking-tight mt-10 mb-4">The Most Popular Basement Layout in New Construction</h2>
          <p className="text-sm text-brand-muted leading-relaxed mb-4">
            About 70% of the new construction basement finishes we do in the Elkhorn-Bennington corridor follow the same general layout:
          </p>
          <ul className="space-y-2 mb-6">
            {[
              "Open living/entertainment area — the largest zone, centered around where the TV goes. LVP or carpet, depends on preference. This is where the kids end up, where movie nights happen, where the extra couch goes.",
              "Bedroom with egress window — most common use is a guest room or an older kid's room. Walk-in closet is a frequent add.",
              "Three-quarter bathroom — shower (no tub), vanity, toilet. Tile floor, tile shower walls. Budget $6K–$10K for this room alone depending on finish level.",
              "Wet bar or kitchenette — ranges from a simple countertop with a mini fridge ($3K–$5K) to a full wet bar with sink, dishwasher, and beverage cooler ($8K–$15K).",
              "Storage/utility room — keeps the mechanicals (furnace, water heater, radon system) separated. Usually stays unfinished with just a door.",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <svg className="w-4 h-4 text-luxury-gold flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.403 12.652a3 3 0 000-5.304 3 3 0 00-3.75-3.751 3 3 0 00-5.305 0 3 3 0 00-3.751 3.75 3 3 0 000 5.305 3 3 0 003.75 3.751 3 3 0 005.305 0 3 3 0 003.751-3.75zm-2.546-4.46a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
                <span className="text-sm text-brand-charcoal font-medium leading-snug">{item}</span>
              </li>
            ))}
          </ul>

          <h2 className="text-xl font-black text-brand-charcoal tracking-tight mt-10 mb-4">Permits and Inspections in Douglas and Sarpy County</h2>
          <p className="text-sm text-brand-muted leading-relaxed mb-4">
            Finishing a basement in Elkhorn, Bennington, or Gretna requires a building permit from the relevant jurisdiction — City of Omaha for Elkhorn (annexed), Sarpy County or City of Gretna for the southern areas, and Washington County or City of Bennington for the northern developments. Permit fees typically run $200 to $600 depending on scope.
          </p>
          <p className="text-sm text-brand-muted leading-relaxed mb-6">
            Inspections happen at three stages: rough-in (framing, electrical, plumbing before drywall), insulation, and final. We schedule these, attend them, and handle any corrections. The permit isn&apos;t just bureaucracy — it&apos;s your proof that the work was done to code, which matters when you sell and the buyer&apos;s inspector checks for permitted work.
          </p>

          <h2 className="text-xl font-black text-brand-charcoal tracking-tight mt-10 mb-4">Key Takeaways</h2>
          <ul className="space-y-2 mb-8">
            {[
              "Don't overpay the builder — dedicated remodeling contractors typically come in 25%–35% under builder quotes for the same work",
              "You probably don't need to wait 12 months — the concrete has been curing since before you closed",
              "Test the slab for moisture, install a vapor barrier, and choose the right flooring — that's the real precaution",
              "Budget $25K–$50K for a quality new construction basement finish in the Elkhorn-Bennington corridor",
              "Egress windows are code-required for bedrooms — most new builds already have them roughed in",
              "Every month you wait, you're paying mortgage on square footage you can't use",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <svg className="w-4 h-4 text-sage-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                <span className="text-sm text-brand-charcoal font-medium">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <CTABox
          heading="How Much to Finish Your Basement?"
          body="Get an instant ballpark from our AI estimator — based on real Omaha contractor rates, not national averages. 30 seconds. No signup."
          buttonText="Estimate My Basement"
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
