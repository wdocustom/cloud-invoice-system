import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-carbon-950 text-chalk-50 antialiased selection:bg-ember-200/40">
      {/* Studio rail — the title strip that runs above every workspace sheet. */}
      <div className="bg-chalk-50 text-carbon-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2.5 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-5 w-5 items-center justify-center border border-carbon-900/25 text-[8px] font-medium tracking-[0.08em] text-carbon-900/80">
              W
            </span>
            <span className="font-sans text-[10px] font-medium uppercase tracking-title text-carbon-900/85">
              WDO Custom
            </span>
            <span aria-hidden className="h-3 w-px bg-carbon-900/20" />
            <span className="truncate font-sans text-[10px] font-medium uppercase tracking-architect text-carbon-900/45">
              Studio Administration
            </span>
          </div>
          <span className="hidden shrink-0 font-sans text-[10px] uppercase tracking-architect text-carbon-900/35 sm:block">
            Omaha, NE
          </span>
        </div>
      </div>
      {children}
    </div>
  );
}
