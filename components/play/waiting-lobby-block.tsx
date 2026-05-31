"use client";

import { STUDENT_COPY } from "@/lib/copy/student";
import { cn } from "@/lib/utils";
import styles from "@/components/play/waiting-lobby-block.module.css";

const WAITING_LOBBY: Record<
  "session_loading" | "waiting",
  { title: string; body1: string; body2: string | null; emoji: string }
> = {
  session_loading: {
    title: STUDENT_COPY.waiting.loadingTitle,
    body1: STUDENT_COPY.waiting.loadingBody,
    body2: null,
    emoji: STUDENT_COPY.waiting.loadingEmoji,
  },
  waiting: {
    title: STUDENT_COPY.waiting.waitingTitle,
    body1: STUDENT_COPY.waiting.waitingBody1,
    body2: STUDENT_COPY.waiting.waitingBody2,
    emoji: STUDENT_COPY.waiting.waitingEmoji,
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
