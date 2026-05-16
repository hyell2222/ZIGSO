/**
 * 시뮬레이션 모드 — 교사 혼자서 사건 흐름을 시연·검수하기 위한 in-memory 모델.
 * Supabase 에는 어떤 행도 쓰지 않으며, 모든 상태는 React state 로만 유지됩니다.
 */

import type { CaseLocationRow } from "@/lib/api/cases";
import type { CasePhase } from "@/lib/api/cases";
import { pickSandboxLobbyBotNicknames } from "@/lib/sandbox/waiting-nicknames";

export type SandboxPlayerReport = {
  suspectId: string;
  method: string;
  motive: string;
  decisiveClue: string;
  submittedAt: string;
};

export type SandboxPlayer = {
  id: string;
  nickname: string;
  teamId: string;
  locationId: string;
  report: SandboxPlayerReport | null;
  /** true 인 경우 교사가 학생 화면으로 직접 join 한 실제 접속자 */
  isReal?: boolean;
};

export type SandboxTeam = {
  id: string;
  name: string;
  foundClueIds: string[];
};

export type SandboxState = {
  phase: CasePhase;
  teams: SandboxTeam[];
  players: SandboxPlayer[];
  /** 학생 패널에서 입력한 닉네임으로 join 한 실제 접속자 (없으면 null) */
  realStudentNickname: string | null;
};

/** 실제 접속자 슬롯 id — buildSandboxAssignments 에서 그대로 사용 */
export const SANDBOX_REAL_STUDENT_PLAYER_ID = "sandbox-real-student";

/** 학생 입장 게이트 고정 참가 코드 (교사 화면·QR 과 동일) */
export const SANDBOX_JOIN_CODE = "MYSTERYCLUB";

/** 대기 학생 목록용 — 닉네임스러운 가상 플레이어 다수 + (참가 시) 실제 학생 1명 추가 */
export type SandboxWaitingChip = {
  id: string;
  nickname: string;
  isReal?: boolean;
};

/**
 * 대기 단계 교사 패널 접속자 칩.
 * - 사건 id 마다 고정된 순으로 12명 분량의 가상 닉네임 (10명 초과)
 * - 학생이 참가하면 목록 **맨 앞**에 새 칩으로 추가 (가상 칩은 유지)
 */
export function buildSandboxWaitingRoster(
  caseId: string,
  locations: CaseLocationRow[],
  realStudentNickname: string | null,
): SandboxWaitingChip[] {
  if (!locations.length) return [];

  const bots = pickSandboxLobbyBotNicknames(caseId.trim() || "_");
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

/** 팀 라벨 — `lib/api/play.ts` 의 실제 배정 함수와 동일 규칙 */
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

/**
 * `lib/api/play.ts` 의 `assignTeamsAndInvestigation` 과 동일 규칙으로 in-memory 배정.
 *
 * - 대기 명단(`buildSandboxWaitingRoster`) 참가자 수 P, 장소 수 L
 * - 팀 개수 N = max(1, floor(P / L)) — 전원이 장소에 나눠 들어갈 수 있는 만큼 편성
 * - 참가자를 섞은 뒤 팀에 라운드로빈으로 나눔
 * - 팀 내부에서도 섞고, 구성원 j 에게 `shuffledZones[j % L]` 장소 배정
 *
 * 그래서 인원이 L 과 정확히 나누어떨어지면 각 팀은 **정확히 L 명**(한 명당 장소 하나씩 순환 매칭)이 되고,
 * 나머지가 있으면 일부 장소에는 같은 팀에서 여러 명이 배치됩니다(실서버 주석과 동일).
 */
export function buildSandboxAssignments(
  caseId: string,
  locations: CaseLocationRow[],
  realStudentNickname: string | null,
): { teams: SandboxTeam[]; players: SandboxPlayer[] } {
  if (locations.length === 0) {
    return { teams: [], players: [] };
  }

  const chips = buildSandboxWaitingRoster(
    caseId,
    locations,
    realStudentNickname,
  );
  shuffleArrayInPlace(chips);

  const zoneIds = locations.map((l) => l.id);
  const zoneCount = zoneIds.length;
  const P = chips.length;
  const numTeams = Math.max(1, Math.floor(P / zoneCount));

  const teams: SandboxTeam[] = Array.from({ length: numTeams }, (_, i) => ({
    id: `sandbox-team-${i}`,
    name: teamLabel(i),
    foundClueIds: [],
  }));

  const byTeam: SandboxWaitingChip[][] = [];
  for (let i = 0; i < numTeams; i++) {
    byTeam.push([]);
  }
  chips.forEach((chip, idx) => {
    byTeam[idx % numTeams]!.push(chip);
  });

  const players: SandboxPlayer[] = [];

  for (let ti = 0; ti < numTeams; ti++) {
    const team = teams[ti]!;
    const bucket = [...byTeam[ti]!];
    shuffleArrayInPlace(bucket);
    const shuffledZones = [...zoneIds];
    shuffleArrayInPlace(shuffledZones);

    bucket.forEach((chip, j) => {
      const locationId = shuffledZones[j % zoneCount]!;
      players.push({
        id: chip.isReal ? SANDBOX_REAL_STUDENT_PLAYER_ID : `sandbox-player-${chip.id}`,
        nickname: chip.nickname.trim() || "참가자",
        teamId: team.id,
        locationId,
        report: null,
        isReal: chip.isReal ? true : undefined,
      });
    });
  }

  return { teams, players };
}

/** waiting → briefing → investigation → final_report → session_end */
export function nextSandboxPhase(current: CasePhase): CasePhase | null {
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

export function getSandboxNextPhaseLabel(current: CasePhase): string {
  switch (current) {
    case "waiting":
      return "시작";
    case "briefing":
      return "다음 단계 (단서 수집)";
    case "investigation":
      return "다음 단계 (범인 지목)";
    case "final_report":
      return "종료";
    default:
      return "—";
  }
}

export const SANDBOX_PHASE_LABEL: Record<CasePhase, string> = {
  waiting: "대기",
  briefing: "사건 파악",
  investigation: "단서 수집",
  final_report: "범인 지목",
  session_end: "종료",
};
