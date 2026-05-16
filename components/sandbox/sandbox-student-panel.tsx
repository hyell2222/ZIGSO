"use client";

import { FormEvent, useMemo, useState } from "react";

import { IngredientExpertPanel } from "@/components/play/ingredient-expert-panel";
import { ScenarioBriefingLayout } from "@/components/play/scenario-briefing-layout";
import { TeamKitchenPanel } from "@/components/play/team-kitchen-panel";
import {
  PlayAtmosphere,
  playLoaderRegion,
  playSurfacePanel,
} from "@/components/play/play-atmosphere";
import { PlayPhaseHeader } from "@/components/play/play-phase-header";
import { PlayHeaderTeamPlace } from "@/components/play/play-header-team-place";
import { WaitingLobbyBlock } from "@/components/play/waiting-lobby-block";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SessionPhase } from "@/lib/api/lessons";
import type { ScenarioPack } from "@/lib/lunch/types";
import type { TeamRow } from "@/lib/api/play";
import {
  SANDBOX_JOIN_CODE,
  SANDBOX_REAL_STUDENT_PLAYER_ID,
  type SandboxPlayer,
  type SandboxTeam,
} from "@/lib/sandbox/state";
import { cn } from "@/lib/utils";

type Props = {
  lessonTitle: string | null;
  description: string | null;
  pack: ScenarioPack;
  phase: SessionPhase;
  teams: SandboxTeam[];
  players: SandboxPlayer[];
  realStudentNickname: string | null;
  onJoinAsStudent: (nickname: string) => void;
  onLeaveAsStudent: () => void;
  onAcquire: (
    teamId: string,
    ingredientId: string,
    answer: string,
    hintStage: 1 | 2 | 3 | 4 | 5,
  ) => void;
  onCompleteMenu: (teamId: string, menuId: string, steps: string[]) => void;
  onSubmitTray: (teamId: string) => void;
};

export function SandboxStudentPanel({
  lessonTitle,
  description,
  pack,
  phase,
  teams,
  players,
  realStudentNickname,
  onJoinAsStudent,
  onLeaveAsStudent,
  onAcquire,
  onCompleteMenu,
  onSubmitTray,
}: Props) {
  void onLeaveAsStudent;
  const [nickname, setNickname] = useState("");
  const [joined, setJoined] = useState(Boolean(realStudentNickname?.trim()));

  const primaryPlayer = useMemo(() => {
    if (!players.length) return null;
    return players.find((p) => p.isReal) ?? players[0]!;
  }, [players]);

  const team = useMemo(
    () => (primaryPlayer ? teams.find((t) => t.id === primaryPlayer.teamId) ?? null : null),
    [primaryPlayer, teams],
  );

  const teamRow: TeamRow | null = useMemo(() => {
    if (!team) return null;
    return {
      id: team.id,
      session_id: null,
      name: team.name,
      acquired_ingredients: team.acquired_ingredients,
      completed_menus: team.completed_menus,
      tray_submitted_at: team.tray_submitted_at,
    };
  }, [team]);

  const acquiredIds = useMemo(
    () => new Set(team?.acquired_ingredients.map((a) => a.ingredientId) ?? []),
    [team],
  );

  const ingredientLabel =
    pack.ingredients.find((i) => i.id === primaryPlayer?.ingredientId)?.name ??
    primaryPlayer?.ingredientId ??
    null;

  if (!joined && !realStudentNickname) {
    return (
      <PlayAtmosphere>
        <main className="flex min-h-0 flex-1 flex-col items-center justify-center p-4">
          <div className={cn("w-full max-w-md p-6", playSurfacePanel)}>
            <h3 className="text-lg font-semibold text-[var(--foreground)]">닉네임 설정</h3>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              참가 코드: <span className="font-mono text-[var(--primary)]">{SANDBOX_JOIN_CODE}</span>
            </p>
            <form
              className="mt-4 space-y-3"
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                const nick = nickname.trim();
                if (!nick) return;
                onJoinAsStudent(nick);
                setJoined(true);
              }}
            >
              <Input
                placeholder="닉네임"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                required
              />
              <Button type="submit" className="w-full">
                입장
              </Button>
            </form>
          </div>
        </main>
      </PlayAtmosphere>
    );
  }

  if (phase === "waiting") {
    return (
      <PlayAtmosphere>
        <section className={playLoaderRegion}>
          <WaitingLobbyBlock
            joinCode={SANDBOX_JOIN_CODE}
            nickname={realStudentNickname ?? nickname}
            sessionTitle={lessonTitle}
            state="waiting"
          />
        </section>
      </PlayAtmosphere>
    );
  }

  if (phase === "investigation" && primaryPlayer && team) {
    return (
      <SandboxIngredientBridge
        pack={pack}
        playerId={primaryPlayer.id}
        teamId={team.id}
        teamName={team.name}
        ingredientId={primaryPlayer.ingredientId}
        acquiredIds={acquiredIds}
        onAcquire={(answer, hintStage) =>
          onAcquire(team.id, primaryPlayer.ingredientId, answer, hintStage)
        }
      />
    );
  }

  if (phase === "final_report" && team && teamRow) {
    return (
      <SandboxKitchenBridge
        pack={pack}
        team={teamRow}
        teamName={team.name}
        onCompleteMenu={(menuId, steps) => onCompleteMenu(team.id, menuId, steps)}
        onSubmitTray={() => onSubmitTray(team.id)}
      />
    );
  }

  if (phase === "briefing") {
    return (
      <PlayAtmosphere>
        <div className="flex min-h-0 flex-1 flex-col">
          <header className="border-b border-[var(--border)] px-4 py-3">
            <PlayPhaseHeader
              phase={1}
              title="오늘의 급식 브리핑"
              description="팀과 전문 재료를 확인하세요."
              rightSlot={
                <PlayHeaderTeamPlace
                  teamName={team?.name ?? null}
                  placeName={ingredientLabel}
                  placeLabel="전문 재료"
                />
              }
            />
          </header>
          <main className="flex-1 overflow-y-auto px-4 py-6">
            <ScenarioBriefingLayout
              loading={false}
              title={lessonTitle}
              description={description}
              scenarioPack={pack}
            />
          </main>
        </div>
      </PlayAtmosphere>
    );
  }

  return (
    <PlayAtmosphere>
      <main className="flex flex-1 items-center justify-center p-8 text-sm text-[var(--muted-foreground)]">
        {phase === "session_end" ? "시뮬레이션이 종료되었습니다." : "교사가 다음 단계로 진행할 때까지 기다려 주세요."}
      </main>
    </PlayAtmosphere>
  );
}

/** API 대신 샌드박스 콜백으로 재료 획득 */
function SandboxIngredientBridge({
  pack,
  playerId,
  teamId,
  teamName,
  ingredientId,
  acquiredIds,
  onAcquire,
}: {
  pack: ScenarioPack;
  playerId: string;
  teamId: string;
  teamName: string;
  ingredientId: string;
  acquiredIds: Set<string>;
  onAcquire: (answer: string, hintStage: 1 | 2 | 3 | 4 | 5) => void;
}) {
  const [, bump] = useState(0);
  return (
    <IngredientExpertPanel
      pack={pack}
      playerId={playerId}
      teamId={teamId}
      teamName={teamName}
      ingredientId={ingredientId}
      acquiredIngredientIds={acquiredIds}
      onAcquired={() => bump((n) => n + 1)}
      sandboxAcquire={onAcquire}
    />
  );
}

function SandboxKitchenBridge({
  pack,
  team,
  teamName,
  onCompleteMenu,
  onSubmitTray,
}: {
  pack: ScenarioPack;
  team: TeamRow;
  teamName: string;
  onCompleteMenu: (menuId: string, steps: string[]) => void;
  onSubmitTray: () => void;
}) {
  const [, bump] = useState(0);
  return (
    <TeamKitchenPanel
      pack={pack}
      team={team}
      teamName={teamName}
      onUpdate={() => bump((n) => n + 1)}
      sandboxCompleteMenu={onCompleteMenu}
      sandboxSubmitTray={onSubmitTray}
    />
  );
}
