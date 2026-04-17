"use client";

import type { UseQueryResult } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { getCharacterById, SessionDetailsRow } from "@/lib/api/play";
import { getCharacterAlibiSections, parseCharacterAlibi } from "@/lib/character-alibi";
import { getScenarioIncidentSections, parseScenarioIncident } from "@/lib/scenario-incident";

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
  const incident = parseScenarioIncident(sessionQuery.data?.scenarios?.incident);
  const incidentSections = incident ? getScenarioIncidentSections(incident) : [];
  const alibi = parseCharacterAlibi(data?.alibi);
  const alibiSections = alibi ? getCharacterAlibiSections(alibi) : [];

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      <Card>
        <CardHeader>
          <CardTitle>Session Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data ? (
            <div className="rounded-md border border-[var(--border)] bg-[rgba(15,17,19,0.35)] p-3 text-sm text-[var(--foreground)]">
              <p className="font-semibold text-[var(--accent)]">{characterName ?? data.name}</p>
              <p className="text-xs text-[var(--muted-foreground)]">직책: {data.role ?? "정보 없음"}</p>
              <p className="text-xs text-[var(--muted-foreground)]">정체: {data.is_culprit ? "범인" : "용의자"}</p>
              {alibiSections.length > 0 ? (
                <div className="mt-3 space-y-3">
                  {alibiSections.map((section) => (
                    <section key={section.key} className="space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
                        {section.label}
                      </p>
                      <div className="space-y-2">
                        {section.entries.map((entry, index) => (
                          <div
                            key={`${section.key}-${index}`}
                            className="rounded-md border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-2"
                          >
                            <p className="text-[11px] text-[var(--muted-foreground)]">시간</p>
                            <p className="text-xs text-[var(--foreground)]">{entry.time ?? "정보 없음"}</p>
                            <p className="mt-2 text-[11px] text-[var(--muted-foreground)]">행동</p>
                            <p className="text-xs text-[var(--foreground)]">{entry.behavior ?? "정보 없음"}</p>
                            <p className="mt-2 text-[11px] text-[var(--muted-foreground)]">위치</p>
                            <p className="text-xs text-[var(--foreground)]">{entry.location ?? "정보 없음"}</p>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              ) : null}
              {data.information ? (
                <p className="mt-2 text-xs text-[var(--foreground)]">Information: {JSON.stringify(data.information)}</p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)]">닉네임 설정 후 입장하면 캐릭터 정보가 표시됩니다.</p>
          )}
          {message ? <p className="text-xs text-[var(--foreground)]">{message}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scenario Briefing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sessionQuery.data ? (
            <>
              <p className="rounded-md border border-[var(--border)] bg-[rgba(15,17,19,0.35)] p-3 text-sm text-[var(--foreground)]">
                {sessionQuery.data.scenarios?.description ?? "No scenario description."}
              </p>
              <div className="space-y-3 rounded-md border border-[var(--border)] bg-[rgba(15,17,19,0.35)] p-3 text-sm text-[var(--foreground)]">
                {incidentSections.length > 0 ? (
                  incidentSections.map((section) => (
                    <section key={section.key} className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
                        {section.label}
                      </p>
                      <div className="space-y-1.5">
                        {section.fields.map((field) => (
                          <div
                            key={`${section.key}-${field.key}`}
                            className="rounded-md border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-2"
                          >
                            <p className="text-[11px] text-[var(--muted-foreground)]">{field.label}</p>
                            <p className="mt-1 text-sm text-[var(--foreground)]">{field.value}</p>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))
                ) : (
                  <p>No incident information.</p>
                )}
              </div>
            </>
          ) : (
            <p className="rounded-md border border-dashed border-[var(--border)] p-3 text-xs text-[var(--muted-foreground)]">
              Join with session code to access scenario details.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
