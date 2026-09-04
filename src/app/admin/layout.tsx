import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bone-50 text-obsidian-900 antialiased selection:bg-brass-200/40">
      {/* Studio rail — the title strip that runs above every workspace sheet. */}
      <div className="bg-obsidian-950 text-bone-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2.5 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-5 w-5 items-center justify-center border border-bone-100/25 text-[8px] font-medium tracking-[0.08em] text-bone-100/80">
              W
            </span>
            <span className="font-mono text-[10px] font-medium uppercase tracking-title text-bone-100/85">
              WDO Custom
            </span>
            <span aria-hidden className="h-3 w-px bg-bone-100/20" />
            <span className="truncate font-mono text-[10px] font-medium uppercase tracking-architect text-bone-100/45">
              Studio Administration
            </span>
          </div>
          <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-architect text-bone-100/35 sm:block">
            Omaha, NE
          </span>
        </div>
      </div>
      {children}
    </div>
  );
}
