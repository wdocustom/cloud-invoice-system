import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper-100 text-ink-900 antialiased selection:bg-bronze-200/40">
      {/* Office rail. A touch darker than the client side so staff always know
          which side of the product they are on. */}
      <div className="border-b border-rule-400 bg-paper-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-2.5 sm:px-8">
          <div className="flex min-w-0 items-baseline gap-2.5">
            <span className="text-[14px] font-semibold tracking-[-0.01em] text-ink-900">WDO Custom</span>
            <span aria-hidden className="h-3 w-px shrink-0 bg-rule-400" />
            <span className="truncate text-[13px] text-ink-500">Office</span>
          </div>
          <span className="hidden shrink-0 text-[13px] text-ink-400 sm:block">Omaha, NE</span>
        </div>
      </div>
      {children}
    </div>
  );
}
