import type {
  ActivityPack,
  Item,
  WordCard,
  WorksheetPlacement,
  WorksheetSlot,
} from "@/lib/activity-pack/types";
import { scoreForClueLevel } from "@/lib/activity-pack/scoring";
import { isItemAnswerCorrect } from "@/lib/activity-pack/validate";

/** activity-pack 엔진·API 공통 검증 메시지 */
export const PLAYER_MESSAGES = {
  defaultPackTitle: "새 활동",
  unknownItem: "단어 정보를 찾을 수 없어요.",
  unknownSlot: "빈칸 정보를 찾을 수 없어요.",
  incorrectAnswer: "아직 맞는 단어가 아니에요. 단서를 다시 보고 추리해 보세요.",
  cannotPlaceOnOwnSlot: "내 빈칸에는 내 단어 카드를 직접 넣을 수 없어요. 팀원에게 도움을 요청하세요.",
  slotOwnerMismatch: "이 빈칸은 해당 팀원의 슬롯이 아니에요.",
  slotWordMismatch: "이 빈칸에 들어갈 단어와 카드가 일치하지 않아요.",
  slotAlreadyFilled: "이미 채워진 빈칸이에요.",
  wordCardNotAvailable: "사용할 수 있는 단어 카드가 없어요.",
  worksheetIncomplete: "아직 채우지 않은 빈칸이 있어요.",
  submissionAlreadySent: "이미 최종 제출을 마쳤어요.",
  operationFailed: "요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.",
} as const;

export function getItemById(pack: ActivityPack, itemId: string): Item | undefined {
  return pack.items.find((i) => i.id === itemId);
}

export function getWorksheetSlot(pack: ActivityPack, slotId: string): WorksheetSlot | undefined {
  return pack.homeWorksheet.slots.find((s) => s.id === slotId);
}

export function clueTextForLevel(item: Item, level: 1 | 2 | 3 | 4 | 5): string {
  return item.clues[`stage${level}` as keyof typeof item.clues];
}

export function tryAcquireWordCard(
  pack: ActivityPack,
  itemId: string,
  answer: string,
  clueLevelUsed: 1 | 2 | 3 | 4 | 5,
): { ok: true; record: WordCard } | { ok: false; reason: string } {
  const item = getItemById(pack, itemId);
  if (!item) return { ok: false, reason: PLAYER_MESSAGES.unknownItem };
  if (!isItemAnswerCorrect(item, answer)) {
    return { ok: false, reason: PLAYER_MESSAGES.incorrectAnswer };
  }
  return {
    ok: true,
    record: {
      itemId,
      clueLevelUsed,
      score: scoreForClueLevel(clueLevelUsed),
      acquiredAt: new Date().toISOString(),
    },
  };
}

export function availableWordCards(cards: WordCard[]): WordCard[] {
  return cards.filter((c) => !c.placedAt);
}

export function hasWordCard(cards: WordCard[], itemId: string): boolean {
  return availableWordCards(cards).some((c) => c.itemId === itemId);
}

export type WorksheetPlacementInput = {
  actorPlayerId: string;
  slotOwnerPlayerId: string;
  slotOwnerRoleId: string;
  slotId: string;
  itemId: string;
};

/** 단어 카드를 팀원 슬롯에 배치 — 본인 슬롯에는 불가 */
export function tryPlaceWordCard(
  pack: ActivityPack,
  actorCards: WordCard[],
  placements: WorksheetPlacement[],
  input: WorksheetPlacementInput,
): { ok: true; record: WorksheetPlacement; updatedCard: WordCard } | { ok: false; reason: string } {
  const slot = getWorksheetSlot(pack, input.slotId);
  if (!slot) return { ok: false, reason: PLAYER_MESSAGES.unknownSlot };

  if (input.actorPlayerId === input.slotOwnerPlayerId) {
    return { ok: false, reason: PLAYER_MESSAGES.cannotPlaceOnOwnSlot };
  }

  if (slot.ownerRoleId !== input.slotOwnerRoleId) {
    return { ok: false, reason: PLAYER_MESSAGES.slotOwnerMismatch };
  }

  if (slot.itemId !== input.itemId) {
    return { ok: false, reason: PLAYER_MESSAGES.slotWordMismatch };
  }

  if (placements.some((p) => p.slotId === input.slotId)) {
    return { ok: false, reason: PLAYER_MESSAGES.slotAlreadyFilled };
  }

  const card = availableWordCards(actorCards).find((c) => c.itemId === input.itemId);
  if (!card) {
    return { ok: false, reason: PLAYER_MESSAGES.wordCardNotAvailable };
  }

  const placedAt = new Date().toISOString();
  return {
    ok: true,
    record: {
      slotId: input.slotId,
      itemId: input.itemId,
      placedByPlayerId: input.actorPlayerId,
      placedAt,
    },
    updatedCard: { ...card, placedAt },
  };
}

export function worksheetProgress(
  pack: ActivityPack,
  placements: WorksheetPlacement[],
): { required: number; filled: number; complete: boolean } {
  const required = pack.homeWorksheet.slots.length;
  const filled = placements.length;
  return {
    required,
    filled,
    complete: required > 0 && filled >= required,
  };
}

export function isWorksheetComplete(pack: ActivityPack, placements: WorksheetPlacement[]): boolean {
  const slotIds = new Set(pack.homeWorksheet.slots.map((s) => s.id));
  const placedIds = new Set(placements.map((p) => p.slotId));
  for (const id of slotIds) {
    if (!placedIds.has(id)) return false;
  }
  return slotIds.size > 0;
}

export type RoleAssignment = {
  roleId: string;
  itemIds: string[];
};

export function assignRolesToPlayers(
  pack: ActivityPack,
  playerIds: string[],
): Map<string, RoleAssignment> {
  const assignment = new Map<string, RoleAssignment>();
  const roles = pack.roles;
  if (roles.length === 0 || playerIds.length === 0) return assignment;

  const playerCount = playerIds.length;
  const roleCount = roles.length;

  let playerIndex = 0;
  for (let ri = 0; ri < roleCount && playerIndex < playerCount; ri++) {
    const remainingPlayers = playerCount - playerIndex;
    const remainingRoles = roleCount - ri;
    const playersForThisRole = Math.ceil(remainingPlayers / remainingRoles);

    for (let j = 0; j < playersForThisRole && playerIndex < playerCount; j++) {
      const playerId = playerIds[playerIndex]!;
      const role = roles[ri]!;
      const primaryItem = role.items[0];
      assignment.set(playerId, {
        roleId: role.id,
        itemIds: primaryItem ? [primaryItem.id] : [],
      });
      playerIndex++;
    }
  }

  return assignment;
}

export function totalGroupScore(wordCards: WordCard[], placements: WorksheetPlacement[]): number {
  const acquisitionScore = wordCards.reduce((sum, c) => sum + c.score, 0);
  const placementScore = placements.length * 3;
  return acquisitionScore + placementScore;
}
