"use client";

type Player = { id: string; nickname: string | null };

type Props = {
  players: Player[];
};

/** 호스트 대기 학생 칩 — `app/sessions`·샌드박스 동일 마크업 */
export function SessionHostWaitingRoster({ players }: Props) {
  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-3 shadow-[var(--elevation-sm)] md:p-4">
      <p className="mb-2 text-[11px] font-medium text-[var(--muted-foreground)] md:mb-2.5 md:text-xs">
        대기 학생
      </p>
      {players.length === 0 ? (
        <p className="py-2 text-center text-xs text-[var(--muted-foreground)]">아직 없음</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {players.map((p) => (
            <li
              key={p.id}
              className="inline-flex min-h-9 touch-manipulation items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--tint-accent-weak)] px-2 py-1 text-xs md:px-2.5 md:text-sm"
            >
              <span className="h-1 w-1 rounded-full bg-[var(--primary)]" aria-hidden />
              <span className="font-medium text-[var(--foreground)]">{p.nickname ?? "참가자"}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
