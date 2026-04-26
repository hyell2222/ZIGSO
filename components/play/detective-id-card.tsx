"use client";

import { clubRoleLabelKr } from "@/lib/club-role";

type Props = {
  nickname: string;
  teamName: string | null;
  zoneName: string;
  roleKey: string | null;
  /** "확인" 전엔 민감 정보 흐리게 */
  className?: string;
};

/**
 * 비밀 탐정 동아리(Mystery Club) 요원 신분 — 브리핑에서 본인 역할·이번 세션 순찰 구역을 ID 카드로 표시.
 */
export function DetectiveIdCard({ nickname, teamName, zoneName, roleKey, className }: Props) {
  const role = clubRoleLabelKr(roleKey);
  return (
    <div
      className={
        "mx-auto w-full max-w-sm overflow-hidden rounded-xl border-2 border-[var(--mystery)]/35 bg-gradient-to-b from-[var(--background)] to-[var(--surface)] shadow-[0_12px_40px_var(--mystery-glow)] " +
        (className ?? "")
      }
    >
      <div className="border-b border-[var(--mystery)]/20 bg-[var(--mystery)]/9 px-4 py-2">
        <p className="text-center text-[10px] font-semibold tracking-[0.2em] text-[var(--mystery)]">
          Mystery Club
        </p>
        <p className="text-center text-[9px] text-[var(--muted-foreground)]">대외비 · 현장 요원</p>
      </div>
      <div className="space-y-3 px-4 py-4">
        <div className="flex justify-between gap-2 text-sm">
          <span className="text-[var(--muted-foreground)]">닉네임</span>
          <span className="font-semibold text-[var(--foreground)]">{nickname || "—"}</span>
        </div>
        <div className="flex justify-between gap-2 text-sm">
          <span className="text-[var(--muted-foreground)]">팀</span>
          <span className="font-mono font-semibold text-[var(--primary)]">{teamName?.trim() || "미배정"}</span>
        </div>
        <div className="h-px bg-[var(--border)]" />
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[var(--mystery)]">이번 사건에서의 직책</p>
          <p className="text-lg font-semibold text-[var(--foreground)]">{role}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[var(--mystery)]">순찰·조사 구역</p>
          <p className="text-base font-medium text-[var(--foreground)]">{zoneName || "—"}</p>
        </div>
      </div>
      <div className="bg-[var(--mystery)]/6 px-4 py-2 text-center">
        <p className="text-[9px] text-[var(--muted-foreground)]">의뢰 종료 시 폐기 · 외부 유출 금지</p>
      </div>
    </div>
  );
}
