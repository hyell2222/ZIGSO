"use client";

import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const WAITING_LOBBY: Record<
  "session_loading" | "waiting",
  { title: string; body1: string; body2: string | null }
> = {
  session_loading: {
    title: "불러오는 중",
    body1: "잠시만 기다려 주세요.",
    body2: null,
  },
  waiting: {
    title: "선생님이 시작할 때까지 대기",
    body1: "팀과 조사 장소가 자동 배정됩니다.",
    body2: "배정이 완료되면 같은 팀끼리 모여 앉아주세요.",
  },
};

export type WaitingLobbyState = keyof typeof WAITING_LOBBY;

/**
 * 학생 대기 화면 — 사건 로딩 / 선생님 시작 대기 두 상태를 표시합니다.
 * (실 play 페이지·샌드박스 양쪽에서 동일 외관으로 사용합니다.)
 */
export function WaitingLobbyBlock({
  joinCode,
  nickname,
  caseTitle,
  state,
  className,
  compact = false,
}: {
  joinCode: string;
  nickname: string;
  caseTitle: string | null;
  state: WaitingLobbyState;
  className?: string;
  /** 샌드박스 패널 등 좁은 뷰 */
  compact?: boolean;
}) {
  const copy = WAITING_LOBBY[state];
  return (
    <div
      className={cn(
        "relative flex max-w-md flex-col items-center text-center",
        compact ? "gap-3 px-4 py-3" : "gap-4 px-6 py-4",
        className,
      )}
    >
      <Loader2
        className={cn(
          "shrink-0 animate-spin text-[var(--primary)]",
          compact ? "h-7 w-7" : "h-10 w-10",
        )}
        style={{
          filter:
            "drop-shadow(0 0 10px color-mix(in srgb, var(--primary) 40%, transparent))",
        }}
        aria-hidden
      />
      <div className={cn("w-full max-w-sm space-y-2", compact && "space-y-1.5")}>
        <p
          className={cn(
            "font-semibold tracking-tight text-[var(--entry-parchment)]",
            compact ? "text-sm" : "text-base",
          )}
        >
          {copy.title}
        </p>
        {caseTitle ? (
          <p
            className={cn(
              "text-[color-mix(in_srgb,var(--entry-parchment)_72%,var(--entry-parchment-muted))]",
              compact ? "text-xs leading-snug" : "text-sm",
            )}
          >
            {caseTitle}
          </p>
        ) : null}
        <p
          className={cn(
            "text-[color-mix(in_srgb,var(--entry-parchment)_68%,var(--entry-parchment-muted))]",
            compact ? "text-[11px]" : "text-xs",
          )}
        >
          <span className="font-mono text-[color-mix(in_srgb,var(--on-primary)_75%,var(--primary))]">
            {joinCode}
          </span>{" "}
          · {nickname}
        </p>
        <p
          className={cn(
            "leading-relaxed text-[color-mix(in_srgb,var(--entry-parchment)_40%,var(--entry-parchment-muted))]",
            compact ? "text-[11px]" : "text-xs",
          )}
        >
          <span className="block">{copy.body1}</span>
          {copy.body2 ? <span className="block">{copy.body2}</span> : null}
        </p>
      </div>
    </div>
  );
}
