"use client";

import { Loader2 } from "lucide-react";

import { LoadingState } from "@/components/ui/loading-state";
import { cn } from "@/lib/utils";
import styles from "@/components/play/waiting-lobby-block.module.css";

export type WaitingLobbyState = "session_loading" | "waiting";

export function WaitingLobbyBlock({
  state,
  className,
}: {
  joinCode: string;
  nickname: string;
  sessionTitle: string | null;
  state: WaitingLobbyState;
  className?: string;
}) {
  return (
    <div
      className={cn(
        styles.card,
        "relative flex max-w-md flex-col items-center text-center",
        className,
      )}
    >
      {state === "session_loading" ? (
        <LoadingState variant="section" tone="play" className="min-h-[min(16rem,40dvh)] py-8" />
      ) : (
        <>
          <Loader2
            className="h-10 w-10 animate-spin text-[var(--primary)]"
            aria-hidden
          />
          <p className={styles.body}>곧 활동이 시작됩니다</p>
        </>
      )}
    </div>
  );
}
