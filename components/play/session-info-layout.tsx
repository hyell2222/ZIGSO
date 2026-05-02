"use client";

import { FileText, Users } from "lucide-react";
import type { ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { cn } from "@/lib/utils";
import type { SessionDetailsRow } from "@/lib/api/play";
import { parseSuspectRosterFromCase } from "@/lib/suspects";

type SessionInfoLayoutProps = {
  sessionQuery: UseQueryResult<SessionDetailsRow, Error>;
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
export function SessionInfoLayout({ sessionQuery }: SessionInfoLayoutProps) {
  const cases = sessionQuery.data?.cases;
  const roster = parseSuspectRosterFromCase(cases?.suspect_roster);

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card
        className={cn(
          "overflow-hidden motion-safe:animate-[playRevealUp_0.55s_cubic-bezier(0.22,1,0.36,1)_both]",
          fileCard,
        )}
      >
        <CardHeader className={cn("space-y-1 pb-4", fileCardHeader)}>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--play-chip-cool)] text-[var(--primary)] ring-1 ring-[color-mix(in_srgb,var(--primary)_22%,transparent)]">
              <FileText className="h-4 w-4" aria-hidden />
            </span>
            <CardTitle className={cn("text-base font-semibold", playTitle)}>사건 파일</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          {sessionQuery.data ? (
            <>
              <div className="space-y-1.5">
                <p className={cn("text-lg font-semibold leading-snug", playTitle)}>
                  {sessionQuery.data.cases?.title ?? "제목 없음"}
                </p>
              </div>
              <div className="space-y-1.5">
                <div
                  className={cn(
                    "rounded-lg border border-[var(--border)] bg-[var(--background)] p-4 text-sm leading-relaxed shadow-[inset_var(--input-inset)]",
                    playTitle,
                  )}
                >
                  <p className="whitespace-pre-wrap">
                    {sessionQuery.data.cases?.description ?? "설명이 없습니다."}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <LoadingState variant="section" tone="default" label="사건 정보를 불러오는 중…" />
          )}
        </CardContent>
      </Card>

      <Card
        className={cn(
          "overflow-hidden motion-safe:animate-[playRevealUp_0.6s_cubic-bezier(0.22,1,0.36,1)_both] motion-safe:[animation-delay:100ms]",
          rosterCard,
        )}
      >
        <CardHeader className={cn("space-y-1 pb-4", rosterCardHeader)}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--play-chip-warm)] text-[var(--accent)] ring-1 ring-[var(--border)]">
                <Users className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <CardTitle className={cn("text-base font-semibold", playTitle)}>용의자 목록</CardTitle>
                <p className={cn("text-xs", playMuted)}>범인 지목에서 아래 인물 중 범인을 고릅니다.</p>
              </div>
            </div>
            {roster.length > 0 ? (
              <span className="shrink-0 rounded-full bg-[var(--primary)] px-2.5 py-0.5 text-xs font-semibold text-[var(--on-primary)] shadow-sm">
                {roster.length}명
              </span>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          {roster.length > 0 ? (
            <ul className="space-y-3">
              {roster.map((s, index) => (
                <li
                  key={s.id}
                  className={cn(
                    "flex gap-3 rounded-lg border p-3 shadow-sm",
                    index % 2 === 0
                      ? "border-[var(--border)] bg-[var(--background)]"
                      : "border-[var(--border)] bg-[var(--tint-accent-weak)]",
                  )}
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--tint-accent-medium)] text-sm font-bold text-[var(--primary)] ring-1 ring-[var(--border)]"
                    aria-hidden
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className={cn("text-base font-semibold", playTitle)}>{s.name || "(이름 없음)"}</p>
                    {s.detail ? (
                      <p className={cn("whitespace-pre-wrap text-sm leading-relaxed", playTitle)}>
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
                "rounded-md border border-dashed border-[var(--play-border-cool)] bg-[var(--play-veil)] px-4 py-6 text-center text-sm",
                playMuted,
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
