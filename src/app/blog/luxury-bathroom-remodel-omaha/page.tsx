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
            <span className="text-[9px] font-black uppercase tracking-widest text-luxury-gold bg-luxury-gold/10 px-2.5 py-1 rounded-full">Bathrooms</span>
            <span className="text-[10px] font-bold text-white/25">10 min read</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-[1.15]">
            High-End Bathroom Remodel in Omaha: What $30K&ndash;$70K Actually Gets You
          </h1>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-5 py-12 md:py-16">
        <div className="prose-wdo">

          <p className="text-base text-brand-muted leading-relaxed mb-6">
            There&apos;s a specific moment when most Omaha homeowners decide their master bathroom needs a full overhaul. Maybe it&apos;s the morning they step onto cold tile for the thousandth time. Maybe it&apos;s when the builder-grade shower door finally sticks for good. Whatever triggers it, the question that follows is always the same: what does a legitimate high-end bathroom remodel actually cost around here?
          </p>
          <p className="text-base text-brand-muted leading-relaxed mb-6">
            The answer depends on what you&apos;re after. A surface refresh — new vanity, re-tile the shower, swap the fixtures — runs $15K to $25K in the Omaha metro. But if you want the real thing — a walk-in shower with frameless glass, heated tile floors, a freestanding tub, custom vanity, and proper lighting — you&apos;re looking at $30K to $70K depending on size, materials, and how much structural work is involved.
          </p>

          <h2 className="text-xl font-black text-brand-charcoal tracking-tight mt-10 mb-4">What Separates a $30K Remodel from a $70K One</h2>
          <p className="text-sm text-brand-muted leading-relaxed mb-4">
            The difference isn&apos;t just &quot;nicer tile.&quot; At the lower end of that range, you&apos;re getting quality materials and solid craftsmanship — porcelain tile, a frameless glass enclosure, upgraded vanity, and modern plumbing fixtures. At the upper end, you&apos;re talking about a fundamentally different bathroom:
          </p>
          <ul className="space-y-2 mb-6">
            {[
              "Full layout reconfiguration — moving plumbing lines, relocating the shower or tub, expanding the footprint into an adjacent closet",
              "Large-format porcelain slabs or natural stone (marble, quartzite) on walls and floors — fewer grout lines, cleaner look",
              "Heated flooring with a dedicated thermostat — not a luxury in Nebraska winters, more like a quality-of-life decision",
              "Curbless walk-in shower with linear drain, frameless glass, and multiple shower heads or body sprays",
              "Custom floating vanity with undermount sinks, soft-close drawers, and integrated LED lighting",
              "Freestanding soaking tub as a focal point, plumbed with a floor-mounted filler",
              "Recessed niches, built-in storage, and proper ventilation upgrades",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <svg className="w-4 h-4 text-luxury-gold flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.403 12.652a3 3 0 000-5.304 3 3 0 00-3.75-3.751 3 3 0 00-5.305 0 3 3 0 00-3.751 3.75 3 3 0 000 5.305 3 3 0 003.75 3.751 3 3 0 005.305 0 3 3 0 003.751-3.75zm-2.546-4.46a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
                <span className="text-sm text-brand-charcoal font-medium leading-snug">{item}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-brand-muted leading-relaxed mb-6">
            The structural work is where costs climb fast. Moving a toilet three feet sounds simple until you realize it means cutting into a concrete slab or rerouting drain lines through floor joists. That&apos;s plumber time, permit time, and inspection time — all of which add up.
          </p>

          <h2 className="text-xl font-black text-brand-charcoal tracking-tight mt-10 mb-4">Why West Omaha and Elkhorn Homeowners Are Investing Now</h2>
          <p className="text-sm text-brand-muted leading-relaxed mb-4">
            Homes in Elkhorn, West Omaha, and Papillion built between 2005 and 2018 share a common problem: the rest of the house has been updated, but the master bath is still stuck in its original builder-grade condition. Cultured marble vanity tops, basic fiberglass shower/tub combos, brass fixtures that were outdated five years after install.
          </p>
          <p className="text-sm text-brand-muted leading-relaxed mb-4">
            These are $400K to $800K homes with $12K bathrooms. The disconnect shows up in daily livability and in resale value. A properly executed master bath remodel in the Omaha market returns 56% to 68% at resale according to 2024 Cost vs. Value data for the Midwest region — but the real return is in the years of daily use before you ever sell.
          </p>
          <p className="text-sm text-brand-muted leading-relaxed mb-6">
            Neighborhoods like Shadow Lake, Lakeside Hills, Eagle Hills, Sagewood, and the newer developments along 192nd and 204th corridors are where we see the most demand. Homeowners who&apos;ve been in their homes five to ten years and aren&apos;t planning to move — they want their bathroom to match the way the rest of their home feels.
          </p>

          <div className="bg-luxury-soft/40 rounded-xl p-5 border border-luxury-champagne/50 mb-8">
            <p className="text-[10px] font-black text-luxury-ochre uppercase tracking-widest mb-2">What a $45K&ndash;$55K Master Bath Looks Like in Elkhorn</p>
            <ul className="space-y-1.5">
              {[
                "Curbless walk-in shower with 12×24 porcelain tile, frameless glass panel, recessed niche",
                "Heated tile floor with programmable thermostat",
                "Custom 60\" floating double vanity with quartz top and undermount sinks",
                "Freestanding acrylic soaking tub with floor-mounted filler",
                "All new plumbing fixtures — matte black or brushed gold, your call",
                "Recessed LED lighting on dimmers, lighted mirror",
                "Full waterproofing system (Schluter DITRA or equivalent) behind all tile",
                "Permit, inspections, drywall, paint, trim — soup to nuts",
              ].map((item) => (
                <li key={item} className="text-xs text-brand-charcoal font-medium flex items-start gap-2">
                  <span className="text-luxury-gold mt-0.5">&#10003;</span> {item}
                </li>
              ))}
            </ul>
          </div>

          <h2 className="text-xl font-black text-brand-charcoal tracking-tight mt-10 mb-4">The Heated Floor Question</h2>
          <p className="text-sm text-brand-muted leading-relaxed mb-4">
            Every client asks about heated floors. In Omaha, where we get legitimate cold from November through March, it&apos;s one of the highest-impact upgrades you can make in a bathroom. The material cost for electric radiant heat mats is $8 to $14 per square foot. For a typical master bath, that&apos;s $600 to $1,200 in materials. Labor adds another $500 to $800 depending on layout complexity.
          </p>
          <p className="text-sm text-brand-muted leading-relaxed mb-6">
            The catch is that radiant heat needs to be installed <em>before</em> the tile goes down. You can&apos;t retrofit it without tearing out the floor. So if you&apos;re already doing a full remodel, this is the time. Skipping it to save $1,500 and then regretting it for the next fifteen winters is a trade most people don&apos;t want to make.
          </p>

          <h2 className="text-xl font-black text-brand-charcoal tracking-tight mt-10 mb-4">Frameless Glass: What to Know Before You Spec It</h2>
          <p className="text-sm text-brand-muted leading-relaxed mb-4">
            Frameless glass shower enclosures are the single most requested feature in high-end Omaha bathroom remodels. They make the space feel twice as large, they&apos;re easier to clean than framed enclosures, and they&apos;re what people see in every design feed and showroom.
          </p>
          <p className="text-sm text-brand-muted leading-relaxed mb-4">
            What most people don&apos;t realize is that frameless glass is custom-fabricated for each opening. It&apos;s tempered 3/8&quot; or 1/2&quot; glass, measured after tile is complete, and typically takes 2 to 3 weeks for fabrication. Budget $2,000 to $4,500 depending on the configuration — a single fixed panel is on the low end, a full enclosure with a hinged door is on the high end.
          </p>
          <p className="text-sm text-brand-muted leading-relaxed mb-6">
            We use local glass fabricators here in the Omaha metro who measure on-site after tile work is complete. No template-from-a-photo guesswork. Every panel is cut to the exact opening, with hardware selected to match your fixtures.
          </p>

          <h2 className="text-xl font-black text-brand-charcoal tracking-tight mt-10 mb-4">Timeline: How Long Does a High-End Bath Remodel Actually Take?</h2>
          <p className="text-sm text-brand-muted leading-relaxed mb-4">
            For a full gut-and-rebuild master bathroom in the Elkhorn or Papillion area, plan for 4 to 7 weeks from demo day to final walkthrough. Here&apos;s how that typically breaks down:
          </p>
          <div className="bg-white rounded-xl border border-brand-stone/20 p-5 mb-6">
            <div className="space-y-3">
              {[
                { phase: "Demo & rough-in", time: "Week 1", detail: "Tear out, rough plumbing, electrical, framing modifications" },
                { phase: "Waterproofing & subfloor", time: "Week 2", detail: "Shower pan, Schluter system, heated floor mat, cement board" },
                { phase: "Tile work", time: "Weeks 2–4", detail: "Shower walls, floor, niches, accent details — this is the longest phase" },
                { phase: "Vanity & fixtures", time: "Week 4–5", detail: "Vanity install, countertop, plumbing trim, mirror, lighting" },
                { phase: "Glass & finishing", time: "Week 5–6", detail: "Frameless glass fabrication/install, paint, trim, final connections" },
                { phase: "Final inspection", time: "Week 6–7", detail: "City inspection, punch list, walkthrough with homeowner" },
              ].map((step) => (
                <div key={step.phase} className="flex items-start gap-3">
                  <span className="text-[10px] font-black text-luxury-ochre uppercase tracking-wider w-20 flex-shrink-0 pt-0.5">{step.time}</span>
                  <div>
                    <p className="text-sm font-bold text-brand-charcoal">{step.phase}</p>
                    <p className="text-xs text-brand-muted">{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-sm text-brand-muted leading-relaxed mb-6">
            The biggest variable is tile complexity. Large-format slabs go up faster than intricate mosaic patterns. If you&apos;re doing a herringbone floor, a waterfall accent wall, and a detailed niche pattern, add another week to the tile phase.
          </p>

          <h2 className="text-xl font-black text-brand-charcoal tracking-tight mt-10 mb-4">What Most Contractors Get Wrong</h2>
          <p className="text-sm text-brand-muted leading-relaxed mb-4">
            The number one callback issue in bathroom remodeling across the Omaha metro is water intrusion behind tile. It happens when a contractor skips proper waterproofing — no membrane behind the shower tile, no pan liner, no Kerdi or DITRA system. The tile looks great for six months, then moisture migrates through the grout, hits the drywall (which should never be used in a wet area), and you&apos;ve got mold behind the wall.
          </p>
          <p className="text-sm text-brand-muted leading-relaxed mb-6">
            Every WDO Custom bathroom gets a full waterproofing system — Schluter DITRA for floors, Kerdi membrane or equivalent in shower walls, proper corner sealing, and a pre-slope on shower pans that we test before a single tile goes down. It&apos;s not optional. It&apos;s not an upgrade. It&apos;s just how a bathroom should be built.
          </p>

          <h2 className="text-xl font-black text-brand-charcoal tracking-tight mt-10 mb-4">Key Takeaways</h2>
          <ul className="space-y-2 mb-8">
            {[
              "A high-end master bath remodel in Omaha runs $30K–$70K depending on scope and materials",
              "Heated floors add $1,500–$2,000 total — install them now or live without them forever",
              "Frameless glass is custom-fabricated, 2–3 week lead time, $2K–$4.5K installed",
              "Full waterproofing is non-negotiable — it's the difference between a 20-year bathroom and a 3-year callback",
              "Timeline: 4–7 weeks for a full gut-and-rebuild, tile complexity is the biggest variable",
              "ROI in the Midwest: 56%–68% at resale, plus years of daily use before you ever list",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <svg className="w-4 h-4 text-sage-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                <span className="text-sm text-brand-charcoal font-medium">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <CTABox
          heading="What Would Your Bathroom Remodel Cost?"
          body="Use our AI-powered estimator to get an instant ballpark based on real Omaha labor and material rates. Takes 30 seconds. No signup required."
          buttonText="Get My Bathroom Estimate"
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
