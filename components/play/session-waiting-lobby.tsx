import { Loader2, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type SessionWaitingLobbyState = "session_loading" | "host_not_started" | "assigning";

type Props = {
  joinCode: string;
  nickname: string;
  caseTitle: string | null;
  state: SessionWaitingLobbyState;
  className?: string;
};

const STATE_COPY: Record<SessionWaitingLobbyState, { title: string; body: string }> = {
  session_loading: {
    title: "세션을 불러오는 중",
    body: "잠시만 기다려 주세요.",
  },
  host_not_started: {
    title: "교사가 수사를 시작할 때까지",
    body: "대기 화면에 머물러 있어요. 팀·역할·조사 구역은 시작 후 자동으로 배정됩니다.",
  },
  assigning: {
    title: "팀·역할 배정 중",
    body: "곧 탐정 동아리 직책과 순찰 구역이 정해집니다.",
  },
};

/**
 * `waiting` 페이스 또는 팀/역할 로딩: 호스트「수사 시작」 전·직후 안내.
 */
export function SessionWaitingLobby({ joinCode, nickname, caseTitle, state, className }: Props) {
  const copy = STATE_COPY[state];
  const isLoading = state === "session_loading" || state === "assigning";

  return (
    <Card
      className={cn(
        "border-[var(--border)] bg-[var(--card-bg)] shadow-[var(--elevation-sm)]",
        className,
      )}
    >
      <CardHeader className="space-y-1 border-b border-[var(--border)]/80 bg-[var(--tint-accent-weak)]">
        <div className="flex items-center gap-2">
          {isLoading ? (
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-[var(--accent)]" aria-hidden />
          ) : (
            <Users className="h-5 w-5 shrink-0 text-[var(--accent)]" aria-hidden />
          )}
          <CardTitle className="text-base text-[var(--mystery)]">{copy.title}</CardTitle>
        </div>
        {caseTitle ? (
          <p className="text-sm font-medium text-[var(--foreground)]">{caseTitle}</p>
        ) : null}
        <p className="text-xs text-[var(--muted-foreground)]">
          <span className="font-mono text-[var(--accent)]">{joinCode}</span> · {nickname}
        </p>
      </CardHeader>
      <CardContent className="pt-4">
        <p className="text-sm leading-relaxed text-[var(--foreground)]">{copy.body}</p>
      </CardContent>
    </Card>
  );
}
