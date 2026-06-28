"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function KitchensPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-brand-alabaster text-brand-charcoal font-sans antialiased selection:bg-luxury-gold/15">

      {/* ─── NAV ─── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-xl border-b border-brand-stone/40 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/images/logo.png" alt="WDO Custom" width={36} height={36} className="rounded-lg shadow-sm" />
            <div className="leading-none">
              <span className="text-sm font-black tracking-tight text-brand-charcoal">WDO</span>
              <span className="text-sm font-medium tracking-tight text-brand-muted ml-1">Custom</span>
            </div>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-[11px] font-bold text-brand-muted hover:text-brand-charcoal tracking-wide uppercase transition-colors">Home</Link>
            <Link href="/estimate" className="text-[11px] font-bold text-brand-muted hover:text-brand-charcoal tracking-wide uppercase transition-colors">Free Estimate</Link>
            <Link href="/consultation" className="text-[11px] font-bold text-brand-muted hover:text-brand-charcoal tracking-wide uppercase transition-colors">Consultation</Link>
            <a href="tel:+14028198558" className="bg-brand-charcoal text-white text-xs font-black tracking-wide uppercase px-5 py-2.5 rounded-lg hover:bg-brand-charcoal/90 transition-all shadow-sm">
              (402) 819-8558
            </a>
          </div>
          <button type="button" onClick={() => setMenuOpen(!menuOpen)} className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg border border-brand-stone/40">
            <svg className="w-4 h-4 text-brand-charcoal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {menuOpen ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />}
            </svg>
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t border-brand-stone/20 bg-white px-5 py-4 space-y-2">
            <Link href="/" className="block text-sm font-bold text-brand-charcoal py-1.5" onClick={() => setMenuOpen(false)}>Home</Link>
            <Link href="/estimate" className="block text-sm font-bold text-luxury-ochre py-1.5" onClick={() => setMenuOpen(false)}>Free Estimate</Link>
            <Link href="/consultation" className="block text-sm font-bold text-brand-charcoal py-1.5" onClick={() => setMenuOpen(false)}>Schedule Consultation</Link>
            <a href="tel:+14028198558" className="block text-sm font-bold text-brand-charcoal py-1.5">(402) 819-8558</a>
          </div>
        )}
      </nav>

      {/* ─── HERO ─── */}
      <section className="pt-16 bg-brand-charcoal relative overflow-hidden">
        <Image src="/images/kitchen-2.jpg" alt="Custom IKEA kitchen by WDO Custom" fill className="object-cover opacity-20" priority sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-charcoal via-brand-charcoal/95 to-brand-charcoal/75" />
        <div className="relative z-10 max-w-5xl mx-auto px-5 py-20 md:py-28">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-luxury-gold" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Omaha&apos;s Custom IKEA Kitchen Specialists</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-[1.1] mb-5">
              IKEA Frames.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-luxury-champagne via-luxury-gold to-luxury-ochre">
                Completely Custom Everything Else.
              </span>
            </h1>
            <p className="text-base sm:text-lg text-white/50 font-medium leading-relaxed mb-8 max-w-xl">
              We take IKEA&apos;s bulletproof SEKTION cabinet system and make it yours — grain-matched fronts, custom colors, custom sizes, premium hardware, and professional installation. The $80k kitchen look at a fraction of the price.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/estimate" className="bg-luxury-gold hover:bg-luxury-ochre text-brand-charcoal font-black text-sm tracking-wide uppercase px-8 py-4 rounded-xl transition-all shadow-glow-gold active:scale-[0.98] text-center">
                Get a Free Kitchen Estimate
              </Link>
              <Link href="/consultation" className="border border-white/15 hover:border-white/30 text-white/70 hover:text-white font-bold text-sm tracking-wide uppercase px-8 py-4 rounded-xl transition-all text-center">
                Schedule Free Consultation
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── VALUE PROP BAR ─── */}
      <section className="bg-white border-b border-brand-stone/30">
        <div className="max-w-5xl mx-auto px-5 py-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            {[
              { stat: "50%", label: "Less than big-box custom" },
              { stat: "2-3 Wks", label: "Faster than traditional" },
              { stat: "25 Yr", label: "IKEA frame warranty" },
              { stat: "100%", label: "Custom look & feel" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-xl sm:text-2xl font-black text-brand-charcoal">{s.stat}</p>
                <p className="text-[10px] font-bold text-brand-muted uppercase tracking-wider mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── THE CONCEPT ─── */}
      <section className="py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-14">
            <p className="text-[11px] font-black text-luxury-gold uppercase tracking-[0.2em] mb-2">The WDO Custom Approach</p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-brand-charcoal tracking-tight">Why We Build on IKEA</h2>
            <p className="text-sm text-brand-muted font-medium mt-3 max-w-2xl mx-auto">
              IKEA&apos;s SEKTION frames are overengineered — steel rail systems, moisture-resistant construction, metric precision, and a 25-year warranty. The frames are incredible. The fronts? Limited. That&apos;s where we come in.
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-brand-stone/30 shadow-premium overflow-hidden">
            <div className="bg-brand-charcoal p-6 md:p-8">
              <h3 className="text-xl md:text-2xl font-black text-white tracking-tight">Custom IKEA Kitchens</h3>
              <p className="text-sm text-white/40 font-medium mt-1">Grain-Matched Fronts &middot; Custom Colors &middot; Premium Finishes</p>
            </div>

            <div className="p-6 md:p-8 space-y-6">
              <p className="text-sm text-brand-muted leading-relaxed">
                We customize every visible surface of your IKEA kitchen. <strong className="text-brand-charcoal">Grain-matched fronts</strong> that flow seamlessly across doors and drawers — no mismatched wood patterns, no generic laminate. Custom colors, custom sizes, premium soft-close hardware, and finishes that make IKEA frames disappear behind furniture-quality cabinetry.
              </p>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2.5">
                  <p className="text-[10px] font-black text-luxury-ochre uppercase tracking-widest">Cabinet System</p>
                  {[
                    "IKEA SEKTION frames — 25-year warranty, steel hardware",
                    "Grain-matched fronts across all doors & drawers",
                    "Custom colors — any shade, any finish",
                    "Custom sizes — not limited to IKEA's standard options",
                    "Slab, shaker, or custom profile door styles",
                  ].map((f) => (
                    <div key={f} className="flex items-start gap-2.5">
                      <svg className="w-4 h-4 text-luxury-gold flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.403 12.652a3 3 0 000-5.304 3 3 0 00-3.75-3.751 3 3 0 00-5.305 0 3 3 0 00-3.751 3.75 3 3 0 000 5.305 3 3 0 003.75 3.751 3 3 0 005.305 0 3 3 0 003.751-3.75zm-2.546-4.46a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                      </svg>
                      <span className="text-xs text-brand-charcoal font-medium leading-snug">{f}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-2.5">
                  <p className="text-[10px] font-black text-luxury-ochre uppercase tracking-widest">Hardware & Details</p>
                  {[
                    "Soft-close hinges & full-extension drawers standard",
                    "Handles, pulls, or handleless push-to-open",
                    "Custom filler panels, trim, and crown molding",
                    "Integrated lighting & organizational inserts",
                    "Full design, delivery, and professional installation",
                  ].map((f) => (
                    <div key={f} className="flex items-start gap-2.5">
                      <svg className="w-4 h-4 text-luxury-gold flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.403 12.652a3 3 0 000-5.304 3 3 0 00-3.75-3.751 3 3 0 00-5.305 0 3 3 0 00-3.751 3.75 3 3 0 000 5.305 3 3 0 003.75 3.751 3 3 0 005.305 0 3 3 0 003.751-3.75zm-2.546-4.46a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                      </svg>
                      <span className="text-xs text-brand-charcoal font-medium leading-snug">{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-luxury-soft/40 rounded-xl p-4 border border-luxury-champagne/50">
                <p className="text-[10px] font-black text-luxury-ochre uppercase tracking-widest mb-1">What Are Grain-Matched Fronts?</p>
                <p className="text-xs text-brand-muted leading-relaxed">
                  Standard cabinet doors have random grain patterns — open two adjacent doors and the wood grain goes different directions. <strong className="text-brand-charcoal">Grain-matching</strong> means every visible front is cut and arranged so the grain flows continuously across your entire kitchen. It&apos;s what separates a good kitchen from a jaw-dropping one, and it&apos;s standard on every WDO Custom IKEA build.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 pt-2">
                <div>
                  <p className="text-[10px] font-bold text-brand-muted uppercase tracking-wider mb-1">Typical Range (10x10 Kitchen)</p>
                  <p className="text-2xl font-black text-brand-charcoal">$18,000 — $45,000</p>
                  <p className="text-[10px] text-brand-muted mt-0.5">Cabinets, fronts, hardware, crown, and installation</p>
                </div>
                <Link
                  href="/estimate"
                  className="w-full sm:w-auto text-center bg-luxury-gold hover:bg-luxury-ochre text-brand-charcoal font-black text-xs tracking-wide uppercase px-8 py-3.5 rounded-xl transition-all shadow-glow-gold active:scale-[0.98]"
                >
                  Estimate My Kitchen
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── WHAT WE CUSTOMIZE ─── */}
      <section className="py-16 bg-white border-y border-brand-stone/20">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-12">
            <p className="text-[11px] font-black text-luxury-gold uppercase tracking-[0.2em] mb-2">Full Customization</p>
            <h2 className="text-2xl sm:text-3xl font-black text-brand-charcoal tracking-tight">Everything IKEA Doesn&apos;t Offer, We Do</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { title: "Grain-Matched Fronts", desc: "Continuous wood grain flow across all doors and drawers for a seamless, high-end look that IKEA's stock options can't achieve." },
              { title: "Any Color, Any Finish", desc: "Not limited to IKEA's catalog. Match your exact paint color, stain, or go with lacquer, matte, gloss — whatever your design calls for." },
              { title: "Custom Sizing", desc: "Non-standard widths, heights, and depths. We fill awkward gaps, wrap around corners, and build to your kitchen's exact dimensions." },
              { title: "Premium Door Profiles", desc: "Slab, shaker, beaded, raised panel, or a fully custom profile. Your door style, your way — manufactured to fit IKEA frames perfectly." },
              { title: "Handleless Systems", desc: "Push-to-open, J-pull channels, or integrated grip profiles for a clean, modern European look with no visible hardware." },
              { title: "Full Remodel Scope", desc: "Countertops, backsplash, lighting, plumbing, electrical, flooring, paint — one contractor, one timeline, one point of contact." },
            ].map((item) => (
              <div key={item.title} className="bg-brand-alabaster rounded-2xl border border-brand-stone/20 p-6">
                <h3 className="text-sm font-black text-brand-charcoal tracking-tight mb-2">{item.title}</h3>
                <p className="text-xs text-brand-muted leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── COMPARISON TABLE ─── */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-5">
          <div className="text-center mb-10">
            <p className="text-[11px] font-black text-luxury-gold uppercase tracking-[0.2em] mb-2">How We Compare</p>
            <h2 className="text-2xl sm:text-3xl font-black text-brand-charcoal tracking-tight">WDO Custom vs. The Alternatives</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b-2 border-brand-charcoal/10">
                  <th className="py-3 pr-4 text-[10px] font-black text-brand-muted uppercase tracking-widest w-[30%]">Feature</th>
                  <th className="py-3 px-4 text-[10px] font-black text-luxury-gold uppercase tracking-widest text-center">WDO Custom</th>
                  <th className="py-3 px-4 text-[10px] font-black text-brand-muted uppercase tracking-widest text-center">IKEA DIY</th>
                  <th className="py-3 pl-4 text-[10px] font-black text-brand-muted uppercase tracking-widest text-center">Big-Box Custom</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {[
                  { feature: "Grain-Matched Fronts", wdo: true, ikea: false, bigBox: false },
                  { feature: "Custom Colors & Finishes", wdo: true, ikea: false, bigBox: "limited" },
                  { feature: "Custom Sizing (Non-Standard)", wdo: true, ikea: false, bigBox: true },
                  { feature: "25-Year Frame Warranty", wdo: true, ikea: true, bigBox: false },
                  { feature: "Handleless Systems", wdo: true, ikea: false, bigBox: false },
                  { feature: "Professional Design & Install", wdo: true, ikea: false, bigBox: true },
                  { feature: "Single Contractor (Design → Install)", wdo: true, ikea: false, bigBox: false },
                  { feature: "Transparent Line-Item Pricing", wdo: true, ikea: true, bigBox: false },
                  { feature: "Digital Project Portal", wdo: true, ikea: false, bigBox: false },
                  { feature: "Competitive Pricing", wdo: true, ikea: true, bigBox: false },
                ].map((row) => (
                  <tr key={row.feature} className="border-b border-brand-stone/15 hover:bg-brand-alabaster/50 transition-colors">
                    <td className="py-3 pr-4 font-semibold text-brand-charcoal">{row.feature}</td>
                    {[row.wdo, row.ikea, row.bigBox].map((val, i) => (
                      <td key={i} className="py-3 px-4 text-center">
                        {val === true
                          ? <span className="inline-flex w-5 h-5 rounded-full bg-sage-100 items-center justify-center"><svg className="w-3 h-3 text-sage-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></span>
                          : val === "limited"
                            ? <span className="text-[10px] font-bold text-brand-muted">Limited</span>
                            : <span className="inline-flex w-5 h-5 rounded-full bg-red-50 items-center justify-center"><svg className="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></span>
                        }
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ─── PHOTO GALLERY ─── */}
      <section id="work" className="py-16 md:py-20 bg-white border-y border-brand-stone/20">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-10">
            <p className="text-[11px] font-black text-luxury-gold uppercase tracking-[0.2em] mb-2">Our Work</p>
            <h2 className="text-2xl sm:text-3xl font-black text-brand-charcoal tracking-tight">Custom IKEA Kitchens We&apos;ve Built</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {["/images/kitchen-1.jpg", "/images/kitchen-2.jpg", "/images/kitchen-3.jpg", "/images/kitchen-4.jpg"].map((src, i) => (
              <div key={i} className="relative aspect-[4/3] rounded-2xl overflow-hidden group">
                <Image src={src} alt={`Custom IKEA kitchen project ${i + 1}`} fill className="object-cover group-hover:scale-105 transition-transform duration-700" sizes="(max-width: 768px) 50vw, 25vw" />
                <div className="absolute inset-0 bg-brand-charcoal/0 group-hover:bg-brand-charcoal/20 transition-colors duration-500" />
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-brand-muted mt-4">More kitchen photos coming soon</p>
        </div>
      </section>

      {/* ─── PROCESS ─── */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-5">
          <div className="text-center mb-12">
            <p className="text-[11px] font-black text-luxury-gold uppercase tracking-[0.2em] mb-2">Our Process</p>
            <h2 className="text-2xl sm:text-3xl font-black text-brand-charcoal tracking-tight">From Vision to Finished Kitchen</h2>
          </div>

          <div className="space-y-0">
            {[
              { num: "01", title: "Free In-Home Consultation", desc: "Skyler visits your home, measures the space, discusses your vision, and walks through customization options — door styles, colors, finishes, hardware. No pressure, no obligation." },
              { num: "02", title: "Design & Material Selection", desc: "We present a detailed layout with 3D renderings, finalize grain-matched fronts, colors, hardware, and every detail. You see exactly what you're getting before we order anything." },
              { num: "03", title: "Line-Itemized Proposal", desc: "Every dollar accounted for — IKEA frames, custom fronts, hardware, countertops, install labor. Review it in your digital project portal. Approve when you're ready." },
              { num: "04", title: "Fabrication & Delivery", desc: "IKEA frames ship in days. Custom grain-matched fronts are fabricated to your exact specs. We coordinate everything so it all arrives together." },
              { num: "05", title: "Professional Installation", desc: "Our crew installs everything — frames, custom fronts, hardware, trim, crown, lighting. Level, plumb, and perfect. Typically 2-3 weeks from start to cooking." },
            ].map((step) => (
              <div key={step.num} className="flex gap-5 py-6 border-b border-brand-stone/15 last:border-0">
                <div className="w-12 h-12 rounded-2xl bg-brand-charcoal flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-black text-luxury-gold">{step.num}</span>
                </div>
                <div>
                  <h3 className="text-base font-black text-brand-charcoal tracking-tight">{step.title}</h3>
                  <p className="text-xs text-brand-muted leading-relaxed mt-1">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="py-16 md:py-20 bg-white border-y border-brand-stone/20">
        <div className="max-w-3xl mx-auto px-5">
          <div className="text-center mb-10">
            <p className="text-[11px] font-black text-luxury-gold uppercase tracking-[0.2em] mb-2">Common Questions</p>
            <h2 className="text-2xl sm:text-3xl font-black text-brand-charcoal tracking-tight">Custom IKEA Kitchen FAQ</h2>
          </div>

          <div className="space-y-3">
            {[
              {
                q: "What does grain-matched mean?",
                a: "Standard cabinets have random grain patterns on each door — open two side-by-side and the wood grain goes different directions. Grain-matching means we cut and arrange every front so the grain flows continuously across your entire kitchen. It creates a seamless, high-end look that's typically only found in $80k+ custom builds."
              },
              {
                q: "Why IKEA frames instead of custom-built boxes?",
                a: "IKEA's SEKTION system is honestly overengineered — steel rail mounting systems, moisture-resistant particle board, metric precision manufacturing, and a 25-year warranty. We've tried custom boxes, and IKEA frames outperform them in durability and consistency. The frames are the hidden backbone. What people see — and what matters for aesthetics — are the fronts, and that's where we go fully custom."
              },
              {
                q: "Can I get any color or finish I want?",
                a: "Yes. We're not limited to IKEA's catalog. Match your exact Benjamin Moore or Sherwin-Williams paint color, go with a custom stain, lacquer, matte, gloss, thermofoil — whatever your design calls for. If you can dream it, we can build it on IKEA frames."
              },
              {
                q: "How long does a custom IKEA kitchen take?",
                a: "From signed contract to cooking dinner: typically 4-8 weeks. IKEA frames ship in days. Custom grain-matched fronts take 3-4 weeks to fabricate. Installation itself is usually 2-3 weeks depending on kitchen size and complexity."
              },
              {
                q: "Do you handle the full kitchen remodel or just cabinets?",
                a: "Full kitchen remodels — cabinets, countertops, backsplash, lighting, plumbing fixtures, flooring, electrical, paint, and demo. One contractor, one timeline, one point of contact. But if you only need cabinets, we do that too."
              },
              {
                q: "What's included in the 25-year IKEA warranty?",
                a: "IKEA's SEKTION warranty covers the cabinet frames, hinges, drawer rails, and internal hardware for 25 years. It's one of the best cabinet warranties in the industry. Our custom fronts carry their own separate warranty on materials and finish. And we include a 1-year workmanship warranty on installation."
              },
            ].map((faq) => (
              <details key={faq.q} className="bg-brand-alabaster rounded-2xl border border-brand-stone/30 shadow-soft group">
                <summary className="px-5 py-4 cursor-pointer list-none flex items-center justify-between gap-4">
                  <span className="text-sm font-bold text-brand-charcoal">{faq.q}</span>
                  <svg className="w-4 h-4 text-brand-muted flex-shrink-0 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-5 pb-4">
                  <p className="text-xs text-brand-muted leading-relaxed">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="py-16 bg-brand-charcoal relative overflow-hidden">
        <Image src="/images/kitchen-1.jpg" alt="" fill className="object-cover opacity-10" sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-charcoal via-brand-charcoal/95 to-brand-charcoal/80" />
        <div className="relative z-10 max-w-2xl mx-auto px-5 text-center">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-3">
            Your Dream Kitchen Starts<br />
            <span className="text-luxury-gold">With a Conversation.</span>
          </h2>
          <p className="text-sm text-white/40 font-medium mb-8 max-w-md mx-auto">
            Get an instant ballpark estimate in 30 seconds, or skip straight to a free in-home consultation with Skyler. No pressure, no showroom markup — just honest pricing from a licensed contractor.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/estimate" className="w-full sm:w-auto bg-luxury-gold hover:bg-luxury-ochre text-brand-charcoal font-black text-sm tracking-wide uppercase px-10 py-4 rounded-xl transition-all shadow-glow-gold active:scale-[0.98] text-center">
              Free Instant Estimate
            </Link>
            <Link href="/consultation" className="w-full sm:w-auto border border-white/15 hover:border-white/30 text-white/70 hover:text-white font-bold text-sm tracking-wide uppercase px-10 py-4 rounded-xl transition-all text-center">
              Schedule Consultation
            </Link>
          </div>
          <p className="text-white/20 text-[11px] font-bold mt-8">
            Or call Skyler directly: <a href="tel:+14028198558" className="text-white/40 hover:text-white underline underline-offset-2 transition-colors">(402) 819-8558</a>
          </p>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="bg-brand-charcoal border-t border-white/5">
        <div className="max-w-6xl mx-auto px-5 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Link href="/" className="flex items-center gap-2.5">
              <Image src="/images/logo.png" alt="WDO Custom" width={28} height={28} className="rounded-md" />
              <span className="text-xs font-bold text-white/40">WDO Custom</span>
            </Link>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              <Link href="/" className="text-[11px] font-bold text-white/30 hover:text-white/60 uppercase tracking-wider transition-colors">Home</Link>
              <Link href="/estimate" className="text-[11px] font-bold text-white/30 hover:text-white/60 uppercase tracking-wider transition-colors">Estimate</Link>
              <Link href="/consultation" className="text-[11px] font-bold text-white/30 hover:text-white/60 uppercase tracking-wider transition-colors">Consultation</Link>
              <a href="tel:+14028198558" className="text-[11px] font-bold text-white/30 hover:text-white/60 uppercase tracking-wider transition-colors">(402) 819-8558</a>
              <a href="https://www.facebook.com/wdocustom" target="_blank" rel="noopener noreferrer" className="text-white/20 hover:text-white/50 transition-colors" aria-label="Facebook">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
              <a href="https://www.instagram.com/wdocustom" target="_blank" rel="noopener noreferrer" className="text-white/20 hover:text-white/50 transition-colors" aria-label="Instagram">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C16.67.014 16.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </a>
            </div>
            <p className="text-[10px] text-white/20 font-medium">NE License #LIC-1901422</p>
          </div>
          <div className="mt-6 pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[10px] text-white/15 font-medium">&copy; {new Date().getFullYear()} WDO Custom LLC. All rights reserved.</p>
            <p className="text-[10px] text-white/15 font-medium">Omaha, NE</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
