"use client";

import type { UseQueryResult } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SessionDetailsRow } from "@/lib/api/play";
import { legacySuspectProfilesPlainText, parseSuspectRosterFromCase } from "@/lib/suspects";

type SessionInfoLayoutProps = {
  sessionQuery: UseQueryResult<SessionDetailsRow, Error>;
};

/**
 * 1단계(브리핑): 사건 개요 + 용의자(또는 레거시 텍스트)
 */
export function SessionInfoLayout({ sessionQuery }: SessionInfoLayoutProps) {
  const cases = sessionQuery.data?.cases;
  const roster = parseSuspectRosterFromCase(cases?.suspect_roster);
  const legacyText = legacySuspectProfilesPlainText(cases?.suspect_profiles);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>사건 개요</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sessionQuery.data ? (
            <>
              <p className="text-sm font-medium text-[var(--foreground)]">
                {sessionQuery.data.cases?.title ?? "제목 없음"}
              </p>
              <p className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 text-sm whitespace-pre-wrap text-[var(--foreground)]">
                {sessionQuery.data.cases?.description ?? "설명이 없습니다."}
              </p>
            </>
          ) : (
            <p className="text-xs text-[var(--muted-foreground)]">불러오는 중…</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>용의자</CardTitle>
        </CardHeader>
        <CardContent>
          {roster.length > 0 ? (
            <ul className="space-y-3 text-sm text-[var(--foreground)]">
              {roster.map((s) => (
                <li key={s.id} className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-2">
                  <p className="font-medium text-[var(--mystery)]">{s.name || "(이름 없음)"}</p>
                  {s.detail ? (
                    <p className="mt-1 whitespace-pre-wrap text-xs text-[var(--muted-foreground)]">{s.detail}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : legacyText ? (
            <p className="whitespace-pre-wrap text-sm text-[var(--foreground)]">{legacyText}</p>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)]">
              (지도교사가 사건에 용의자 정보를 넣지 않았습니다.)
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
