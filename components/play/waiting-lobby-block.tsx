"use client";

import { cn } from "@/lib/utils";
import styles from "@/components/play/waiting-lobby-block.module.css";
import { LoadingState } from "../ui/loading-state";

const WAITING_LOBBY: Record<
  "session_loading" | "waiting",
  { title: string; body1: string;  }
> = {
  session_loading: {
    title: "준비 중",
    body1: "활동 안내를 불러오고 있어요.",
  },
  waiting: {
    title: "곧 활동이 시작됩니다",
    body1: "모둠과 역할이 배정되면, 같은 모둠끼리 모여 주세요.",
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
      <LoadingState variant="section" tone="play" className="min-h-[min(16rem,40dvh)] py-8" />
      <div className="w-full max-w-sm space-y-1.5 @sm:space-y-2">
        <p className={styles.title}>{copy.title}</p>
        {sessionTitle ? (
          <p className={styles.sessionTitle}>
            {sessionTitle}
            <span className={styles.dot} aria-hidden>
              ·
            </span>
            {nickname}
          </p>
        ) : null}
      </div>
    </div>
  );
}
