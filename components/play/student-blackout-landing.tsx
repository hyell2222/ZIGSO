"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";

import { getSessionByJoinCode } from "@/lib/api/play";
import { ROUTES } from "@/lib/routes";
import { hasSupabaseEnv } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const MYSTERY_CLUB_TAG = "MYSTERY CLUB";
const LINE_CONNECTING_REST = "서버에 접속 중입니다…";
const LINE_AUTH_REQUIRED = "[WARNING] 접근 권한이 필요합니다.";
const ACCESS_PROMPT_AUTO = "잠시 후 입장 인증 창이 열립니다…";
/** 프리루드·경고 문구 표시 후 입장 모달까지 대기 (PC·모바일 동일) */
const AUTO_MODAL_DELAY_MS = 3000;

const LOAD_BAR_DURATION_MS = 2200;
const LOAD_BAR_STEPS = 28;

const PRELUDE_DWELL_MS = 420;
const PRELUDE_FADE_MS = 380;
const POST_BEAT_MS = 140;

const HARDBOILED =
  "참가 코드와 닉네임을 입력하세요. 보안 규정에 따라 승인된 동아리원만 이 사건 자료에 접근할 수 있습니다.";

async function typeChars(
  text: string,
  onUpdate: (s: string) => void,
  ms: number,
  shouldAbort: () => boolean,
) {
  for (let i = 0; i <= text.length; i++) {
    if (shouldAbort()) return;
    onUpdate(text.slice(0, i));
    if (i < text.length) await new Promise((r) => setTimeout(r, ms));
  }
}

function EntryLedRow({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none flex justify-center gap-5 opacity-80",
        className,
      )}
      aria-hidden
    >
      <span className="motion-safe:animate-[ledPulse_2.8s_ease-in-out_infinite] h-1 w-1 rounded-full bg-[var(--entry-parchment)] shadow-[0_0_10px_color-mix(in_srgb,var(--entry-accent)_65%,transparent)]" />
      <span className="motion-safe:animate-[ledPulse_2.8s_ease-in-out_infinite_0.35s] h-1 w-1 rounded-full bg-[var(--entry-parchment)] shadow-[0_0_10px_color-mix(in_srgb,var(--entry-accent)_65%,transparent)]" />
      <span className="motion-safe:animate-[ledPulse_2.8s_ease-in-out_infinite_0.7s] h-1 w-1 rounded-full bg-[var(--entry-parchment)] shadow-[0_0_8px_color-mix(in_srgb,var(--entry-accent)_55%,transparent)]" />
    </div>
  );
}

type StudentBlackoutLandingProps = {
  /** QR·공유 링크 등으로 전달된 참가 코드(랜딩 폼에 미리 채움) */
  prefillJoinCode?: string;
  prefillNickname?: string;
};

export function StudentBlackoutLanding({
  prefillJoinCode,
  prefillNickname,
}: StudentBlackoutLandingProps = {}) {
  const router = useRouter();
  const [clubTitle, setClubTitle] = useState("");
  const [connectLine, setConnectLine] = useState("");
  const [authLine, setAuthLine] = useState("");
  const [loadPercent, setLoadPercent] = useState<number | null>(null);
  const [showPrelude, setShowPrelude] = useState(true);
  const [preludeFadingOut, setPreludeFadingOut] = useState(false);
  const [accessPromptText, setAccessPromptText] = useState("");
  const [awaitingAccessKey, setAwaitingAccessKey] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [hardboiled, setHardboiled] = useState("");
  const [caseCode, setCaseCode] = useState(() => prefillJoinCode ?? "");
  const [nickname, setNickname] = useState(() => prefillNickname ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (prefillJoinCode) setCaseCode(prefillJoinCode);
  }, [prefillJoinCode]);

  useEffect(() => {
    if (prefillNickname) setNickname(prefillNickname);
  }, [prefillNickname]);

  const preludeRunRef = useRef(0);

  useEffect(() => {
    const run = ++preludeRunRef.current;
    let cancelled = false;
    let modalDelayTimer: ReturnType<typeof globalThis.setTimeout> | undefined;
    const shouldAbort = () => cancelled || preludeRunRef.current !== run;

    const reduce =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const titleMs = reduce ? 5 : 18;
    const afterTitleMs = reduce ? 60 : 200;
    const connectMs = reduce ? 6 : 20;
    const afterConnectMs = reduce ? 80 : 240;
    const loadSteps = reduce ? 10 : LOAD_BAR_STEPS;
    const loadTotalMs = reduce ? 480 : LOAD_BAR_DURATION_MS;
    const dwellMs = reduce ? 100 : PRELUDE_DWELL_MS;
    const fadeMs = reduce ? 80 : PRELUDE_FADE_MS;
    const postBeatMs = reduce ? 40 : POST_BEAT_MS;
    const authMs = reduce ? 5 : 16;
    const afterAuthMs = reduce ? 120 : 380;
    const accessMs = reduce ? 4 : 11;

    void (async () => {
      await typeChars(MYSTERY_CLUB_TAG, setClubTitle, titleMs, shouldAbort);
      if (shouldAbort()) return;
      await new Promise((r) => setTimeout(r, afterTitleMs));
      if (shouldAbort()) return;
      await typeChars(LINE_CONNECTING_REST, setConnectLine, connectMs, shouldAbort);
      if (shouldAbort()) return;
      await new Promise((r) => setTimeout(r, afterConnectMs));
      if (shouldAbort()) return;

      setLoadPercent(0);
      for (let s = 0; s <= loadSteps; s++) {
        if (shouldAbort()) return;
        const t = s === loadSteps ? 1 : s / loadSteps;
        flushSync(() => {
          if (!shouldAbort()) setLoadPercent(t * 100);
        });
        await new Promise((r) => setTimeout(r, loadTotalMs / loadSteps));
      }
      if (shouldAbort()) return;
      await new Promise((r) => setTimeout(r, dwellMs));
      if (shouldAbort()) return;

      setPreludeFadingOut(true);
      await new Promise((r) => setTimeout(r, fadeMs));
      if (shouldAbort()) return;

      setLoadPercent(null);
      setConnectLine("");
      setClubTitle(MYSTERY_CLUB_TAG);
      setShowPrelude(false);
      setPreludeFadingOut(false);
      await new Promise((r) => setTimeout(r, postBeatMs));
      if (shouldAbort()) return;

      await typeChars(LINE_AUTH_REQUIRED, setAuthLine, authMs, shouldAbort);
      if (shouldAbort()) return;
      await new Promise((r) => setTimeout(r, afterAuthMs));
      if (shouldAbort()) return;

      await typeChars(ACCESS_PROMPT_AUTO, (chunk) => setAccessPromptText(chunk), accessMs, shouldAbort);
      if (shouldAbort()) return;
      setAwaitingAccessKey(true);
      await new Promise<void>((resolve) => {
        modalDelayTimer = globalThis.setTimeout(() => {
          modalDelayTimer = undefined;
          resolve();
        }, AUTO_MODAL_DELAY_MS);
      });
      if (shouldAbort()) return;
      setAwaitingAccessKey(false);
      setModalOpen(true);
    })();

    return () => {
      cancelled = true;
      if (modalDelayTimer !== undefined) globalThis.clearTimeout(modalDelayTimer);
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

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const code = caseCode.trim().toUpperCase();
    const nick = nickname.trim();
    if (!code || !nick) return;
    if (!hasSupabaseEnv) {
      router.push(ROUTES.playJoin(code, nick));
      return;
    }
    setBusy(true);
    try {
      await getSessionByJoinCode(code);
      router.push(ROUTES.playJoin(code, nick));
    } catch {
      setError("참가 코드를 확인할 수 없습니다. 담당 선생님께 문의하세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="font-sans fixed inset-0 z-0 flex min-h-dvh flex-col overflow-hidden text-[color:var(--entry-parchment)]"
      style={{
        backgroundColor: "var(--entry-shell-deep)",
        backgroundImage: `
          linear-gradient(180deg, color-mix(in srgb, var(--entry-shell) 96%, transparent) 0%, var(--entry-shell-deep) 100%),
          repeating-linear-gradient(0deg, transparent, transparent 1px, var(--entry-grid) 1px, var(--entry-grid) 2px),
          repeating-linear-gradient(90deg, transparent, transparent 1px, var(--entry-grid) 1px, var(--entry-grid) 2px)
        `,
      }}
    >
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[color-mix(in_srgb,var(--primary)_12%,transparent)] to-transparent" />

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-10">
        <div className="flex w-full max-w-md flex-col items-center gap-7 md:gap-8">
          <div className="w-full text-center">
            <p
              className="text-2xl font-bold tracking-[0.12em] text-[color:var(--entry-accent-soft)] drop-shadow-[0_0_18px_color-mix(in_srgb,var(--entry-accent)_40%,transparent)] md:text-3xl md:tracking-[0.14em]"
            >
              {showPrelude ? clubTitle : MYSTERY_CLUB_TAG}
              {showPrelude &&
              !modalOpen &&
              !awaitingAccessKey &&
              clubTitle.length < MYSTERY_CLUB_TAG.length ? (
                <span className="ml-px inline-block h-5 w-0.5 translate-y-1 animate-pulse bg-[var(--entry-accent)] align-middle md:h-6" />
              ) : null}
            </p>
          </div>

          <div className="relative w-full min-h-[8rem] text-center text-base leading-relaxed tracking-[0.03em] motion-safe:transition-[min-height] motion-safe:duration-300 md:min-h-[9rem] md:text-lg">
            {showPrelude ? (
              <div
                className={cn(
                  "space-y-5 motion-safe:transition-[opacity,transform] motion-safe:duration-300 motion-safe:ease-out",
                  preludeFadingOut
                    ? "pointer-events-none opacity-0 motion-safe:-translate-y-1"
                    : "opacity-100",
                )}
              >
                <p className="text-[color:var(--entry-parchment)]">
                  {connectLine}
                  {!modalOpen &&
                  !awaitingAccessKey &&
                  loadPercent === null &&
                  clubTitle.length >= MYSTERY_CLUB_TAG.length &&
                  connectLine.length < LINE_CONNECTING_REST.length ? (
                    <span className="ml-px inline-block h-4 w-0.5 translate-y-0.5 animate-pulse bg-[var(--entry-accent)] align-middle md:h-5" />
                  ) : null}
                </p>
                {loadPercent !== null ? (
                  <div className="mx-auto w-full max-w-[19rem] text-left text-[color:var(--entry-parchment-muted)]">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <span className="relative h-1.5 min-w-[9rem] flex-1 overflow-hidden rounded-sm bg-[var(--entry-bar-track)] ring-1 ring-[color-mix(in_srgb,var(--entry-accent)_28%,transparent)]">
                        <span
                          className={cn(
                            "absolute inset-y-0 left-0 rounded-sm bg-gradient-to-r from-[var(--entry-accent)] to-[var(--entry-accent-glow)]",
                            loadPercent != null && loadPercent >= 100 && "right-0 w-full",
                          )}
                          style={
                            loadPercent != null && loadPercent >= 100
                              ? undefined
                              : { width: `${loadPercent ?? 0}%` }
                          }
                        />
                      </span>
                      <span className="shrink-0 tabular-nums text-[color:var(--entry-accent-soft)]">
                        {Math.min(100, Math.round(loadPercent))}%
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="motion-safe:animate-[revealPost_0.48s_cubic-bezier(0.22,1,0.36,1)_both] space-y-5">
                <p
                  className={cn(
                    "mx-auto w-fit max-w-full text-balance rounded-md border px-2 py-1.5 text-left text-sm font-semibold leading-snug tracking-[0.05em]",
                    "border-[color-mix(in_srgb,var(--entry-warn-glow)_55%,transparent)]",
                    "bg-[color-mix(in_srgb,var(--entry-warn-ink)_72%,transparent)]",
                    "text-[color:var(--entry-auth-notice)]",
                    "shadow-[0_0_0_1px_color-mix(in_srgb,var(--entry-warn-glow)_22%,transparent),0_0_28px_color-mix(in_srgb,var(--danger)_26%,transparent),inset_0_1px_0_color-mix(in_srgb,var(--highlight)_12%,transparent)]",
                    "motion-safe:animate-[warnPulse_2.4s_ease-in-out_infinite]",
                    "md:px-2.5 md:py-2 md:text-base md:tracking-[0.06em]",
                  )}
                >
                  {authLine}
                  {!modalOpen &&
                  !awaitingAccessKey &&
                  accessPromptText.length === 0 &&
                  authLine.length < LINE_AUTH_REQUIRED.length ? (
                    <span className="ml-px inline-block h-3 w-0.5 translate-y-px animate-pulse bg-[color-mix(in_srgb,var(--highlight)_55%,#f0e0d4)] align-middle shadow-[0_0_10px_color-mix(in_srgb,var(--danger)_40%,transparent)] md:h-3.5" />
                  ) : null}
                </p>
                {authLine.length >= LINE_AUTH_REQUIRED.length ||
                accessPromptText.length > 0 ||
                awaitingAccessKey ? (
                  <p className="text-balance text-[color:var(--entry-parchment-muted)]">
                    {accessPromptText}
                    {!awaitingAccessKey && accessPromptText.length < ACCESS_PROMPT_AUTO.length ? (
                      <span className="ml-px inline-block h-3 w-0.5 translate-y-px animate-pulse bg-[var(--entry-accent)] align-middle md:h-3.5" />
                    ) : null}
                  </p>
                ) : null}
              </div>
            )}
          </div>

          <EntryLedRow />
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => {}}
        title="학생 참가 인증"
        titleId="landing-auth-title"
        hideCloseButton
        closeOnBackdrop={false}
        closeOnEscape={false}
        bodyClassName="space-y-4"
      >
        <div className="relative w-full">
          <p className="invisible text-balance text-sm leading-relaxed" aria-hidden>
            {HARDBOILED}
          </p>
          <p className="absolute inset-0 text-pretty text-left text-sm leading-relaxed text-[var(--muted-foreground)]">
            {hardboiled}
            {hardboiled.length < HARDBOILED.length ? (
              <span className="ml-0.5 inline-block h-[1em] w-px animate-pulse bg-[var(--primary)] align-[-0.05em]" />
            ) : null}
          </p>
        </div>
        <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
          <div>
            <label htmlFor="landing-case-code" className="mb-1.5 block text-xs font-medium text-[var(--primary)]">
              참가 코드
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
                className="h-11 text-sm tracking-[0.08em]"
              />
              {!caseCode.trim() ? (
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm tracking-[0.06em] text-[var(--muted-foreground)]">
                  참가 코드를 입력하세요
                </span>
              ) : null}
            </div>
          </div>
          <div>
            <label htmlFor="landing-nickname" className="mb-1.5 block text-xs font-medium text-[var(--primary)]">
              닉네임
            </label>
            <Input
              id="landing-nickname"
              autoComplete="off"
              spellCheck={false}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              disabled={busy}
              placeholder="닉네임을 입력하세요"
              className="h-11 text-sm tracking-[0.06em]"
            />
          </div>
          <Button
            type="submit"
            disabled={busy || !caseCode.trim() || !nickname.trim()}
            className="h-11 w-full text-sm"
            size="lg"
          >
            {busy ? "확인 중…" : "참가하기"}
          </Button>
        </form>
        {error ? <p className="text-center text-sm font-medium text-[var(--danger)]">{error}</p> : null}
      </Modal>
    </div>
  );
}
