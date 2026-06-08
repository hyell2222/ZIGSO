/**
 * 활동·세션 화면 공통 타이포 (전체 화면 / 샌드박스 `contained`).
 * KERISBAEUM 위계: EB(제목) · B(소제목) · R(본문) · L(보조)
 */
export const activityLayoutType = {
  /** 최상단 활동명 (교사 메타 헤더) — EB */
  activityTitle:
    "break-words text-xl font-extrabold leading-tight tracking-tight text-[var(--foreground)] @md:text-2xl",
  activityTitleContained:
    "break-words font-mono text-base font-bold leading-tight tracking-wide text-[var(--accent)] @md:text-lg",
  /** R / L */
  activityMeta: "text-sm font-normal text-[var(--muted-foreground)]",
  activityMetaStrong: "font-bold text-[var(--foreground)]",
  activityMetaContained: "text-xs font-light text-[var(--muted-foreground)]",

  /** 단계 헤더 — EB(제목) · B(스텝) · R/L(설명) */
  phaseStep: "text-xs font-bold uppercase tracking-wider text-[var(--accent)] @md:text-sm",
  phaseTitle:
    "text-lg font-extrabold leading-tight text-[var(--foreground)] @md:text-xl @md:leading-snug",
  phaseTitleExpanded:
    "text-lg font-extrabold leading-tight text-[var(--foreground)] @md:text-xl @md:leading-snug",
  phaseDescription: "text-sm font-normal leading-snug text-[var(--muted-foreground)] @md:leading-relaxed",
  phaseDescriptionExpanded:
    "text-sm font-normal leading-relaxed text-[var(--muted-foreground)] @md:text-base @md:leading-relaxed",

  /** 단계 본문 안 카드·블록 제목 — B */
  sectionTitle: "text-base font-bold text-[var(--foreground)] @md:text-lg",
  sectionSubtitle: "mt-0.5 text-xs font-light leading-snug text-[var(--muted-foreground)] @md:text-sm",

  /** 패널·카드 본문 안 소제목 — B */
  panelSectionTitle: "text-sm font-bold text-[var(--foreground)]",

  /** 학생 play 패널 카드 — B(섹션) · R(본문) · L(메타) */
  playPanelSection: "text-base font-bold text-[var(--foreground)] @md:text-lg",
  playPanelLead: "text-sm font-bold text-[var(--foreground)] @md:text-base",
  playPanelBody: "text-sm font-normal leading-relaxed text-[var(--muted-foreground)]",
  playPanelHint: "text-xs font-bold text-[var(--foreground)]",
  playPanelRow: "text-xs font-normal text-[var(--foreground)] @md:text-sm",
  playPanelRowMeta: "text-xs font-light text-[var(--muted-foreground)]",
  playPanelChip: "text-xs font-normal text-[var(--foreground)]",
  playPanelCalloutTitle: "text-sm font-extrabold text-[var(--primary)] @md:text-base",
  playPanelCalloutBody: "text-sm font-normal text-[var(--muted-foreground)]",
  playPanelCalloutFootnote: "text-xs font-light text-[var(--muted-foreground)]",
  playPanelMessage: "text-sm font-normal",

  /** 섹션 카드 안 모둠·아이템명 — B */
  nestedCardHeader: "text-sm font-mono font-bold text-[var(--accent)] @md:text-base",
  listRowPrimary: "text-xs font-normal text-[var(--foreground)] @md:text-sm",
  listRowSecondary: "shrink-0 text-xs font-light text-[var(--muted-foreground)]",

  nestedCardLead: "text-sm font-mono font-bold text-[var(--accent)] @md:text-lg",
  nestedCardTitle: "text-sm font-normal text-[var(--foreground)]",
  nestedCardScore: "text-sm font-bold tabular-nums text-[var(--primary)] @md:text-lg",
  nestedCardMeta: "mt-1 text-sm font-normal text-[var(--muted-foreground)]",
  nestedCardBadge: "text-xs font-light text-[var(--muted-foreground)]",
  nestedCardFootnote: "text-xs font-light leading-relaxed text-[var(--muted-foreground)]",
  nestedCardFootnoteStrong: "font-bold text-[var(--foreground)]",
  nestedCardFootnoteLabel: "font-bold uppercase tracking-wide text-[var(--accent)]",

  body: "text-sm font-normal leading-relaxed",
  bodyMuted: "text-sm font-normal leading-relaxed text-[var(--muted-foreground)]",
  caption: "text-xs font-light text-[var(--muted-foreground)]",
} as const;
