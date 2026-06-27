"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

interface LineItem {
  item: string;
  low: number;
  high: number;
  notes: string;
}

interface EstimateData {
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

interface Estimate {
  id: string;
  token: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  project_type: string;
  scope_level: string;
  description: string;
  estimate_data: EstimateData;
  status: string;
  converted_to_invoice_id: string | null;
  created_at: string;
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export default function PublicEstimatePage() {
  const params = useParams();
  const token = params?.token as string;
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data, error } = await supabase
        .from("estimates")
        .select("*")
        .eq("token", token)
        .single();
      if (error || !data) {
        setNotFound(true);
      } else {
        setEstimate(data);
      }
      setLoading(false);
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-alabaster flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-brand-charcoal/20 border-t-brand-charcoal rounded-full animate-spin" />
          <p className="text-xs font-medium text-brand-muted">Loading your estimate...</p>
        </div>
      </div>
    );
  }

  if (notFound || !estimate) {
    return (
      <div className="min-h-screen bg-brand-alabaster flex items-center justify-center font-sans px-5">
        <div className="text-center max-w-sm">
          <h1 className="text-2xl font-black text-brand-charcoal mb-2">Estimate Not Found</h1>
          <p className="text-sm text-brand-muted mb-6">This estimate link may have expired or is invalid.</p>
          <Link href="/estimate" className="bg-luxury-gold hover:bg-luxury-ochre text-brand-charcoal font-black text-sm uppercase px-8 py-3.5 rounded-xl transition-all">
            Get a New Estimate
          </Link>
        </div>
      </div>
    );
  }

  const result = estimate.estimate_data;
  const createdDate = new Date(estimate.created_at).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });

  const consultationParams = new URLSearchParams();
  if (estimate.name) consultationParams.set("name", estimate.name);
  if (estimate.email) consultationParams.set("email", estimate.email);
  if (estimate.phone) consultationParams.set("phone", estimate.phone);
  if (estimate.project_type) consultationParams.set("project", estimate.project_type);

  return (
    <div className="min-h-screen bg-brand-alabaster text-brand-charcoal font-sans antialiased selection:bg-luxury-gold/15">
      {/* NAV */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-xl border-b border-brand-stone/40 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/images/logo.png" alt="WDO Custom" width={36} height={36} className="rounded-lg shadow-sm" />
            <div className="leading-none">
              <span className="text-sm font-black tracking-tight text-brand-charcoal">WDO</span>
              <span className="text-sm font-medium tracking-tight text-brand-muted ml-1">Custom</span>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/estimate" className="text-xs font-bold text-brand-muted hover:text-brand-charcoal tracking-wide uppercase transition-colors hidden sm:block">
              New Estimate
            </Link>
            <a href="tel:+14028198558" className="bg-brand-charcoal text-white text-xs font-black tracking-wide uppercase px-5 py-2.5 rounded-lg hover:bg-brand-charcoal/90 transition-all shadow-sm">
              (402) 819-8558
            </a>
          </div>
        </div>
      </nav>

      <div className="pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-5">

          {/* Status Banner */}
          {estimate.converted_to_invoice_id ? (
            <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-800">Your Proposal is Ready</p>
                <p className="text-xs text-emerald-700 mt-0.5">This estimate has been converted into a detailed proposal. Check your email for the link to your project portal.</p>
              </div>
            </div>
          ) : (
            <div className="mb-6 bg-luxury-soft/50 border border-luxury-champagne rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1">
                <p className="text-sm font-bold text-brand-charcoal">Ready for the next step?</p>
                <p className="text-xs text-brand-muted mt-0.5">Schedule a free in-home consultation to get an exact, line-itemized quote.</p>
              </div>
              <Link
                href={`/consultation?${consultationParams.toString()}`}
                className="bg-luxury-gold hover:bg-luxury-ochre text-brand-charcoal font-black text-xs tracking-wide uppercase px-6 py-3 rounded-xl transition-all shadow-glow-gold active:scale-[0.98] whitespace-nowrap"
              >
                Schedule Consultation
              </Link>
            </div>
          )}

          {/* Estimate Card */}
          <div className="bg-white border border-brand-stone/40 rounded-2xl shadow-premium overflow-hidden">
            {/* Header */}
            <div className="bg-brand-charcoal px-6 py-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-luxury-gold/5 rounded-full blur-[40px]" />
              <div className="relative z-10">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-[10px] font-bold text-luxury-gold uppercase tracking-widest mb-1">Your Estimate</p>
                    <h1 className="text-xl font-black text-white tracking-tight">{result.project_title}</h1>
                    <p className="text-[11px] text-white/30 mt-1">Created {createdDate}</p>
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

            {/* CTA */}
            {!estimate.converted_to_invoice_id && (
              <div className="px-6 py-8 bg-white border-t border-brand-stone/15 text-center">
                <h3 className="text-lg font-black text-brand-charcoal tracking-tight mb-1">Ready to Make This Happen?</h3>
                <p className="text-sm text-brand-muted mb-6 max-w-md mx-auto">
                  This ballpark gets you started. A free on-site walkthrough with Skyler gets you an exact, line-itemized quote — typically within 48 hours.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    href={`/consultation?${consultationParams.toString()}`}
                    className="w-full sm:w-auto bg-luxury-gold hover:bg-luxury-ochre text-brand-charcoal font-black text-sm tracking-wide uppercase px-10 py-4 rounded-xl transition-all shadow-glow-gold active:scale-[0.98] text-center"
                  >
                    Schedule Free Consultation
                  </Link>
                  <a
                    href="tel:+14028198558"
                    className="w-full sm:w-auto border border-brand-stone/50 hover:border-brand-charcoal/30 text-brand-charcoal font-bold text-sm tracking-wide uppercase px-10 py-4 rounded-xl transition-all text-center"
                  >
                    Call Skyler — (402) 819-8558
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-brand-charcoal border-t border-white/5">
        <div className="max-w-6xl mx-auto px-5 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2.5">
              <Image src="/images/logo.png" alt="WDO Custom" width={28} height={28} className="rounded-md" />
              <span className="text-xs font-bold text-white/40">WDO Custom</span>
            </Link>
            <p className="text-[10px] text-white/20 font-medium">NE License #LIC-1901422</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
