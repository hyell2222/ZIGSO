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
    <div className="flex gap-3 rounded-lg border border-[color-mix(in_srgb,var(--primary)_22%,transparent)] bg-[color-mix(in_srgb,var(--ink)_22%,#100e0c)] p-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--primary)_18%,transparent)] text-[color:var(--entry-accent-soft)]">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold text-[color:var(--entry-parchment-muted)]">{label}</p>
        <p
          className={cn(
            "mt-0.5 break-words text-base font-semibold text-[color:var(--entry-parchment)]",
            valueClassName,
          )}
        >
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

/**
 * 플레이어 부원증 — 브리핑에서 본인 역할·순찰 구역을 ID 카드로 표시.
 */
export function PlayerIdCard({ nickname, teamName, zoneName, roleKey, className }: Props) {
  const role = clubRoleLabelKr(roleKey);
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-md overflow-hidden rounded-2xl border-2 border-[color-mix(in_srgb,var(--primary)_38%,transparent)]",
        "bg-gradient-to-b from-[color-mix(in_srgb,var(--mystery)_72%,var(--ink))] via-[color-mix(in_srgb,var(--mystery)_58%,#12100e)] to-[color-mix(in_srgb,var(--ink)_85%,#0c0a09)]",
        "shadow-[0_16px_48px_color-mix(in_srgb,var(--ink)_50%,transparent),0_0_0_1px_color-mix(in_srgb,var(--primary)_16%,transparent)]",
        "motion-safe:animate-[playRevealUp_0.7s_cubic-bezier(0.22,1,0.36,1)_both]",
        "motion-safe:ring-1 motion-safe:ring-[color-mix(in_srgb,var(--primary)_22%,transparent)]",
        className,
      )}
    >
      <div
        className="relative border-b-2 border-[color-mix(in_srgb,var(--primary)_22%,transparent)] px-4 py-3 motion-safe:animate-[playIdShimmer_8s_ease-in-out_infinite] motion-reduce:animate-none"
        style={{
          background:
            "linear-gradient(100deg, color-mix(in srgb, var(--mystery) 18%, transparent) 0%, color-mix(in srgb, var(--primary) 14%, #151210) 42%, color-mix(in srgb, var(--mystery) 18%, transparent) 100%)",
          backgroundSize: "200% 100%",
        }}
      >
        <p className="text-center text-[11px] font-bold tracking-[0.22em] text-[color:var(--entry-accent-soft)]">
          MYSTERY CLUB
        </p>
        <p className="mt-1 text-center text-xs text-[color:var(--entry-parchment-muted)]">부원증 · 브리핑 1단계</p>
      </div>
      <div className="space-y-3 p-4">
        <Row icon={User} label="닉네임" value={nickname} />
        <Row
          icon={IdCard}
          label="소속 팀"
          value={teamName?.trim() || "미배정"}
          valueClassName="font-mono text-[color:var(--entry-accent-soft)]"
        />
        <Row icon={Shield} label="이번 사건 동아리 직책" value={role} />
        <Row icon={MapPin} label="순찰·조사 구역 (이 맵만 조사)" value={zoneName} />
      </div>
      <div className="border-t border-[color-mix(in_srgb,var(--primary)_14%,transparent)] bg-[color-mix(in_srgb,var(--mystery)_35%,#0f0d0b)] px-4 py-2.5 text-center">
        <p className="text-[10px] text-[color:var(--entry-parchment-muted)]">의뢰 종료 시 폐기 · 외부 유출 금지</p>
      </div>
    </div>
  );
}
