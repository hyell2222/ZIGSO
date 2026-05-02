"use client";

import type { ReactNode } from "react";

import { Textarea } from "@/components/ui/textarea";
import type { SuspectEntry } from "@/lib/suspects";
import { cn } from "@/lib/utils";

export type FinalReportFieldValues = {
  suspectId: string;
  method: string;
  motive: string;
  decisiveClue: string;
};

export type FinalReportTheme = "play" | "parchment";

type ThemeStyles = {
  label: string;
  select: string;
  textarea: string;
  banner: string;
  bannerHeading: string;
  bannerBody: string;
  bannerTimestamp: string;
};

const THEMES: Record<FinalReportTheme, ThemeStyles> = {
  play: {
    label: "text-xs font-medium text-[var(--accent)]",
    select:
      "border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] shadow-[inset_var(--input-inset)]",
    textarea: "border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]",
    banner:
      "rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-3 shadow-[inset_var(--input-inset)]",
    bannerHeading: "text-[var(--accent)]",
    bannerBody: "text-[var(--foreground)]",
    bannerTimestamp: "text-[var(--muted-foreground)]",
  },
  parchment: {
    label: "text-xs font-medium text-[color:var(--entry-accent-soft)]",
    select:
      "border-[color-mix(in_srgb,var(--accent)_28%,transparent)] bg-[color-mix(in_srgb,var(--mystery)_65%,var(--ink))] text-[color:var(--entry-parchment)]",
    textarea:
      "border-[color-mix(in_srgb,var(--accent)_28%,transparent)] bg-[color-mix(in_srgb,var(--ink)_32%,#12100e)] text-[color:var(--entry-parchment)]",
    banner:
      "rounded-md border border-[color-mix(in_srgb,var(--primary)_40%,transparent)] bg-[color-mix(in_srgb,var(--primary)_14%,#141a17)] px-3 py-2.5 shadow-[0_0_20px_color-mix(in_srgb,var(--primary)_8%,transparent)]",
    bannerHeading: "text-[color:var(--entry-accent-soft)]",
    bannerBody: "text-[color:var(--entry-parchment)]",
    bannerTimestamp: "text-[color:var(--entry-parchment-muted)]",
  },
};

type FieldsProps = {
  values: FinalReportFieldValues;
  suspectRoster: SuspectEntry[];
  readOnly?: boolean;
  onChange?: (next: FinalReportFieldValues) => void;
  theme?: FinalReportTheme;
  idPrefix?: string;
  /** readOnly 모드에서 용의자 명단이 비어있을 때 select 안에 보여줄 fallback 이름. */
  emptyRosterSuspectName?: string;
  /** edit 모드에서 용의자 명단이 비어있을 때 select 자리에 대신 렌더할 노드. */
  emptyRosterEditFallback?: ReactNode;
};

/** 최종 보고서 4개 필드(범인/수법/동기/단서). 읽기·편집 모드를 모두 지원. */
export function FinalReportFields({
  values,
  suspectRoster,
  readOnly = false,
  onChange,
  theme = "play",
  idPrefix = "final-report",
  emptyRosterSuspectName,
  emptyRosterEditFallback,
}: FieldsProps) {
  const styles = THEMES[theme];
  const labelClass = cn(styles.label);
  const update = (patch: Partial<FinalReportFieldValues>) => {
    if (readOnly) return;
    onChange?.({ ...values, ...patch });
  };

  const suspectFieldId = `${idPrefix}-suspect`;
  const showEmptyRosterEdit = !readOnly && suspectRoster.length === 0;

  return (
    <>
      {showEmptyRosterEdit ? (
        emptyRosterEditFallback ?? null
      ) : (
        <div className="space-y-2">
          <label className={labelClass} htmlFor={suspectFieldId}>
            지목한 범인 (용의자 중 1명) <span className="text-[var(--danger)]">*</span>
          </label>
          <select
            id={suspectFieldId}
            className={cn(
              "flex h-11 w-full rounded-md border px-3 text-sm",
              styles.select,
              readOnly && "cursor-not-allowed opacity-95",
            )}
            value={values.suspectId}
            onChange={readOnly ? undefined : (ev) => update({ suspectId: ev.target.value })}
            disabled={readOnly}
            required={!readOnly}
          >
            {!readOnly ? <option value="">용의자를 선택해주세요</option> : null}
            {suspectRoster.length === 0 ? (
              <option value={values.suspectId}>
                {emptyRosterSuspectName?.trim() || values.suspectId.trim() || "—"}
              </option>
            ) : (
              suspectRoster.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name || s.id}
                </option>
              ))
            )}
          </select>
        </div>
      )}

      <FinalReportTextField
        label={<span>범행 도구 · 수법 <span className="text-[var(--danger)]">*</span></span>}
        value={values.method}
        readOnly={readOnly}
        labelClass={labelClass}
        textareaClass={styles.textarea}
        onChange={(next) => update({ method: next })}
      />
      <FinalReportTextField
        label={<span>범행 동기 <span className="text-[var(--danger)]">*</span></span>}
        value={values.motive}
        readOnly={readOnly}
        labelClass={labelClass}
        textareaClass={styles.textarea}
        onChange={(next) => update({ motive: next })}
      />
      <FinalReportTextField
        label={<span>결정적 단서 <span className="text-[var(--danger)]">*</span></span>}
        value={values.decisiveClue}
        readOnly={readOnly}
        labelClass={labelClass}
        textareaClass={styles.textarea}
        onChange={(next) => update({ decisiveClue: next })}
      />
    </>
  );
}

function FinalReportTextField({
  label,
  value,
  readOnly,
  labelClass,
  textareaClass,
  onChange,
}: {
  label: ReactNode;
  value: string;
  readOnly: boolean;
  labelClass: string;
  textareaClass: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className={labelClass}>{label}</label>
      <Textarea
        rows={3}
        value={value}
        readOnly={readOnly}
        required={!readOnly}
        className={cn(textareaClass, readOnly && "cursor-default")}
        onChange={readOnly ? undefined : (ev) => onChange(ev.target.value)}
      />
    </div>
  );
}

type BannerProps = {
  submittedAt: string | null | undefined;
  title?: string;
  description: string;
  theme?: FinalReportTheme;
  className?: string;
};

/** 최종 보고가 제출된 후 보여주는 안내 배너. */
export function FinalReportSubmittedBanner({
  submittedAt,
  title = "제출 완료",
  description,
  theme = "play",
  className,
}: BannerProps) {
  const styles = THEMES[theme];
  return (
    <div className={cn(styles.banner, className)}>
      <p className={cn("text-xs font-semibold uppercase tracking-wider", styles.bannerHeading)}>
        {title}
      </p>
      <p className={cn("mt-1 font-medium", styles.bannerBody)}>{description}</p>
      {submittedAt ? (
        <p className={cn("mt-1 text-xs", styles.bannerTimestamp)}>
          {new Date(submittedAt).toLocaleString("ko-KR")}
        </p>
      ) : null}
    </div>
  );
}
