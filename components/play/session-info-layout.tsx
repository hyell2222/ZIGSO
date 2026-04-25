"use client";

import type { UseQueryResult } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { clubRoleLabelKr } from "@/lib/club-role";
import type { PlayerWithPatrolRow, SessionDetailsRow } from "@/lib/api/play";
import { parseSuspectRosterFromCase } from "@/lib/suspects";

type SessionInfoLayoutProps = {
  zoneName: string | null;
  playerQuery: UseQueryResult<PlayerWithPatrolRow, Error>;
  sessionQuery: UseQueryResult<SessionDetailsRow, Error>;
  message: string | null;
};

/**
 * 1단계(브리핑): 부원 증(역할·구역) + 사건 개요 + 용의자 프로필
 */
export function SessionInfoLayout({
  zoneName,
  playerQuery,
  sessionQuery,
  message,
}: SessionInfoLayoutProps) {
  const data = playerQuery.data;
  const cases = sessionQuery.data?.cases;
  const roster = parseSuspectRosterFromCase(cases?.suspect_roster);
  const legacyText =
    typeof cases?.suspect_profiles === "string"
      ? cases.suspect_profiles.trim()
      : cases?.suspect_profiles != null
        ? JSON.stringify(cases.suspect_profiles).trim()
        : "";

  return (
    <div className="grid gap-4 lg:grid-cols-3">
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

      <Card className="lg:col-span-1">
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
              (교사가 시나리오에 용의자 정보를 넣지 않았습니다.)
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
