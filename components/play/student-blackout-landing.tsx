"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { getSessionByJoinCode } from "@/lib/api/play";
import { ROUTES } from "@/lib/routes";
import { hasSupabaseEnv } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import styles from "@/components/play/student-blackout-landing.module.css";

const TRAY_ITEMS = ["🍚", "🥣", "🥕", "🍗", "🧃"] as const;

type OpenBeat = "shutter" | "stock" | "steam" | "open" | "invite";

const BEATS: Array<{ key: OpenBeat; message: string; ms: number }> = [
  { key: "shutter", message: "급식 카운터 셔터를 올리는 중…", ms: 1600 },
  { key: "stock", message: "오늘의 메뉴를 도시락에 담는 중…", ms: 3800 },
  { key: "steam", message: "따끈따끈하게 데우는 중…", ms: 2200 },
  { key: "open", message: "", ms: 2600 },
  { key: "invite", message: "이제 팀 주방으로 들어올 수 있어요!", ms: 2200 },
];

/** 마지막 안내 문구를 읽을 시간 */
const MODAL_OPEN_DELAY_MS = 1400;

type StudentBlackoutLandingProps = {
  prefillJoinCode?: string;
  prefillNickname?: string;
};

export function StudentBlackoutLanding({
  prefillJoinCode,
  prefillNickname,
}: StudentBlackoutLandingProps = {}) {
  const router = useRouter();
  const [beatIndex, setBeatIndex] = useState(0);
  const [filledSlots, setFilledSlots] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [joinCode, setJoinCode] = useState(() => prefillJoinCode ?? "");
  const [nickname, setNickname] = useState(() => prefillNickname ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const preludeRunRef = useRef(0);

  useEffect(() => {
    if (prefillJoinCode) setJoinCode(prefillJoinCode);
  }, [prefillJoinCode]);

  useEffect(() => {
    if (prefillNickname) setNickname(prefillNickname);
  }, [prefillNickname]);

  useEffect(() => {
    const run = ++preludeRunRef.current;
    let cancelled = false;
    const timers: ReturnType<typeof globalThis.setTimeout>[] = [];
    const shouldAbort = () => cancelled || preludeRunRef.current !== run;

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        const id = globalThis.setTimeout(resolve, ms);
        timers.push(id);
      });

    const scheduleStockFill = async (totalMs: number) => {
      const steps = TRAY_ITEMS.length;
      const stepMs = Math.max(280, Math.floor(totalMs / steps));
      for (let i = 1; i <= steps; i++) {
        if (shouldAbort()) return;
        setFilledSlots(i);
        if (i < steps) await wait(stepMs);
      }
    };

    void (async () => {
      if (reduceMotion) {
        setBeatIndex(BEATS.length - 1);
        setFilledSlots(TRAY_ITEMS.length);
        await wait(800);
        if (shouldAbort()) return;
        setModalOpen(true);
        return;
      }

      for (let i = 0; i < BEATS.length; i++) {
        if (shouldAbort()) return;
        const beat = BEATS[i]!;
        setBeatIndex(i);

        if (beat.key === "stock") {
          await scheduleStockFill(beat.ms);
        } else {
          await wait(beat.ms);
        }
      }

      if (shouldAbort()) return;
      await wait(MODAL_OPEN_DELAY_MS);
      if (shouldAbort()) return;
      setModalOpen(true);
    })();

    return () => {
      cancelled = true;
      for (const id of timers) globalThis.clearTimeout(id);
    };
  }, [reduceMotion]);

  useEffect(() => {
    if (!modalOpen) return;
    const id = window.setTimeout(() => {
      document.getElementById("landing-join-code")?.focus();
    }, 120);
    return () => window.clearTimeout(id);
  }, [modalOpen]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const code = joinCode.trim().toUpperCase();
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

  const currentBeat = BEATS[beatIndex] ?? BEATS[0]!;
  const beatKey = currentBeat.key;
  const shutterGone = beatIndex >= 1 || reduceMotion;
  const shutterAnimating = beatKey === "shutter" && !reduceMotion;
  const showSteam = beatKey === "steam" || beatKey === "open" || beatKey === "invite";
  const showOpenRibbon = beatKey === "open" || beatKey === "invite";
  const statusMessage =
    beatKey === "open" ? "영업 시작! 🎉" : currentBeat.message;

  return (
    <div
      className={cn(
        "font-sans fixed inset-0 z-0 flex min-h-dvh flex-col overflow-hidden",
        styles.shell,
      )}
    >
      <div className={styles.ambient} aria-hidden />
      <div className={styles.tileFloor} aria-hidden />

      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-10",
          styles.content,
        )}
      >
        <div className={styles.stage}>
          <div className={styles.logoRow}>
            <p className={styles.logoTitle}>SCHOOL LUNCH RUSH</p>
            <p className={styles.logoSub}>협동 영어 · 급식 타이쿤</p>
          </div>

          <article className={styles.counter} aria-busy={!modalOpen} aria-live="polite">
            <div className={styles.awning} aria-hidden />
            <p className={styles.counterTop}>
              <span aria-hidden>🏫</span>
              TODAY&apos;S LUNCH COUNTER
            </p>

            <div className={styles.windowFrame}>
              <div
                className={cn(
                  styles.shutter,
                  (shutterAnimating || shutterGone) && styles.shutterOpen,
                )}
                aria-hidden
              >
                <span className={styles.shutterSlat} />
                <span className={styles.shutterSlat} />
                <span className={styles.shutterSlat} />
              </div>

              <div
                className={cn(styles.openRibbon, showOpenRibbon && styles.openRibbonVisible)}
                aria-hidden={!showOpenRibbon}
              >
                <span className={styles.openRibbonInner}>OPEN!</span>
              </div>

              <div className={styles.windowInner}>
                <span className={styles.chef} aria-hidden>
                  👨‍🍳
                </span>
                <div className={styles.tray} role="group" aria-label="오늘의 급식 준비">
                  {TRAY_ITEMS.map((item, index) => (
                    <span
                      key={item}
                      className={cn(
                        styles.traySlot,
                        index < filledSlots && styles.traySlotFilled,
                      )}
                      aria-hidden={index >= filledSlots}
                    >
                      {index < filledSlots ? item : "·"}
                    </span>
                  ))}
                </div>
              </div>

              <div
                className={cn(styles.steam, showSteam && styles.steamVisible)}
                aria-hidden
              >
                <span className={styles.steamPuff} />
                <span className={styles.steamPuff} />
                <span className={styles.steamPuff} />
              </div>
            </div>
          </article>

          <div className={styles.statusWrap}>
            {statusMessage ? (
              <p key={`${beatIndex}-${statusMessage}`} className={styles.statusLine}>
                {statusMessage}
              </p>
            ) : null}
            <div className={styles.stepDots} aria-hidden>
              {BEATS.map((b, i) => (
                <span
                  key={b.key}
                  className={cn(
                    styles.stepDot,
                    i === beatIndex && styles.stepDotActive,
                    i < beatIndex && styles.stepDotDone,
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => {}}
        title="급식실 입장"
        titleId="landing-auth-title"
        hideCloseButton
        closeOnBackdrop={false}
        closeOnEscape={false}
        overlayClassName={styles.joinModalOverlay}
        panelClassName={styles.joinModalPanel}
        headerClassName={styles.joinModalHeader}
        bodyClassName={cn("space-y-4", styles.joinModalBody)}
        titlePrefix={<span className="text-lg leading-none" aria-hidden>🎫</span>}
      >
        <p className={styles.joinModalHint}>
          선생님이 알려준 <strong>참가 코드</strong>와 <strong>닉네임</strong>을 입력하면 팀 주방으로
          들어갈 수 있어요.
        </p>
        <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
          <div>
            <label htmlFor="landing-join-code" className="mb-1.5 block text-xs font-bold text-[var(--primary)]">
              참가 코드
            </label>
            <div className="relative">
              <Input
                id="landing-join-code"
                autoComplete="off"
                spellCheck={false}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                disabled={busy}
                placeholder=""
                className="h-11 rounded-lg border-2 border-[color-mix(in_srgb,var(--primary)_22%,var(--border))] bg-white text-sm font-semibold tracking-[0.12em]"
              />
              {!joinCode.trim() ? (
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--muted-foreground)]">
                  예: ABC123
                </span>
              ) : null}
            </div>
          </div>
          <div>
            <label htmlFor="landing-nickname" className="mb-1.5 block text-xs font-bold text-[var(--primary)]">
              닉네임
            </label>
            <Input
              id="landing-nickname"
              autoComplete="off"
              spellCheck={false}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              disabled={busy}
              placeholder="예: 도시락왕 김코드"
              className="h-11 rounded-lg border-2 border-[color-mix(in_srgb,var(--primary)_22%,var(--border))] bg-white text-sm"
            />
          </div>
          <Button
            type="submit"
            disabled={busy || !joinCode.trim() || !nickname.trim()}
            className={cn("h-11 w-full text-sm", styles.joinSubmit)}
            size="lg"
          >
            {busy ? "확인 중…" : "급식실 입장 🍱"}
          </Button>
        </form>
        {error ? <p className="text-center text-sm font-medium text-[var(--danger)]">{error}</p> : null}
      </Modal>
    </div>
  );
}
