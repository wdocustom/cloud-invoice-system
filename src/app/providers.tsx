"use client";
import { ToastContainer } from "@/lib/toast";
import PageTracker from "@/components/PageTracker";

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageTracker />
      {children}
      <ToastContainer />
    </>
  );
}
