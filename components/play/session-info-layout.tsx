"use client";

import { FileText, Users } from "lucide-react";
import type { ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { SessionDetailsRow } from "@/lib/api/play";
import { parseSuspectRosterFromCase } from "@/lib/suspects";

type SessionInfoLayoutProps = {
  sessionQuery: UseQueryResult<SessionDetailsRow, Error>;
};

const playCard =
  "border-[color-mix(in_srgb,var(--primary)_26%,transparent)] bg-[color-mix(in_srgb,var(--mystery)_78%,var(--ink))] text-[color:var(--entry-parchment)] shadow-[0_12px_40px_color-mix(in_srgb,var(--ink)_45%,transparent)]";
const playCardHeader =
  "border-b border-[color-mix(in_srgb,var(--primary)_18%,transparent)] bg-[color-mix(in_srgb,var(--mystery)_55%,#151210)]";
const playMuted = "text-[color:var(--entry-parchment-muted)]";
const playTitle = "text-[color:var(--entry-parchment)]";

function FieldLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--entry-accent-soft)]",
        className,
      )}
    >
      {children}
    </p>
  );
}

/**
 * 1단계(브리핑): 사건 개요 + 용의자
 */
export function SessionInfoLayout({ sessionQuery }: SessionInfoLayoutProps) {
  const cases = sessionQuery.data?.cases;
  const roster = parseSuspectRosterFromCase(cases?.suspect_roster);

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card
        className={cn(
          "overflow-hidden motion-safe:animate-[playRevealUp_0.55s_cubic-bezier(0.22,1,0.36,1)_both]",
          playCard,
        )}
      >
        <CardHeader className={cn("space-y-1 pb-4", playCardHeader)}>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--primary)_22%,transparent)] text-[color:var(--entry-accent-soft)] shadow-sm ring-1 ring-[color-mix(in_srgb,var(--primary)_30%,transparent)]">
              <FileText className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <CardTitle className={cn("text-base font-semibold", playTitle)}>사건 파일</CardTitle>
              <p className={cn("text-xs", playMuted)}>브리핑에 공개되는 제목·개요입니다.</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          {sessionQuery.data ? (
            <>
              <div className="space-y-1.5">
                <FieldLabel>사건 제목</FieldLabel>
                <p className={cn("text-lg font-semibold leading-snug", playTitle)}>
                  {sessionQuery.data.cases?.title ?? "제목 없음"}
                </p>
              </div>
              <div className="space-y-1.5">
                <FieldLabel>사건 개요 · 의뢰 내용</FieldLabel>
                <div
                  className={cn(
                    "rounded-lg border border-[color-mix(in_srgb,var(--accent)_22%,transparent)] bg-[color-mix(in_srgb,var(--ink)_35%,#12100e)] p-4 text-sm leading-relaxed shadow-[inset_0_1px_0_color-mix(in_srgb,var(--entry-parchment)_6%,transparent)]",
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
            <p className={cn("text-sm", playMuted)}>불러오는 중…</p>
          )}
        </CardContent>
      </Card>

      <Card
        className={cn(
          "overflow-hidden motion-safe:animate-[playRevealUp_0.6s_cubic-bezier(0.22,1,0.36,1)_both] motion-safe:[animation-delay:100ms]",
          playCard,
        )}
      >
        <CardHeader className={cn("space-y-1 pb-4", playCardHeader)}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--primary)_22%,transparent)] text-[color:var(--entry-accent-soft)] shadow-sm ring-1 ring-[color-mix(in_srgb,var(--primary)_30%,transparent)]">
                <Users className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <CardTitle className={cn("text-base font-semibold", playTitle)}>용의자 목록</CardTitle>
                <p className={cn("text-xs", playMuted)}>최종 보고에서 아래 인물 중 범인을 고릅니다.</p>
              </div>
            </div>
            {roster.length > 0 ? (
              <span className="shrink-0 rounded-full bg-[var(--primary)] px-2.5 py-0.5 text-xs font-semibold text-[var(--on-primary)] shadow-[0_0_12px_color-mix(in_srgb,var(--primary)_35%,transparent)]">
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
                  className="flex gap-3 rounded-lg border border-[color-mix(in_srgb,var(--accent)_24%,transparent)] bg-[color-mix(in_srgb,var(--ink)_28%,#141110)] p-3 shadow-sm"
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--primary)_25%,transparent)] text-sm font-bold text-[color:var(--entry-accent-soft)] ring-1 ring-[color-mix(in_srgb,var(--primary)_35%,transparent)]"
                    aria-hidden
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <FieldLabel className="normal-case tracking-normal !text-[color:var(--entry-parchment-muted)]">
                      이름
                    </FieldLabel>
                    <p className={cn("text-base font-semibold", playTitle)}>{s.name || "(이름 없음)"}</p>
                    {s.detail ? (
                      <>
                        <FieldLabel className={cn("mt-2 normal-case tracking-normal", playMuted)}>
                          프로필 · 알리바이 등
                        </FieldLabel>
                        <p className={cn("whitespace-pre-wrap text-sm leading-relaxed", playTitle)}>
                          {s.detail}
                        </p>
                      </>
                    ) : (
                      <p className={cn("text-xs italic", playMuted)}>추가 설명 없음</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p
              className={cn(
                "rounded-md border border-dashed border-[color-mix(in_srgb,var(--primary)_28%,transparent)] bg-[color-mix(in_srgb,var(--mystery)_40%,#141110)] px-4 py-6 text-center text-sm",
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
