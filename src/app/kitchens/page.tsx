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
        <Image src="/images/kitchen-2.jpg" alt="Custom kitchen by WDO Custom" fill className="object-cover opacity-20" priority sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-charcoal via-brand-charcoal/95 to-brand-charcoal/75" />
        <div className="relative z-10 max-w-5xl mx-auto px-5 py-20 md:py-28">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-luxury-gold" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Omaha&apos;s Custom Kitchen Specialists</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-[1.1] mb-5">
              Custom Kitchens.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-luxury-champagne via-luxury-gold to-luxury-ochre">
                Two Ways to Get There.
              </span>
            </h1>
            <p className="text-base sm:text-lg text-white/50 font-medium leading-relaxed mb-8 max-w-xl">
              Semi-custom IKEA with Grayson-matched fronts for smart budgets. Full custom frameless Euro cabinetry for luxury builds. Both installed by one licensed contractor who obsesses over every detail.
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

      {/* ─── TWO TIERS ─── */}
      <section id="options" className="py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-14">
            <p className="text-[11px] font-black text-luxury-gold uppercase tracking-[0.2em] mb-2">Choose Your Path</p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-brand-charcoal tracking-tight">Two Tiers. One Standard of Craft.</h2>
            <p className="text-sm text-brand-muted font-medium mt-3 max-w-xl mx-auto">Whether you choose smart-budget IKEA frames or full custom Euro boxes, every kitchen we build looks and functions like it belongs in an architectural magazine.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">

            {/* TIER 1: IKEA + Grayson */}
            <div className="bg-white rounded-3xl border border-brand-stone/30 shadow-premium overflow-hidden group hover:shadow-elevated transition-shadow duration-500">
              <div className="bg-brand-charcoal p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-luxury-gold/5 rounded-full blur-[30px]" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[9px] font-black uppercase tracking-widest text-luxury-gold bg-luxury-gold/10 px-3 py-1 rounded-full">Most Popular</span>
                    <span className="text-[10px] font-bold text-white/30">$$</span>
                  </div>
                  <h3 className="text-xl font-black text-white tracking-tight">Semi-Custom IKEA</h3>
                  <p className="text-[11px] text-white/40 font-medium mt-1">with Grayson-Matched Fronts</p>
                </div>
              </div>

              <div className="p-6 space-y-5">
                <p className="text-sm text-brand-muted leading-relaxed">
                  IKEA&apos;s legendary SEKTION frames — engineered for 25 years of daily use — paired with <strong className="text-brand-charcoal">Grayson custom-matched fronts</strong> that transform builder-grade boxes into furniture-quality cabinetry. Custom colors, custom sizes, premium soft-close hardware.
                </p>

                <div className="space-y-2.5">
                  {[
                    "IKEA SEKTION frames — 25-year warranty, steel hardware",
                    "Grayson-matched fronts — any color, any style, any size",
                    "Slab, shaker, or custom profile door styles",
                    "Soft-close hinges & full-extension drawers standard",
                    "Custom filler panels, trim, and crown molding",
                    "Handles, pulls, or handleless push-to-open",
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

                <div className="bg-luxury-soft/40 rounded-xl p-4 border border-luxury-champagne/50">
                  <p className="text-[10px] font-black text-luxury-ochre uppercase tracking-widest mb-1">Why This Works</p>
                  <p className="text-xs text-brand-muted leading-relaxed">
                    IKEA frames are overengineered — steel rail systems, moisture-resistant particle board, metric precision. The fronts are where the magic happens. Grayson manufactures to IKEA&apos;s exact specs but in <strong className="text-brand-charcoal">any color, finish, or profile you want</strong>. You get a kitchen that looks $80k for half the price.
                  </p>
                </div>

                <div className="pt-2">
                  <p className="text-[10px] font-bold text-brand-muted uppercase tracking-wider mb-1">Typical Range (10x10 Kitchen)</p>
                  <p className="text-2xl font-black text-brand-charcoal">$18,000 — $35,000</p>
                  <p className="text-[10px] text-brand-muted mt-0.5">Cabinets, fronts, hardware, crown, and installation</p>
                </div>

                <Link
                  href="/estimate"
                  className="block w-full text-center bg-luxury-gold hover:bg-luxury-ochre text-brand-charcoal font-black text-xs tracking-wide uppercase px-6 py-3.5 rounded-xl transition-all shadow-glow-gold active:scale-[0.98]"
                >
                  Estimate My IKEA Kitchen
                </Link>
              </div>
            </div>

            {/* TIER 2: Full Custom Euro */}
            <div className="bg-white rounded-3xl border border-brand-stone/30 shadow-premium overflow-hidden group hover:shadow-elevated transition-shadow duration-500">
              <div className="bg-brand-charcoal p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-luxury-gold/5 rounded-full blur-[30px]" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/50 bg-white/5 px-3 py-1 rounded-full">Luxury Tier</span>
                    <span className="text-[10px] font-bold text-white/30">$$$</span>
                  </div>
                  <h3 className="text-xl font-black text-white tracking-tight">Full Custom Euro</h3>
                  <p className="text-[11px] text-white/40 font-medium mt-1">Frameless European Cabinetry</p>
                </div>
              </div>

              <div className="p-6 space-y-5">
                <p className="text-sm text-brand-muted leading-relaxed">
                  True frameless construction — <strong className="text-brand-charcoal">no face frame, full-overlay doors, seamless lines</strong>. Custom-built boxes in plywood or high-grade melamine with edgebanding, paired with any door material from thermofoil to solid hardwood veneer. The same look Eurowood sells — at better pricing.
                </p>

                <div className="space-y-2.5">
                  {[
                    "True frameless (European) box construction",
                    "3/4\" plywood or premium melamine boxes",
                    "Full-overlay doors — zero reveal, clean lines",
                    "Any material: thermofoil, acrylic, veneer, lacquer, solid wood",
                    "Integrated handleless systems (Servo-Drive, push-to-open, J-pull)",
                    "Custom interior systems — pull-outs, dividers, spice racks",
                    "Unlimited sizes — no IKEA grid constraints",
                    "Full design, fabrication coordination, and installation",
                  ].map((f) => (
                    <div key={f} className="flex items-start gap-2.5">
                      <svg className="w-4 h-4 text-luxury-gold flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.403 12.652a3 3 0 000-5.304 3 3 0 00-3.75-3.751 3 3 0 00-5.305 0 3 3 0 00-3.751 3.75 3 3 0 000 5.305 3 3 0 003.75 3.751 3 3 0 005.305 0 3 3 0 003.751-3.75zm-2.546-4.46a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                      </svg>
                      <span className="text-xs text-brand-charcoal font-medium leading-snug">{f}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-brand-alabaster rounded-xl p-4 border border-brand-stone/20">
                  <p className="text-[10px] font-black text-brand-charcoal uppercase tracking-widest mb-1">Eurowood Alternative</p>
                  <p className="text-xs text-brand-muted leading-relaxed">
                    Same frameless European construction methods. Same high-end finishes. Same handleless hardware systems. <strong className="text-brand-charcoal">Better pricing, faster timelines, and a local contractor</strong> who manages every detail from design through install — not a showroom that subs it out.
                  </p>
                </div>

                <div className="pt-2">
                  <p className="text-[10px] font-bold text-brand-muted uppercase tracking-wider mb-1">Typical Range (10x10 Kitchen)</p>
                  <p className="text-2xl font-black text-brand-charcoal">$35,000 — $65,000</p>
                  <p className="text-[10px] text-brand-muted mt-0.5">Custom boxes, doors, hardware, and full installation</p>
                </div>

                <Link
                  href="/consultation"
                  className="block w-full text-center bg-brand-charcoal hover:bg-brand-charcoal/90 text-white font-black text-xs tracking-wide uppercase px-6 py-3.5 rounded-xl transition-all shadow-sm"
                >
                  Schedule Design Consultation
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── COMPARISON TABLE ─── */}
      <section className="py-16 bg-white border-y border-brand-stone/20">
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
                  <th className="py-3 px-4 text-[10px] font-black text-brand-muted uppercase tracking-widest text-center">Big-Box Stores</th>
                  <th className="py-3 pl-4 text-[10px] font-black text-brand-muted uppercase tracking-widest text-center">Eurowood / Showrooms</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {[
                  { feature: "Frameless Euro Construction", wdo: true, bigBox: false, euro: true },
                  { feature: "Custom Colors & Finishes", wdo: true, bigBox: false, euro: true },
                  { feature: "Handleless Systems", wdo: true, bigBox: false, euro: true },
                  { feature: "IKEA Frame Option (25yr warranty)", wdo: true, bigBox: false, euro: false },
                  { feature: "Single Contractor (Design → Install)", wdo: true, bigBox: false, euro: false },
                  { feature: "Transparent Line-Item Pricing", wdo: true, bigBox: false, euro: false },
                  { feature: "Digital Project Portal", wdo: true, bigBox: false, euro: false },
                  { feature: "2-3 Week Cabinet Install", wdo: true, bigBox: false, euro: false },
                  { feature: "Competitive Pricing", wdo: true, bigBox: true, euro: false },
                  { feature: "1-Year Workmanship Warranty", wdo: true, bigBox: false, euro: "varies" },
                ].map((row) => (
                  <tr key={row.feature} className="border-b border-brand-stone/15 hover:bg-brand-alabaster/50 transition-colors">
                    <td className="py-3 pr-4 font-semibold text-brand-charcoal">{row.feature}</td>
                    <td className="py-3 px-4 text-center">
                      {row.wdo === true && <span className="inline-flex w-5 h-5 rounded-full bg-sage-100 items-center justify-center"><svg className="w-3 h-3 text-sage-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></span>}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {row.bigBox === true
                        ? <span className="inline-flex w-5 h-5 rounded-full bg-sage-100 items-center justify-center"><svg className="w-3 h-3 text-sage-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></span>
                        : <span className="inline-flex w-5 h-5 rounded-full bg-red-50 items-center justify-center"><svg className="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></span>
                      }
                    </td>
                    <td className="py-3 pl-4 text-center">
                      {row.euro === true
                        ? <span className="inline-flex w-5 h-5 rounded-full bg-sage-100 items-center justify-center"><svg className="w-3 h-3 text-sage-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></span>
                        : row.euro === "varies"
                          ? <span className="text-[10px] font-bold text-brand-muted">Varies</span>
                          : <span className="inline-flex w-5 h-5 rounded-full bg-red-50 items-center justify-center"><svg className="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ─── PHOTO GALLERY (placeholder for user's photos) ─── */}
      <section id="work" className="py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-10">
            <p className="text-[11px] font-black text-luxury-gold uppercase tracking-[0.2em] mb-2">Our Work</p>
            <h2 className="text-2xl sm:text-3xl font-black text-brand-charcoal tracking-tight">Kitchens We&apos;ve Built</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {["/images/kitchen-1.jpg", "/images/kitchen-2.jpg", "/images/kitchen-3.jpg", "/images/kitchen-4.jpg"].map((src, i) => (
              <div key={i} className="relative aspect-[4/3] rounded-2xl overflow-hidden group">
                <Image src={src} alt={`WDO Custom kitchen project ${i + 1}`} fill className="object-cover group-hover:scale-105 transition-transform duration-700" sizes="(max-width: 768px) 50vw, 25vw" />
                <div className="absolute inset-0 bg-brand-charcoal/0 group-hover:bg-brand-charcoal/20 transition-colors duration-500" />
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-brand-muted mt-4">More kitchen photos coming soon</p>
        </div>
      </section>

      {/* ─── PROCESS ─── */}
      <section className="py-16 bg-white border-y border-brand-stone/20">
        <div className="max-w-4xl mx-auto px-5">
          <div className="text-center mb-12">
            <p className="text-[11px] font-black text-luxury-gold uppercase tracking-[0.2em] mb-2">Our Process</p>
            <h2 className="text-2xl sm:text-3xl font-black text-brand-charcoal tracking-tight">From Vision to Finished Kitchen</h2>
          </div>

          <div className="space-y-0">
            {[
              { num: "01", title: "Free In-Home Consultation", desc: "Skyler visits your home, measures the space, discusses your vision, and helps you choose between IKEA + Grayson or full custom Euro — no pressure, no obligation." },
              { num: "02", title: "Design & Material Selection", desc: "We present a detailed layout with 3D renderings, finalize door styles, colors, hardware, and every detail. You see exactly what you're getting before we order anything." },
              { num: "03", title: "Line-Itemized Proposal", desc: "Every dollar accounted for — cabinets, fronts, hardware, countertops, install labor. Review it in your digital project portal. Approve when you're ready." },
              { num: "04", title: "Fabrication & Delivery", desc: "IKEA frames ship in days. Grayson fronts or custom Euro boxes are fabricated to your specs. We coordinate everything so it all arrives together." },
              { num: "05", title: "Professional Installation", desc: "Our crew installs everything — boxes, fronts, hardware, trim, crown, lighting. Level, plumb, and perfect. Typically 2-3 weeks from start to cooking." },
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
      <section className="py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-5">
          <div className="text-center mb-10">
            <p className="text-[11px] font-black text-luxury-gold uppercase tracking-[0.2em] mb-2">Common Questions</p>
            <h2 className="text-2xl sm:text-3xl font-black text-brand-charcoal tracking-tight">Kitchen Cabinet FAQ</h2>
          </div>

          <div className="space-y-3">
            {[
              {
                q: "What are Grayson-matched fronts?",
                a: "Grayson manufactures cabinet doors and drawer fronts that fit IKEA SEKTION frames perfectly — same mounting holes, same dimensions. But unlike IKEA's limited door options, Grayson offers hundreds of colors, custom sizes, and premium profiles like slab, shaker, and beaded inset. You get IKEA's bulletproof engineering with truly custom aesthetics."
              },
              {
                q: "How does WDO Custom compare to Eurowood?",
                a: "We offer the same frameless European construction, the same high-end finishes (thermofoil, acrylic, lacquer, veneer), and the same handleless hardware systems. The difference: better pricing, faster timelines, and a single licensed contractor who manages design through installation — not a showroom that subs out the install to whoever is available."
              },
              {
                q: "Can I mix IKEA frames with non-IKEA countertops and appliances?",
                a: "Absolutely. Most of our IKEA kitchen projects include quartz or granite countertops, custom tile backsplashes, and premium appliances from any brand. The IKEA frames are just the cabinet boxes — everything else is fully customizable."
              },
              {
                q: "How long does a kitchen cabinet project take?",
                a: "From signed contract to cooking dinner: typically 4-8 weeks. IKEA frames ship in days. Grayson fronts take 3-4 weeks to fabricate. Full custom Euro boxes take 4-6 weeks. Installation itself is usually 2-3 weeks depending on kitchen size and complexity."
              },
              {
                q: "Do you handle the full kitchen remodel or just cabinets?",
                a: "Full kitchen remodels — cabinets, countertops, backsplash, lighting, plumbing fixtures, flooring, electrical, paint, and demo. One contractor, one timeline, one point of contact. But if you only need cabinets, we do that too."
              },
              {
                q: "What's included in the 25-year IKEA warranty?",
                a: "IKEA's SEKTION warranty covers the cabinet frames, hinges, drawer rails, and internal hardware for 25 years. It's one of the best cabinet warranties in the industry. The Grayson fronts carry their own separate warranty on materials and finish."
              },
            ].map((faq) => (
              <details key={faq.q} className="bg-white rounded-2xl border border-brand-stone/30 shadow-soft group">
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
