"use client";
import { useState, useRef } from "react";
import Link from "next/link";

const PROJECT_TYPES = [
  { label: "Kitchen Remodel", icon: "🍳" },
  { label: "Bathroom Remodel", icon: "🚿" },
  { label: "Basement Finishing", icon: "🏠" },
  { label: "Whole-Home Renovation", icon: "🔨" },
  { label: "Room Addition", icon: "📐" },
  { label: "Outdoor Living / Deck", icon: "🌿" },
  { label: "Flooring", icon: "🪵" },
  { label: "Interior Painting", icon: "🎨" },
  { label: "Custom Built-Ins / Millwork", icon: "🪚" },
  { label: "Other", icon: "✦" },
];

interface LineItem {
  item: string;
  low: number;
  high: number;
  notes: string;
}

interface EstimateResult {
  project_title: string;
  line_items: LineItem[];
  subtotal_low: number;
  subtotal_high: number;
  overhead_profit_percent: number;
  contingency_percent: number;
  total_projected_low: number;
  total_projected_high: number;
  timeline_weeks: string;
  disclaimers: string[];
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export default function InstantEstimatePage() {
  const [projectType, setProjectType] = useState("");
  const [scopeLevel, setScopeLevel] = useState("mid");
  const [size, setSize] = useState("");
  const [zip, setZip] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EstimateResult | null>(null);
  const [error, setError] = useState("");
  const resultRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async () => {
    if (!projectType) { setError("Please select a project type."); return; }
    if (!description.trim()) { setError("Please describe your project."); return; }

    setError("");
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/instant-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectType, scopeLevel, size, zip, description }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Request failed");
      }

      const data = await res.json();
      setResult(data);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-alabaster text-brand-charcoal font-sans antialiased selection:bg-luxury-gold/15">

      {/* ─── NAV ─── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-xl border-b border-brand-stone/40 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-charcoal flex items-center justify-center shadow-sm">
              <span className="text-white font-editorial font-black text-sm tracking-tight">W</span>
            </div>
            <div className="leading-none">
              <span className="text-sm font-black tracking-tight text-brand-charcoal">WDO</span>
              <span className="text-sm font-medium tracking-tight text-brand-muted ml-1">Custom</span>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xs font-bold text-brand-muted hover:text-brand-charcoal tracking-wide uppercase transition-colors hidden sm:block">
              Home
            </Link>
            <a href="tel:+14028198558" className="bg-brand-charcoal text-white text-xs font-black tracking-wide uppercase px-5 py-2.5 rounded-lg hover:bg-brand-charcoal/90 transition-all shadow-sm">
              (402) 819-8558
            </a>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="pt-16 bg-brand-charcoal relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:3rem_3rem]" />
        <div className="absolute top-[-20%] right-[-10%] w-[40%] h-[70%] bg-gradient-to-bl from-luxury-gold/5 to-transparent rounded-full blur-[80px]" />

        <div className="relative z-10 max-w-4xl mx-auto px-5 py-14 md:py-20">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Free &amp; Instant — No Signup</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                Know Your Budget<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-luxury-champagne via-luxury-gold to-luxury-ochre">
                  Before the First Call
                </span>
              </h1>
              <p className="text-sm text-white/40 font-medium leading-relaxed">
                Get an AI-powered ballpark estimate in under 30 seconds based on current Omaha market rates. Describe your project, see the numbers, then decide if you want to talk.
              </p>
              <button
                type="button"
                onClick={() => formRef.current?.scrollIntoView({ behavior: "smooth" })}
                className="bg-luxury-gold hover:bg-luxury-ochre text-brand-charcoal font-black text-sm tracking-wide uppercase px-7 py-3.5 rounded-xl transition-all shadow-glow-gold active:scale-[0.98]"
              >
                Start My Estimate
              </button>
            </div>

            <div className="hidden md:block space-y-3">
              {[
                { num: "30s", text: "Average estimate time" },
                { num: "100%", text: "Free — no account needed" },
                { num: "Real", text: "Omaha market rates, not national averages" },
              ].map((s) => (
                <div key={s.text} className="flex items-center gap-4 bg-white/5 border border-white/8 rounded-xl px-5 py-3.5">
                  <span className="text-lg font-black text-luxury-gold w-14 flex-shrink-0">{s.num}</span>
                  <span className="text-xs text-white/50 font-medium">{s.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── TRUST BAR ─── */}
      <section className="bg-white border-b border-brand-stone/30">
        <div className="max-w-4xl mx-auto px-5 py-4">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[10px] font-bold text-brand-muted uppercase tracking-widest">
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-luxury-gold" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.403 12.652a3 3 0 000-5.304 3 3 0 00-3.75-3.751 3 3 0 00-5.305 0 3 3 0 00-3.751 3.75 3 3 0 000 5.305 3 3 0 003.75 3.751 3 3 0 005.305 0 3 3 0 003.751-3.75zm-2.546-4.46a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
              Licensed &amp; Insured
            </span>
            <span className="hidden sm:inline text-brand-stone/40">|</span>
            <span>NE #LIC-1901422</span>
            <span className="hidden sm:inline text-brand-stone/40">|</span>
            <span>1-Year Warranty</span>
            <span className="hidden sm:inline text-brand-stone/40">|</span>
            <span>5-Star Rated</span>
          </div>
        </div>
      </section>

      {/* ─── ESTIMATOR FORM ─── */}
      <section ref={formRef} className="py-14 md:py-20">
        <div className="max-w-3xl mx-auto px-5">

          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-brand-charcoal tracking-tight">Tell Us About Your Project</h2>
            <p className="text-sm text-brand-muted font-medium mt-2">The more detail you share, the more accurate your estimate.</p>
          </div>

          <div className="bg-white border border-brand-stone/40 rounded-2xl shadow-premium overflow-hidden">

            {/* Step 1: Project Type */}
            <div className="px-6 py-5 border-b border-brand-stone/20">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-full bg-brand-charcoal text-white text-[10px] font-black flex items-center justify-center">1</span>
                <label className="text-xs font-black text-brand-charcoal uppercase tracking-widest">What are you remodeling?</label>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {PROJECT_TYPES.map((t) => (
                  <button
                    key={t.label}
                    type="button"
                    onClick={() => setProjectType(t.label)}
                    className={`flex flex-col items-center gap-1 px-3 py-3 rounded-xl border text-center transition-all ${
                      projectType === t.label
                        ? "bg-brand-charcoal border-brand-charcoal text-white shadow-sm"
                        : "bg-brand-alabaster border-brand-stone/40 text-brand-muted hover:border-brand-charcoal/30 hover:text-brand-charcoal"
                    }`}
                  >
                    <span className="text-lg leading-none">{t.icon}</span>
                    <span className="text-[10px] font-bold leading-tight">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Finish Level */}
            <div className="px-6 py-5 border-b border-brand-stone/20">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-full bg-brand-charcoal text-white text-[10px] font-black flex items-center justify-center">2</span>
                <label className="text-xs font-black text-brand-charcoal uppercase tracking-widest">What finish level do you want?</label>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: "budget", label: "Budget", sub: "Builder grade finishes", price: "$" },
                  { value: "mid", label: "Mid-Range", sub: "Quality standard finishes", price: "$$" },
                  { value: "high", label: "High-End", sub: "Custom luxury finishes", price: "$$$" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setScopeLevel(opt.value)}
                    className={`p-4 rounded-xl border text-center transition-all ${
                      scopeLevel === opt.value
                        ? "bg-brand-charcoal border-brand-charcoal text-white shadow-sm"
                        : "bg-brand-alabaster border-brand-stone/40 text-brand-muted hover:border-brand-charcoal/30"
                    }`}
                  >
                    <p className={`text-base font-black mb-0.5 ${scopeLevel === opt.value ? "text-luxury-gold" : "text-brand-charcoal"}`}>{opt.price}</p>
                    <p className={`text-xs font-black ${scopeLevel === opt.value ? "text-white" : "text-brand-charcoal"}`}>{opt.label}</p>
                    <p className={`text-[10px] mt-0.5 ${scopeLevel === opt.value ? "text-white/50" : "text-brand-muted"}`}>{opt.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: Details */}
            <div className="px-6 py-5 border-b border-brand-stone/20">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-full bg-brand-charcoal text-white text-[10px] font-black flex items-center justify-center">3</span>
                <label className="text-xs font-black text-brand-charcoal uppercase tracking-widest">Project details</label>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-[10px] font-bold text-brand-muted uppercase tracking-wide mb-1">Size / Dimensions</label>
                  <input
                    type="text"
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    placeholder="e.g. 200 sq ft, 10x12 room"
                    className="w-full px-4 py-2.5 rounded-xl border border-brand-stone/40 bg-brand-alabaster text-sm text-brand-charcoal placeholder:text-brand-muted/40 focus:outline-none focus:border-brand-charcoal/40 focus:ring-1 focus:ring-brand-charcoal/10 transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-brand-muted uppercase tracking-wide mb-1">ZIP Code</label>
                  <input
                    type="text"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    placeholder="e.g. 68114"
                    maxLength={5}
                    className="w-full px-4 py-2.5 rounded-xl border border-brand-stone/40 bg-brand-alabaster text-sm text-brand-charcoal placeholder:text-brand-muted/40 focus:outline-none focus:border-brand-charcoal/40 focus:ring-1 focus:ring-brand-charcoal/10 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-brand-muted uppercase tracking-wide mb-1">Describe what you want done *</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="The more you share, the better. Example: Full master bath gut and remodel. Remove existing tub/shower combo, install walk-in tile shower with frameless glass, double vanity with quartz top, heated tile floor, new recessed lighting."
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-brand-stone/40 bg-brand-alabaster text-sm text-brand-charcoal placeholder:text-brand-muted/40 focus:outline-none focus:border-brand-charcoal/40 focus:ring-1 focus:ring-brand-charcoal/10 transition resize-none leading-relaxed"
                />
              </div>
            </div>

            {/* Step 4: Contact (Optional) */}
            <div className="px-6 py-5 border-b border-brand-stone/20 bg-luxury-soft/30">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-6 h-6 rounded-full bg-luxury-gold/20 text-luxury-ochre text-[10px] font-black flex items-center justify-center">✦</span>
                <label className="text-xs font-black text-brand-charcoal uppercase tracking-widest">Want us to follow up? <span className="normal-case font-medium text-brand-muted">(Optional)</span></label>
              </div>
              <p className="text-[11px] text-brand-muted mb-3 ml-8">Leave your info and Skyler will personally reach out to discuss your project.</p>
              <div className="grid sm:grid-cols-2 gap-3 ml-8">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-4 py-2.5 rounded-xl border border-brand-stone/40 bg-white text-sm text-brand-charcoal placeholder:text-brand-muted/40 focus:outline-none focus:border-brand-charcoal/40 focus:ring-1 focus:ring-brand-charcoal/10 transition"
                />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone number"
                  className="w-full px-4 py-2.5 rounded-xl border border-brand-stone/40 bg-white text-sm text-brand-charcoal placeholder:text-brand-muted/40 focus:outline-none focus:border-brand-charcoal/40 focus:ring-1 focus:ring-brand-charcoal/10 transition"
                />
              </div>
            </div>

            {/* Submit */}
            <div className="px-6 py-5">
              {error && (
                <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2 mb-4">{error}</p>
              )}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="w-full bg-luxury-gold hover:bg-luxury-ochre disabled:opacity-50 disabled:cursor-not-allowed text-brand-charcoal font-black text-sm tracking-wide uppercase px-8 py-4 rounded-xl transition-all shadow-glow-gold active:scale-[0.98]"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Building Your Estimate...
                  </span>
                ) : (
                  "Get My Free Estimate"
                )}
              </button>
              <p className="text-center text-[10px] text-brand-muted mt-3">
                Powered by AI using current Omaha, NE market rates. This is a ballpark — not a binding quote.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── ESTIMATE RESULT ─── */}
      {result && (
        <section ref={resultRef} className="pb-10">
          <div className="max-w-3xl mx-auto px-5">
            <div className="bg-white border border-brand-stone/40 rounded-2xl shadow-premium overflow-hidden">
              {/* Header */}
              <div className="bg-brand-charcoal px-6 py-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-luxury-gold/5 rounded-full blur-[40px]" />
                <div className="relative z-10">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <p className="text-[10px] font-bold text-luxury-gold uppercase tracking-widest mb-1">Your Estimate</p>
                      <h3 className="text-xl font-black text-white tracking-tight">{result.project_title}</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Estimated Range</p>
                      <p className="text-2xl font-black text-luxury-gold tracking-tight">${fmt(result.total_projected_low)} — ${fmt(result.total_projected_high)}</p>
                    </div>
                  </div>
                  {result.timeline_weeks && (
                    <div className="mt-3 inline-flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1">
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Est. Timeline:</span>
                      <span className="text-[11px] font-black text-white">{result.timeline_weeks} weeks</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Line Items */}
              <div className="divide-y divide-brand-stone/15">
                {result.line_items.map((item, i) => (
                  <div key={i} className="px-6 py-4 flex items-start justify-between gap-4 hover:bg-brand-alabaster/50 transition-colors">
                    <div className="flex-1 min-w-0 flex items-start gap-3">
                      <span className="w-5 h-5 rounded-md bg-brand-warm flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[9px] font-black text-brand-muted">{i + 1}</span>
                      </span>
                      <div>
                        <p className="text-sm font-bold text-brand-charcoal">{item.item}</p>
                        {item.notes && <p className="text-[11px] text-brand-muted mt-0.5 leading-relaxed">{item.notes}</p>}
                      </div>
                    </div>
                    <p className="text-sm font-black text-brand-charcoal flex-shrink-0 tabular-nums whitespace-nowrap">
                      ${fmt(item.low)} — ${fmt(item.high)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="bg-brand-warm/40 border-t border-brand-stone/20 px-6 py-4 space-y-2">
                <div className="flex justify-between text-xs text-brand-muted">
                  <span>Subtotal (Labor &amp; Materials)</span>
                  <span className="font-bold tabular-nums">${fmt(result.subtotal_low)} — ${fmt(result.subtotal_high)}</span>
                </div>
                <div className="flex justify-between text-xs text-brand-muted">
                  <span>Overhead &amp; Profit ({result.overhead_profit_percent}%)</span>
                  <span className="font-bold">Included</span>
                </div>
                <div className="flex justify-between text-xs text-brand-muted">
                  <span>Contingency ({result.contingency_percent}%)</span>
                  <span className="font-bold">Included</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-brand-stone/30">
                  <span className="text-sm font-black text-brand-charcoal uppercase tracking-wide">Total Estimate</span>
                  <span className="text-xl font-black text-brand-charcoal tabular-nums">${fmt(result.total_projected_low)} — ${fmt(result.total_projected_high)}</span>
                </div>
              </div>

              {/* Disclaimers */}
              <div className="px-6 py-4 bg-brand-alabaster/60 border-t border-brand-stone/15">
                <ul className="space-y-1">
                  {result.disclaimers.map((d, i) => (
                    <li key={i} className="text-[10px] text-brand-muted leading-relaxed flex gap-1.5">
                      <span className="text-brand-muted/30 flex-shrink-0">•</span>
                      {d}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Conversion CTA */}
              <div className="px-6 py-8 bg-white border-t border-brand-stone/15 text-center">
                <h3 className="text-lg font-black text-brand-charcoal tracking-tight mb-1">Ready to Make This Happen?</h3>
                <p className="text-sm text-brand-muted mb-6 max-w-md mx-auto">
                  This ballpark gets you started. A free on-site walkthrough with Skyler gets you an exact, line-itemized quote — typically within 48 hours.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <a
                    href="tel:+14028198558"
                    className="w-full sm:w-auto bg-luxury-gold hover:bg-luxury-ochre text-brand-charcoal font-black text-sm tracking-wide uppercase px-10 py-4 rounded-xl transition-all shadow-glow-gold active:scale-[0.98] text-center"
                  >
                    Call Skyler — (402) 819-8558
                  </a>
                  <a
                    href="mailto:skyler@wdocustom.com"
                    className="w-full sm:w-auto border border-brand-stone/50 hover:border-brand-charcoal/30 text-brand-charcoal font-bold text-sm tracking-wide uppercase px-10 py-4 rounded-xl transition-all text-center"
                  >
                    Email Us
                  </a>
                </div>
              </div>
            </div>

            <div className="text-center mt-5">
              <button
                type="button"
                onClick={() => { setResult(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className="text-xs font-bold text-brand-muted hover:text-brand-charcoal transition-colors underline underline-offset-2"
              >
                Estimate another project
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ─── WHY WDO CUSTOM ─── */}
      <section className="py-16 bg-white border-t border-brand-stone/20">
        <div className="max-w-4xl mx-auto px-5">
          <div className="text-center mb-10">
            <p className="text-[11px] font-black text-luxury-gold uppercase tracking-[0.2em] mb-2">Why Homeowners Choose Us</p>
            <h2 className="text-2xl sm:text-3xl font-black text-brand-charcoal tracking-tight">Not Your Typical Contractor</h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                title: "Transparent, Line-Itemized Pricing",
                desc: "No mystery bids. Every dollar is accounted for before you sign. You see exactly what you're paying for.",
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                  </svg>
                ),
              },
              {
                title: "Your Own Digital Project Portal",
                desc: "Track daily progress with photos, select materials, message your contractor, and pay — all from your phone.",
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                  </svg>
                ),
              },
              {
                title: "One Contractor, One Point of Contact",
                desc: "Skyler manages every project personally — no handoffs, no runaround. You always know who to call.",
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                ),
              },
              {
                title: "1-Year Workmanship Warranty",
                desc: "Every project is backed in writing. If something isn't right, we come back and make it right — no questions asked.",
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                ),
              },
            ].map((card) => (
              <div key={card.title} className="flex gap-4 p-5 bg-brand-alabaster rounded-xl border border-brand-stone/30 hover:shadow-soft transition-shadow">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-luxury-soft flex items-center justify-center text-luxury-ochre">
                  {card.icon}
                </div>
                <div>
                  <p className="text-sm font-black text-brand-charcoal mb-0.5">{card.title}</p>
                  <p className="text-xs text-brand-muted leading-relaxed">{card.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="py-16 bg-brand-charcoal relative overflow-hidden">
        <div className="absolute top-[-30%] right-[-10%] w-[40%] h-[80%] bg-gradient-to-bl from-luxury-gold/5 to-transparent rounded-full blur-[80px]" />
        <div className="relative z-10 max-w-2xl mx-auto px-5 text-center">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-3">
            Skip the Estimate.<br />
            <span className="text-luxury-gold">Talk to Skyler Directly.</span>
          </h2>
          <p className="text-sm text-white/40 font-medium mb-8 max-w-md mx-auto">
            Prefer a conversation? Call or text anytime for a free consultation. No pressure, no sales pitch — just honest advice from a licensed contractor.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="tel:+14028198558"
              className="w-full sm:w-auto bg-luxury-gold hover:bg-luxury-ochre text-brand-charcoal font-black text-sm tracking-wide uppercase px-10 py-4 rounded-xl transition-all shadow-glow-gold active:scale-[0.98] text-center"
            >
              (402) 819-8558
            </a>
            <a
              href="mailto:skyler@wdocustom.com"
              className="w-full sm:w-auto border border-white/15 hover:border-white/30 text-white/70 hover:text-white font-bold text-sm tracking-wide uppercase px-10 py-4 rounded-xl transition-all text-center"
            >
              skyler@wdocustom.com
            </a>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="bg-brand-charcoal border-t border-white/5">
        <div className="max-w-6xl mx-auto px-5 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-white/10 flex items-center justify-center">
                <span className="text-white font-editorial font-black text-xs">W</span>
              </div>
              <span className="text-xs font-bold text-white/40">WDO Custom</span>
            </Link>
            <div className="flex items-center gap-6">
              <Link href="/" className="text-[11px] font-bold text-white/30 hover:text-white/60 uppercase tracking-wider transition-colors">Home</Link>
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
