/**
 * 시뮬레이션 모드 — 교사 혼자서 활동 흐름을 시연·검수하기 위한 in-memory 모델.
 */

import { ACTIVITY_PHASE_LABELS } from "@/lib/copy/phases";
import { COPY_DEFAULTS } from "@/lib/copy/defaults";
import { MIN_ROLES_PER_GROUP } from "@/lib/activity-pack/sizing";
import type { ActivityPhase, SessionStatus } from "@/lib/types";
import { assignRolesToPlayers } from "@/lib/activity-pack/engine";
import type { AcquiredItem, CompletedTask, ActivityPack } from "@/lib/activity-pack/types";
import { pickSandboxLobbyBotNicknames, SANDBOX_LOBBY_BOT_COUNT } from "@/lib/sandbox/waiting-nicknames";
import {
  HOST_SESSION_START_LABEL,
  hostSessionNextPhaseLabel,
} from "@/lib/copy/teacher";

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
  roleId: string;
  /** @deprecated — itemIds 사용 */
  itemId: string;
  itemIds: string[];
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
  realStudentNickname: string | null,
  groupSize = MIN_ROLES_PER_GROUP,
): SandboxWaitingChip[] {
  const slotsPerGroup = Math.max(MIN_ROLES_PER_GROUP, groupSize);
  const botCount = slotsPerGroup * Math.ceil(SANDBOX_LOBBY_BOT_COUNT / slotsPerGroup);
  const nicknames = pickSandboxLobbyBotNicknames(activityId.trim() || "_");
  const out: SandboxWaitingChip[] = Array.from({ length: botCount }, (_, i) => ({
    id: `sandbox-lobby-bot-${i}`,
    nickname: nicknames[i % nicknames.length] ?? `${COPY_DEFAULTS.participant} ${i + 1}`,
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
  if (pack.roles.length === 0) {
    return { groups: [], players: [] };
  }
  const fallbackItemId = pack.items[0]?.id ?? "";

  const chips = buildSandboxWaitingRoster(activityId, realStudentNickname, pack.groupSize);
  shuffleArrayInPlace(chips);

  const groupSize = Math.max(MIN_ROLES_PER_GROUP, pack.groupSize);
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

  const players: SandboxPlayer[] = [];

  for (let gi = 0; gi < groups.length; gi++) {
    const group = groups[gi]!;
    const groupChips = byGroup[gi]!;
    const groupPlayerIds = groupChips.map((chip) =>
      chip.isReal ? SANDBOX_REAL_STUDENT_PLAYER_ID : `sandbox-player-${chip.id}`,
    );
    const roleAssignment = assignRolesToPlayers(pack, groupPlayerIds);
    for (const chip of groupChips) {
      const playerId = chip.isReal ? SANDBOX_REAL_STUDENT_PLAYER_ID : `sandbox-player-${chip.id}`;
      const assigned = roleAssignment.get(playerId);
      const itemIds = assigned?.itemIds ?? [];
      players.push({
        id: playerId,
        nickname: chip.nickname.trim() || COPY_DEFAULTS.participant,
        groupId: group.id,
        roleId: assigned?.roleId ?? pack.roles[0]?.id ?? "",
        itemId: itemIds[0] ?? fallbackItemId,
        itemIds,
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

export const SANDBOX_PHASE_LABEL = ACTIVITY_PHASE_LABELS;
