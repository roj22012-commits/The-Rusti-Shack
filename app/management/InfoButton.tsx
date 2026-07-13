"use client";

import { useState } from "react";

export default function InfoButton({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`About ${title}`}
        className="flex h-5 w-5 items-center justify-center rounded-full border border-ocean-dark/40 text-[11px] font-semibold text-ocean-dark hover:bg-ocean-dark/10"
      >
        i
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-sand-dark/60 bg-white p-4 text-left text-xs leading-relaxed text-foreground/80 shadow-lg sm:w-80">
            <p className="mb-1 font-semibold text-foreground">{title}</p>
            {children}
          </div>
        </>
      )}
    </span>
  );
}
