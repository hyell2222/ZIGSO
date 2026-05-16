/**
 * 시뮬레이션 모드 — 교사 혼자서 급식 게임 흐름을 시연·검수하기 위한 in-memory 모델.
 */

import type { SessionPhase } from "@/lib/api/lessons";
import type { AcquiredIngredient, CompletedMenu, ScenarioPack } from "@/lib/lunch/types";
import { pickSandboxLobbyBotNicknames } from "@/lib/sandbox/waiting-nicknames";

export type SandboxTeam = {
  id: string;
  name: string;
  acquired_ingredients: AcquiredIngredient[];
  completed_menus: CompletedMenu[];
  tray_submitted_at: string | null;
};

export type SandboxPlayer = {
  id: string;
  nickname: string;
  teamId: string;
  ingredientId: string;
  isReal?: boolean;
};

export type SandboxState = {
  phase: SessionPhase;
  teams: SandboxTeam[];
  players: SandboxPlayer[];
  realStudentNickname: string | null;
};

export const SANDBOX_REAL_STUDENT_PLAYER_ID = "sandbox-real-student";
export const SANDBOX_JOIN_CODE = "LUNCHRUSH";

export type SandboxWaitingChip = {
  id: string;
  nickname: string;
  isReal?: boolean;
};

export function buildSandboxWaitingRoster(
  lessonId: string,
  pack: ScenarioPack,
  realStudentNickname: string | null,
): SandboxWaitingChip[] {
  const slotCount = Math.max(pack.ingredients.length, pack.teamSize, 4);
  const bots = pickSandboxLobbyBotNicknames(lessonId.trim() || "_").slice(0, slotCount);
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

export function teamLabel(index: number) {
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
    teams: [],
    players: [],
    realStudentNickname: null,
  };
}

export function buildSandboxAssignments(
  lessonId: string,
  pack: ScenarioPack,
  realStudentNickname: string | null,
): { teams: SandboxTeam[]; players: SandboxPlayer[] } {
  const ingredients = pack.ingredients;
  if (ingredients.length === 0) {
    return { teams: [], players: [] };
  }

  const chips = buildSandboxWaitingRoster(lessonId, pack, realStudentNickname);
  shuffleArrayInPlace(chips);

  const teamSize = Math.max(2, pack.teamSize);
  const numTeams = Math.max(1, Math.ceil(chips.length / teamSize));

  const teams: SandboxTeam[] = Array.from({ length: numTeams }, (_, i) => ({
    id: `sandbox-team-${i}`,
    name: teamLabel(i),
    acquired_ingredients: [],
    completed_menus: [],
    tray_submitted_at: null,
  }));

  const byTeam: SandboxWaitingChip[][] = teams.map(() => []);
  chips.forEach((chip, idx) => {
    byTeam[idx % numTeams]!.push(chip);
  });

  const ingredientIds = ingredients.map((i) => i.id);
  let ingredientIndex = 0;
  const players: SandboxPlayer[] = [];

  for (let ti = 0; ti < teams.length; ti++) {
    const team = teams[ti]!;
    for (const chip of byTeam[ti]!) {
      const ingredientId = ingredientIds[ingredientIndex % ingredientIds.length]!;
      ingredientIndex++;
      players.push({
        id: chip.isReal ? SANDBOX_REAL_STUDENT_PLAYER_ID : `sandbox-player-${chip.id}`,
        nickname: chip.nickname.trim() || "참가자",
        teamId: team.id,
        ingredientId,
        isReal: chip.isReal ? true : undefined,
      });
    }
  }

  return { teams, players };
}

export function nextSandboxPhase(current: SessionPhase): SessionPhase | null {
  switch (current) {
    case "waiting":
      return "briefing";
    case "briefing":
      return "investigation";
    case "investigation":
      return "final_report";
    case "final_report":
      return "session_end";
    default:
      return null;
  }
}

export function getSandboxNextPhaseLabel(current: SessionPhase): string {
  switch (current) {
    case "waiting":
      return "시작";
    case "briefing":
      return "다음 단계";
    case "investigation":
      return "다음 단계";
    case "final_report":
      return "종료";
    default:
      return "—";
  }
}

export const SANDBOX_PHASE_LABEL: Record<SessionPhase, string> = {
  waiting: "대기",
  briefing: "급식 브리핑",
  investigation: "재료 전문가",
  final_report: "급식판 완성",
  session_end: "종료",
};
