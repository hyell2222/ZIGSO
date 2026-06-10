import { Z } from "@/lib/ui/z-index";
import { cn } from "@/lib/utils";

export const ACTIVITY_LAYOUT_MAX = "max-w-5xl";

/** 페이지 좌우 여백 — 헤더·본문·푸터 동일 */
export const activityPageGutter = "px-4 @sm:px-5 @md:px-6";

export const activityPageGutterContained = "px-3 @sm:px-4";

/** 페이지 본문·조인 화면 등 — 최대 너비 + 좌우 여백 */
export const activityPageShell = cn("mx-auto w-full", ACTIVITY_LAYOUT_MAX, activityPageGutter);

/** 단계 헤더 바 */
export const activityPhaseHeaderShell = cn(
  "shrink-0 border-b border-[color-mix(in_srgb,var(--primary)_18%,var(--border))]",
  "bg-[var(--surface)]",
  "shadow-[0_1px_0_color-mix(in_srgb,var(--primary)_8%,transparent)]",
  "motion-safe:animate-[playRevealUp_0.45s_cubic-bezier(0.22,1,0.36,1)_both]",
);

export const activityPhaseHeaderInner = cn(
  "mx-auto w-full",
  ACTIVITY_LAYOUT_MAX,
  activityPageGutter,
  "py-3 @sm:py-3.5 @md:py-4",
);

export const activityPhaseHeaderInnerContained = cn(
  activityPageGutterContained,
  "py-2.5 @sm:py-3",
);

/** 교사 — 활동 제목·참가 코드 행 (①) */
export const activitySessionMetaShell = cn(
  "border-b border-[var(--border)]",
  "bg-[var(--surface-overlay)]",
);

/** 교사 — 배정 현황 그리드 카드 (④) */
export const activityTeacherGroupCard = cn(
  "rounded-xl border border-[color-mix(in_srgb,var(--primary)_8%,var(--border))]",
  "bg-[var(--surface-overlay)] p-3.5 shadow-[var(--elevation-sm)] @md:p-4",
);

/** 교사 — 그룹 카드 안 학생 행 */
export const activityTeacherMemberRow = cn(
  "flex items-center justify-between gap-2 rounded-lg px-2.5 py-2",
  "bg-[color-mix(in_srgb,var(--tint-primary-weak)_90%,var(--surface-overlay))]",
);

/** 교사 — 대기·입장 학생 칩 */
export const activityTeacherPresenceChip = cn(
  "inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--primary)_10%,var(--border))]",
  "bg-[var(--surface-overlay)] px-3 py-1.5 shadow-[var(--elevation-sm)]",
);

/** 교사 헤더 — QR(좌) · 제목·접속(중) · 단계 버튼(우) */
export const activitySessionMetaInner = cn(
  "mx-auto flex w-full flex-wrap items-center gap-3",
  ACTIVITY_LAYOUT_MAX,
  activityPageGutter,
  "py-3 @sm:gap-4 @sm:py-3.5 @md:py-4",
);

export const activitySessionMetaInnerContained = cn(
  activityPageGutterContained,
  "gap-2 py-2.5 @sm:py-3",
);

/** 교사 본문 래퍼 (④ 배정 현황) */
export const activityPageBody = cn(
  "mx-auto w-full space-y-4",
  ACTIVITY_LAYOUT_MAX,
  activityPageGutter,
  "py-5 @sm:space-y-5 @sm:py-6 @md:py-7",
);

export const activityPageBodyContained = cn(
  "space-y-3 py-3",
  activityPageGutterContained,
);

/** 학생 play 스크롤 본문 */
export const activityMainContent = cn(
  "mx-auto w-full min-h-0",
  ACTIVITY_LAYOUT_MAX,
  activityPageGutter,
  "py-4 @sm:py-5 @md:py-6",
);

export const activityMainContentContained = cn(activityPageGutterContained, "py-3 @sm:py-3");

export const activityMainInner = "w-full min-h-0 flex-1 overflow-y-auto overscroll-y-contain";

export const activityFooterChrome = cn(
  "sticky bottom-0 shrink-0 border-t border-[color-mix(in_srgb,var(--primary)_18%,var(--border))]",
  Z.dropdown,
  "bg-[var(--surface)]",
  "shadow-[0_-1px_0_color-mix(in_srgb,var(--primary)_8%,transparent)]",
);

export const activityFooterInner = cn(
  "mx-auto w-full",
  ACTIVITY_LAYOUT_MAX,
  activityPageGutter,
  "py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]",
);

export const activityLoaderRegion = cn(
  "mx-auto flex w-full min-h-0 flex-1 flex-col items-center justify-center",
  ACTIVITY_LAYOUT_MAX,
  activityPageGutter,
  "py-10",
);

/** 세로 간격 */
export const activityStack = "space-y-4";
export const activityStackTight = "space-y-3";

/** 대시보드·대기 목록 등 섹션 카드 */
export const activitySectionCard = cn(
  activityStackTight,
  "rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-[var(--elevation-sm)]",
);

/** 학생 단계 본문 패널 카드 */
export const activityPanelCard = cn(
  activityStack,
  "rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-[var(--elevation-sm)]",
);

/** 단계 본문 — 모달과 동일한 섹션 카드 껍데기 */
export const playPhaseSectionShell =
  "overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card-bg)] shadow-[var(--elevation-sm)]";

export const playPhaseSectionHeader =
  "flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3 @md:px-5 @md:py-3.5";

export const playPhaseSectionBody = "px-4 py-4 @md:px-5 @md:py-4";

/** 섹션 카드 세로 스택 (3단계 등) */
export const playPhasePanelStack = "flex flex-col gap-4";

/** 그리드 안 모둠·아이템 카드 */
export const activityNestedCard = cn(
  "rounded-md border border-[var(--border)] bg-[var(--muted)] p-3 shadow-sm",
);

export const activityCardGrid = "grid grid-cols-1 gap-3 @sm:gap-4 @md:grid-cols-2 @lg:grid-cols-3";

/** 목록 한 줄(학생 칩·배정 행) */
export const activityListRow = cn(
  "flex items-center justify-between gap-2 rounded-md border border-[color-mix(in_srgb,var(--primary)_16%,var(--border))]",
  "bg-[var(--tint-primary-weak)] px-3 py-1.5",
);

export const activityCallout = cn(
  "rounded-lg border border-[color-mix(in_srgb,var(--primary)_30%,var(--border))]",
  "bg-[var(--tint-primary-weak)] p-4",
);

export const activityEmptyState = cn(
  "rounded-lg border border-dashed border-[color-mix(in_srgb,var(--primary)_20%,var(--border))] bg-[var(--muted)] p-6 text-center",
);

/** stepper 안내 밴드 — 부모 좌우 패딩 상쇄 */
export function activityPhaseGuideBandBleed(contained = false) {
  return contained
    ? "-mx-3 px-3 @sm:-mx-4 @sm:px-4"
    : "-mx-4 px-4 @sm:-mx-5 @sm:px-5 @md:-mx-6 @md:px-6";
}

export function activityLayoutClasses(contained = false) {
  return {
    phaseHeaderInner: cn(
      activityPhaseHeaderInner,
      contained && activityPhaseHeaderInnerContained,
    ),
    sessionMetaInner: cn(
      activitySessionMetaInner,
      contained && activitySessionMetaInnerContained,
    ),
    pageBody: cn(activityPageBody, contained && activityPageBodyContained),
    mainContent: cn(activityMainContent, contained && activityMainContentContained),
  };
}
