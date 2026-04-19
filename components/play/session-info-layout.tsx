"use client";

import type { UseQueryResult } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CharacterRow, SessionDetailsRow } from "@/lib/api/play";

type SessionInfoLayoutProps = {
  characterName: string | null;
  characterQuery: UseQueryResult<CharacterRow, Error>;
  sessionQuery: UseQueryResult<SessionDetailsRow, Error>;
  message: string | null;
};

export function SessionInfoLayout({
  characterName,
  characterQuery,
  sessionQuery,
  message,
}: SessionInfoLayoutProps) {
  const data = characterQuery.data;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      <Card>
        <CardHeader>
          <CardTitle>내 캐릭터</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data ? (
            <div className="rounded-md border border-[var(--border)] bg-[rgba(15,17,19,0.35)] p-3 text-sm text-[var(--foreground)]">
              <p className="font-semibold text-[var(--accent)]">{characterName ?? data.name}</p>
              <p className="text-xs text-[var(--muted-foreground)]">
                직책: {data.role ?? "정보 없음"}
              </p>
            </div>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)]">
              닉네임 설정 후 입장하면 캐릭터 정보가 표시됩니다.
            </p>
          )}
          {message ? <p className="text-xs text-[var(--foreground)]">{message}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>시나리오 브리핑</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sessionQuery.data ? (
            <>
              <p className="rounded-md border border-[var(--border)] bg-[rgba(15,17,19,0.35)] p-3 text-sm text-[var(--foreground)]">
                {sessionQuery.data.scenarios?.title ?? "제목 없음"}
              </p>
              <p className="rounded-md border border-[var(--border)] bg-[rgba(15,17,19,0.35)] p-3 text-sm whitespace-pre-wrap text-[var(--foreground)]">
                {sessionQuery.data.scenarios?.description ?? "시나리오 설명이 없습니다."}
              </p>
            </>
          ) : (
            <p className="rounded-md border border-dashed border-[var(--border)] p-3 text-xs text-[var(--muted-foreground)]">
              세션 코드로 입장하면 시나리오 정보가 표시됩니다.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
