/**
 * 활동·세션 화면 공통 타이포 (전체 화면 / 샌드박스 `contained`).
 */
export const activityLayoutType = {
  /** 최상단 활동명 (교사 메타 헤더) */
  activityTitle:
    "break-words text-xl font-bold leading-tight tracking-tight text-[var(--foreground)] @md:text-2xl",
  activityTitleContained:
    "break-words font-mono text-base font-semibold leading-tight tracking-wide text-[var(--accent)] @md:text-lg",
  activityMeta: "text-sm text-[var(--muted-foreground)]",
  activityMetaStrong: "font-semibold text-[var(--foreground)]",
  activityMetaContained: "text-xs text-[var(--muted-foreground)]",

  /** 단계 헤더 — 활동명보다 한 단계 작게, 본문 섹션보다 큼 */
  phaseStep: "text-xs font-semibold uppercase tracking-wider text-[var(--accent)] @md:text-sm",
  phaseTitle:
    "text-lg font-bold leading-tight text-[var(--foreground)] @md:text-xl @md:leading-snug",
  phaseTitleExpanded:
    "text-lg font-bold leading-tight text-[var(--foreground)] @md:text-xl @md:leading-snug",
  phaseDescription: "text-sm leading-snug text-[var(--muted-foreground)] @md:leading-relaxed",
  phaseDescriptionExpanded:
    "text-sm leading-relaxed text-[var(--muted-foreground)] @md:text-base @md:leading-relaxed",

  /** 단계 본문 안 카드·블록 제목 (배정 결과, STAD 모둠 순위 등) — 단계 제목보다 작게 */
  sectionTitle: "text-base font-semibold text-[var(--foreground)] @md:text-lg",
  sectionSubtitle: "mt-0.5 text-xs leading-snug text-[var(--muted-foreground)] @md:text-sm",

  /** 패널·카드 본문 안 소제목 (학생 홈 집단 등) */
  panelSectionTitle: "text-sm font-semibold text-[var(--foreground)]",

  /** 섹션 카드 안 모둠·아이템명 (배정·진행) — 섹션 제목보다 작게 */
  nestedCardHeader: "text-sm font-mono font-semibold text-[var(--accent)] @md:text-base",
  /** 목록·칩 한 줄 — 본문 (코드네임 등), 섹션·카드 헤더보다 작게 */
  listRowPrimary: "text-xs font-medium text-[var(--foreground)] @md:text-sm",
  listRowSecondary: "shrink-0 text-xs text-[var(--muted-foreground)]",

  /** 섹션 카드 안 모둠·순위 행 (배정·진행·결과 공통) */
  nestedCardLead: "text-sm font-mono font-semibold text-[var(--accent)] @md:text-lg",
  nestedCardTitle: "text-sm font-medium text-[var(--foreground)]",
  nestedCardScore: "text-sm font-semibold tabular-nums text-[var(--primary)] @md:text-lg",
  nestedCardMeta: "mt-1 text-sm text-[var(--muted-foreground)]",
  nestedCardBadge: "text-xs text-[var(--muted-foreground)]",
  /** 카드 하단 부가 정보 (MVP 등) — 섹션 제목보다 작게 */
  nestedCardFootnote: "text-xs leading-relaxed text-[var(--muted-foreground)]",
  nestedCardFootnoteStrong: "font-semibold text-[var(--foreground)]",
  nestedCardFootnoteLabel: "font-semibold uppercase tracking-wide text-[var(--accent)]",

  body: "text-sm leading-relaxed",
  bodyMuted: "text-sm leading-relaxed text-[var(--muted-foreground)]",
  caption: "text-xs text-[var(--muted-foreground)]",
} as const;
