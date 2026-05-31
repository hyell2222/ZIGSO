"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PHASE_MINUTES, type TimedPhase } from "@/lib/copy/teacher";

function formatHhMmSs(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`;
}

function formatTimerDisplay(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h === 0) {
    return `${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`;
  }
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`;
}

function timerDigitsToSeconds(digits: string) {
  const padded = digits.replace(/\D/g, "").slice(-6).padStart(6, "0");
  const hours = Number(padded.slice(0, 2));
  const minutes = Number(padded.slice(2, 4));
  const seconds = Number(padded.slice(4, 6));
  return hours * 3600 + minutes * 60 + seconds;
}

function formatTimerDigits(digits: string) {
  const padded = digits.replace(/\D/g, "").slice(-6).padStart(6, "0");
  return `${padded.slice(0, 2)}:${padded.slice(2, 4)}:${padded.slice(4, 6)}`;
}

function secondsToTimerDigits(totalSeconds: number) {
  const formatted = formatHhMmSs(totalSeconds).replace(/:/g, "");
  return formatted.replace(/^0+/, "");
}

/**
 * 호스트 타이머 — 단계별 기본값 + 직접 편집 가능. 순수 클라이언트 상태로만 동작합니다.
 */
export function PhaseTimerContent({ phase }: { phase: TimedPhase }) {
  const defaultMinutes = PHASE_MINUTES[phase];
  const [timerRemainingSec, setTimerRemainingSec] = useState<number>(
    defaultMinutes * 60,
  );
  const [resetBaselineSec, setResetBaselineSec] = useState<number>(
    defaultMinutes * 60,
  );
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [timerInputDigits, setTimerInputDigits] = useState(
    secondsToTimerDigits(defaultMinutes * 60),
  );
  const timerInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isTimerRunning) return;
    const id = window.setInterval(() => {
      setTimerRemainingSec((prev) => {
        if (prev <= 1) {
          setIsTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [isTimerRunning]);

  useEffect(() => {
    if (!isEditing || !timerInputRef.current) return;
    const length = timerInputRef.current.value.length;
    timerInputRef.current.setSelectionRange(length, length);
  }, [isEditing, timerInputDigits]);

  const commitTimerValue = () => {
    const nextSeconds = timerDigitsToSeconds(timerInputDigits);
    setTimerRemainingSec(nextSeconds);
    setResetBaselineSec(nextSeconds);
    setIsTimerRunning(false);
    setTimerInputDigits(secondsToTimerDigits(nextSeconds));
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {isEditing ? (
        <Input
          ref={timerInputRef}
          autoFocus
          value={formatTimerDigits(timerInputDigits)}
          inputMode="numeric"
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "").slice(-6);
            setTimerInputDigits(digits);
          }}
          onBlur={commitTimerValue}
          onKeyDown={(e) => {
            if (/^\d$/.test(e.key)) {
              e.preventDefault();
              setTimerInputDigits((prev) => (prev + e.key).slice(-6));
              return;
            }

            if (e.key === "Backspace") {
              e.preventDefault();
              setTimerInputDigits((prev) => prev.slice(0, -1));
              return;
            }

            if (e.key === "Enter") {
              e.preventDefault();
              commitTimerValue();
              return;
            }

            if (e.key === "Escape") {
              e.preventDefault();
              setTimerInputDigits(secondsToTimerDigits(timerRemainingSec));
              setIsEditing(false);
              return;
            }

            if (e.key === "Tab" || e.key.startsWith("Arrow")) return;

            e.preventDefault();
          }}
          className="h-20 !w-[9ch] border-none px-0 text-center font-mono text-5xl tabular-nums text-[var(--muted-foreground)] sm:h-24 sm:text-6xl md:text-5xl"
        />
      ) : (
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setTimerInputDigits("");
            setIsEditing(true);
          }}
          className="h-20 text-center font-mono text-5xl tabular-nums text-[var(--accent)] transition hover:text-[var(--highlight)] sm:h-24 sm:text-6xl md:text-5xl"
        >
          {formatTimerDisplay(timerRemainingSec)}
        </Button>
      )}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => setIsTimerRunning((v) => !v)}
        >
          {isTimerRunning ? "일시정지" : "시작"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setTimerRemainingSec(resetBaselineSec);
            setIsTimerRunning(false);
            setTimerInputDigits(secondsToTimerDigits(resetBaselineSec));
            setIsEditing(false);
          }}
        >
          초기화
        </Button>
      </div>
    </div>
  );
}
