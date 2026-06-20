import { Z } from "@/lib/ui/z-index";
import { cn } from "@/lib/utils";

export const ACTIVITY_LAYOUT_MAX = "max-w-3xl";

/** TopNav·교사 서브내비와 동일한 가로 폭 */
export const appNavContentShell = "mx-auto w-full max-w-5xl px-4";

/** GuideModalScope — play/session/sandbox 패널 루트 */
export const activityGuideModalScope = cn(
  "@container flex h-full min-h-0 w-full flex-col overflow-hidden",
);

/** 실세션·play 뷰포트 루트 — 샌드박스 패널과 동일 full-bleed */
export const activityViewportRoot = cn(
  activityGuideModalScope,
  "h-dvh pt-[env(safe-area-inset-top,0px)]",
);

/** 실세션·play — 배너·본문·푸터 공통 full-bleed (폭은 appNavContentShell) */
export const activityLayoutFrame = cn(
  "flex h-full min-h-0 w-full flex-col overflow-hidden",
);

/** 배너·본문·푸터 — TopNav와 동일 폭 */
export const activityPageColumn = appNavContentShell;

/** 프레임 없이 단독 사용 (조인·랜딩 등) */
export const activityPageShell = appNavContentShell;

export const activitySessionHeaderPaddingContained = "py-2.5 @sm:py-3";

export const activitySessionHeaderRowContained = cn(
  "flex w-full flex-wrap items-end gap-4",
  "min-h-12",
  activitySessionHeaderPaddingContained,
);

/** 학생 play 상단 배너 — 교사 헤더보다 얇게 */
export const activityPlayStudentHeaderPaddingContained = "py-1.5 @sm:py-2";

export const activityPlayStudentHeaderRowContained = cn(
  "flex w-full flex-wrap items-center gap-2.5",
  activityPlayStudentHeaderPaddingContained,
);

/** 배너 액션 버튼 — 좁은 화면 sm, @md 이상 default (Button size="sm"과 함께) */
export const activityBannerButtonClass =
  "gap-2 @md:h-10 @md:min-h-10 @md:px-4 @md:text-base";

/** 배너 ? 안내 버튼 — 좁은 화면 축소 */
export const activityBannerHelpButtonClass =
  "h-4 w-4 [&_svg]:h-3 [&_svg]:w-3 @md:h-5 @md:w-5 @md:[&_svg]:h-3.5 @md:[&_svg]:w-3.5";

/** overview — 모둠·역할 안내 카드 (중앙 강조) */
export const activityOverviewAssignmentCard = cn(
  "w-[min(100%,20rem)] @sm:w-[min(100%,24rem)] @md:w-[min(100%,26rem)]",
  "rounded-2xl border-2 border-[color-mix(in_srgb,var(--primary)_38%,var(--border))]",
  "bg-[linear-gradient(180deg,color-mix(in_srgb,var(--primary)_12%,var(--play-panel)),color-mix(in_srgb,var(--play-panel)_96%,var(--surface)))]",
  "shadow-[var(--play-shadow-lift),0_0_0_1px_color-mix(in_srgb,var(--primary)_6%,transparent)]",
  "motion-safe:animate-[playRevealUp_0.48s_cubic-bezier(0.22,1,0.36,1)_both]",
);

/** 교사 — 활동 제목·참가 코드 행 (①) */
export const activitySessionMetaShell = cn(
  "border-b border-[var(--border)]",
  "bg-[var(--surface-overlay)]",
);

/** 교사 — 배정 현황 그리드 카드 (④) */
export const activityTeacherGroupCard = cn(
  "w-full min-w-0",
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

/** 교사 헤더 — TopNav와 동일 max-w-5xl · px-4 */
export const activitySessionMetaInner = cn(appNavContentShell, activitySessionHeaderRowContained);

/** 본문 세로 여백 — 좌우 gutter는 pageColumn에서 */
export const activityBodyPaddingY = "py-6 @sm:py-8 @md:py-10";

/** 본문 하단 — safe-area 포함 */
export const activityBodyPaddingBottomContained =
  "pb-[max(1rem,env(safe-area-inset-bottom,0px))] @sm:pb-[max(1.25rem,env(safe-area-inset-bottom,0px))]";

/** 교사 본문 래퍼 (④ 배정 현황) */
export const activityPageBody = cn(
  activityPageColumn,
  activityBodyPaddingBottomContained,
);

/** 배너·푸터 사이 full-bleed 스크롤 — 패딩·max-width 없음 (스크롤바는 패널 가장자리) */
export const activityScrollBodyShell = cn(
  "flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain",
  "w-full [-webkit-overflow-scrolling:touch]",
);

export const activityFooterChrome = cn(
  "shrink-0 border-t border-[color-mix(in_srgb,var(--primary)_18%,var(--border))]",
  Z.dropdown,
  "bg-[var(--surface)]",
  "shadow-[0_-1px_0_color-mix(in_srgb,var(--primary)_8%,transparent)]",
);

export const activityFooterInner = cn(
  activityPageColumn,
  "py-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))]",
);

/** PlayPhaseShell 등 이미 본문 여백이 있는 영역 안 — gutter 중복 없음 */
export const activityLoaderRegionInset =
  "flex w-full min-h-0 flex-1 flex-col items-center justify-center";

/** 단계 본문 — 모달과 동일한 섹션 카드 껍데기 */
export const playPhaseSectionShell =
  "overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card-bg)] shadow-[var(--elevation-sm)]";

/** 교사 활동 에디터 — CardHeader·play 섹션과 동일한 톤 */
export const activityEditorHeaderBg =
  "bg-[color-mix(in_srgb,var(--tint-primary-weak)_55%,var(--surface))]";

export const activityEditorPanelBg = "bg-[var(--card-bg)]";

/** 지문 카드 — primary 계열 */
export const activityEditorSegmentPanelBg =
  "bg-[color-mix(in_srgb,var(--tint-primary-weak)_42%,var(--card-bg))]";

export const activityEditorSegmentHeaderBorder = "border-[var(--border)]";

export const activityEditorSegmentFieldClass =
  "border-[var(--border)] bg-[var(--surface-overlay)]";

/** 문제 카드 — accent 계열 */
export const activityEditorQuestionPanelBg =
  "bg-[color-mix(in_srgb,var(--tint-accent-weak)_48%,var(--card-bg))]";

export const activityEditorQuestionHeaderBorder = "border-[var(--border)]";

export const activityEditorInsetCard =
  "rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-[var(--input-inset)]";

export const activityEditorQuestionCard =
  "overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-overlay)] shadow-[var(--elevation-sm)]";

export const activityEditorQuestionCardToolbar =
  "flex items-center justify-between gap-2 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--tint-accent-weak)_55%,var(--surface-overlay))] px-3 py-2";

export const activityEditorNumberBadge =
  "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--tint-primary-weak)] text-sm font-bold tabular-nums text-[var(--primary-muted)]";

export const activityEditorChipActive =
  "border-[color-mix(in_srgb,var(--primary)_38%,var(--border))] bg-[var(--tint-primary-medium)] text-[var(--primary)]";

export const activityEditorChoicePreviewCorrect =
  "border-[var(--primary)] bg-[var(--tint-primary-medium)]";

export const playPhaseSectionHeader =
  "flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3 @md:px-5 @md:py-3.5";

export const playPhaseSectionBody = "px-4 py-4 @md:px-5 @md:py-4";

/** 섹션 카드 세로 스택 (3단계 등) */
export const playPhasePanelStack = "flex flex-col gap-4";

/** 2단계 — 지문·연습 문제 좌우 2열 (좁은 화면은 세로 스택) */
export const playPhaseDualSectionGrid =
  "grid w-full grid-cols-1 items-start gap-4 @md:grid-cols-2 @md:gap-5";

export const playPhaseTripleSectionGrid =
  "grid w-full grid-cols-1 items-start gap-4 @md:grid-cols-3 @md:gap-5";

export const activityCardGrid = cn(
  "grid w-full grid-cols-1 gap-3 @md:grid-cols-2 @md:gap-4 @lg:grid-cols-3",
);

export function activityLayoutClasses() {
  return {
    layoutFrame: activityLayoutFrame,
    pageColumn: activityPageColumn,
    sessionMetaInner: activitySessionMetaInner,
    pageBody: activityPageBody,
  };
}
