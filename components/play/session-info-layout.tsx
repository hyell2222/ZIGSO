"use client";

import type { UseQueryResult } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { getCharacterById, SessionDetailsRow } from "@/lib/api/play";

type CharacterRow = Awaited<ReturnType<typeof getCharacterById>>;

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
          <CardTitle>Session Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data ? (
            <div className="rounded-md border border-slate-800 p-3 text-sm text-slate-200">
              <p className="font-semibold text-cyan-300">{characterName ?? data.name}</p>
              <p className="text-xs text-slate-400">Role: {data.role ?? "Unknown role"}</p>
              {data.alibi ? <p className="mt-2 text-xs text-slate-300">Alibi: {data.alibi}</p> : null}
              {data.motive ? (
                <p className="mt-2 text-xs text-slate-300">Motive: {JSON.stringify(data.motive)}</p>
              ) : null}
              {data.information ? (
                <p className="mt-2 text-xs text-slate-300">Information: {JSON.stringify(data.information)}</p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-slate-400">닉네임 설정 후 입장하면 캐릭터 정보가 표시됩니다.</p>
          )}
          {message ? <p className="text-xs text-slate-300">{message}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scenario Briefing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sessionQuery.data ? (
            <>
              <p className="rounded-md border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-200">
                {sessionQuery.data.scenarios?.description ?? "No scenario description."}
              </p>
              <p className="rounded-md border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-200">
                {sessionQuery.data.scenarios?.incident
                  ? JSON.stringify(sessionQuery.data.scenarios.incident)
                  : "No incident information."}
              </p>
            </>
          ) : (
            <p className="rounded-md border border-dashed border-slate-700 p-3 text-xs text-slate-400">
              Join with session code to access scenario details.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
