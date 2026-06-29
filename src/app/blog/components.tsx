"use client";
import Link from "next/link";
import Image from "next/image";

export function Nav({ menuOpen, setMenuOpen }: { menuOpen: boolean; setMenuOpen: (v: boolean) => void }) {
  return (
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
          <Link href="/kitchens" className="text-[11px] font-bold text-brand-muted hover:text-brand-charcoal tracking-wide uppercase transition-colors">Kitchens</Link>
          <Link href="/blog" className="text-[11px] font-bold text-brand-charcoal tracking-wide uppercase">Blog</Link>
          <Link href="/estimate" className="text-[11px] font-bold text-brand-muted hover:text-brand-charcoal tracking-wide uppercase transition-colors">Free Estimate</Link>
          <a href="tel:+14028198558" className="bg-brand-charcoal text-white text-xs font-black tracking-wide uppercase px-5 py-2.5 rounded-lg hover:bg-brand-charcoal/90 transition-all shadow-sm">(402) 819-8558</a>
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
          <Link href="/kitchens" className="block text-sm font-bold text-brand-charcoal py-1.5" onClick={() => setMenuOpen(false)}>Kitchens</Link>
          <Link href="/blog" className="block text-sm font-bold text-brand-charcoal py-1.5" onClick={() => setMenuOpen(false)}>Blog</Link>
          <Link href="/estimate" className="block text-sm font-bold text-luxury-ochre py-1.5" onClick={() => setMenuOpen(false)}>Free Estimate</Link>
          <a href="tel:+14028198558" className="block text-sm font-bold text-brand-charcoal py-1.5">(402) 819-8558</a>
        </div>
      )}
    </nav>
  );
}

export function BlogFooter() {
  return (
    <footer className="bg-brand-charcoal border-t border-white/5">
      <div className="max-w-6xl mx-auto px-5 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/images/logo.png" alt="WDO Custom" width={28} height={28} className="rounded-md" />
            <span className="text-xs font-bold text-white/40">WDO Custom</span>
          </Link>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {[
              ["Home", "/"],
              ["Kitchens", "/kitchens"],
              ["Blog", "/blog"],
              ["Estimate", "/estimate"],
              ["Consultation", "/consultation"],
            ].map(([label, href]) => (
              <Link key={href} href={href} className="text-[11px] font-bold text-white/30 hover:text-white/60 uppercase tracking-wider transition-colors">{label}</Link>
            ))}
            <a href="tel:+14028198558" className="text-[11px] font-bold text-white/30 hover:text-white/60 uppercase tracking-wider transition-colors">(402) 819-8558</a>
          </div>
          <p className="text-[10px] text-white/20 font-medium">NE License #LIC-1901422</p>
        </div>
        <div className="mt-6 pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[10px] text-white/15 font-medium">&copy; {new Date().getFullYear()} WDO Custom LLC. All rights reserved.</p>
          <p className="text-[10px] text-white/15 font-medium">Omaha, NE</p>
        </div>
      </div>
    </footer>
  );
}
