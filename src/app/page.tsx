"use client";
import { useState } from "react";
import Link from "next/link";

const SERVICES = [
  {
    title: "Kitchen Remodeling",
    desc: "Complete kitchen transformations — custom cabinetry, countertops, backsplash, lighting, and layout redesign.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819" />
      </svg>
    ),
  },
  {
    title: "Bathroom Remodeling",
    desc: "Spa-quality bathrooms with tile work, walk-in showers, vanities, heated floors, and modern fixtures.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
      </svg>
    ),
  },
  {
    title: "Basement Finishing",
    desc: "Transform unused space into living areas, home theaters, bars, offices, and guest suites.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" />
      </svg>
    ),
  },
  {
    title: "Whole-Home Renovation",
    desc: "Full-scale remodels from floor plan reconfiguration to finishes — one contractor, one vision, one timeline.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    title: "Additions & Buildouts",
    desc: "Room additions, bump-outs, and structural expansions that blend seamlessly with existing architecture.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 16.875h3.375m0 0h3.375m-3.375 0V13.5m0 3.375v3.375M6 10.5h2.25a2.25 2.25 0 002.25-2.25V6a2.25 2.25 0 00-2.25-2.25H6A2.25 2.25 0 003.75 6v2.25A2.25 2.25 0 006 10.5zm0 9.75h2.25A2.25 2.25 0 0010.5 18v-2.25a2.25 2.25 0 00-2.25-2.25H6a2.25 2.25 0 00-2.25 2.25V18A2.25 2.25 0 006 20.25zm9.75-9.75H18a2.25 2.25 0 002.25-2.25V6A2.25 2.25 0 0018 3.75h-2.25A2.25 2.25 0 0013.5 6v2.25a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
  },
  {
    title: "Outdoor Living",
    desc: "Decks, patios, pergolas, and outdoor kitchens built to handle Nebraska's four-season climate.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
      </svg>
    ),
  },
];

const PROCESS_STEPS = [
  { step: "01", title: "Consultation", desc: "We visit your home, listen to your vision, and discuss scope, budget, and timeline." },
  { step: "02", title: "Design & Estimate", desc: "You receive a detailed, transparent proposal with line-item pricing — no hidden fees." },
  { step: "03", title: "Digital Approval", desc: "Review and sign your contract online through your private homeowner portal." },
  { step: "04", title: "Build", desc: "We manage permits, materials, subs, and daily progress — you track it all in real time." },
  { step: "05", title: "Final Walkthrough", desc: "Punch list, final inspection, and keys handed over. Backed by our 1-year workmanship warranty." },
];

const SERVICE_AREAS = [
  "Omaha", "Elkhorn", "Gretna", "Papillion", "La Vista",
  "Bellevue", "Bennington", "Ralston", "Council Bluffs", "Waterloo",
];

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-brand-alabaster text-brand-charcoal font-sans antialiased selection:bg-luxury-gold/15">

      {/* ─── NAVIGATION ─── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-xl border-b border-brand-stone/40 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <button type="button" onClick={() => scrollTo("hero")} className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-brand-charcoal flex items-center justify-center shadow-sm">
              <span className="text-white font-editorial font-black text-sm tracking-tight">W</span>
            </div>
            <div className="leading-none">
              <span className="text-sm font-black tracking-tight text-brand-charcoal">WDO</span>
              <span className="text-sm font-medium tracking-tight text-brand-muted ml-1">Custom</span>
            </div>
          </button>

          <div className="hidden md:flex items-center gap-8">
            {[
              ["Services", "services"],
              ["Process", "process"],
              ["About", "about"],
              ["Areas", "areas"],
            ].map(([label, id]) => (
              <button key={id} type="button" onClick={() => scrollTo(id)} className="text-xs font-bold text-brand-muted hover:text-brand-charcoal tracking-wide uppercase transition-colors">
                {label}
              </button>
            ))}
            <Link href="/estimate" className="bg-brand-charcoal text-white text-xs font-black tracking-wide uppercase px-5 py-2.5 rounded-lg hover:bg-brand-charcoal/90 transition-all shadow-sm">
              Free Estimate
            </Link>
          </div>

          <button type="button" onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 -mr-2 text-brand-charcoal">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              }
            </svg>
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-brand-stone/40 bg-white px-5 py-4 space-y-3 animate-fade-in">
            {[["Services", "services"], ["Process", "process"], ["About", "about"], ["Areas", "areas"], ["Contact", "contact"]].map(([label, id]) => (
              <button key={id} type="button" onClick={() => scrollTo(id)} className="block w-full text-left text-sm font-bold text-brand-charcoal py-1.5">
                {label}
              </button>
            ))}
            <Link href="/estimate" className="block w-full text-left text-sm font-black text-luxury-ochre py-1.5" onClick={() => setMenuOpen(false)}>
              Free Instant Estimate
            </Link>
          </div>
        )}
      </nav>

      {/* ─── HERO ─── */}
      <section id="hero" className="relative min-h-[90vh] flex items-center overflow-hidden pt-16">
        <div className="absolute inset-0 bg-brand-charcoal">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-charcoal via-brand-charcoal/95 to-brand-charcoal/80" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:3rem_3rem]" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-5 py-20 md:py-0 w-full">
          <div className="max-w-2xl space-y-8">
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-luxury-gold" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Licensed Nebraska General Contractor</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-[1.08]">
              Omaha&apos;s Premier<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-luxury-champagne via-luxury-gold to-luxury-ochre">
                Remodeling Partner
              </span>
            </h1>

            <p className="text-base sm:text-lg text-white/50 font-medium leading-relaxed max-w-lg">
              Kitchens, bathrooms, basements, and whole-home renovations —
              built with precision, managed with transparency, and backed
              by a one-year workmanship warranty.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/estimate" className="bg-luxury-gold hover:bg-luxury-ochre text-brand-charcoal font-black text-sm tracking-wide uppercase px-8 py-4 rounded-xl transition-all shadow-glow-gold active:scale-[0.98] text-center">
                Get a Free Estimate
              </Link>
              <button type="button" onClick={() => scrollTo("services")} className="border border-white/15 hover:border-white/30 text-white/70 hover:text-white font-bold text-sm tracking-wide uppercase px-8 py-4 rounded-xl transition-all">
                View Services
              </button>
            </div>

            <div className="flex items-center gap-6 pt-2">
              <div className="text-center">
                <p className="text-2xl font-black text-white">100+</p>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Projects Completed</p>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div className="text-center">
                <p className="text-2xl font-black text-white">5-Star</p>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Client Rated</p>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div className="text-center">
                <p className="text-2xl font-black text-white">1-Year</p>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Warranty</p>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg className="w-5 h-5 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* ─── TRUST BAR ─── */}
      <section className="bg-white border-b border-brand-stone/30">
        <div className="max-w-6xl mx-auto px-5 py-5">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[11px] font-bold text-brand-muted uppercase tracking-widest">
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-luxury-gold" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.403 12.652a3 3 0 000-5.304 3 3 0 00-3.75-3.751 3 3 0 00-5.305 0 3 3 0 00-3.751 3.75 3 3 0 000 5.305 3 3 0 003.75 3.751 3 3 0 005.305 0 3 3 0 003.751-3.75zm-2.546-4.46a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
              Licensed &amp; Insured
            </span>
            <span className="hidden sm:inline text-brand-stone">|</span>
            <span>NE License #LIC-1901422</span>
            <span className="hidden sm:inline text-brand-stone">|</span>
            <span>IRC &amp; IBC Compliant</span>
            <span className="hidden sm:inline text-brand-stone">|</span>
            <span>Omaha Metro Area</span>
          </div>
        </div>
      </section>

      {/* ─── SERVICES ─── */}
      <section id="services" className="py-24 bg-brand-alabaster">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center max-w-xl mx-auto mb-16">
            <p className="text-[11px] font-black text-luxury-gold uppercase tracking-[0.2em] mb-3">What We Do</p>
            <h2 className="text-3xl sm:text-4xl font-black text-brand-charcoal tracking-tight">Remodeling Services</h2>
            <p className="text-sm text-brand-muted font-medium mt-3 leading-relaxed">
              From concept to completion, we handle every phase of your remodel — permits, materials, skilled trades, and project management under one roof.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {SERVICES.map((s) => (
              <div key={s.title} className="group bg-white border border-brand-stone/40 rounded-2xl p-7 hover:shadow-elevated hover:border-brand-stone/60 transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-brand-warm flex items-center justify-center text-brand-charcoal mb-5 group-hover:bg-luxury-soft group-hover:text-luxury-ochre transition-colors">
                  {s.icon}
                </div>
                <h3 className="text-base font-black text-brand-charcoal mb-2 tracking-tight">{s.title}</h3>
                <p className="text-sm text-brand-muted leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PROCESS ─── */}
      <section id="process" className="py-24 bg-brand-charcoal relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:4rem_4rem]" />

        <div className="relative z-10 max-w-6xl mx-auto px-5">
          <div className="text-center max-w-xl mx-auto mb-16">
            <p className="text-[11px] font-black text-luxury-gold uppercase tracking-[0.2em] mb-3">How It Works</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Our Process</h2>
            <p className="text-sm text-white/40 font-medium mt-3 leading-relaxed">
              A clear, structured approach from first conversation to final walkthrough — so you always know what&apos;s happening and what&apos;s next.
            </p>
          </div>

          <div className="grid md:grid-cols-5 gap-6">
            {PROCESS_STEPS.map((p, i) => (
              <div key={p.step} className="relative text-center md:text-left group">
                {i < PROCESS_STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-6 left-[calc(50%+24px)] w-[calc(100%-48px)] h-px bg-white/10" />
                )}
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/5 border border-white/10 mb-4 group-hover:border-luxury-gold/40 group-hover:bg-luxury-gold/5 transition-all">
                  <span className="text-sm font-black text-luxury-gold">{p.step}</span>
                </div>
                <h3 className="text-sm font-black text-white mb-1.5 tracking-tight">{p.title}</h3>
                <p className="text-xs text-white/40 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── ABOUT ─── */}
      <section id="about" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-5">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-[11px] font-black text-luxury-gold uppercase tracking-[0.2em] mb-3">About WDO Custom</p>
              <h2 className="text-3xl sm:text-4xl font-black text-brand-charcoal tracking-tight mb-6">
                Built on Craftsmanship.<br />Run on Transparency.
              </h2>
              <div className="space-y-4 text-sm text-brand-muted leading-relaxed">
                <p>
                  WDO Custom is a licensed Nebraska general contracting company led by Skyler Camacho, specializing in residential remodeling across the Omaha metro. We handle everything from kitchen and bathroom renovations to full-scale home transformations.
                </p>
                <p>
                  Every project is managed through our proprietary digital platform — giving you a private portal to review your proposal, approve your contract electronically, track daily progress with photos, select materials, communicate directly with your contractor, and manage payments. No guesswork, no phone tag, no surprises.
                </p>
                <p>
                  We&apos;re fully insured, IRC and IBC code-compliant, and every project is backed by our one-year workmanship warranty. Our pricing is transparent and line-itemized so you see exactly where every dollar goes.
                </p>
              </div>
              <div className="mt-8 flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-brand-warm border-2 border-brand-stone flex items-center justify-center">
                  <span className="font-editorial font-black text-lg text-brand-charcoal">SC</span>
                </div>
                <div>
                  <p className="text-sm font-black text-brand-charcoal">Skyler Camacho</p>
                  <p className="text-xs text-brand-muted font-medium">Owner &amp; General Contractor</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {[
                { label: "Transparent Pricing", detail: "Line-itemized proposals with no hidden fees. You see every cost before signing." },
                { label: "Real-Time Project Tracking", detail: "Daily photo logs, progress updates, and milestone tracking through your private portal." },
                { label: "Digital Homeowner Portal", detail: "Approve contracts, select materials, message your contractor, and pay — all in one place." },
                { label: "1-Year Workmanship Warranty", detail: "Every project backed by a written warranty. We stand behind our work." },
              ].map((item) => (
                <div key={item.label} className="flex gap-4 p-5 bg-brand-alabaster rounded-xl border border-brand-stone/30">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-luxury-soft flex items-center justify-center mt-0.5">
                    <svg className="w-4 h-4 text-luxury-ochre" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.403 12.652a3 3 0 000-5.304 3 3 0 00-3.75-3.751 3 3 0 00-5.305 0 3 3 0 00-3.751 3.75 3 3 0 000 5.305 3 3 0 003.75 3.751 3 3 0 005.305 0 3 3 0 003.751-3.75zm-2.546-4.46a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-black text-brand-charcoal">{item.label}</p>
                    <p className="text-xs text-brand-muted leading-relaxed mt-0.5">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── SERVICE AREAS ─── */}
      <section id="areas" className="py-24 bg-brand-alabaster">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center max-w-xl mx-auto mb-12">
            <p className="text-[11px] font-black text-luxury-gold uppercase tracking-[0.2em] mb-3">Where We Work</p>
            <h2 className="text-3xl sm:text-4xl font-black text-brand-charcoal tracking-tight">Serving the Omaha Metro</h2>
            <p className="text-sm text-brand-muted font-medium mt-3 leading-relaxed">
              We serve homeowners across the greater Omaha area, including these communities and surrounding neighborhoods.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 max-w-3xl mx-auto">
            {SERVICE_AREAS.map((area) => (
              <span key={area} className="px-5 py-2.5 bg-white border border-brand-stone/40 rounded-full text-sm font-bold text-brand-charcoal shadow-sm hover:shadow-soft hover:border-luxury-gold/30 transition-all cursor-default">
                {area}
              </span>
            ))}
          </div>

          <p className="text-center text-xs text-brand-muted mt-6">
            Don&apos;t see your area? <button type="button" onClick={() => scrollTo("contact")} className="text-luxury-ochre font-bold hover:underline">Reach out</button> — we may still be able to help.
          </p>
        </div>
      </section>

      {/* ─── CONTACT / CTA ─── */}
      <section id="contact" className="py-24 bg-brand-charcoal relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-[-30%] right-[-15%] w-[50%] h-[80%] bg-gradient-to-bl from-luxury-gold/5 to-transparent rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto px-5 text-center">
          <p className="text-[11px] font-black text-luxury-gold uppercase tracking-[0.2em] mb-3">Start Your Project</p>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-4">
            Ready to Transform Your Home?
          </h2>
          <p className="text-sm text-white/40 font-medium leading-relaxed mb-10 max-w-lg mx-auto">
            Get in touch for a free, no-obligation consultation. We&apos;ll walk your space, discuss your vision, and deliver a transparent, line-itemized estimate — typically within 48 hours.
          </p>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 sm:p-10 backdrop-blur-sm max-w-md mx-auto text-left space-y-6">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Phone</p>
              <a href="tel:+14028198558" className="text-lg font-black text-white hover:text-luxury-gold transition-colors">(402) 819-8558</a>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Email</p>
              <a href="mailto:skyler@wdocustom.com" className="text-lg font-black text-white hover:text-luxury-gold transition-colors">skyler@wdocustom.com</a>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Location</p>
              <p className="text-lg font-black text-white">Omaha, NE</p>
            </div>
            <div className="pt-2">
              <Link href="/estimate" className="block w-full text-center bg-luxury-gold hover:bg-luxury-ochre text-brand-charcoal font-black text-sm tracking-wide uppercase px-8 py-4 rounded-xl transition-all shadow-glow-gold active:scale-[0.98]">
                Get an Instant Estimate
              </Link>
              <a href="tel:+14028198558" className="block w-full text-center border border-white/15 hover:border-white/30 text-white/70 hover:text-white font-bold text-xs tracking-wide uppercase px-8 py-3 rounded-xl transition-all mt-2">
                Or Call (402) 819-8558
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="bg-brand-charcoal border-t border-white/5">
        <div className="max-w-6xl mx-auto px-5 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-white/10 flex items-center justify-center">
                <span className="text-white font-editorial font-black text-xs">W</span>
              </div>
              <span className="text-xs font-bold text-white/40">WDO Custom</span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              {[["Services", "services"], ["Process", "process"], ["About", "about"], ["Areas", "areas"], ["Contact", "contact"]].map(([label, id]) => (
                <button key={id} type="button" onClick={() => scrollTo(id)} className="text-[11px] font-bold text-white/30 hover:text-white/60 uppercase tracking-wider transition-colors">
                  {label}
                </button>
              ))}
            </div>

            <p className="text-[10px] text-white/20 font-medium text-center md:text-right">
              NE License #LIC-1901422
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-[10px] text-white/15 font-medium">
              &copy; {new Date().getFullYear()} WDO Custom LLC. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
