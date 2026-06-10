/**
 * 활동·세션 화면 공통 타이포.
 * KERISBAEUM 위계: EB(제목) · B(소제목) · R(본문) · L(보조)
 */
export const activityLayoutType = {
  /** 최상단 활동명 (교사 메타 헤더) — EB */
  activityTitleContained:
    "break-words font-mono text-xl font-bold leading-tight tracking-wide text-[var(--accent)] @md:text-2xl",
  /** R / L */
  activityMetaStrong: "font-bold text-[var(--foreground)]",
  activityMetaContained: "text-xs font-light text-[var(--muted-foreground)]",
  /** 단계 본문 안 카드·블록 제목 — B */
  sectionTitle: "text-base font-bold text-[var(--foreground)] @md:text-lg",
  sectionSubtitle: "mt-0.5 text-xs font-light leading-snug text-[var(--muted-foreground)] @md:text-sm",

  /** 패널·카드 본문 안 소제목 — B */
  panelSectionTitle: "text-sm font-bold text-[var(--foreground)]",

  /** 학생 play 패널 카드 — B(섹션) · R(본문) · L(메타) */
  playPanelSection: "text-base font-bold text-[var(--foreground)] @md:text-lg",
  playPanelBody: "text-sm font-normal leading-relaxed text-[var(--muted-foreground)]",
  playPanelChip: "text-xs font-normal text-[var(--foreground)]",
  playPanelMessage: "text-sm font-normal",

  listRowPrimary: "text-xs font-normal text-[var(--foreground)] @md:text-sm",
  listRowSecondary: "shrink-0 text-xs font-light text-[var(--muted-foreground)]",

  bodyMuted: "text-sm font-normal leading-relaxed text-[var(--muted-foreground)]",
  caption: "text-xs font-light text-[var(--muted-foreground)]",
} as const;
