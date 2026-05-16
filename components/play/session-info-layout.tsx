"use client";

import { FileText, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { cn } from "@/lib/utils";
import type { SuspectEntry } from "@/lib/suspects";
import { parseSuspectRosterFromCase } from "@/lib/suspects";

export type SessionInfoLayoutCase = {
  title: string | null;
  description: string | null;
  suspect_roster: SuspectEntry[] | null | unknown;
};

type SessionInfoLayoutProps = {
  loading: boolean;
  /**
   * 사건 메타데이터. 실 플레이는 `getPlaySessionDetails(...).cases`,
   * 시뮬레이션은 `CaseRecord` 에서 같은 모양으로 채워서 넘깁니다.
   */
  caseData: SessionInfoLayoutCase | null | undefined;
  /** 샌드박스 등 좁은 뷰 — 제목·그리드 간격 축소 */
  compact?: boolean;
};

/** 사건 파일 — 살짝 그린 미스트 (공문 느낌) */
const fileCard =
  "border-[var(--play-border-cool)] bg-[var(--play-panel-cool)] text-[var(--foreground)] shadow-[var(--play-shadow-soft)]";
const fileCardHeader =
  "border-b border-[var(--play-border-cool)] bg-[var(--play-veil)]";

/** 용의자 — 앰버 톤 (인물·리스트) */
const rosterCard =
  "border-[var(--play-border-warm)] bg-[var(--play-panel-warm)] text-[var(--foreground)] shadow-[var(--play-shadow-lift)]";
const rosterCardHeader =
  "border-b border-[var(--border)] bg-[var(--panel-warn-bg)]";

const playMuted = "text-[var(--muted-foreground)]";
const playTitle = "text-[var(--foreground)]";

/**
 * 1단계(사건 파악): 사건 개요 + 용의자
 */
export function SessionInfoLayout({
  loading,
  caseData,
  compact = false,
}: SessionInfoLayoutProps) {
  if (loading) {
    return (
      <div
        className={cn(
          "flex flex-1 flex-col items-center justify-center",
          compact
            ? "min-h-[min(11rem,36dvh)] py-4"
            : "min-h-[min(20rem,46dvh)] py-6",
        )}
      >
        <LoadingState
          variant="section"
          tone="play"
          label="불러오는 중…"
          className="min-h-0 py-4"
        />
      </div>
    );
  }

  const cases = caseData;
  const roster = parseSuspectRosterFromCase(cases?.suspect_roster);

  return (
    <div
      className={cn(
        "grid sm:grid-cols-2",
        compact ? "gap-3 sm:gap-3 md:gap-4" : "gap-4 sm:gap-5 md:gap-6",
      )}
    >
      <Card
        className={cn(
          "overflow-hidden motion-safe:animate-[playRevealUp_0.55s_cubic-bezier(0.22,1,0.36,1)_both]",
          fileCard,
        )}
      >
        <CardHeader
          className={cn("space-y-1", fileCardHeader, compact ? "pb-3" : "pb-4")}
        >
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "flex items-center justify-center rounded-md bg-[var(--play-chip-cool)] text-[var(--primary)] ring-1 ring-[color-mix(in_srgb,var(--primary)_22%,transparent)]",
                compact ? "h-7 w-7" : "h-8 w-8",
              )}
            >
              <FileText
                className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4")}
                aria-hidden
              />
            </span>
            <CardTitle
              className={cn(
                "font-semibold",
                playTitle,
                compact ? "text-sm" : "text-base",
              )}
            >
              사건 파일
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className={cn(compact ? "space-y-3 pt-3" : "space-y-4 pt-5")}>
          <div className="space-y-1.5">
            <p
              className={cn(
                "font-semibold leading-snug",
                playTitle,
                compact ? "text-sm" : "text-lg",
              )}
            >
              {cases?.title ?? "제목 없음"}
            </p>
          </div>
          <div className="space-y-1.5">
            <div
              className={cn(
                "rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm leading-relaxed shadow-[inset_var(--input-inset)]",
                playTitle,
                compact ? "p-3 text-[13px] leading-snug" : "p-4",
              )}
            >
              <p className="whitespace-pre-wrap">
                {cases?.description ?? "설명이 없습니다."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card
        className={cn(
          "overflow-hidden motion-safe:animate-[playRevealUp_0.6s_cubic-bezier(0.22,1,0.36,1)_both] motion-safe:[animation-delay:100ms]",
          rosterCard,
        )}
      >
        <CardHeader
          className={cn("space-y-1", rosterCardHeader, compact ? "pb-3" : "pb-4")}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex items-center justify-center rounded-md bg-[var(--play-chip-warm)] text-[var(--accent)] ring-1 ring-[var(--border)]",
                  compact ? "h-7 w-7" : "h-8 w-8",
                )}
              >
                <Users
                  className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4")}
                  aria-hidden
                />
              </span>
              <div>
                <CardTitle
                  className={cn(
                    "font-semibold",
                    playTitle,
                    compact ? "text-sm" : "text-base",
                  )}
                >
                  용의자 목록
                </CardTitle>
                <p className={cn(compact ? "text-[11px]" : "text-xs", playMuted)}>
                  범인 지목에서 아래 인물 중 범인을 고릅니다.
                </p>
              </div>
            </div>
            {roster.length > 0 ? (
              <span className="shrink-0 rounded-full bg-[var(--primary)] px-2.5 py-0.5 text-xs font-semibold text-[var(--on-primary)] shadow-sm">
                {roster.length}명
              </span>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className={compact ? "pt-3" : "pt-5"}>
          {roster.length > 0 ? (
            <ul className={cn(compact ? "space-y-2" : "space-y-3")}>
              {roster.map((s, index) => (
                <li
                  key={s.id}
                  className={cn(
                    "flex rounded-lg border shadow-sm",
                    compact ? "gap-2 p-2" : "gap-3 p-3",
                    index % 2 === 0
                      ? "border-[var(--border)] bg-[var(--background)]"
                      : "border-[var(--border)] bg-[var(--tint-accent-weak)]",
                  )}
                >
                  <span
                    className={cn(
                      "flex shrink-0 items-center justify-center rounded-md bg-[var(--tint-accent-medium)] font-bold text-[var(--primary)] ring-1 ring-[var(--border)]",
                      compact ? "h-7 w-7 text-xs" : "h-9 w-9 text-sm",
                    )}
                    aria-hidden
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p
                      className={cn(
                        "font-semibold",
                        playTitle,
                        compact ? "text-sm" : "text-base",
                      )}
                    >
                      {s.name || "(이름 없음)"}
                    </p>
                    {s.detail ? (
                      <p
                        className={cn(
                          "whitespace-pre-wrap leading-relaxed",
                          playTitle,
                          compact ? "text-xs" : "text-sm",
                        )}
                      >
                        {s.detail}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p
              className={cn(
                "rounded-md border border-dashed border-[var(--play-border-cool)] bg-[var(--play-veil)] text-center",
                playMuted,
                compact ? "px-3 py-4 text-xs" : "px-4 py-6 text-sm",
              )}
            >
              선생님이 이 사건에 용의자 정보를 넣지 않았습니다.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
