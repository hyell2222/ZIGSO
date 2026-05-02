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
  iconClassName,
}: {
  icon: typeof User;
  label: string;
  value: string;
  valueClassName?: string;
  iconClassName?: string;
}) {
  return (
    <div className="flex gap-3 rounded-lg border border-[var(--play-border-cool)] bg-[var(--play-inset)] p-3 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--on-primary)_22%,transparent)]">
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-[var(--primary)] ring-1 ring-[color-mix(in_srgb,var(--primary)_18%,transparent)]",
          iconClassName ?? "bg-[var(--play-chip-cool)]",
        )}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold text-[var(--muted-foreground)]">{label}</p>
        <p
          className={cn("mt-0.5 break-words text-base font-semibold text-[var(--foreground)]", valueClassName)}
        >
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

/**
 * 플레이어 부원증 — 사건 파악에서 본인 역할·조사 장소을 ID 카드로 표시.
 */
export function PlayerIdCard({ nickname, teamName, zoneName, roleKey, className }: Props) {
  const role = clubRoleLabelKr(roleKey);
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-md overflow-hidden rounded-2xl border-2 border-[var(--border)]",
        "bg-[var(--card-bg)] shadow-[var(--elevation-sm)]",
        "motion-safe:animate-[playRevealUp_0.7s_cubic-bezier(0.22,1,0.36,1)_both]",
        className,
      )}
    >
      <div className="relative border-b-2 border-[var(--border)] bg-[var(--panel-warn-bg)] px-4 py-3">
        <p className="text-center text-[11px] font-bold tracking-[0.22em] text-[var(--primary)]">
          MYSTERY CLUB
        </p>
        <p className="mt-1 text-center text-md font-bold text-[var(--highlight)]">
          부원증
        </p>
      </div>
      <div className="space-y-3 p-4">
        <Row icon={User} label="닉네임" value={nickname} />
        <Row
          icon={IdCard}
          label="소속 팀"
          value={teamName?.trim() || "미배정"}
          valueClassName="font-mono text-[var(--primary)]"
          iconClassName="bg-[var(--tint-accent-medium)] text-[var(--primary)]"
        />
        <Row
          icon={Shield}
          label="이번 사건 동아리 직책"
          value={role}
          iconClassName="bg-[var(--tint-accent-medium)] text-[var(--accent)]"
        />
        <Row icon={MapPin} label="조사·조사 장소 (이 맵만 조사)" value={zoneName} />
      </div>
      <div className="border-t border-[var(--play-border-cool)] bg-[var(--play-panel)] px-4 py-2.5 text-center">
        <p className="text-[10px] text-[var(--muted-foreground)]">의뢰 종료 시 폐기 · 외부 유출 금지</p>
      </div>
    </div>
  );
}
