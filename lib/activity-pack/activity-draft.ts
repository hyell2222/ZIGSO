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
import type { ItemHints, Item, ActivityPack, Task, Role } from "@/lib/activity-pack/types";
import { ACTIVITY_PACK_VERSION } from "@/lib/activity-pack/types";
import { makeTempId } from "@/lib/temp-id";
import { buildRoleCodenameMap } from "@/lib/play/role-codenames";

export {
  derivedActivityScale,
  MAX_ROLES_PER_GROUP,
  MIN_ROLES_PER_GROUP,
} from "@/lib/activity-pack/sizing";
export { MAX_ITEMS_PER_ROLE, MIN_ITEMS_PER_ROLE } from "@/lib/activity-pack/roles";

export const HINT_STAGE_LABELS: Record<keyof ItemHints, string> = {
  stage1: "1단계 힌트 (5점 · 가장 어려움)",
  stage2: "2단계 힌트 (4점)",
  stage3: "3단계 힌트 (3점)",
  stage4: "4단계 힌트 (2점)",
  stage5: "5단계 힌트 (1점 · 가장 쉬움)",
};

export type EditorItem = {
  localId: string;
  id: string;
  name: string;
  hints: ItemHints;
};

export type EditorRole = {
  localId: string;
  id: string;
  items: EditorItem[];
};

export type EditorTask = {
  localId: string;
  id: string;
  title: string;
  description: string;
  acceptedItemIds: string[];
  minimumItems?: number;
};

export type ActivityEditorDraft = {
  title: string;
  description: string;
  roles: EditorRole[];
  tasks: EditorTask[];
};

export type FlatEditorItem = {
  item: EditorItem;
  roleLocalId: string;
  roleLabel: string;
};

const EMPTY_HINTS = (): ItemHints => ({
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
    hints: EMPTY_HINTS(),
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

export function createEmptyTask(): EditorTask {
  return {
    localId: makeTempId(),
    id: "",
    title: "",
    description: "",
    acceptedItemIds: [],
    minimumItems: 1,
  };
}

export function editorRoleLabel(index: number): string {
  return `역할 ${index + 1}`;
}

export function editorItemLabel(index: number): string {
  return `아이템 ${index + 1}`;
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
  const boothRole = createEmptyRole();
  const booth = boothRole.items[0]!;
  booth.name = "부스 운영 매뉴얼";
  booth.hints = {
    stage1: "축제 당일 체크리스트가 들어 있습니다.",
    stage2: "개점 시간과 마감 절차가 적혀 있습니다.",
    stage3: "매뉴얼 표지에 ‘부스 운영’이라고 쓰여 있습니다.",
    stage4: "‘부스 운영 매뉴얼’이라는 제목입니다.",
    stage5: "정답: 부스 운영 매뉴얼",
  };

  const ticketRole = createEmptyRole();
  const ticket = ticketRole.items[0]!;
  ticket.name = "입장권";
  ticket.hints = {
    stage1: "관람객이 손에 들고 다닙니다.",
    stage2: "QR 코드가 인쇄되어 있습니다.",
    stage3: "‘입장권’이라는 글자가 보입니다.",
    stage4: "종이 티켓 형태입니다.",
    stage5: "정답: 입장권",
  };

  const roles = [boothRole, ticketRole];
  const flat = flattenEditorItems({ title: "", description: "", roles, tasks: [] });
  return {
    title: "학교 축제 부스 운영",
    description:
      "내일은 학교 축제입니다.\n여러 과제를 해결하며 축제 부스를 성공적으로 운영하세요.",
    roles,
    tasks: [
      {
        localId: makeTempId(),
        id: "",
        title: "부스 개점 준비",
        description: "개점 전에 필요한 자료와 절차를 정리하세요.",
        acceptedItemIds: flat.map((f) => f.item.localId),
        minimumItems: 1,
      },
    ],
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

export function packToEditorDraft(pack: ActivityPack): ActivityEditorDraft {
  const sourceRoles = pack.roles.length > 0 ? pack.roles : itemsToRoles(pack.items);

  const roles: EditorRole[] = sourceRoles.map((role) => ({
    localId: makeTempId(),
    id: role.id,
    items: role.items.map((item) => ({
      localId: makeTempId(),
      id: item.id,
      name: item.name,
      hints: { ...item.hints },
    })),
  }));

  const itemIds = new Set(flattenRoleItems(sourceRoles).map((i) => i.id));
  const localByItemId = new Map<string, string>();
  for (const role of roles) {
    for (const item of role.items) {
      if (item.id) localByItemId.set(item.id, item.localId);
    }
  }

  const tasks: EditorTask[] = pack.tasks.map((task) => ({
    localId: makeTempId(),
    id: task.id,
    title: task.title,
    description: task.description,
    acceptedItemIds: task.acceptedItemIds
      .filter((id) => itemIds.has(id))
      .map((id) => localByItemId.get(id) ?? id),
    minimumItems: task.minimumItems,
  }));

  return {
    title: pack.title.replace(/^활동:\s*/, ""),
    description: pack.description,
    roles: roles.length > 0 ? roles : [createEmptyRole()],
    tasks: tasks.length > 0 ? tasks : [createEmptyTask()],
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
        hints: {
          stage1: rawItem.hints.stage1.trim(),
          stage2: rawItem.hints.stage2.trim(),
          stage3: rawItem.hints.stage3.trim(),
          stage4: rawItem.hints.stage4.trim(),
          stage5: rawItem.hints.stage5.trim(),
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

  const tasks: Task[] = draft.tasks.map((ch, idx) => {
    const taskId = slugFromName(ch.title, `task_${idx + 1}`);
    const acceptedItemIds = ch.acceptedItemIds
      .map((ref) => idMap.get(ref) ?? ref)
      .filter((id) => usedItemIds.has(id));
    const min =
      typeof ch.minimumItems === "number" && ch.minimumItems >= 1
        ? Math.min(ch.minimumItems, acceptedItemIds.length || ch.minimumItems)
        : undefined;

    return {
      id: ch.id.trim() || taskId,
      title: ch.title.trim(),
      description: ch.description.trim(),
      acceptedItemIds,
      minimumItems: min,
    };
  });

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
    tasks,
  });
}

export const EDITOR_STEPS = [
  {
    id: "basics",
    title: "기본 정보",
    description: "활동 제목·설명",
  },
  {
    id: "items",
    title: "역할·아이템",
    description: "역할 개수와 역할별 맞출 아이템·힌트",
  },
  {
    id: "tasks",
    title: "모둠 과제",
    description: "홈 집단에서 해결할 과제",
  },
] as const;

export type EditorStepId = (typeof EDITOR_STEPS)[number]["id"];

function validateRolesAndItems(draft: ActivityEditorDraft, errors: string[]) {
  if (draft.roles.length === 0) {
    errors.push("역할을 한 가지 이상 추가하세요.");
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
        `「${roleLabel}」아이템은 ${MIN_ITEMS_PER_ROLE}~${MAX_ITEMS_PER_ROLE}개입니다.`,
      );
    }
    for (const item of role.items) {
      if (!item.name.trim()) errors.push("맞출 아이템(정답) 이름을 입력하세요.");
      for (const [key, label] of Object.entries(HINT_STAGE_LABELS) as [keyof ItemHints, string][]) {
        if (!item.hints[key].trim()) {
          errors.push(`「${item.name || "아이템"}」 — ${label}을(를) 입력하세요.`);
        }
      }
    }
  }
}

export function validateEditorDraftStep(draft: ActivityEditorDraft, step: EditorStepId): string[] {
  const errors: string[] = [];

  if (step === "basics") {
    if (!draft.title.trim()) errors.push("활동 제목을 입력하세요.");
    if (!draft.description.trim()) errors.push("활동 설명을 입력하세요.");
    return errors;
  }

  if (step === "items") {
    validateRolesAndItems(draft, errors);
    return errors;
  }

  if (draft.tasks.length === 0) {
    errors.push("모둠 과제를 한 가지 이상 추가하세요.");
  }
  for (const task of draft.tasks) {
    if (!task.title.trim()) errors.push("모둠 과제 제목을 입력하세요.");
    if (!task.description.trim()) errors.push(`「${task.title || "과제"}」설명을 입력하세요.`);
    const refs = task.acceptedItemIds.length;
    if (refs === 0) {
      errors.push(`「${task.title || "과제"}」에 사용할 아이템을 한 가지 이상 선택하세요.`);
    }
    const min = task.minimumItems ?? 1;
    if (min < 1 || min > refs) {
      errors.push(`「${task.title || "과제"}」최소 아이템 수가 올바르지 않습니다.`);
    }
  }
  return errors;
}

export function validateEditorDraft(draft: ActivityEditorDraft): string[] {
  const errors: string[] = [];

  if (!draft.title.trim()) {
    errors.push("활동 제목을 입력하세요.");
  }
  if (!draft.description.trim()) {
    errors.push("활동 설명을 입력하세요.");
  }
  validateRolesAndItems(draft, errors);

  if (draft.tasks.length === 0) {
    errors.push("모둠 과제를 한 가지 이상 추가하세요.");
  }
  for (const task of draft.tasks) {
    if (!task.title.trim()) errors.push("모둠 과제 제목을 입력하세요.");
    if (!task.description.trim()) errors.push(`「${task.title || "과제"}」설명을 입력하세요.`);
    const refs = task.acceptedItemIds.length;
    if (refs === 0) {
      errors.push(`「${task.title || "과제"}」에 사용할 아이템을 한 가지 이상 선택하세요.`);
    }
    const min = task.minimumItems ?? 1;
    if (min < 1 || min > refs) {
      errors.push(`「${task.title || "과제"}」최소 아이템 수가 올바르지 않습니다.`);
    }
  }

  return errors;
}
