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
import landingStyles from "@/components/play/student-blackout-landing.module.css";

const MYSTERY_CLUB_TAG = "MYSTERY CLUB";
const LINE_CONNECTING_REST = "서버에 접속 중입니다…";
const PERMISSION_REQUIRED_LINE = "접근 권한이 필요합니다.";
const PLEASE_WAIT_LINE = "잠시만 기다려주세요…";
/** 타이핑·길이 비교용 (권한 안내 + 대기 안내) */
const GATE_NOTICE_TYPED = `${PERMISSION_REQUIRED_LINE}\n${PLEASE_WAIT_LINE}`;

const AUTO_MODAL_DELAY_MS = 4800;
const LOAD_BAR_DURATION_MS = 11000;
const LOAD_BAR_STEPS = 60;
const PRELUDE_DWELL_MS = 1000;
const POST_BEAT_MS = 450;

const PAUSE_AFTER_TITLE_MS = 2600;
const PAUSE_AFTER_CONNECT_MS = 2600;
const PAUSE_BEFORE_GATE_NOTICE_MS = 2600;
const PAUSE_AFTER_GATE_NOTICE_MS = 1400;

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
  const [loadPercent, setLoadPercent] = useState<number | null>(null);
  const [gateNoticeTyped, setGateNoticeTyped] = useState("");
  const [awaitingJoinForm, setAwaitingJoinForm] = useState(false);
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

    const titleMs = reduce ? 18 : 58;
    const pauseAfterTitle = reduce ? 280 : PAUSE_AFTER_TITLE_MS;
    const connectMs = reduce ? 24 : 78;
    const pauseAfterConnect = reduce ? 300 : PAUSE_AFTER_CONNECT_MS;
    const loadSteps = reduce ? 12 : LOAD_BAR_STEPS;
    const loadTotalMs = reduce ? 720 : LOAD_BAR_DURATION_MS;
    const dwellMs = reduce ? 200 : PRELUDE_DWELL_MS;
    const postBeatMs = reduce ? 100 : POST_BEAT_MS;
    const pauseBeforeGateNotice = reduce ? 280 : PAUSE_BEFORE_GATE_NOTICE_MS;
    const pauseAfterGateNotice = reduce ? 200 : PAUSE_AFTER_GATE_NOTICE_MS;
    const gateNoticeTypeMs = reduce ? 16 : 42;

    void (async () => {
      await typeChars(MYSTERY_CLUB_TAG, setClubTitle, titleMs, shouldAbort);
      if (shouldAbort()) return;
      await new Promise((r) => setTimeout(r, pauseAfterTitle));
      if (shouldAbort()) return;
      await typeChars(LINE_CONNECTING_REST, setConnectLine, connectMs, shouldAbort);
      if (shouldAbort()) return;
      await new Promise((r) => setTimeout(r, pauseAfterConnect));
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

      /* 로딩 바·접속 문구 유지: 짧은 비트 후, 한 박자 더 쉬었다가 안내 문구 타이핑 */
      await new Promise((r) => setTimeout(r, postBeatMs));
      if (shouldAbort()) return;
      await new Promise((r) => setTimeout(r, pauseBeforeGateNotice));
      if (shouldAbort()) return;

      await typeChars(GATE_NOTICE_TYPED, (chunk) => setGateNoticeTyped(chunk), gateNoticeTypeMs, shouldAbort);
      if (shouldAbort()) return;
      await new Promise((r) => setTimeout(r, pauseAfterGateNotice));
      if (shouldAbort()) return;
      setAwaitingJoinForm(true);
      await new Promise<void>((resolve) => {
        modalDelayTimer = globalThis.setTimeout(() => {
          modalDelayTimer = undefined;
          resolve();
        }, AUTO_MODAL_DELAY_MS);
      });
      if (shouldAbort()) return;
      setAwaitingJoinForm(false);
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
      await new Promise((r) => setTimeout(r, 1000));
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

  const showTitleCursor =
    !modalOpen && !awaitingJoinForm && clubTitle.length < MYSTERY_CLUB_TAG.length;
  const showConnectCursor =
    !modalOpen &&
    !awaitingJoinForm &&
    loadPercent === null &&
    clubTitle.length >= MYSTERY_CLUB_TAG.length &&
    connectLine.length < LINE_CONNECTING_REST.length;
  const loadRounded = loadPercent != null ? Math.min(100, Math.round(loadPercent)) : 0;

  const gateNoticeNewlineIdx = gateNoticeTyped.indexOf("\n");
  const permissionLineShown =
    gateNoticeNewlineIdx >= 0 ? gateNoticeTyped.slice(0, gateNoticeNewlineIdx) : gateNoticeTyped;
  const pleaseWaitLineShown =
    gateNoticeNewlineIdx >= 0 ? gateNoticeTyped.slice(gateNoticeNewlineIdx + 1) : "";
  const pleaseWaitLineVisible = pleaseWaitLineShown.length > 0 || awaitingJoinForm;
  const showPermissionLineCursor =
    !awaitingJoinForm && gateNoticeTyped.length < PERMISSION_REQUIRED_LINE.length;
  const showPleaseWaitLineCursor =
    !awaitingJoinForm &&
    gateNoticeTyped.length > PERMISSION_REQUIRED_LINE.length &&
    gateNoticeTyped.length < GATE_NOTICE_TYPED.length;
  const pleaseWaitLineComplete =
    awaitingJoinForm || pleaseWaitLineShown.length >= PLEASE_WAIT_LINE.length;
  const showWaitLoader = !modalOpen && pleaseWaitLineVisible && pleaseWaitLineComplete;

  return (
    <div
      className={cn(
        "font-sans fixed inset-0 z-0 flex min-h-dvh flex-col overflow-hidden text-[color:var(--entry-parchment)]",
        landingStyles.shell,
      )}
      style={{
        backgroundColor: "var(--entry-shell-deep)",
        backgroundImage:
          "linear-gradient(180deg, color-mix(in srgb, var(--entry-shell) 96%, transparent) 0%, var(--entry-shell-deep) 100%)",
      }}
    >
      <div className={landingStyles.ambient} aria-hidden />
      <div className={landingStyles.shellGrid} aria-hidden />
      <div className={landingStyles.scanlines} aria-hidden />

      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col items-center justify-center overflow-visible px-6 py-10",
          landingStyles.content,
        )}
      >
        <div className={landingStyles.terminalStack}>
          <article className={landingStyles.terminal}>
            <header className={landingStyles.terminalChrome} aria-hidden>
              <span className={landingStyles.windowDots}>
                <span />
                <span />
                <span />
              </span>
              <span className={landingStyles.chromeLabel}>SECURE</span>
            </header>
            <div className={landingStyles.terminalBody}>
              <p className={landingStyles.title}>
                {clubTitle}
                {showTitleCursor ? <span className={landingStyles.cursor} aria-hidden /> : null}
              </p>

              {connectLine.length > 0 ? (
                <p className={landingStyles.connectLine}>
                  {connectLine}
                  {showConnectCursor ? <span className={landingStyles.cursor} aria-hidden /> : null}
                </p>
              ) : null}

              {loadPercent !== null ? (
                <div className={landingStyles.loadRow}>
                  <span className={landingStyles.loadTrack}>
                    <span
                      className={cn(
                        landingStyles.loadFill,
                        loadPercent >= 100 && landingStyles.loadFillFull,
                      )}
                      style={loadPercent >= 100 ? undefined : { width: `${loadPercent}%` }}
                    />
                  </span>
                  <span className={landingStyles.loadPercent}>{loadRounded}%</span>
                </div>
              ) : null}

              {gateNoticeTyped.length > 0 || awaitingJoinForm ? (
                <div className={landingStyles.gateNoticeBlock}>
                  <p className={landingStyles.gateNoticeLine}>
                    {permissionLineShown}
                    {showPermissionLineCursor ? (
                      <span className={landingStyles.cursor} aria-hidden />
                    ) : null}
                  </p>
                  {pleaseWaitLineVisible ? (
                    <>
                      <p className={landingStyles.gateNoticeLine}>
                        {pleaseWaitLineShown || PLEASE_WAIT_LINE}
                        {showPleaseWaitLineCursor ? (
                          <span className={landingStyles.cursor} aria-hidden />
                        ) : null}
                      </p>
                      {showWaitLoader ? (
                        <div className={landingStyles.waitLoader} aria-hidden>
                          <span />
                          <span />
                          <span />
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
            <footer className={landingStyles.terminalChromeBottom} aria-hidden>
              <span>MYSTERY CLUB</span>
            </footer>
          </article>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => {}}
        title="참가 인증"
        titleId="landing-auth-title"
        hideCloseButton
        closeOnBackdrop={false}
        closeOnEscape={false}
        bodyClassName="space-y-4"
      >
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
              className="h-11 text-sm tracking-[0.08em]"
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
