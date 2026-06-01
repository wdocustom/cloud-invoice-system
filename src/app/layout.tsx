import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap", // Forces browser to instantly use clean system text if network lags
});

export const metadata: Metadata = {
  title: "WDO Custom Portal Suite",
  description: "Operations Central Management Hub",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.variable} font-sans bg-[#f8fafc] text-slate-900 antialiased`}>
        {children}
      </body>
    </html>
  );
}