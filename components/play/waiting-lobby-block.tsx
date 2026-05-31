"use client";

import { cn } from "@/lib/utils";
import styles from "@/components/play/waiting-lobby-block.module.css";

const WAITING_LOBBY: Record<
  "session_loading" | "waiting",
  { title: string; body1: string; body2: string | null; emoji: string }
> = {
  session_loading: {
    title: "준비 중",
    body1: "활동 안내를 불러오고 있어요.",
    body2: null,
    emoji: "⏳",
  },
  waiting: {
    title: "곧 활동이 시작됩니다",
    body1: "시작하면 모둠·역할·단어가 배정됩니다.",
    body2: "배정이 끝나면 같은 모둠끼리 모여 주세요.",
    emoji: "🧩",
  },
};

export type WaitingLobbyState = keyof typeof WAITING_LOBBY;

export function WaitingLobbyBlock({
  joinCode,
  nickname,
  sessionTitle,
  state,
  className,
}: {
  joinCode: string;
  nickname: string;
  sessionTitle: string | null;
  state: WaitingLobbyState;
  className?: string;
}) {
  const copy = WAITING_LOBBY[state];
  return (
    <div
      className={cn(
        styles.card,
        "relative flex max-w-md flex-col items-center text-center",
        className,
      )}
    >
      <span className={styles.activityIcon} aria-hidden>
        {copy.emoji}
      </span>
      <div className="w-full max-w-sm space-y-1.5 @sm:space-y-2">
        <p className={styles.title}>{copy.title}</p>
        {sessionTitle ? <p className={styles.sessionTitle}>{sessionTitle}</p> : null}
        <p className={styles.meta}>
          <span className={styles.code}>{joinCode}</span>
          <span className={styles.dot} aria-hidden>
            ·
          </span>
          {nickname}
        </p>
        <p className={styles.body}>
          <span className="block">{copy.body1}</span>
          {copy.body2 ? <span className="mt-1 block">{copy.body2}</span> : null}
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
