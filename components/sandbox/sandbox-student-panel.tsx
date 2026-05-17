"use client";

import { FormEvent, useMemo, useState } from "react";

import { ExpertPhasePanel } from "@/components/play/expert-group-panel";
import { ActivityIntroductionLayout } from "@/components/play/overview-layout";
import { GroupPhasePanel } from "@/components/play/home-group-panel";
import {
  PlayAtmosphere,
  playLoaderRegion,
  playSurfacePanel,
} from "@/components/play/play-atmosphere";
import { PlayPhaseHeader } from "@/components/play/play-phase-header";
import { PlayHeaderGroupPlace } from "@/components/play/play-header-group-place";
import { WaitingLobbyBlock } from "@/components/play/waiting-lobby-block";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActivityPhase } from "@/lib/api/activities";
import type { ActivityPack } from "@/lib/activity-pack/types";
import type { GroupRow } from "@/lib/api/play";
import {
  SANDBOX_JOIN_CODE,
  SANDBOX_REAL_STUDENT_PLAYER_ID,
  type SandboxPlayer,
  type SandboxGroup,
} from "@/lib/sandbox/state";
import { cn } from "@/lib/utils";

type Props = {
  activityTitle: string | null;
  description: string | null;
  pack: ActivityPack;
  phase: ActivityPhase;
  groups: SandboxGroup[];
  players: SandboxPlayer[];
  realStudentNickname: string | null;
  onJoinAsStudent: (nickname: string) => void;
  onLeaveAsStudent: () => void;
  onAcquire: (
    groupId: string,
    itemId: string,
    answer: string,
    hintStage: 1 | 2 | 3 | 4 | 5,
  ) => void;
  onCompleteTask: (groupId: string, taskId: string, steps: string[]) => void;
  onCompleteActivity: (groupId: string) => void;
};

export function SandboxStudentPanel({
  activityTitle,
  description,
  pack,
  phase,
  groups,
  players,
  realStudentNickname,
  onJoinAsStudent,
  onLeaveAsStudent,
  onAcquire,
  onCompleteTask,
  onCompleteActivity,
}: Props) {
  void onLeaveAsStudent;
  const [nickname, setNickname] = useState("");
  const [joined, setJoined] = useState(Boolean(realStudentNickname?.trim()));

  const primaryPlayer = useMemo(() => {
    if (!players.length) return null;
    return players.find((p) => p.isReal) ?? players[0]!;
  }, [players]);

  const group = useMemo(
    () => (primaryPlayer ? groups.find((t) => t.id === primaryPlayer.groupId) ?? null : null),
    [primaryPlayer, groups],
  );

  const groupRow: GroupRow | null = useMemo(() => {
    if (!group) return null;
    return {
      id: group.id,
      session_id: null,
      name: group.name,
      acquired_items: group.acquired_items,
      completed_tasks: group.completed_tasks,
      completed_at: group.completed_at,
    };
  }, [group]);

  const acquiredIds = useMemo(
    () => new Set(group?.acquired_items.map((a) => a.itemId) ?? []),
    [group],
  );

  const roleLabel =
    pack.items.find((i) => i.id === primaryPlayer?.itemId)?.name ??
    primaryPlayer?.itemId ??
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
            sessionTitle={activityTitle}
            state="waiting"
          />
        </section>
      </PlayAtmosphere>
    );
  }

  if (phase === "expert_group" && primaryPlayer && group) {
    return (
      <SandboxExpertBridge
        pack={pack}
        playerId={primaryPlayer.id}
        groupId={group.id}
        groupName={group.name}
        itemId={primaryPlayer.itemId}
        acquiredIds={acquiredIds}
        onAcquire={(answer, hintStage) =>
          onAcquire(group.id, primaryPlayer.itemId, answer, hintStage)
        }
      />
    );
  }

  if (phase === "home_group" && group && groupRow) {
    return (
      <SandboxGroupBridge
        pack={pack}
        group={groupRow}
        groupName={group.name}
        onCompleteTask={(taskId, steps) => onCompleteTask(group.id, taskId, steps)}
        onCompleteActivity={() => onCompleteActivity(group.id)}
      />
    );
  }

  if (phase === "overview") {
    return (
      <PlayAtmosphere>
        <div className="flex min-h-0 flex-1 flex-col">
          <header className="border-b border-[var(--border)] px-4 py-3">
            <PlayPhaseHeader
              phase={1}
              title="활동 브리핑"
              description="팀과 전문 재료를 확인하세요."
              rightSlot={
                <PlayHeaderGroupPlace
                  groupName={group?.name ?? null}
                  placeName={roleLabel}
                  placeLabel="전문 재료"
                />
              }
            />
          </header>
          <main className="flex-1 overflow-y-auto px-4 py-6">
            <ActivityIntroductionLayout
              loading={false}
              title={activityTitle}
              description={description}
              activityPack={pack}
            />
          </main>
        </div>
      </PlayAtmosphere>
    );
  }

  return (
    <PlayAtmosphere>
      <main className="flex flex-1 items-center justify-center p-8 text-sm text-[var(--muted-foreground)]">
        {phase === "results" ? "시뮬레이션이 종료되었습니다." : "교사가 다음 단계로 진행할 때까지 기다려 주세요."}
      </main>
    </PlayAtmosphere>
  );
}

/** API 대신 샌드박스 콜백으로 재료 획득 */
function SandboxExpertBridge({
  pack,
  playerId,
  groupId,
  groupName,
  itemId,
  acquiredIds,
  onAcquire,
}: {
  pack: ActivityPack;
  playerId: string;
  groupId: string;
  groupName: string;
  itemId: string;
  acquiredIds: Set<string>;
  onAcquire: (answer: string, hintStage: 1 | 2 | 3 | 4 | 5) => void;
}) {
  const [, bump] = useState(0);
  return (
    <ExpertPhasePanel
      pack={pack}
      playerId={playerId}
      groupId={groupId}
      groupName={groupName}
      itemId={itemId}
      acquiredItemIds={acquiredIds}
      onAcquired={() => bump((n) => n + 1)}
      sandboxAcquire={onAcquire}
    />
  );
}

function SandboxGroupBridge({
  pack,
  group,
  groupName,
  onCompleteTask,
  onCompleteActivity,
}: {
  pack: ActivityPack;
  group: GroupRow;
  groupName: string;
  onCompleteTask: (taskId: string, steps: string[]) => void;
  onCompleteActivity: () => void;
}) {
  const [, bump] = useState(0);
  return (
    <GroupPhasePanel
      pack={pack}
      group={group}
      groupName={groupName}
      onUpdate={() => bump((n) => n + 1)}
      sandboxCompleteTask={onCompleteTask}
      sandboxCompleteActivity={onCompleteActivity}
    />
  );
}
