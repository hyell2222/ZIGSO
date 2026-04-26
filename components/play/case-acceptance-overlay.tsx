"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type CaseAcceptanceOverlayProps = {
  title: string;
  description: string;
  onComplete: () => void;
};

async function typeDocument(
  fullText: string,
  onTick: (s: string) => void,
  msPerChar: number,
  cancelled: () => boolean,
) {
  for (let i = 0; i <= fullText.length; i++) {
    if (cancelled()) return;
    onTick(fullText.slice(0, i));
    if (i < fullText.length) await new Promise((r) => setTimeout(r, msPerChar));
  }
}

function BriefcaseOpenIcon({ phase }: { phase: "locked" | "open" }) {
  const open = phase === "open";
  return (
    <svg
      viewBox="0 0 120 100"
      className={cn(
        "h-24 w-32 transition-all duration-700 ease-out md:h-28 md:w-36",
        open && "scale-105",
      )}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <g className="text-[var(--primary)]">
        <rect x="18" y="38" width="84" height="52" rx="3" opacity={open ? 0.9 : 1} />
        <g
          style={{ transformOrigin: "60px 38px" }}
          className={cn("transition-transform duration-700 ease-out", open && "-rotate-[28deg] -translate-y-1")}
        >
          <path d="M38 38V28a22 22 0 0 1 44 0v10" />
        </g>
        {!open ? (
          <>
            <circle cx="60" cy="58" r="7" />
            <rect x="56" y="58" width="8" height="10" rx="1" />
          </>
        ) : (
          <path d="M52 58h16M60 52v12" className="text-[var(--primary)]" strokeWidth={1.2} />
        )}
      </g>
    </svg>
  );
}

export function CaseAcceptanceOverlay({ title, description, onComplete }: CaseAcceptanceOverlayProps) {
  const docBody = useMemo(
    () => `사건 의뢰서\n\n제목: ${title}\n\n${description || "—"}`,
    [title, description],
  );
  const [tint, setTint] = useState<"red" | "green">("red");
  const [briefOpen, setBriefOpen] = useState(false);
  const [doorsOpen, setDoorsOpen] = useState(false);
  const [docText, setDocText] = useState("");
  const [formGone, setFormGone] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const docBodyRef = useRef(docBody);
  docBodyRef.current = docBody;

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      onCompleteRef.current();
      return;
    }

    const t1 = window.setTimeout(() => setTint("green"), 450);
    const t2 = window.setTimeout(() => {
      setBriefOpen(true);
      setFormGone(true);
    }, 900);
    const t3 = window.setTimeout(() => setDoorsOpen(true), 1400);

    let cancelled = false;
    const t4 = window.setTimeout(() => {
      void typeDocument(docBodyRef.current, setDocText, 18, () => cancelled);
    }, 1600);

    const tDone = window.setTimeout(() => onCompleteRef.current(), 6500);

    return () => {
      cancelled = true;
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.clearTimeout(t4);
      window.clearTimeout(tDone);
    };
  }, []);

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex flex-col font-sans motion-safe:transition-[background-color] motion-safe:duration-[600ms]",
        tint === "red" ? "bg-[#2a0a0a]" : "bg-[#0a0e17]",
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-1/2 border-b border-[var(--primary)]/20 bg-gradient-to-b from-black/80 to-transparent motion-safe:transition-transform motion-safe:duration-[1s] motion-safe:ease-in-out",
          doorsOpen && "-translate-y-full",
        )}
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 h-1/2 border-t border-[var(--primary)]/20 bg-gradient-to-t from-black/80 to-transparent motion-safe:transition-transform motion-safe:duration-[1s] motion-safe:ease-in-out",
          doorsOpen && "translate-y-full",
        )}
      />

      <div className="relative z-[2] flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-8">
        <div
          className={cn(
            "mb-6 flex flex-col items-center motion-safe:transition-all motion-safe:duration-500",
            formGone && "motion-safe:-translate-y-8 motion-safe:opacity-0 motion-safe:duration-300",
          )}
        >
          <BriefcaseOpenIcon phase={briefOpen ? "open" : "locked"} />
          <p
            className={cn(
              "mt-3 font-mono text-[10px] tracking-[0.35em] motion-safe:transition-colors motion-safe:duration-500",
              tint === "red" ? "text-red-400/90" : "text-[var(--primary)]",
            )}
          >
            {tint === "red" ? "PENDING HOST SIGNAL…" : "ACCESS GRANTED"}
          </p>
        </div>

        {doorsOpen ? (
          <div className="max-h-[min(72vh,560px)] w-full max-w-2xl overflow-y-auto border border-white/15 bg-black px-6 py-8 shadow-[0_0_48px_rgba(27,74,58,0.2)]">
            <pre className="whitespace-pre-wrap break-words font-mono text-[12px] leading-relaxed tracking-[0.03em] text-white md:text-sm">
              {docText}
              {docText.length > 0 && docText.length < docBody.length ? (
                <span className="ml-0.5 inline-block w-2 motion-safe:animate-pulse bg-[var(--primary)] align-[-0.12em]" />
              ) : null}
            </pre>
          </div>
        ) : null}
      </div>
    </div>
  );
}
