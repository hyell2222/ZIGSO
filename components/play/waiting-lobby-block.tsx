"use client";

import { cn } from "@/lib/utils";
import styles from "@/components/play/waiting-lobby-block.module.css";

const WAITING_LOBBY: Record<
  "session_loading" | "waiting",
  { title: string; body1: string; body2: string | null; emoji: string }
> = {
  session_loading: {
    title: "주방 불 끄는 중",
    body1: "오늘의 메뉴를 불러오고 있어요.",
    body2: null,
    emoji: "🍳",
  },
  waiting: {
    title: "곧 급식 타임!",
    body1: "선생님이 시작하면 팀·전문 재료가 자동 배정돼요.",
    body2: "배정이 끝나면 같은 팀끼리 모여 주세요.",
    emoji: "🍱",
  },
};

export type WaitingLobbyState = keyof typeof WAITING_LOBBY;

export function WaitingLobbyBlock({
  joinCode,
  nickname,
  sessionTitle,
  state,
  className,
  compact = false,
}: {
  joinCode: string;
  nickname: string;
  sessionTitle: string | null;
  state: WaitingLobbyState;
  className?: string;
  compact?: boolean;
}) {
  const copy = WAITING_LOBBY[state];
  return (
    <div
      className={cn(
        styles.card,
        compact && styles.cardCompact,
        "relative flex max-w-md flex-col items-center text-center",
        className,
      )}
    >
      <span
        className={cn(styles.trayIcon, compact && styles.trayIconCompact)}
        aria-hidden
      >
        {copy.emoji}
      </span>
      <div className={cn("w-full max-w-sm space-y-2", compact && "space-y-1.5")}>
        <p className={cn(styles.title, compact && styles.titleCompact)}>{copy.title}</p>
        {sessionTitle ? (
          <p className={cn(styles.sessionTitle, compact && styles.sessionTitleCompact)}>
            {sessionTitle}
          </p>
        ) : null}
        <p className={cn(styles.meta, compact && styles.metaCompact)}>
          <span className={styles.code}>{joinCode}</span>
          <span className={styles.dot} aria-hidden>
            ·
          </span>
          {nickname}
        </p>
        <p className={cn(styles.body, compact && styles.bodyCompact)}>
          <span className="block">{copy.body1}</span>
          {copy.body2 ? <span className="block mt-1">{copy.body2}</span> : null}
        </p>
        <div className={styles.dots} aria-hidden>
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}
