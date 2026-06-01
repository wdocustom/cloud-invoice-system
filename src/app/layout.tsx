import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/globals.css";

// Instantiate the industry-standard premium typeface matrix
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "WDO Custom Portal Suite",
  description: "Operations Central Management and Client Approvals Workbench Node",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.variable} font-sans bg-[#f8fafc] text-slate-900 antialiased`}>
        {children}
      </body>
    </html>
  );
}