"use client";

import { LoadingState } from "@/components/ui/loading-state";

export type GroupAssignmentMember = {
  id: string;
  nickname: string | null;
  /** 부원에게 배정된 전문 재료 이름 */
  zoneName: string | null;
};

export type GroupAssignmentGroup = {
  group: { id: string; name: string | null };
  members: GroupAssignmentMember[];
};

/**
 * 호스트 화면 — 팀·장소 배정 결과 카드 묶음.
 * (실 세션·샌드박스 양쪽에서 동일 외관으로 사용합니다.)
 */
export function GroupAssignmentDashboard({
  groups,
  loading,
}: {
  groups: GroupAssignmentGroup[];
  loading: boolean;
}) {
  return (
    <section className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-[var(--elevation-sm)]">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            배정 결과
          </h2>
        </div>
      </header>
      {loading ? (
        <LoadingState variant="section" label="불러오는 중…" />
      ) : groups.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">
          배정된 팀이 없습니다.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:gap-3 lg:grid-cols-3">
          {groups.map((g) => (
            <div
              key={g.group.id}
              className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-2.5 shadow-sm"
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-mono text-lg font-semibold text-[var(--accent)]">
                  {g.group.name ?? "—"}
                </p>
                <span className="text-[10px] text-[var(--muted-foreground)]">
                  {g.members.length}명
                </span>
              </div>
              <ul className="mt-1.5 space-y-1">
                {g.members.length === 0 ? (
                  <li className="rounded border border-dashed border-[var(--border)] px-2 py-1.5 text-xs text-[var(--muted-foreground)]">
                    아직 배정된 학생 없음
                  </li>
                ) : (
                  g.members.map((m) => (
                    <li
                      key={m.id}
                      className="flex items-center justify-between gap-2 rounded border border-[var(--border)] bg-[var(--tint-accent-weak)] px-2 py-1 text-[11px]"
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
