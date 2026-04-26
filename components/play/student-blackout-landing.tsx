"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getSessionByJoinCode } from "@/lib/api/play";
import { ROUTES } from "@/lib/routes";
import { hasSupabaseEnv } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const ARCHIVE_BG = "#0A0E17";

const LINE_CONNECTING = "Connecting to Mystery Club Server...";
const LINE_AUTH_REQUIRED = "Authentication Required.";

const LOAD_BAR_DURATION_MS = 4200;
const LOAD_BAR_STEPS = 48;

/** 로딩 완료 후 — Y 입력 전까지 모달 미표시 */
const ACCESS_PROMPT = "Press Y to access.";

const HARDBOILED =
  "수사할 사건의 케이스 코드와 닉네임을 입력하십시오. Mystery Club의 보안 프로토콜에 따라 승인된 동아리원만 접근 가능합니다.";

async function typeChars(
  text: string,
  onUpdate: (s: string) => void,
  ms: number,
  cancelled: () => boolean,
) {
  for (let i = 0; i <= text.length; i++) {
    if (cancelled()) return;
    onUpdate(text.slice(0, i));
    if (i < text.length) await new Promise((r) => setTimeout(r, ms));
  }
}

export function StudentBlackoutLanding() {
  const router = useRouter();
  const [connectLine, setConnectLine] = useState("");
  const [authLine, setAuthLine] = useState("");
  const [loadPercent, setLoadPercent] = useState<number | null>(null);
  const [accessPromptText, setAccessPromptText] = useState("");
  const [awaitingAccessKey, setAwaitingAccessKey] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [hardboiled, setHardboiled] = useState("");
  const [caseCode, setCaseCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const done = () => cancelled;
    const reduce =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    void (async () => {
      if (reduce) {
        setConnectLine(LINE_CONNECTING);
        setAuthLine(LINE_AUTH_REQUIRED);
        setLoadPercent(100);
        setAccessPromptText(ACCESS_PROMPT);
        setAwaitingAccessKey(true);
        return;
      }
      await typeChars(LINE_CONNECTING, setConnectLine, 22, done);
      if (cancelled) return;
      await new Promise((r) => setTimeout(r, 280));
      if (cancelled) return;
      await typeChars(LINE_AUTH_REQUIRED, setAuthLine, 18, done);
      if (cancelled) return;
      await new Promise((r) => setTimeout(r, 400));
      if (cancelled) return;

      setLoadPercent(0);
      for (let s = 0; s <= LOAD_BAR_STEPS; s++) {
        if (cancelled) return;
        setLoadPercent(Math.round((s / LOAD_BAR_STEPS) * 100));
        await new Promise((r) => setTimeout(r, LOAD_BAR_DURATION_MS / LOAD_BAR_STEPS));
      }
      if (cancelled) return;
      await new Promise((r) => setTimeout(r, 200));
      if (cancelled) return;

      await typeChars(ACCESS_PROMPT, (chunk) => setAccessPromptText(chunk), 12, done);
      if (cancelled) return;
      setAwaitingAccessKey(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    let cancelled = false;
    void (async () => {
      await typeChars(
        HARDBOILED,
        (s) => {
          if (!cancelled) setHardboiled(s);
        },
        14,
        () => cancelled,
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen) return;
    const id = window.setTimeout(() => {
      document.getElementById("landing-case-code")?.focus();
    }, 120);
    return () => window.clearTimeout(id);
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen && !awaitingAccessKey) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen, awaitingAccessKey]);

  useEffect(() => {
    if (!awaitingAccessKey) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "y" && e.key !== "Y") return;
      e.preventDefault();
      setAwaitingAccessKey(false);
      setModalOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [awaitingAccessKey]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const code = caseCode.trim().toUpperCase();
    const nick = nickname.trim();
    if (!code || !nick) return;
    if (!hasSupabaseEnv) {
      router.push(
        `${ROUTES.play}?code=${encodeURIComponent(code)}&nickname=${encodeURIComponent(nick)}`,
      );
      return;
    }
    setBusy(true);
    try {
      await getSessionByJoinCode(code);
      router.push(
        `${ROUTES.play}?code=${encodeURIComponent(code)}&nickname=${encodeURIComponent(nick)}`,
      );
    } catch {
      setError("케이스 코드를 확인할 수 없습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-0 flex min-h-dvh flex-col overflow-hidden font-mono text-[#c8dbd4]"
      style={{
        backgroundColor: ARCHIVE_BG,
        backgroundImage: `
          linear-gradient(180deg, rgba(10,14,23,0.98) 0%, rgba(5,8,12,1) 100%),
          repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(94, 234, 212, 0.045) 1px, rgba(94, 234, 212, 0.045) 2px),
          repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(94, 234, 212, 0.035) 1px, rgba(94, 234, 212, 0.035) 2px)
        `,
      }}
    >
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[rgba(45,212,191,0.09)] to-transparent" />
      <div className="pointer-events-none absolute bottom-5 left-0 right-0 flex justify-center gap-5 opacity-70">
        <span className="motion-safe:animate-[ledPulse_2.8s_ease-in-out_infinite] h-1 w-1 rounded-full bg-[#5eead4] shadow-[0_0_10px_#5eead4]" />
        <span className="motion-safe:animate-[ledPulse_2.8s_ease-in-out_infinite_0.35s] h-1 w-1 rounded-full bg-[#5eead4] shadow-[0_0_10px_#5eead4]" />
        <span className="motion-safe:animate-[ledPulse_2.8s_ease-in-out_infinite_0.7s] h-1 w-1 rounded-full bg-[#5eead4] shadow-[0_0_8px_#5eead4]" />
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-md space-y-6 text-center font-mono text-[13px] leading-relaxed tracking-[0.04em] md:text-[15px]">
          <div className="space-y-3">
            <p className="text-[#e8f0ec]">
              {connectLine}
              {!modalOpen &&
              !awaitingAccessKey &&
              loadPercent === null &&
              connectLine.length < LINE_CONNECTING.length ? (
                <span className="ml-px inline-block h-3.5 w-1 translate-y-px animate-pulse bg-[#5eead4] align-middle md:h-4" />
              ) : null}
            </p>
            <p className="text-[#9fb5ad]">
              {authLine}
              {!modalOpen &&
              !awaitingAccessKey &&
              loadPercent === null &&
              connectLine.length >= LINE_CONNECTING.length &&
              authLine.length < LINE_AUTH_REQUIRED.length ? (
                <span className="ml-px inline-block h-3.5 w-1 translate-y-px animate-pulse bg-[#5eead4] align-middle md:h-4" />
              ) : null}
            </p>
          </div>
          {loadPercent !== null ? (
            <div className="mx-auto w-full max-w-[20rem] text-left text-[#b8d0c8]">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="relative h-2 min-w-[10rem] flex-1 overflow-hidden rounded-sm bg-black/60 ring-1 ring-[#5eead4]/25">
                  <span
                    className="absolute inset-y-0 left-0 rounded-sm bg-gradient-to-r from-[#2dd4bf] to-[#5eead4] motion-safe:transition-[width] motion-safe:duration-75 motion-safe:ease-out"
                    style={{ width: `${loadPercent}%` }}
                  />
                </span>
                <span className="shrink-0 tabular-nums text-[#7fffd4]">{loadPercent}%</span>
              </div>
            </div>
          ) : null}
          {loadPercent === 100 && (accessPromptText.length > 0 || awaitingAccessKey) ? (
            <p className="break-all text-[#b8d0c8]">
              {accessPromptText}
              {!awaitingAccessKey && accessPromptText.length < ACCESS_PROMPT.length ? (
                <span className="ml-px inline-block h-3.5 w-1 translate-y-px animate-pulse bg-[#5eead4] align-middle md:h-4" />
              ) : null}
              {awaitingAccessKey ? (
                <span className="ml-2 inline text-[#7fffd4] motion-safe:animate-pulse">[Y]</span>
              ) : null}
            </p>
          ) : null}
        </div>
      </div>

      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ink)]/55 p-4 backdrop-blur-[2px]"
          aria-hidden={false}
        >
          <Card
            role="dialog"
            aria-modal="true"
            aria-labelledby="landing-auth-title"
            className={cn(
              "w-full max-w-md overflow-hidden",
              "motion-safe:animate-[modalIn_0.45s_cubic-bezier(0.22,1,0.36,1)_both]",
            )}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <CardHeader className="space-y-1 pb-3">
              <CardTitle id="landing-auth-title" className="text-lg">
                Mystery Club · 입장
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <p className="min-h-[4.5em] text-left text-sm leading-relaxed text-[var(--foreground)]">
                {hardboiled}
                {hardboiled.length < HARDBOILED.length ? (
                  <span className="ml-0.5 inline-block h-[1em] w-px animate-pulse bg-[var(--primary)] align-[-0.05em]" />
                ) : null}
              </p>
              <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
                <div>
                  <label
                    htmlFor="landing-case-code"
                    className="mb-1.5 block text-xs font-medium text-[var(--accent)]"
                  >
                    코드
                  </label>
                  <div className="relative">
                    <Input
                      id="landing-case-code"
                      autoComplete="off"
                      spellCheck={false}
                      value={caseCode}
                      onChange={(e) => setCaseCode(e.target.value)}
                      disabled={busy}
                      placeholder=""
                      className="h-11 font-mono text-sm tracking-[0.08em]"
                    />
                    {!caseCode ? (
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm tracking-[0.06em] text-[var(--muted-foreground)]">
                        케이스 코드
                      </span>
                    ) : null}
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="landing-nickname"
                    className="mb-1.5 block text-xs font-medium text-[var(--accent)]"
                  >
                    닉네임
                  </label>
                  <Input
                    id="landing-nickname"
                    autoComplete="off"
                    spellCheck={false}
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    disabled={busy}
                    placeholder="표시될 이름"
                    className="h-11 font-mono text-sm tracking-[0.06em]"
                  />
                </div>
                <Button type="submit" disabled={busy} className="h-11 w-full font-mono text-sm" size="lg">
                  {busy ? "확인 중…" : "입장하기"}
                </Button>
              </form>
              {error ? (
                <p className="text-center text-sm font-medium text-[var(--error)]">{error}</p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <style>{`
        @keyframes ledPulse {
          0%,
          100% {
            opacity: 0.25;
            transform: scale(1);
          }
          50% {
            opacity: 0.88;
            transform: scale(1.25);
          }
        }
        @keyframes modalIn {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
