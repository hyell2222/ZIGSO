"use client";

import { MapPin } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

import {
  FinalReportFields,
  FinalReportSubmittedBanner,
  type FinalReportFieldValues,
} from "@/components/play/final-report-fields";
import { InvestigationMapShell } from "@/components/play/investigation-map-shell";
import {
  PLAY_PAGE_BLACK_BG,
  PlayAtmosphere,
  playPhaseHeaderChromeInner,
  playPhaseHeaderChromeShell,
  playLoaderRegion,
  playSurfaceCool,
  playSurfacePanel,
} from "@/components/play/play-atmosphere";
import { PlayHeaderTeamPlace } from "@/components/play/play-header-team-place";
import { PlayPhaseHeader } from "@/components/play/play-phase-header";
import { SessionInfoLayout } from "@/components/play/session-info-layout";
import { WaitingLobbyBlock } from "@/components/play/waiting-lobby-block";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isCulpritCorrect } from "@/lib/report-compare";
import { validateFinalReportEnglishNarratives } from "@/lib/report-english";
import {
  findSuspectName,
  parseSuspectRosterFromCase,
  type SuspectEntry,
} from "@/lib/suspects";
import type {
  CaseClueRow,
  CaseLocationRow,
  CaseRecord,
} from "@/lib/api/cases";
import type { CasePhase } from "@/lib/api/cases";
import type {
  CaseClueForMap,
  CaseLocationForMap,
} from "@/lib/api/play";
import {
  SANDBOX_JOIN_CODE,
  type SandboxPlayer,
  type SandboxTeam,
} from "@/lib/sandbox/state";
import { cn } from "@/lib/utils";

type SandboxStudentPanelProps = {
  caseRecord: CaseRecord;
  locations: CaseLocationRow[];
  clues: CaseClueRow[];
  phase: CasePhase;
  teams: SandboxTeam[];
  players: SandboxPlayer[];
  /** 학생 화면에서 join 한 실제 접속자 닉네임 (없으면 join 게이트 표시) */
  realStudentNickname: string | null;
  onJoinAsStudent: (nickname: string) => void;
  onLeaveAsStudent: () => void;
  onTeamCluesFound: (teamId: string, clueIds: string[]) => void;
  onSubmitReport: (
    playerId: string,
    report: {
      suspectId: string;
      method: string;
      motive: string;
      decisiveClue: string;
    },
  ) => void;
};

/**
 * 시뮬레이션 학생 화면 — `app/play/session/page.tsx` 외관과 맞춥니다.
 * 단서 수집 단계에만 장소별 탭을 두어 장소 지도를 전환해서 볼 수 있습니다.
 *
 * 실제 플레이와 동일하게, 첫 진입 시에는 참가 코드(`SANDBOX` 고정·읽기 전용) +
 * 닉네임 입력 화면을 거친 뒤에야 본문 시뮬레이션이 노출됩니다.
 */
export function SandboxStudentPanel({
  caseRecord,
  locations,
  clues,
  phase,
  teams,
  players,
  realStudentNickname,
  onJoinAsStudent,
  onLeaveAsStudent,
  onTeamCluesFound,
  onSubmitReport,
}: SandboxStudentPanelProps) {
  void onLeaveAsStudent;

  /** 참가 학생(실제 접속) 우선, 없으면 배정 결과 첫 명 — 팀 고정 관점 */
  const primaryPlayer = useMemo<SandboxPlayer | null>(() => {
    if (!players.length || !teams.length) return null;
    const real = players.find((p) => p.isReal);
    return real ?? players[0]!;
  }, [players, teams]);

  const primaryTeam = useMemo<SandboxTeam | null>(() => {
    if (!primaryPlayer) return null;
    return teams.find((t) => t.id === primaryPlayer.teamId) ?? null;
  }, [teams, primaryPlayer]);

  /** 단서 수집에서만 사용자가 선택한 조사 장소(지도) */
  const [investigationPreviewLocationId, setInvestigationPreviewLocationId] =
    useState<string | null>(null);

  const mapLocationId = useMemo(() => {
    if (phase !== "investigation") return null;
    if (!locations.length) return null;
    if (
      investigationPreviewLocationId &&
      locations.some((l) => l.id === investigationPreviewLocationId)
    ) {
      return investigationPreviewLocationId;
    }
    return primaryPlayer?.locationId ?? locations[0]!.id;
  }, [
    phase,
    locations,
    investigationPreviewLocationId,
    primaryPlayer?.locationId,
  ]);

  const hasJoined = Boolean(realStudentNickname);

  const showInvestigationPlaceTabs =
    phase === "investigation" &&
    Boolean(primaryTeam) &&
    locations.length > 1;

  if (!hasJoined) {
    return <SandboxJoinGate onJoin={onJoinAsStudent} />;
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-[var(--background)]">
      {showInvestigationPlaceTabs ? (
        <SandboxInvestigationPlaceTabBar
          locations={locations}
          activeLocationId={mapLocationId}
          nickname={primaryPlayer?.nickname ?? realStudentNickname}
          onLocationChange={setInvestigationPreviewLocationId}
        />
      ) : null}

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <SandboxStudentBody
          caseRecord={caseRecord}
          locations={locations}
          clues={clues}
          phase={phase}
          joinedNickname={realStudentNickname ?? ""}
          perspectivePlayer={primaryPlayer}
          perspectiveTeam={primaryTeam}
          investigationMapLocationId={mapLocationId}
          onTeamCluesFound={onTeamCluesFound}
          onSubmitReport={onSubmitReport}
        />
      </div>
    </div>
  );
}

function SandboxJoinGate({ onJoin }: { onJoin: (nickname: string) => void }) {
  const [nickname, setNickname] = useState("");
  const trimmed = nickname.trim();
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!trimmed) return;
    onJoin(trimmed);
  };
  return (
    <PlayAtmosphere variant="contained">
      <div className="flex h-full min-h-0 flex-col">
        <main className="flex flex-1 items-center justify-center px-3 py-4 sm:px-4 sm:py-5">
          <div
            className={cn(
              "w-full max-w-md p-4 motion-safe:animate-[playModalRise_0.55s_cubic-bezier(0.22,1,0.36,1)_both] sm:p-5",
              playSurfacePanel,
            )}
          >
            <h3 className="text-base font-semibold text-[var(--foreground)] sm:text-lg">
              참가 인증
            </h3>
            <form className="mt-3 space-y-3 sm:mt-4 sm:space-y-4" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="sandbox-join-code"
                  className="mb-1.5 block text-xs font-medium text-[var(--primary)]"
                >
                  참가 코드
                </label>
                <Input
                  id="sandbox-join-code"
                  value={SANDBOX_JOIN_CODE}
                  readOnly
                  aria-readonly
                  tabIndex={-1}
                  autoComplete="off"
                  spellCheck={false}
                  className="h-11 cursor-default text-sm tracking-[0.08em] text-[var(--muted-foreground)]"
                />
              </div>
              <div>
                <label
                  htmlFor="sandbox-join-nickname"
                  className="mb-1.5 block text-xs font-medium text-[var(--primary)]"
                >
                  닉네임
                </label>
                <Input
                  id="sandbox-join-nickname"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="닉네임을 입력하세요"
                  autoComplete="off"
                  spellCheck={false}
                  required
                  autoFocus
                  className="h-11 text-sm tracking-[0.06em]"
                />
              </div>
              <Button
                type="submit"
                size="lg"
                className="h-11 w-full text-sm"
                disabled={!trimmed}
              >
                참가하기
              </Button>
            </form>
          </div>
        </main>
      </div>
    </PlayAtmosphere>
  );
}

function SandboxInvestigationPlaceTabBar({
  locations,
  activeLocationId,
  nickname,
  onLocationChange,
}: {
  locations: CaseLocationRow[];
  activeLocationId: string | null;
  nickname: string | null;
  onLocationChange: (id: string) => void;
}) {
  return (
    <div className="border-b border-[var(--border)] bg-[var(--surface)] px-3 py-2">
      <div className="flex items-center gap-2 text-[11px] text-[var(--muted-foreground)]">
        <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" aria-hidden />
        <span className="font-semibold uppercase tracking-wider text-[var(--accent)]">
          장소별 지도
        </span>
        {nickname ? (
          <span className="ml-auto truncate font-mono text-[11px] text-[var(--foreground)]">
            {nickname}
          </span>
        ) : null}
      </div>
      <div className="mt-2">
        <TabRow
          label="장소"
          icon={<MapPin className="h-3 w-3 shrink-0" aria-hidden />}
          items={locations.map((l) => ({
            id: l.id,
            label: l.name?.trim() || "장소",
          }))}
          activeId={activeLocationId}
          onChange={onLocationChange}
        />
      </div>
    </div>
  );
}

function TabRow({
  label,
  icon,
  items,
  activeId,
  onChange,
}: {
  label: string;
  icon?: React.ReactNode;
  items: { id: string; label: string }[];
  activeId: string | null;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
        {label}
      </span>
      <div
        role="tablist"
        className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto pb-0.5"
      >
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <button
              key={item.id}
              role="tab"
              aria-selected={active}
              onClick={() => onChange(item.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition",
                active
                  ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--background)] shadow-sm"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:border-[var(--accent)]/60 hover:bg-[var(--tint-accent-weak)]",
              )}
            >
              {icon}
              <span className="max-w-[10rem] truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SandboxStudentBody({
  caseRecord,
  locations,
  clues,
  phase,
  joinedNickname,
  perspectivePlayer,
  perspectiveTeam,
  investigationMapLocationId,
  onTeamCluesFound,
  onSubmitReport,
}: {
  caseRecord: CaseRecord;
  locations: CaseLocationRow[];
  clues: CaseClueRow[];
  phase: CasePhase;
  joinedNickname: string;
  perspectivePlayer: SandboxPlayer | null;
  perspectiveTeam: SandboxTeam | null;
  investigationMapLocationId: string | null;
  onTeamCluesFound: (teamId: string, clueIds: string[]) => void;
  onSubmitReport: (
    playerId: string,
    report: {
      suspectId: string;
      method: string;
      motive: string;
      decisiveClue: string;
    },
  ) => void;
}) {
  const roster = useMemo(
    () => parseSuspectRosterFromCase(caseRecord.suspect_roster),
    [caseRecord.suspect_roster],
  );

  const sessionLayoutCase = useMemo(
    () => ({
      title: caseRecord.title,
      description: caseRecord.description,
      suspect_roster: caseRecord.suspect_roster,
    }),
    [caseRecord.title, caseRecord.description, caseRecord.suspect_roster],
  );

  const activeLocation = useMemo(
    () =>
      perspectivePlayer
        ? locations.find((l) => l.id === perspectivePlayer.locationId) ?? null
        : null,
    [perspectivePlayer, locations],
  );

  /** 단서 수집: 선택한 장소 이름 / 그 외: 배정 장소 이름 */
  const mapPreviewLocation =
    phase === "investigation" && investigationMapLocationId != null
      ? locations.find((l) => l.id === investigationMapLocationId)
      : null;

  const teamName = perspectiveTeam?.name ?? null;
  const placeNameForHeader =
    phase === "investigation" && mapPreviewLocation
      ? mapPreviewLocation.name ?? null
      : activeLocation?.name ?? null;

  const noAssignment = !perspectivePlayer || !perspectiveTeam;

  if (phase === "waiting") {
    return (
      <PlayAtmosphere variant="contained">
        <div className="flex h-full flex-col">
          <main className={playLoaderRegion}>
            <WaitingLobbyBlock
              joinCode={SANDBOX_JOIN_CODE}
              nickname={joinedNickname || "가상 학생"}
              caseTitle={caseRecord.title?.trim() || "제목 없는 사건"}
              state="waiting"
              compact
            />
          </main>
        </div>
      </PlayAtmosphere>
    );
  }

  if (phase === "session_end") {
    return (
      <div
        className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center"
        style={PLAY_PAGE_BLACK_BG}
      >
        <p className="text-base font-semibold text-[var(--entry-parchment)]">
          종료
        </p>
        <p className="max-w-md text-xs text-[color-mix(in_srgb,var(--entry-parchment)_72%,var(--entry-parchment-muted))]">
          시뮬레이션이 끝났습니다. 실제 학생 화면에서는 이 시점에 자동으로 메인
          화면으로 이동합니다.
        </p>
      </div>
    );
  }

  if (phase === "investigation") {
    if (
      noAssignment ||
      !perspectivePlayer ||
      !perspectiveTeam ||
      !investigationMapLocationId
    ) {
      return (
        <PlayAtmosphere variant="contained">
          <div className="flex h-full flex-col">
            <main className={playLoaderRegion}>
              <p className="text-xs text-[var(--muted-foreground)]">
                보여줄 가상 플레이어가 없습니다.
              </p>
            </main>
          </div>
        </PlayAtmosphere>
      );
    }
    const locNameDisplay =
      mapPreviewLocation?.name?.trim() || "장소";
    return (
      <SandboxInvestigationView
        key={`${perspectiveTeam.id}:${investigationMapLocationId}`}
        locations={locations}
        clues={clues}
        activeLocationId={investigationMapLocationId}
        teamFoundClueIds={perspectiveTeam.foundClueIds}
        onClueIdsChange={(ids) => onTeamCluesFound(perspectiveTeam.id, ids)}
        teamName={teamName}
        placeName={locNameDisplay}
      />
    );
  }

  if (phase === "briefing") {
    return (
      <PlayAtmosphere variant="contained">
        <div className="flex h-full min-h-0 flex-col">
          <header className={playPhaseHeaderChromeShell}>
            <div className={playPhaseHeaderChromeInner}>
              <PlayPhaseHeader
                phase={1}
                title="사건 파악"
                description="우측에서 팀과 담당 조사 장소를 확인한 뒤, 같은 팀끼리 모여 앉아 사건 파일을 확인하세요."
                compact
                rightSlot={
                  <PlayHeaderTeamPlace
                    teamName={teamName}
                    placeName={placeNameForHeader}
                    pending={noAssignment}
                    compact
                  />
                }
              />
            </div>
          </header>
          <main className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col space-y-3 overflow-y-auto px-3 py-4 pb-[max(2rem,env(safe-area-inset-bottom,0px))] sm:space-y-4 sm:px-4 sm:py-5 md:px-6">
            <section className="flex min-h-[min(12rem,40dvh)] flex-1 flex-col motion-safe:animate-[playRevealUp_0.6s_cubic-bezier(0.22,1,0.36,1)_both] motion-safe:[animation-delay:80ms] md:min-h-[min(14rem,44dvh)]">
              <SessionInfoLayout
                loading={false}
                caseData={sessionLayoutCase}
                compact
              />
            </section>
          </main>
        </div>
      </PlayAtmosphere>
    );
  }

  // final_report
  if (!perspectivePlayer || !perspectiveTeam) {
    return (
      <PlayAtmosphere variant="contained">
        <div className="flex h-full flex-col">
          <main className={playLoaderRegion}>
            <p className="text-xs text-[var(--muted-foreground)]">
              보여줄 가상 플레이어가 없습니다.
            </p>
          </main>
        </div>
      </PlayAtmosphere>
    );
  }
  return (
    <PlayAtmosphere variant="contained">
      <div className="flex h-full min-h-0 flex-col">
        <header className={playPhaseHeaderChromeShell}>
          <div className={playPhaseHeaderChromeInner}>
            <PlayPhaseHeader
              phase={3}
              title="범인 지목"
              description="각자 한 번씩 제출합니다. 범인은 등록된 용의자 중에서만 선택할 수 있으며, 수법·동기·결정적 단서는 영어로만 작성합니다."
              compact
              rightSlot={
                <PlayHeaderTeamPlace
                  teamName={teamName}
                  placeName={placeNameForHeader}
                  pending={noAssignment}
                  compact
                />
              }
            />
          </div>
        </header>
        <main className="mx-auto w-full max-w-2xl flex-1 space-y-4 overflow-y-auto px-3 py-4 pb-[max(2rem,env(safe-area-inset-bottom,0px))] sm:space-y-5 sm:px-4 sm:py-5 md:max-w-3xl md:px-6">
          <div
            className={cn(
              "overflow-hidden px-4 pb-4 pt-4 motion-safe:animate-[playRevealUp_0.6s_cubic-bezier(0.22,1,0.36,1)_both] motion-safe:[animation-delay:60ms] sm:px-5 sm:pb-6 sm:pt-6",
              playSurfaceCool,
            )}
          >
            <SandboxFinalReportContent
              key={perspectivePlayer.id}
              player={perspectivePlayer}
              team={perspectiveTeam}
              roster={roster}
              answerSuspectId={caseRecord.answer_suspect_id ?? null}
              onSubmit={(values) => onSubmitReport(perspectivePlayer.id, values)}
            />
          </div>
        </main>
      </div>
    </PlayAtmosphere>
  );
}

function SandboxInvestigationView({
  locations,
  clues,
  activeLocationId,
  teamFoundClueIds,
  onClueIdsChange,
  teamName,
  placeName,
}: {
  locations: CaseLocationRow[];
  clues: CaseClueRow[];
  activeLocationId: string;
  teamFoundClueIds: string[];
  onClueIdsChange: (ids: string[]) => void;
  teamName: string | null;
  placeName: string | null;
}) {
  const filteredLocations: CaseLocationForMap[] = useMemo(
    () =>
      locations
        .filter((l) => l.id === activeLocationId)
        .map((l) => ({ id: l.id, name: l.name })),
    [locations, activeLocationId],
  );
  const filteredClues: CaseClueForMap[] = useMemo(
    () =>
      clues
        .filter((c) => c.location_id === activeLocationId)
        .map((c) => ({
          id: c.id,
          name: c.name,
          content: c.content,
          location_id: c.location_id,
          props: c.props,
        })),
    [clues, activeLocationId],
  );

  return (
    <InvestigationMapShell
      variant="contained"
      compactHeader
      mapLoading={false}
      mapError={null}
      locations={filteredLocations}
      clues={filteredClues}
      discoveredClueIds={teamFoundClueIds}
      onDiscoveredClueIdsChange={onClueIdsChange}
      headerRightSlot={
        <PlayHeaderTeamPlace
          teamName={teamName}
          placeName={placeName}
          compact
        />
      }
    />
  );
}

function SandboxFinalReportContent({
  player,
  team,
  roster,
  answerSuspectId,
  onSubmit,
}: {
  player: SandboxPlayer;
  team: SandboxTeam;
  roster: SuspectEntry[];
  answerSuspectId: string | null;
  onSubmit: (values: FinalReportFieldValues) => void;
}) {
  const [values, setValues] = useState<FinalReportFieldValues>({
    suspectId: "",
    method: "",
    motive: "",
    decisiveClue: "",
  });
  const [message, setMessage] = useState<string | null>(null);

  const ownReport = player.report;
  const ownSuspectName = findSuspectName(roster, ownReport?.suspectId ?? null);
  const trueName = findSuspectName(roster, answerSuspectId);
  const correct = ownReport
    ? isCulpritCorrect(answerSuspectId, ownReport.suspectId)
    : false;

  if (ownReport) {
    return (
      <div className="space-y-5 text-sm text-[var(--foreground)]">
        <FinalReportSubmittedBanner
          submittedAt={ownReport.submittedAt}
          description={`지목한 범인: ${ownSuspectName ?? ownReport.suspectId}`}
        />
        {answerSuspectId ? (
          <div
            className={
              "rounded-lg border-2 p-4 " +
              (correct
                ? "border-[color-mix(in_srgb,var(--primary)_35%,var(--border))] bg-[var(--tint-accent-weak)]"
                : "border-[var(--panel-warn-border)] bg-[var(--panel-warn-bg)]")
            }
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)]">
              범인 검거 결과
            </p>
            <p className="mt-2 text-base font-bold text-[var(--foreground)] sm:text-lg">
              {correct ? "검거 성공" : "검거 실패"}
            </p>
            <dl className="mt-3 grid gap-2 text-sm">
              <div className="flex flex-wrap justify-between gap-2 border-t border-[var(--border)] pt-2">
                <dt className="text-[var(--muted-foreground)]">사건 정답</dt>
                <dd className="font-semibold text-[var(--foreground)]">
                  {trueName ?? "—"}
                </dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-[var(--muted-foreground)]">팀</dt>
                <dd className="font-mono font-semibold text-[var(--foreground)]">
                  {team.name}
                </dd>
              </div>
            </dl>
          </div>
        ) : (
          <p className="text-xs text-[var(--muted-foreground)]">
            이 사건에는 정답 범인이 등록되지 않아 검거 여부를 표시하지 않습니다.
          </p>
        )}
      </div>
    );
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (
      !values.suspectId.trim() ||
      !values.method.trim() ||
      !values.motive.trim() ||
      !values.decisiveClue.trim()
    ) {
      setMessage("용의자 선택과 나머지 항목을 모두 입력해 주세요.");
      return;
    }
    const englishErr = validateFinalReportEnglishNarratives(values);
    if (englishErr) {
      setMessage(englishErr);
      return;
    }
    onSubmit(values);
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <p className="rounded-md border border-[var(--border)] bg-[var(--tint-accent-weak)] px-3 py-2 text-sm text-[var(--foreground)] shadow-[inset_var(--input-inset)]">
        팀원과 논의한 뒤{" "}
        <strong className="text-[var(--primary)]">한 번만</strong> 제출할 수
        있습니다. 아래 서술 칸은 <strong className="text-[var(--primary)]">영어로만</strong>{" "}
        작성합니다.
      </p>
      <FinalReportFields
        idPrefix={`sandbox-${player.id}`}
        values={values}
        suspectRoster={roster}
        onChange={setValues}
        emptyRosterEditFallback={
          <p className="rounded-md border border-[var(--panel-warn-border)] bg-[var(--panel-warn-bg)] px-3 py-2 text-sm text-[var(--foreground)]">
            이 사건에 용의자 목록이 없습니다.
          </p>
        }
      />
      {message ? (
        <p className="text-sm text-[var(--danger)]">{message}</p>
      ) : null}
      <Button
        type="submit"
        className="w-full"
        disabled={roster.length === 0}
      >
        범인 지목 제출
      </Button>
    </form>
  );
}

