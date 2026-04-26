"use client";

import { IdCard, MapPin, Shield, User } from "lucide-react";

import { clubRoleLabelKr } from "@/lib/club-role";
import { cn } from "@/lib/utils";

type Props = {
  nickname: string;
  teamName: string | null;
  zoneName: string;
  roleKey: string | null;
  className?: string;
};

function Row({
  icon: Icon,
  label,
  value,
  valueClassName,
}: {
  icon: typeof User;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex gap-3 rounded-lg border border-[var(--border)]/80 bg-[var(--card-bg)]/90 p-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--tint-accent)] text-[var(--accent)]">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold text-[var(--muted-foreground)]">{label}</p>
        <p className={cn("mt-0.5 break-words text-base font-semibold text-[var(--foreground)]", valueClassName)}>
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

/**
 * 비밀 탐정 동아리(Mystery Club) 요원 신분 — 브리핑에서 본인 역할·순찰 구역을 ID 카드로 표시.
 */
export function DetectiveIdCard({ nickname, teamName, zoneName, roleKey, className }: Props) {
  const role = clubRoleLabelKr(roleKey);
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-md overflow-hidden rounded-2xl border-2 border-[var(--mystery)]/40 bg-gradient-to-b from-[var(--background)] via-[var(--surface)] to-[var(--background)] shadow-[0_16px_48px_color-mix(in_srgb,var(--mystery)_18%,transparent)]",
        className,
      )}
    >
      <div className="border-b-2 border-[var(--mystery)]/25 bg-[var(--mystery)]/10 px-4 py-3">
        <p className="text-center text-[11px] font-bold tracking-[0.22em] text-[var(--mystery)]">MYSTERY CLUB</p>
        <p className="mt-1 text-center text-xs text-[var(--muted-foreground)]">부원증 · 브리핑 1단계</p>
      </div>
      <div className="space-y-3 p-4">
        <Row icon={User} label="플레이어 닉네임" value={nickname} />
        <Row
          icon={IdCard}
          label="소속 팀"
          value={teamName?.trim() || "미배정"}
          valueClassName="font-mono text-[var(--primary)]"
        />
        <Row icon={Shield} label="이번 사건 동아리 직책" value={role} />
        <Row icon={MapPin} label="순찰·조사 구역 (이 맵만 조사)" value={zoneName} />
      </div>
      <div className="border-t border-[var(--border)] bg-[var(--mystery)]/5 px-4 py-2.5 text-center">
        <p className="text-[10px] text-[var(--muted-foreground)]">의뢰 종료 시 폐기 · 외부 유출 금지</p>
      </div>
    </div>
  );
}
