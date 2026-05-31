import {
  MAX_ITEMS_PER_ROLE,
  MIN_ITEMS_PER_ROLE,
  flattenRoleItems,
  itemsToRoles,
} from "@/lib/activity-pack/roles";
import {
  MAX_ROLES_PER_GROUP,
  MIN_ROLES_PER_GROUP,
  normalizePackSizing,
} from "@/lib/activity-pack/sizing";
import {
  buildDefaultHomeWorksheet,
  buildDefaultWorksheetSlots,
  extractSlotIdsFromPassage,
  syncWorksheetSlotsFromPassage,
} from "@/lib/activity-pack/worksheet";
import type { HomeWorksheet, ItemClues, Item, ActivityPack, Role } from "@/lib/activity-pack/types";
import { ACTIVITY_PACK_VERSION } from "@/lib/activity-pack/types";
import { makeTempId } from "@/lib/temp-id";
import { buildRoleCodenameMap } from "@/lib/play/role-codenames";

export {
  derivedActivityScale,
  MAX_ROLES_PER_GROUP,
  MIN_ROLES_PER_GROUP,
} from "@/lib/activity-pack/sizing";
export { MAX_ITEMS_PER_ROLE, MIN_ITEMS_PER_ROLE } from "@/lib/activity-pack/roles";

export const HINT_STAGE_LABELS: Record<keyof ItemClues, string> = {
  stage1: "1단계 단서 (5점 · 가장 어려움)",
  stage2: "2단계 단서 (4점)",
  stage3: "3단계 단서 (3점)",
  stage4: "4단계 단서 (2점)",
  stage5: "5단계 단서 (1점 · 가장 쉬움)",
};

export type EditorItem = {
  localId: string;
  id: string;
  name: string;
  clues: ItemClues;
};

export type EditorRole = {
  localId: string;
  id: string;
  items: EditorItem[];
};

export type ActivityEditorDraft = {
  title: string;
  description: string;
  roles: EditorRole[];
  /** 홈 집단 공유 학습지 — {{slot_id}} 로 빈칸 표시 */
  summaryPassage: string;
};

export type FlatEditorItem = {
  item: EditorItem;
  roleLocalId: string;
  roleLabel: string;
};

const EMPTY_HINTS = (): ItemClues => ({
  stage1: "",
  stage2: "",
  stage3: "",
  stage4: "",
  stage5: "",
});

export function createEmptyItem(): EditorItem {
  return {
    localId: makeTempId(),
    id: "",
    name: "",
    clues: EMPTY_HINTS(),
  };
}

export function createEmptyRole(): EditorRole {
  return {
    localId: makeTempId(),
    id: "",
    items: [createEmptyItem()],
  };
}

/** 편집기에서 역할 코드명 미리보기용 키 */
export function editorRoleKey(role: EditorRole, index: number): string {
  return role.id.trim() || role.localId || `role_${index + 1}`;
}

export function editorRoleCodenameMap(draft: ActivityEditorDraft): Map<string, string> {
  const keys = draft.roles.map((role, index) => editorRoleKey(role, index));
  const scope = draft.title.trim() || "activity-editor";
  return buildRoleCodenameMap(scope, keys);
}

export function editorRoleLabel(index: number): string {
  return `역할 ${index + 1}`;
}

export function editorItemLabel(index: number): string {
  return `단어 ${index + 1}`;
}

export function flattenEditorItems(draft: ActivityEditorDraft): FlatEditorItem[] {
  return draft.roles.flatMap((role, ri) => {
    const roleLabel = editorRoleLabel(ri);
    return role.items.map((item) => ({
      item,
      roleLocalId: role.localId,
      roleLabel,
    }));
  });
}

export function createDefaultActivityDraft(): ActivityEditorDraft {
  const environmentRole = createEmptyRole();
  const environment = environmentRole.items[0]!;
  environment.name = "environment";
  environment.clues = {
    stage1: "지구를 둘러싼 모든 자연과 생물을 가리킵니다.",
    stage2: "We must protect our ___ to live safely.",
    stage3: "본문 첫 문장에 ‘our environment’가 나옵니다.",
    stage4: "영어 11글자, e로 시작합니다.",
    stage5: "정답: environment",
  };

  const pollutionRole = createEmptyRole();
  const pollution = pollutionRole.items[0]!;
  pollution.name = "pollution";
  pollution.clues = {
    stage1: "공기·물·땅을 더럽히는 것입니다.",
    stage2: "Factories cause a lot of ___.",
    stage3: "본문에 ‘reduce pollution’이 나옵니다.",
    stage4: "영어 10글자, p로 시작합니다.",
    stage5: "정답: pollution",
  };

  const recycleRole = createEmptyRole();
  const recycle = recycleRole.items[0]!;
  recycle.name = "recycle";
  recycle.clues = {
    stage1: "쓴 종이·플라스틱을 다시 사용하는 행동입니다.",
    stage2: "We should ___ plastic bottles.",
    stage3: "본문 마지막 문장에 등장합니다.",
    stage4: "re-___-le 형태의 영어 단어입니다.",
    stage5: "정답: recycle",
  };

  const roles = [environmentRole, pollutionRole, recycleRole];

  return {
    title: "교과서 본문: Save Our Planet",
    description:
      "중2 영어 교과서 ‘Save Our Planet’ 지문을 바탕으로 합니다.\n전문가 집단에서 본문 핵심 단어의 단어 카드를 얻고, 홈 집단에서 지문 요약 학습지를 완성하세요.",
    roles,
    summaryPassage:
      "교과서 지문에 따르면, {{slot_environment}}을(를) 지키려면 {{slot_pollution}}을(를) 줄이고 {{slot_recycle}}을(를) 실천해야 합니다.",
  };
}

function slugFromName(name: string, fallback: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
  return slug || fallback;
}

/** 편집기에서 빈칸 토큰 미리보기 — 저장 시 slot id와 일치하도록 */
export function editorSlotToken(item: EditorItem, roleIndex: number, itemIndex: number): string {
  const itemId = item.id.trim() || slugFromName(item.name, `role_${roleIndex + 1}_item_${itemIndex + 1}`);
  return `{{slot_${itemId}}}`;
}

export function packToEditorDraft(pack: ActivityPack): ActivityEditorDraft {
  const sourceRoles = pack.roles.length > 0 ? pack.roles : itemsToRoles(pack.items);

  const roles: EditorRole[] = sourceRoles.map((role) => ({
    localId: makeTempId(),
    id: role.id,
    items: role.items.map((item) => ({
      localId: makeTempId(),
      id: item.id,
      name: item.name,
      clues: { ...item.clues },
    })),
  }));

  return {
    title: pack.title.replace(/^활동:\s*/, ""),
    description: pack.description,
    roles: roles.length > 0 ? roles : [createEmptyRole()],
    summaryPassage: pack.homeWorksheet.summaryPassage,
  };
}

export function editorDraftToPack(draft: ActivityEditorDraft): ActivityPack {
  const usedRoleIds = new Set<string>();
  const usedItemIds = new Set<string>();
  const roles: Role[] = [];
  const idMap = new Map<string, string>();

  for (let ri = 0; ri < draft.roles.length; ri++) {
    const rawRole = draft.roles[ri]!;
    const roleBaseId = `role_${ri + 1}`;
    let roleId = rawRole.id.trim() || roleBaseId;
    let rn = 2;
    while (usedRoleIds.has(roleId)) {
      roleId = `${roleBaseId}_${rn}`;
      rn++;
    }
    usedRoleIds.add(roleId);

    const roleItems: Item[] = [];
    for (let ii = 0; ii < rawRole.items.length; ii++) {
      const rawItem = rawRole.items[ii]!;
      const itemBaseId = slugFromName(rawItem.name, `${roleId}_item_${ii + 1}`);
      let itemId = rawItem.id.trim() || itemBaseId;
      let suffix = 2;
      while (usedItemIds.has(itemId)) {
        itemId = `${itemBaseId}_${suffix}`;
        suffix++;
      }
      usedItemIds.add(itemId);
      idMap.set(rawItem.localId, itemId);
      if (rawItem.id.trim()) idMap.set(rawItem.id, itemId);

      roleItems.push({
        id: itemId,
        name: rawItem.name.trim(),
        clues: {
          stage1: rawItem.clues.stage1.trim(),
          stage2: rawItem.clues.stage2.trim(),
          stage3: rawItem.clues.stage3.trim(),
          stage4: rawItem.clues.stage4.trim(),
          stage5: rawItem.clues.stage5.trim(),
        },
      });
    }

    roles.push({
      id: roleId,
      name: "",
      items: roleItems,
    });
  }

  const items = flattenRoleItems(roles);

  let homeWorksheet: HomeWorksheet = {
    summaryPassage: draft.summaryPassage.trim(),
    slots: buildDefaultWorksheetSlots(roles),
  };
  if (!homeWorksheet.summaryPassage) {
    homeWorksheet = buildDefaultHomeWorksheet(roles, items);
  } else {
    homeWorksheet = syncWorksheetSlotsFromPassage(homeWorksheet, roles);
  }

  const title = draft.title.trim()
    ? draft.title.trim().startsWith("활동:")
      ? draft.title.trim()
      : `활동: ${draft.title.trim()}`
    : "새 직소 활동";

  return normalizePackSizing({
    version: ACTIVITY_PACK_VERSION,
    title,
    description: draft.description.trim(),
    groupSize: roles.length,
    itemsPerPlayer: 1,
    roles,
    items,
    homeWorksheet,
  });
}

export const EDITOR_STEPS = [
  { id: "basics", title: "활동 안내", description: "제목·학습 상황 소개" },
  { id: "items", title: "역할·단어", description: "역할별 본문 핵심 단어와 5단계 단서" },
  { id: "worksheet", title: "공유 학습지", description: "홈 집단 최종 요약문과 빈칸" },
] as const;

export type EditorStepId = (typeof EDITOR_STEPS)[number]["id"];

function validateRolesAndItems(draft: ActivityEditorDraft, errors: string[]) {
  if (draft.roles.length === 0) {
    errors.push("모둠원 역할을 한 가지 이상 추가하세요.");
  } else if (
    draft.roles.length < MIN_ROLES_PER_GROUP ||
    draft.roles.length > MAX_ROLES_PER_GROUP
  ) {
    errors.push(
      `역할은 ${MIN_ROLES_PER_GROUP}~${MAX_ROLES_PER_GROUP}개입니다. (모둠 인원과 같습니다)`,
    );
  }
  for (let ri = 0; ri < draft.roles.length; ri++) {
    const role = draft.roles[ri]!;
    const roleLabel = editorRoleLabel(ri);
    if (role.items.length < MIN_ITEMS_PER_ROLE || role.items.length > MAX_ITEMS_PER_ROLE) {
      errors.push(
        `「${roleLabel}」단어는 ${MIN_ITEMS_PER_ROLE}~${MAX_ITEMS_PER_ROLE}개입니다.`,
      );
    }
    for (const item of role.items) {
      if (!item.name.trim()) errors.push("단어(정답)를 입력하세요.");
      for (const [key, label] of Object.entries(HINT_STAGE_LABELS) as [keyof ItemClues, string][]) {
        if (!item.clues[key].trim()) {
          errors.push(`「${item.name || "단어"}」 — ${label}을(를) 입력하세요.`);
        }
      }
    }
  }
}

export function validateEditorDraftStep(draft: ActivityEditorDraft, step: EditorStepId): string[] {
  const errors: string[] = [];

  if (step === "basics") {
    if (!draft.title.trim()) errors.push("수업·활동 제목을 입력하세요.");
    if (!draft.description.trim()) errors.push("활동 안내(학습 상황)를 입력하세요.");
    return errors;
  }

  if (step === "items") {
    validateRolesAndItems(draft, errors);
    return errors;
  }

  if (step === "worksheet") {
    if (!draft.summaryPassage.trim()) {
      errors.push("최종 요약문을 입력하세요.");
    } else if (extractSlotIdsFromPassage(draft.summaryPassage).length === 0) {
      errors.push("요약문에 {{slot_id}} 형식의 빈칸을 하나 이상 넣으세요.");
    }
    return errors;
  }

  return errors;
}

export function validateEditorDraft(draft: ActivityEditorDraft): string[] {
  const errors: string[] = [];

  if (!draft.title.trim()) {
    errors.push("수업·활동 제목을 입력하세요.");
  }
  if (!draft.description.trim()) {
    errors.push("활동 안내(학습 상황)를 입력하세요.");
  }
  validateRolesAndItems(draft, errors);

  if (!draft.summaryPassage.trim()) {
    errors.push("최종 요약문을 입력하세요.");
  } else if (extractSlotIdsFromPassage(draft.summaryPassage).length === 0) {
    errors.push("요약문에 {{slot_id}} 형식의 빈칸을 하나 이상 넣으세요.");
  }

  return errors;
}
