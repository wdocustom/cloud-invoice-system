"use client";
import { useState } from "react";
import Link from "next/link";
import { Nav, BlogFooter } from "./components";

const POSTS = [
  {
    slug: "custom-ikea-kitchen-omaha",
    title: "The $150K Kitchen Look for a Fraction of the Price: Why Omaha Homeowners Are Upgrading IKEA Kitchens",
    excerpt: "How WDO Custom pairs IKEA's bulletproof SEKTION steel-rail frames with grain-matched custom fronts, premium hardware, and full-scope structural work — delivering luxury kitchens across the Omaha metro at a fraction of showroom pricing.",
    tag: "Kitchens",
    readTime: "8 min read",
  },
  {
    slug: "budget-whole-home-remodel-omaha",
    title: "How to Budget for a Whole-Home Remodel in Omaha Without Hidden Fees",
    excerpt: "Transparent, line-itemed pricing. A Digital Homeowner Portal with daily photo logs. No surprise change orders. Here's how Omaha homeowners are taking the guesswork out of major renovations.",
    tag: "Budgeting",
    readTime: "7 min read",
  },
  {
    slug: "basement-vs-addition-omaha",
    title: "Maximizing Square Footage: Basement Finishing vs. Structural Additions for Omaha Homes",
    excerpt: "Should you finish the basement or build an addition? We break down cost per square foot, permit timelines, Nebraska's 4-season climate considerations, and ROI for Omaha-area homeowners.",
    tag: "Planning",
    readTime: "9 min read",
  },
  {
    slug: "luxury-bathroom-remodel-omaha",
    title: "High-End Bathroom Remodel in Omaha: What $30K–$70K Actually Gets You",
    excerpt: "Walk-in showers, heated tile floors, freestanding tubs, and frameless glass — what a luxury bathroom remodel actually costs in Elkhorn, West Omaha, and Papillion, and what separates a $30K job from a $70K one.",
    tag: "Bathrooms",
    readTime: "10 min read",
  },
  {
    slug: "new-construction-basement-finishing-elkhorn",
    title: "Finishing the Basement in Your New Build: A Guide for Elkhorn & Bennington Homeowners",
    excerpt: "Just closed on a new construction home with an unfinished basement? Here's what it actually costs, why the builder's quote was inflated, and why waiting 12 months is a myth that's costing you money.",
    tag: "Basements",
    readTime: "9 min read",
  },
];

export default function BlogIndexPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-brand-alabaster text-brand-charcoal font-sans antialiased selection:bg-luxury-gold/15">
      <Nav menuOpen={menuOpen} setMenuOpen={setMenuOpen} />

      {/* Hero */}
      <section className="pt-16 bg-brand-charcoal">
        <div className="max-w-4xl mx-auto px-5 py-16 md:py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-luxury-gold" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">WDO Custom Blog</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-[1.1] mb-4">
            Remodeling Insights<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-luxury-champagne via-luxury-gold to-luxury-ochre">
              From the Field.
            </span>
          </h1>
          <p className="text-sm sm:text-base text-white/40 font-medium max-w-xl mx-auto leading-relaxed">
            Honest cost breakdowns, project guides, and lessons learned from a licensed Omaha contractor who&apos;s in the trenches every day. No fluff — just what homeowners actually need to know.
          </p>
        </div>
      </section>

      {/* Post Grid */}
      <section className="py-14 md:py-20">
        <div className="max-w-5xl mx-auto px-5">
          <div className="grid md:grid-cols-3 gap-5">
            {POSTS.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="group">
                <div className="bg-white rounded-2xl border border-brand-stone/30 shadow-soft hover:shadow-elevated transition-all duration-300 overflow-hidden h-full flex flex-col">
                  <div className="bg-brand-charcoal p-5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-luxury-gold/5 rounded-full blur-[25px]" />
                    <div className="relative z-10 flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase tracking-widest text-luxury-gold bg-luxury-gold/10 px-2.5 py-1 rounded-full">{post.tag}</span>
                      <span className="text-[10px] font-bold text-white/25">{post.readTime}</span>
                    </div>
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <h2 className="text-base font-black text-brand-charcoal tracking-tight leading-snug mb-3 group-hover:text-luxury-ochre transition-colors">
                      {post.title}
                    </h2>
                    <p className="text-xs text-brand-muted leading-relaxed flex-1">{post.excerpt}</p>
                    <div className="mt-4 flex items-center gap-1.5 text-luxury-ochre">
                      <span className="text-xs font-bold uppercase tracking-wide">Read Article</span>
                      <svg className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-brand-charcoal py-12">
        <div className="max-w-3xl mx-auto px-5 text-center">
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-3">
            Ready to See What Your Project Would Cost?
          </h2>
          <p className="text-sm text-white/40 font-medium mb-6 max-w-md mx-auto">
            Our AI-powered estimator uses real Omaha market rates to give you an instant ballpark — no signup, no obligation.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/estimate" className="w-full sm:w-auto bg-luxury-gold hover:bg-luxury-ochre text-brand-charcoal font-black text-sm tracking-wide uppercase px-8 py-4 rounded-xl transition-all shadow-glow-gold active:scale-[0.98] text-center">
              Try the Free Estimator
            </Link>
            <Link href="/consultation" className="w-full sm:w-auto border border-white/15 hover:border-white/30 text-white/70 hover:text-white font-bold text-sm tracking-wide uppercase px-8 py-4 rounded-xl transition-all text-center">
              Schedule Consultation
            </Link>
          </div>
        </div>
      </section>

      <BlogFooter />
    </div>
  );
}

