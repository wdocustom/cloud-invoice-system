"use client";
import { useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

const TIME_SLOTS = [
  "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM",
  "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
  "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM",
];

function getNextBusinessDays(count: number): Date[] {
  const days: Date[] = [];
  const d = new Date();
  d.setDate(d.getDate() + 1);
  while (days.length < count) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function formatDateShort(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatDateFull(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

export default function ConsultationPage() {
  return (
    <Suspense fallback={null}>
      <ConsultationForm />
    </Suspense>
  );
}

function ConsultationForm() {
  const params = useSearchParams();
  const prefillName = params.get("name") || "";
  const prefillEmail = params.get("email") || "";
  const prefillPhone = params.get("phone") || "";
  const prefillProject = params.get("project") || "";

  const [name, setName] = useState(prefillName);
  const [email, setEmail] = useState(prefillEmail);
  const [phone, setPhone] = useState(prefillPhone);
  const [address, setAddress] = useState("");
  const [projectType, setProjectType] = useState(prefillProject);
  const [notes, setNotes] = useState("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const businessDays = useMemo(() => getNextBusinessDays(14), []);

  const handleSubmit = async () => {
    if (!name.trim()) { setError("Please enter your name."); return; }
    if (!email.trim()) { setError("Please enter your email address."); return; }
    if (!phone.trim()) { setError("Please enter your phone number."); return; }
    if (!address.trim()) { setError("Please enter your project address."); return; }
    if (!selectedDate) { setError("Please select a date."); return; }
    if (!selectedTime) { setError("Please select a time."); return; }

    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/schedule-consultation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          address: address.trim(),
          projectType,
          notes: notes.trim(),
          date: selectedDate,
          time: selectedTime,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to schedule. Please try again.");
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-brand-alabaster text-brand-charcoal font-sans antialiased selection:bg-luxury-gold/15">
        <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-xl border-b border-brand-stone/40 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <Image src="/images/logo.png" alt="WDO Custom" width={36} height={36} className="rounded-lg shadow-sm" />
              <div className="leading-none">
                <span className="text-sm font-black tracking-tight text-brand-charcoal">WDO</span>
                <span className="text-sm font-medium tracking-tight text-brand-muted ml-1">Custom</span>
              </div>
            </Link>
          </div>
        </nav>

        <div className="pt-16 flex items-center justify-center min-h-screen px-5">
          <div className="max-w-lg w-full text-center py-20">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-brand-charcoal tracking-tight mb-3">
              You&apos;re All Set!
            </h1>
            <p className="text-sm text-brand-muted leading-relaxed mb-2">
              Your consultation with Skyler is booked for:
            </p>
            <p className="text-lg font-black text-brand-charcoal mb-1">
              {formatDateFull(new Date(selectedDate + "T12:00:00"))}
            </p>
            <p className="text-base font-bold text-luxury-gold mb-6">{selectedTime}</p>
            <div className="bg-white border border-brand-stone/40 rounded-2xl p-6 text-left space-y-4 mb-8">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-bold text-brand-charcoal">Calendar invite sent</p>
                  <p className="text-xs text-brand-muted">Check your email for a calendar invite you can add to Google Calendar, Apple Calendar, or Outlook.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-luxury-soft flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-luxury-ochre" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0115 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-bold text-brand-charcoal">On-site at your home</p>
                  <p className="text-xs text-brand-muted">Skyler will come to {address || "your address"} to walk through the project in person.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-bold text-brand-charcoal">About 30–45 minutes</p>
                  <p className="text-xs text-brand-muted">We&apos;ll measure, discuss your vision, and answer every question. No pressure, no sales pitch.</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/" className="text-xs font-bold text-brand-muted hover:text-brand-charcoal transition-colors underline underline-offset-2">
                Back to Home
              </Link>
              <Link href="/estimate" className="text-xs font-bold text-brand-muted hover:text-brand-charcoal transition-colors underline underline-offset-2">
                Get Another Estimate
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
              Free Estimate
            </Link>
            <a href="tel:+14028198558" className="bg-brand-charcoal text-white text-xs font-black tracking-wide uppercase px-5 py-2.5 rounded-lg hover:bg-brand-charcoal/90 transition-all shadow-sm">
              (402) 819-8558
            </a>
          </div>
        </div>
      </nav>

      {/* HEADER */}
      <section className="pt-16 bg-brand-charcoal relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-charcoal via-brand-charcoal/95 to-brand-charcoal/85" />
        <div className="relative z-10 max-w-3xl mx-auto px-5 py-12 md:py-16 text-center">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Free — No Obligation</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight mb-3">
            Schedule Your Free<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-luxury-champagne via-luxury-gold to-luxury-ochre">
              In-Home Consultation
            </span>
          </h1>
          <p className="text-sm text-white/40 font-medium max-w-lg mx-auto leading-relaxed">
            Skyler will visit your home, walk through your project, take measurements, and provide a detailed, line-itemized quote — typically within 48 hours.
          </p>
        </div>
      </section>

      {/* FORM */}
      <section className="py-12 md:py-16">
        <div className="max-w-3xl mx-auto px-5">
          <div className="bg-white border border-brand-stone/40 rounded-2xl shadow-premium overflow-hidden">

            {/* Contact Info */}
            <div className="px-6 py-5 border-b border-brand-stone/20">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 rounded-full bg-brand-charcoal text-white text-[10px] font-black flex items-center justify-center">1</span>
                <label className="text-xs font-black text-brand-charcoal uppercase tracking-widest">Your Information</label>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-brand-muted uppercase tracking-wide mb-1">Full Name *</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name"
                    className="w-full px-4 py-2.5 rounded-xl border border-brand-stone/40 bg-brand-alabaster text-sm text-brand-charcoal placeholder:text-brand-muted/40 focus:outline-none focus:border-brand-charcoal/40 focus:ring-1 focus:ring-brand-charcoal/10 transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-brand-muted uppercase tracking-wide mb-1">Email *</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-brand-stone/40 bg-brand-alabaster text-sm text-brand-charcoal placeholder:text-brand-muted/40 focus:outline-none focus:border-brand-charcoal/40 focus:ring-1 focus:ring-brand-charcoal/10 transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-brand-muted uppercase tracking-wide mb-1">Phone *</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(402) 555-1234"
                    className="w-full px-4 py-2.5 rounded-xl border border-brand-stone/40 bg-brand-alabaster text-sm text-brand-charcoal placeholder:text-brand-muted/40 focus:outline-none focus:border-brand-charcoal/40 focus:ring-1 focus:ring-brand-charcoal/10 transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-brand-muted uppercase tracking-wide mb-1">Project Address *</label>
                  <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St, Omaha, NE"
                    className="w-full px-4 py-2.5 rounded-xl border border-brand-stone/40 bg-brand-alabaster text-sm text-brand-charcoal placeholder:text-brand-muted/40 focus:outline-none focus:border-brand-charcoal/40 focus:ring-1 focus:ring-brand-charcoal/10 transition" />
                </div>
              </div>
            </div>

            {/* Project Info */}
            <div className="px-6 py-5 border-b border-brand-stone/20">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 rounded-full bg-brand-charcoal text-white text-[10px] font-black flex items-center justify-center">2</span>
                <label className="text-xs font-black text-brand-charcoal uppercase tracking-widest">Project Info <span className="normal-case font-medium text-brand-muted">(Optional)</span></label>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-brand-muted uppercase tracking-wide mb-1">Project Type</label>
                  <select value={projectType} onChange={(e) => setProjectType(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-brand-stone/40 bg-brand-alabaster text-sm text-brand-charcoal focus:outline-none focus:border-brand-charcoal/40 focus:ring-1 focus:ring-brand-charcoal/10 transition">
                    <option value="">Select a project type</option>
                    <option>Kitchen Remodel</option>
                    <option>Bathroom Remodel</option>
                    <option>Basement Finishing</option>
                    <option>Whole-Home Renovation</option>
                    <option>Room Addition</option>
                    <option>Outdoor Living / Deck</option>
                    <option>Flooring</option>
                    <option>Interior Painting</option>
                    <option>Custom Built-Ins / Millwork</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-brand-muted uppercase tracking-wide mb-1">Anything else we should know?</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                    placeholder="Budget range, timeline, special considerations..."
                    className="w-full px-4 py-3 rounded-xl border border-brand-stone/40 bg-brand-alabaster text-sm text-brand-charcoal placeholder:text-brand-muted/40 focus:outline-none focus:border-brand-charcoal/40 focus:ring-1 focus:ring-brand-charcoal/10 transition resize-none" />
                </div>
              </div>
            </div>

            {/* Date Selection */}
            <div className="px-6 py-5 border-b border-brand-stone/20">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 rounded-full bg-brand-charcoal text-white text-[10px] font-black flex items-center justify-center">3</span>
                <label className="text-xs font-black text-brand-charcoal uppercase tracking-widest">Pick a Date *</label>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-2">
                {businessDays.map((d) => {
                  const key = d.toISOString().split("T")[0];
                  return (
                    <button key={key} type="button" onClick={() => setSelectedDate(key)}
                      className={`px-2 py-3 rounded-xl border text-center transition-all ${
                        selectedDate === key
                          ? "bg-brand-charcoal border-brand-charcoal text-white shadow-sm"
                          : "bg-brand-alabaster border-brand-stone/40 text-brand-muted hover:border-brand-charcoal/30 hover:text-brand-charcoal"
                      }`}>
                      <p className={`text-[10px] font-bold ${selectedDate === key ? "text-white/60" : "text-brand-muted"}`}>
                        {d.toLocaleDateString("en-US", { weekday: "short" })}
                      </p>
                      <p className={`text-sm font-black ${selectedDate === key ? "text-white" : "text-brand-charcoal"}`}>
                        {d.getDate()}
                      </p>
                      <p className={`text-[9px] font-medium ${selectedDate === key ? "text-white/40" : "text-brand-muted/60"}`}>
                        {d.toLocaleDateString("en-US", { month: "short" })}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Selection */}
            <div className="px-6 py-5 border-b border-brand-stone/20">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 rounded-full bg-brand-charcoal text-white text-[10px] font-black flex items-center justify-center">4</span>
                <label className="text-xs font-black text-brand-charcoal uppercase tracking-widest">Pick a Time *</label>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {TIME_SLOTS.map((t) => (
                  <button key={t} type="button" onClick={() => setSelectedTime(t)}
                    className={`px-2 py-2.5 rounded-xl border text-center transition-all ${
                      selectedTime === t
                        ? "bg-brand-charcoal border-brand-charcoal text-white shadow-sm"
                        : "bg-brand-alabaster border-brand-stone/40 text-brand-muted hover:border-brand-charcoal/30 hover:text-brand-charcoal"
                    }`}>
                    <span className="text-[11px] font-bold">{t}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <div className="px-6 py-5">
              {error && (
                <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2 mb-4">{error}</p>
              )}
              <button type="button" onClick={handleSubmit} disabled={submitting}
                className="w-full bg-luxury-gold hover:bg-luxury-ochre disabled:opacity-50 disabled:cursor-not-allowed text-brand-charcoal font-black text-sm tracking-wide uppercase px-8 py-4 rounded-xl transition-all shadow-glow-gold active:scale-[0.98]">
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Booking...
                  </span>
                ) : (
                  "Book My Free Consultation"
                )}
              </button>
              <p className="text-center text-[10px] text-brand-muted mt-3">
                100% free. No obligation. Skyler will come to you.
              </p>
            </div>
          </div>

          {/* What to Expect */}
          <div className="mt-10 grid sm:grid-cols-3 gap-4">
            {[
              { title: "Skyler comes to you", desc: "No need to leave home. We meet at your project site to get the full picture.", icon: "M15 10.5a3 3 0 11-6 0 3 3 0 016 0zM19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0115 0z" },
              { title: "30–45 minutes", desc: "We measure, discuss your vision, walk through options, and answer every question.", icon: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" },
              { title: "Quote in 48 hours", desc: "You'll get a detailed, line-itemized proposal in your own digital project portal.", icon: "M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25" },
            ].map((item) => (
              <div key={item.title} className="bg-white border border-brand-stone/30 rounded-xl p-5 text-center">
                <div className="w-10 h-10 rounded-lg bg-luxury-soft flex items-center justify-center text-luxury-ochre mx-auto mb-3">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                  </svg>
                </div>
                <p className="text-sm font-black text-brand-charcoal mb-1">{item.title}</p>
                <p className="text-xs text-brand-muted leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-brand-charcoal border-t border-white/5">
        <div className="max-w-6xl mx-auto px-5 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2.5">
              <Image src="/images/logo.png" alt="WDO Custom" width={28} height={28} className="rounded-md" />
              <span className="text-xs font-bold text-white/40">WDO Custom</span>
            </Link>
            <p className="text-[10px] text-white/20 font-medium">NE License #LIC-1901422</p>
          </div>
          <div className="mt-6 pt-4 border-t border-white/5 text-center">
            <p className="text-[10px] text-white/15 font-medium">&copy; {new Date().getFullYear()} WDO Custom LLC. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
