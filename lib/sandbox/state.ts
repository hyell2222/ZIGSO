/**
 * 시뮬레이션 모드 — 교사 혼자서 활동 흐름을 시연·검수하기 위한 in-memory 모델.
 */

import type { ActivityPhase, SessionStatus } from "@/lib/types";
import type { AcquiredItem, CompletedTask, ActivityPack } from "@/lib/activity-pack/types";
import { pickSandboxLobbyBotNicknames } from "@/lib/sandbox/waiting-nicknames";
import {
  HOST_SESSION_START_LABEL,
  hostSessionNextPhaseLabel,
} from "@/lib/teacher/host-session-labels";

export type SandboxGroup = {
  id: string;
  name: string;
  acquired_items: AcquiredItem[];
  completed_tasks: CompletedTask[];
  completed_at: string | null;
};

export type SandboxPlayer = {
  id: string;
  nickname: string;
  groupId: string;
  itemId: string;
  isReal?: boolean;
};

export type SandboxState = {
  phase: ActivityPhase;
  status: SessionStatus;
  groups: SandboxGroup[];
  players: SandboxPlayer[];
  realStudentNickname: string | null;
};

export const SANDBOX_REAL_STUDENT_PLAYER_ID = "sandbox-real-student";
export const SANDBOX_JOIN_CODE = "JIGSAW";

export type SandboxWaitingChip = {
  id: string;
  nickname: string;
  isReal?: boolean;
};

export function buildSandboxWaitingRoster(
  activityId: string,
  pack: ActivityPack,
  realStudentNickname: string | null,
): SandboxWaitingChip[] {
  const slotCount = Math.max(pack.items.length, pack.groupSize, 4);
  const bots = pickSandboxLobbyBotNicknames(activityId.trim() || "_").slice(0, slotCount);
  const out: SandboxWaitingChip[] = bots.map((nickname, i) => ({
    id: `sandbox-lobby-bot-${i}`,
    nickname,
  }));

  const realNick = realStudentNickname?.trim();
  if (realNick) {
    out.unshift({
      id: "sandbox-real-student-join",
      nickname: realNick,
      isReal: true,
    });
  }
  return out;
}

export function groupLabel(index: number) {
  const A = "A".charCodeAt(0);
  if (index < 26) return String.fromCharCode(A + index);
  const first = Math.floor(index / 26) - 1;
  const second = index % 26;
  return `${String.fromCharCode(A + first)}${String.fromCharCode(A + second)}`;
}

function shuffleArrayInPlace<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = t;
  }
}

export function createInitialSandboxState(): SandboxState {
  return {
    phase: "waiting",
    status: "active",
    groups: [],
    players: [],
    realStudentNickname: null,
  };
}

export function buildSandboxAssignments(
  activityId: string,
  pack: ActivityPack,
  realStudentNickname: string | null,
): { groups: SandboxGroup[]; players: SandboxPlayer[] } {
  const items = pack.items;
  if (items.length === 0) {
    return { groups: [], players: [] };
  }

  const chips = buildSandboxWaitingRoster(activityId, pack, realStudentNickname);
  shuffleArrayInPlace(chips);

  const groupSize = Math.max(2, pack.groupSize);
  const numGroups = Math.max(1, Math.ceil(chips.length / groupSize));

  const groups: SandboxGroup[] = Array.from({ length: numGroups }, (_, i) => ({
    id: `sandbox-group-${i}`,
    name: groupLabel(i),
    acquired_items: [],
    completed_tasks: [],
    completed_at: null,
  }));

  const byGroup: SandboxWaitingChip[][] = groups.map(() => []);
  chips.forEach((chip, idx) => {
    byGroup[idx % numGroups]!.push(chip);
  });

  const itemIds = items.map((i) => i.id);
  let roleIndex = 0;
  const players: SandboxPlayer[] = [];

  for (let ti = 0; ti < groups.length; ti++) {
    const group = groups[ti]!;
    for (const chip of byGroup[ti]!) {
      const itemId = itemIds[roleIndex % itemIds.length]!;
      roleIndex++;
      players.push({
        id: chip.isReal ? SANDBOX_REAL_STUDENT_PLAYER_ID : `sandbox-player-${chip.id}`,
        nickname: chip.nickname.trim() || "참가자",
        groupId: group.id,
        itemId,
        isReal: chip.isReal ? true : undefined,
      });
    }
  }

  return { groups, players };
}

export function nextSandboxPhase(current: ActivityPhase): ActivityPhase | null {
  switch (current) {
    case "waiting":
      return "overview";
    case "overview":
      return "expert_group";
    case "expert_group":
      return "home_group";
    case "home_group":
      return "results";
    default:
      return null;
  }
}

export function getSandboxNextPhaseLabel(current: ActivityPhase): string {
  if (current === "waiting") return HOST_SESSION_START_LABEL;
  return hostSessionNextPhaseLabel(current);
}

export const SANDBOX_PHASE_LABEL: Record<ActivityPhase, string> = {
  waiting: "대기",
  overview: "활동 소개",
  expert_group: "전문가 집단",
  home_group: "홈 집단",
  results: "결과",
};
