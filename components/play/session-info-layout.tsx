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

function FieldLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--accent)]",
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
      <Card className="overflow-hidden border-[var(--border)] shadow-[var(--elevation-sm)]">
        <CardHeader className="space-y-1 border-b border-[var(--border)]/80 bg-[var(--tint-accent-weak)] pb-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--surface)] text-[var(--accent)] shadow-sm">
              <FileText className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <CardTitle className="text-base font-semibold text-[var(--mystery)]">사건 파일</CardTitle>
              <p className="text-xs text-[var(--muted-foreground)]">브리핑에 공개되는 제목·개요입니다.</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          {sessionQuery.data ? (
            <>
              <div className="space-y-1.5">
                <FieldLabel>사건 제목</FieldLabel>
                <p className="text-lg font-semibold leading-snug text-[var(--foreground)]">
                  {sessionQuery.data.cases?.title ?? "제목 없음"}
                </p>
              </div>
              <div className="space-y-1.5">
                <FieldLabel>사건 개요 · 의뢰 내용</FieldLabel>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-4 text-sm leading-relaxed text-[var(--foreground)] shadow-[var(--input-inset)]">
                  <p className="whitespace-pre-wrap">
                    {sessionQuery.data.cases?.description ?? "설명이 없습니다."}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)]">불러오는 중…</p>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-[var(--border)] shadow-[var(--elevation-sm)]">
        <CardHeader className="space-y-1 border-b border-[var(--border)]/80 bg-[var(--tint-accent-weak)] pb-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--surface)] text-[var(--accent)] shadow-sm">
                <Users className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <CardTitle className="text-base font-semibold text-[var(--mystery)]">용의자 목록</CardTitle>
                <p className="text-xs text-[var(--muted-foreground)]">
                  최종 보고에서 아래 인물 중 범인을 고릅니다.
                </p>
              </div>
            </div>
            {roster.length > 0 ? (
              <span className="shrink-0 rounded-full bg-[var(--primary)] px-2.5 py-0.5 text-xs font-semibold text-[var(--on-primary)]">
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
                  className="flex gap-3 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-3 shadow-sm"
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--tint-accent-medium)] text-sm font-bold text-[var(--mystery)]"
                    aria-hidden
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <FieldLabel className="normal-case tracking-normal text-[var(--muted-foreground)]">
                      이름
                    </FieldLabel>
                    <p className="text-base font-semibold text-[var(--mystery)]">{s.name || "(이름 없음)"}</p>
                    {s.detail ? (
                      <>
                        <FieldLabel className="mt-2 normal-case tracking-normal text-[var(--muted-foreground)]">
                          프로필 · 알리바이 등
                        </FieldLabel>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--foreground)]">
                          {s.detail}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs italic text-[var(--muted-foreground)]">추가 설명 없음</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-md border border-dashed border-[var(--border)] bg-[var(--tint-accent-weak)] px-4 py-6 text-center text-sm text-[var(--muted-foreground)]">
              지도교사가 이 사건에 용의자 정보를 넣지 않았습니다.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
