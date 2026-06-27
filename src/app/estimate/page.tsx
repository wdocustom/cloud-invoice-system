"use client";
import { useState, useRef } from "react";
import Link from "next/link";

const PROJECT_TYPES = [
  "Kitchen Remodel",
  "Bathroom Remodel",
  "Basement Finishing",
  "Whole-Home Renovation",
  "Room Addition",
  "Outdoor Living / Deck",
  "Flooring",
  "Interior Painting",
  "Custom Built-Ins / Millwork",
  "Other",
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
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EstimateResult | null>(null);
  const [error, setError] = useState("");
  const resultRef = useRef<HTMLDivElement>(null);

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
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
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
              Call Us
            </a>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="pt-16 bg-brand-charcoal relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:3rem_3rem]" />
        <div className="relative z-10 max-w-3xl mx-auto px-5 py-16 md:py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-luxury-gold" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Free &amp; Instant</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight mb-4">
            Get a Rough Estimate<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-luxury-champagne via-luxury-gold to-luxury-ochre">
              in Seconds
            </span>
          </h1>
          <p className="text-sm sm:text-base text-white/40 font-medium leading-relaxed max-w-lg mx-auto">
            Describe your remodeling project and get an AI-powered ballpark estimate based on current Omaha market rates. No signup, no commitment.
          </p>
        </div>
      </section>

      {/* ─── ESTIMATOR FORM ─── */}
      <section className="py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-5">
          <div className="bg-white border border-brand-stone/40 rounded-2xl shadow-card overflow-hidden">
            <div className="border-b border-brand-stone/30 px-6 py-4">
              <h2 className="text-xs font-black text-brand-charcoal uppercase tracking-widest">Project Details</h2>
              <p className="text-[11px] text-brand-muted mt-0.5">Fill in what you know — the more detail, the better your estimate.</p>
            </div>

            <div className="p-6 space-y-5">
              {/* Project Type */}
              <div>
                <label className="block text-[11px] font-bold text-brand-charcoal uppercase tracking-wide mb-1.5">Project Type *</label>
                <div className="flex flex-wrap gap-2">
                  {PROJECT_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setProjectType(t)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                        projectType === t
                          ? "bg-brand-charcoal border-brand-charcoal text-white"
                          : "bg-brand-alabaster border-brand-stone/50 text-brand-muted hover:border-brand-charcoal/30 hover:text-brand-charcoal"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scope Level */}
              <div>
                <label className="block text-[11px] font-bold text-brand-charcoal uppercase tracking-wide mb-1.5">Material &amp; Finish Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "budget", label: "Budget", sub: "Builder grade" },
                    { value: "mid", label: "Mid-Range", sub: "Standard" },
                    { value: "high", label: "High-End", sub: "Custom / luxury" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setScopeLevel(opt.value)}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        scopeLevel === opt.value
                          ? "bg-brand-charcoal border-brand-charcoal text-white"
                          : "bg-brand-alabaster border-brand-stone/50 text-brand-muted hover:border-brand-charcoal/30"
                      }`}
                    >
                      <p className={`text-xs font-black ${scopeLevel === opt.value ? "text-white" : "text-brand-charcoal"}`}>{opt.label}</p>
                      <p className={`text-[10px] mt-0.5 ${scopeLevel === opt.value ? "text-white/60" : "text-brand-muted"}`}>{opt.sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Size + ZIP */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-brand-charcoal uppercase tracking-wide mb-1.5">Project Size / Dimensions</label>
                  <input
                    type="text"
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    placeholder="e.g. 200 sq ft, 10x12 room, 5x8 bathroom"
                    className="w-full px-4 py-2.5 rounded-xl border border-brand-stone/50 bg-brand-alabaster text-sm text-brand-charcoal placeholder:text-brand-muted/50 focus:outline-none focus:border-brand-charcoal/40 transition"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-brand-charcoal uppercase tracking-wide mb-1.5">ZIP Code</label>
                  <input
                    type="text"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    placeholder="e.g. 68114"
                    maxLength={5}
                    className="w-full px-4 py-2.5 rounded-xl border border-brand-stone/50 bg-brand-alabaster text-sm text-brand-charcoal placeholder:text-brand-muted/50 focus:outline-none focus:border-brand-charcoal/40 transition"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11px] font-bold text-brand-charcoal uppercase tracking-wide mb-1.5">Describe Your Project *</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Example: Full master bath remodel. Want a walk-in tile shower with glass enclosure, new vanity with double sinks, heated tile floors, and updated lighting. Currently has a tub/shower combo."
                  rows={5}
                  className="w-full px-4 py-3 rounded-xl border border-brand-stone/50 bg-brand-alabaster text-sm text-brand-charcoal placeholder:text-brand-muted/50 focus:outline-none focus:border-brand-charcoal/40 transition resize-none leading-relaxed"
                />
              </div>

              {error && (
                <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>
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
                    Generating Estimate...
                  </span>
                ) : (
                  "Get My Estimate"
                )}
              </button>
            </div>
          </div>

          <p className="text-center text-[10px] text-brand-muted mt-4">
            This is a rough AI-generated estimate for budgeting purposes only. A formal quote requires an on-site consultation.
          </p>
        </div>
      </section>

      {/* ─── ESTIMATE RESULT ─── */}
      {result && (
        <section ref={resultRef} className="pb-20">
          <div className="max-w-3xl mx-auto px-5">
            <div className="bg-white border border-brand-stone/40 rounded-2xl shadow-card overflow-hidden">
              {/* Header */}
              <div className="bg-brand-charcoal px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Rough Estimate</p>
                    <h3 className="text-lg font-black text-white tracking-tight">{result.project_title}</h3>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Estimated Range</p>
                    <p className="text-lg font-black text-luxury-gold">${fmt(result.total_projected_low)} — ${fmt(result.total_projected_high)}</p>
                  </div>
                </div>
                {result.timeline_weeks && (
                  <p className="text-[11px] text-white/30 font-medium mt-2">Estimated timeline: {result.timeline_weeks} weeks</p>
                )}
              </div>

              {/* Line Items */}
              <div className="divide-y divide-brand-stone/20">
                {result.line_items.map((item, i) => (
                  <div key={i} className="px-6 py-4 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-brand-charcoal">{item.item}</p>
                      {item.notes && <p className="text-[11px] text-brand-muted mt-0.5">{item.notes}</p>}
                    </div>
                    <p className="text-sm font-black text-brand-charcoal flex-shrink-0 tabular-nums">
                      ${fmt(item.low)} — ${fmt(item.high)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="bg-brand-warm/50 border-t border-brand-stone/30 px-6 py-4 space-y-2">
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
                <div className="flex justify-between items-center pt-2 border-t border-brand-stone/30">
                  <span className="text-sm font-black text-brand-charcoal uppercase tracking-wide">Total Estimate</span>
                  <span className="text-lg font-black text-brand-charcoal tabular-nums">${fmt(result.total_projected_low)} — ${fmt(result.total_projected_high)}</span>
                </div>
              </div>

              {/* Disclaimers */}
              <div className="px-6 py-4 bg-brand-alabaster border-t border-brand-stone/20">
                <p className="text-[10px] font-bold text-brand-muted uppercase tracking-widest mb-2">Important Notes</p>
                <ul className="space-y-1">
                  {result.disclaimers.map((d, i) => (
                    <li key={i} className="text-[11px] text-brand-muted leading-relaxed flex gap-1.5">
                      <span className="text-brand-muted/40 flex-shrink-0">•</span>
                      {d}
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA */}
              <div className="px-6 py-6 bg-white border-t border-brand-stone/20 text-center space-y-3">
                <p className="text-sm font-bold text-brand-charcoal">Like what you see? Let&apos;s make it real.</p>
                <p className="text-xs text-brand-muted">Schedule a free on-site consultation for a detailed, binding quote.</p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
                  <a
                    href="tel:+14028198558"
                    className="bg-luxury-gold hover:bg-luxury-ochre text-brand-charcoal font-black text-xs tracking-wide uppercase px-8 py-3.5 rounded-xl transition-all shadow-glow-gold"
                  >
                    Call (402) 819-8558
                  </a>
                  <a
                    href="mailto:skyler@wdocustom.com"
                    className="border border-brand-stone/50 hover:border-brand-charcoal/30 text-brand-charcoal font-bold text-xs tracking-wide uppercase px-8 py-3.5 rounded-xl transition-all"
                  >
                    Email Us
                  </a>
                </div>
              </div>
            </div>

            {/* Run Again */}
            <div className="text-center mt-6">
              <button
                type="button"
                onClick={() => { setResult(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className="text-xs font-bold text-brand-muted hover:text-brand-charcoal transition-colors underline underline-offset-2"
              >
                Estimate a different project
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ─── FOOTER ─── */}
      <footer className="bg-brand-charcoal border-t border-white/5">
        <div className="max-w-6xl mx-auto px-5 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-white/10 flex items-center justify-center">
                <span className="text-white font-editorial font-black text-xs">W</span>
              </div>
              <span className="text-xs font-bold text-white/40">WDO Custom</span>
            </div>
            <div className="flex items-center gap-6">
              <Link href="/" className="text-[11px] font-bold text-white/30 hover:text-white/60 uppercase tracking-wider transition-colors">Home</Link>
              <a href="tel:+14028198558" className="text-[11px] font-bold text-white/30 hover:text-white/60 uppercase tracking-wider transition-colors">Call</a>
            </div>
            <p className="text-[10px] text-white/20 font-medium">NE License #LIC-1901422</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
