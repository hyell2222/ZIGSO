"use client";

import { useMemo } from "react";

import { LoadingState } from "@/components/ui/loading-state";
import { cn } from "@/lib/utils";

export type GroupAssignmentMember = {
  id: string;
  nickname: string | null;
  /** 부원에게 배정된 담당 항목 이름 */
  zoneName: string | null;
  /** role 뷰에서 모둠명 표시 */
  groupName?: string | null;
};

export type GroupAssignmentGroup = {
  group: { id: string; name: string | null };
  members: GroupAssignmentMember[];
};

export type RoleAssignmentBucket = {
  roleKey: string;
  roleName: string;
  members: GroupAssignmentMember[];
};

function buildRoleBuckets(groups: GroupAssignmentGroup[]): RoleAssignmentBucket[] {
  const map = new Map<string, RoleAssignmentBucket>();

  for (const g of groups) {
    for (const m of g.members) {
      const roleName = m.zoneName?.trim() || "미배정";
      const roleKey = roleName;
      const bucket = map.get(roleKey) ?? { roleKey, roleName, members: [] };
      bucket.members.push({ ...m, groupName: g.group.name });
      map.set(roleKey, bucket);
    }
  }

  return [...map.values()].sort((a, b) => {
    if (a.roleName === "미배정") return 1;
    if (b.roleName === "미배정") return -1;
    return a.roleName.localeCompare(b.roleName, "ko");
  });
}

/**
 * 호스트 화면 — 모둠·장소 배정 결과 카드 묶음.
 * (실 세션·샌드박스 양쪽에서 동일 외관으로 사용합니다.)
 */
export function GroupAssignmentDashboard({
  groups,
  loading,
  groupBy = "group",
}: {
  groups: GroupAssignmentGroup[];
  loading: boolean;
  /** expert_group: 담당 항목(role)별 카드 */
  groupBy?: "group" | "role";
}) {
  const roleBuckets = useMemo(
    () => (groupBy === "role" ? buildRoleBuckets(groups) : []),
    [groupBy, groups],
  );

  const isRoleView = groupBy === "role";
  const isEmpty = isRoleView ? roleBuckets.length === 0 : groups.length === 0;

  return (
    <section
      className={cn(
        "space-y-2 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-2.5 shadow-[var(--elevation-sm)]",
        "@md:space-y-3 @md:p-4",
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-[var(--foreground)] @md:text-base">
            배정 결과
          </h2>
          {isRoleView ? (
            <p className="mt-0.5 text-xs text-[var(--muted-foreground)] @md:text-sm">
              담당 항목별
            </p>
          ) : null}
        </div>
      </header>
      {loading ? (
        <LoadingState variant="section" label="불러오는 중…" />
      ) : isEmpty ? (
        <p className="text-sm text-[var(--muted-foreground)]">
          {isRoleView ? "배정된 역할이 없습니다." : "배정된 모둠이 없습니다."}
        </p>
      ) : isRoleView ? (
        <div className="grid grid-cols-1 gap-2.5 @md:grid-cols-2 @md:gap-3 @lg:grid-cols-3 @lg:gap-4">
          {roleBuckets.map((role) => (
            <div
              key={role.roleKey}
              className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-2 shadow-sm @md:p-2.5"
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-mono font-semibold text-[var(--accent)] @md:text-lg">
                  {role.roleName}
                </p>
                <span className="text-xs text-[var(--muted-foreground)]">{role.members.length}명</span>
              </div>
              <ul className="mt-1 space-y-1.5 @md:mt-1.5 @md:space-y-1.5">
                {role.members.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between gap-2 rounded border border-[var(--border)] bg-[var(--tint-accent-weak)] px-2 py-1 text-xs @md:text-sm"
                  >
                    <span className="min-w-0 flex-1 text-[var(--foreground)]">
                      {m.nickname ?? "참가자"}
                    </span>
                    <span className="shrink-0 text-[var(--muted-foreground)]">
                      {m.groupName ?? "—"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 @md:grid-cols-2 @md:gap-3 @lg:grid-cols-3 @lg:gap-4">
          {groups.map((g) => (
            <div
              key={g.group.id}
              className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-2 shadow-sm @md:p-2.5"
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-mono font-semibold text-[var(--accent)] @md:text-lg">
                  {g.group.name ?? "—"}
                </p>
                <span className="text-xs text-[var(--muted-foreground)]">{g.members.length}명</span>
              </div>
              <ul className="mt-1 space-y-1.5 @md:mt-1.5 @md:space-y-1.5">
                {g.members.length === 0 ? (
                  <li className="rounded border border-dashed border-[var(--border)] px-2 py-1 text-sm text-[var(--muted-foreground)] @md:py-1.5 @md:text-xs">
                    아직 배정된 학생 없음
                  </li>
                ) : (
                  g.members.map((m) => (
                    <li
                      key={m.id}
                      className="flex items-center justify-between gap-2 rounded border border-[var(--border)] bg-[var(--tint-accent-weak)] px-2 py-1 text-xs @md:text-sm"
                    >
                      <span className="min-w-0 flex-1 text-[var(--foreground)]">
                        {m.nickname ?? "참가자"}
                      </span>
                      <span className="shrink-0 text-[var(--accent)]">
                        {m.zoneName ?? "—"}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
