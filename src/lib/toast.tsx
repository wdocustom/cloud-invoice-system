"use client";
import React, { useState, useEffect, useCallback } from "react";

type ToastType = "success" | "error" | "info";
type Toast = { id: number; message: string; type: ToastType };
type Listener = (t: Toast[]) => void;

let toasts: Toast[] = [];
let listener: Listener = () => {};
let nextId = 0;

export function toast(message: string, type: ToastType = "info") {
  const id = nextId++;
  toasts = [...toasts, { id, message, type }];
  listener(toasts);
  setTimeout(() => removeToast(id), 3000);
}

function removeToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  listener(toasts);
}

const styles: Record<ToastType, string> = {
  success: "bg-emerald-50 text-emerald-700",
  error: "bg-red-50 text-red-700",
  info: "bg-white text-slate-800",
};

const slideIn = `@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}`;

export function ToastContainer() {
  const [items, setItems] = useState<Toast[]>([]);
  const sync = useCallback((t: Toast[]) => setItems([...t]), []);

  useEffect(() => {
    listener = sync;
    return () => { listener = () => {}; };
  }, [sync]);

  if (!items.length) return null;

  return (
    <>
      <style>{slideIn}</style>
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            style={{ animation: "slideIn .25s ease-out" }}
            className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 shadow-lg shadow-black/5 text-xs font-bold ${styles[t.type]}`}
          >
            {t.type === "success" && (
              <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
            <span>{t.message}</span>
            <button onClick={() => removeToast(t.id)} className="ml-1 opacity-40 hover:opacity-100 text-[10px] leading-none">✕</button>
          </div>
        ))}
      </div>
    </>
  );
}
