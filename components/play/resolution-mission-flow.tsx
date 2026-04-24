"use client";

/**
 * 최종 미션(Final Mission) 단계의 진행 UI (controlled view).
 *
 * 학생이 최종 미션 맵(=resolutionLocation)에 입장한 뒤, 맵 위에 떠 있는 미션 카드와
 * 단계별 모달을 통해 다음 흐름을 진행한다:
 *
 *   1단계 (이미 완료): 미션 진입 코드 입력  ← `app/play/page.tsx` 의 진입 폼
 *   2단계 (이 컴포넌트 + InvestigationMap):
 *     최종 미션 맵에서 미션 타겟을 골라 E 키로 조사 — 3번의 기회.
 *     맞히면: "[단서이름]을(를) 발견하는 데 성공했습니다!"
 *   3단계 (이 컴포넌트):
 *     수집한 아이템 중 필수 3개를 선택해 제출 — 3번의 기회.
 *     맞히면: "미션 완료!" + onMissionComplete()
 *
 * 모든 게임 상태(stage / 시도 횟수 / 에러)는 부모(`app/play/page.tsx`)가 소유한다.
 * 이 컴포넌트는 props 만으로 그려지는 dumb view 다 — 2단계의 prop 조사 입력은
 * 맵 컴포넌트에서 발생하므로 부모가 통합적으로 흐름을 제어한다.
 *
 * 기회 소진(3회 오답) 시: 다시 도전하기 버튼으로 카운터를 리셋해 학생이 더 단서를 모은
 * 뒤 재시도할 수 있다 (교실 친화적).
 */

import { CheckCircle2, X } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

export const RESOLUTION_FIND_MAX_ATTEMPTS = 3;
export const RESOLUTION_UNLOCK_MAX_ATTEMPTS = 3;
export const RESOLUTION_UNLOCK_PICK_COUNT = 3;

export type ResolutionStage = "find" | "found" | "unlock" | "complete";

type CollectedItem = {
  id: string;
  name: string;
};

type ResolutionMissionFlowProps = {
  /** 미션 설명 (예: "보물상자 열기"). null/빈문자열이면 카드 헤더 미표시. */
  mission: string | null;

  /** 팀이 이미 미션 완료 상태인지 (다른 팀원이 먼저 완료한 경우 등) */
  isTeamSolved: boolean;

  /** 진행 단계 */
  stage: ResolutionStage;

  // 2단계: 맵 위 prop 조사 ----------------------------------------------------
  /** 사용한 조사 시도 횟수 (0..3) */
  findAttemptsUsed: number;
  /** 마지막 조사 결과 메시지 (오답 안내 등) — null 이면 표시 없음 */
  findError: string | null;
  /** "발견 성공" 모달에 보여줄 단서 이름 (미션 타겟 단서 이름) */
  foundClueName: string | null;

  // 3단계: 제출 아이템(Required Items) 선택 ------------------------------
  /**
   * 학생이 선택할 수 있는 후보 아이템 목록 (= 팀이 수집한 단서들).
   * 필수 3개가 이 목록에 없으면 제출이 불가능하므로, 부모가 적어도 그 3개를
   * 포함하도록 보장하는 게 좋다 (보통 제작자가 이미 수집된 단서를 필수 아이템으로 지정).
   */
  collectedItems: CollectedItem[];
  /** 사용한 제출 시도 횟수 (0..3) */
  unlockAttemptsUsed: number;
  /** 마지막 제출 결과 메시지 — null 이면 표시 없음 */
  unlockError: string | null;

  // 콜백 -----------------------------------------------------------------------
  onResetFind: () => void;
  /** 발견 성공 모달의 다음 단계 버튼 — stage 를 "unlock" 으로 전환 */
  onContinueToUnlock: () => void;
  /** 필수 아이템 제출 시도 — 정확히 3개 선택해 제출 */
  onSubmitUnlock: (selectedIds: string[]) => void;
  onResetUnlock: () => void;
};

export function ResolutionMissionFlow({
  mission,
  isTeamSolved,
  stage,
  findAttemptsUsed,
  findError,
  foundClueName,
  collectedItems,
  unlockAttemptsUsed,
  unlockError,
  onResetFind,
  onContinueToUnlock,
  onSubmitUnlock,
  onResetUnlock,
}: ResolutionMissionFlowProps) {
  const trimmedMission = mission?.trim() ?? "";

  const unlockRemaining = Math.max(
    0,
    RESOLUTION_UNLOCK_MAX_ATTEMPTS - unlockAttemptsUsed,
  );

  // 팀이 다른 곳에서 이미 완료한 경우(=isTeamSolved) 즉시 완료 화면으로 보이게.
  const effectiveStage: ResolutionStage = isTeamSolved ? "complete" : stage;

  return (
    <>
      <MissionCard
        stage={effectiveStage}
        findExhausted={findAttemptsUsed >= RESOLUTION_FIND_MAX_ATTEMPTS}
        findError={findError}
        onResetFind={onResetFind}
      />

      {effectiveStage === "found" ? (
        <FoundModal
          clueName={foundClueName}
          onContinue={onContinueToUnlock}
        />
      ) : null}

      {effectiveStage === "unlock" ? (
        <UnlockModal
          mission={trimmedMission}
          collectedItems={collectedItems}
          attemptsRemaining={unlockRemaining}
          attemptsExhausted={unlockAttemptsUsed >= RESOLUTION_UNLOCK_MAX_ATTEMPTS}
          error={unlockError}
          onSubmit={onSubmitUnlock}
          onReset={onResetUnlock}
        />
      ) : null}

      {effectiveStage === "complete" ? (
        <MissionCompleteOverlay mission={trimmedMission} />
      ) : null}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Mission card (top-right)                                           */
/* ------------------------------------------------------------------ */

function MissionCard({
  stage,
  findExhausted,
  findError,
  onResetFind,
}: {
  stage: ResolutionStage;
  findExhausted: boolean;
  findError: string | null;
  onResetFind: () => void;
}) {
  // find 단계의 진행 안내/남은 기회는 상단 bar에서 노출한다.
  // 카드는 find에서 오답/기회소진 피드백이 있을 때만 보이게 최소화한다.
  if (stage === "complete") return null;
  if (stage === "find" && !findError && !findExhausted) return null;

  return (
    <div className="pointer-events-auto absolute right-4 top-4 max-w-[320px] rounded-lg border border-[var(--accent)]/60 bg-[rgba(15,17,19,0.92)] p-4 shadow-xl">
      {stage === "find" ? (
        <>
          {findError ? (
            <p className="text-xs text-[var(--primary)]">{findError}</p>
          ) : null}
          {findExhausted ? (
            <Button
              type="button"
              onClick={onResetFind}
              className="mt-3 w-full"
              variant="outline"
            >
              다시 도전하기
            </Button>
          ) : null}
        </>
      ) : null}

      {stage === "found" || stage === "unlock" ? (
        <p className="text-xs text-[var(--muted-foreground)]">
          다음 단계(필수 아이템 제출)로 진행하세요.
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Found (after correct prop investigation)                            */
/* ------------------------------------------------------------------ */

function FoundModal({
  clueName,
  onContinue,
}: {
  clueName: string | null;
  onContinue: () => void;
}) {
  const trimmed = (clueName ?? "").trim() || "대상";
  return (
    <ModalShell title="발견 성공!" closable={false}>
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <CheckCircle2 className="h-12 w-12 text-[var(--accent)]" aria-hidden />
        <p className="text-base font-semibold text-[var(--foreground)]">
          {`${withObjectParticle(trimmed)} 발견하는 데 성공했습니다!`}
        </p>
        <p className="text-xs text-[var(--muted-foreground)]">
          이제 수집한 단서 중 필수 아이템 3개를 골라 제출하세요.
        </p>
      </div>
      <Button type="button" onClick={onContinue} className="w-full">
        필수 아이템 제출하기
      </Button>
    </ModalShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Unlock (pick exactly 3 items from collected)                        */
/* ------------------------------------------------------------------ */

function UnlockModal({
  mission,
  collectedItems,
  attemptsRemaining,
  attemptsExhausted,
  error,
  onSubmit,
  onReset,
}: {
  mission: string;
  collectedItems: CollectedItem[];
  attemptsRemaining: number;
  attemptsExhausted: boolean;
  error: string | null;
  onSubmit: (selectedIds: string[]) => void;
  onReset: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // 시도 횟수가 변하면(=오답 제출 후) 선택 초기화하여 다시 고를 수 있게 한다.
  // 정확히 시도 횟수만 추적하면 되지만 간단히 error 의 변화를 감지한다.
  useEffect(() => {
    if (error) setSelected(new Set());
  }, [error]);

  const toggle = (id: string) => {
    if (attemptsExhausted) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= RESOLUTION_UNLOCK_PICK_COUNT) return prev;
        next.add(id);
      }
      return next;
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (attemptsExhausted) return;
    if (selected.size !== RESOLUTION_UNLOCK_PICK_COUNT) return;
    onSubmit(Array.from(selected));
  };

  const handleReset = () => {
    setSelected(new Set());
    onReset();
  };

  const submittable = selected.size === RESOLUTION_UNLOCK_PICK_COUNT;

  return (
    <ModalShell title="제출 아이템 — 3개 제출" closable={false}>
      <p className="text-sm text-[var(--muted-foreground)]">
        {mission ? `'${mission}'를 위해 ` : ""}
        수집한 아이템 중 정확한 <b>3개</b>를 선택해 제출하세요.
      </p>

      {collectedItems.length === 0 ? (
        <p className="rounded-md border border-dashed border-[var(--border)] bg-black/20 p-3 text-center text-xs text-[var(--muted-foreground)]">
          아직 수집한 아이템이 없습니다. 조사 단계에서 단서를 더 모아주세요.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <ul className="max-h-[40vh] space-y-1 overflow-y-auto rounded border border-[var(--border)] bg-black/20 p-2">
            {collectedItems.map((item) => {
              const isSelected = selected.has(item.id);
              const disabled =
                attemptsExhausted ||
                (!isSelected && selected.size >= RESOLUTION_UNLOCK_PICK_COUNT);
              return (
                <li key={item.id}>
                  <label
                    className={
                      "flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors " +
                      (isSelected
                        ? "bg-[var(--accent)]/20 text-[var(--foreground)]"
                        : disabled
                          ? "cursor-not-allowed text-[var(--muted-foreground)]"
                          : "text-[var(--foreground)] hover:bg-white/5")
                    }
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={disabled}
                      onChange={() => toggle(item.id)}
                    />
                    <span className="flex-1 truncate">
                      {item.name?.trim() || "이름 없는 단서"}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
            <span>
              선택{" "}
              <span className="font-semibold text-[var(--accent)]">
                {selected.size}
              </span>{" "}
              / {RESOLUTION_UNLOCK_PICK_COUNT}
            </span>
            <span>
              남은 기회{" "}
              <span
                className={
                  attemptsRemaining === 0
                    ? "font-semibold text-[var(--primary)]"
                    : "font-semibold text-[var(--accent)]"
                }
              >
                {attemptsRemaining}
              </span>{" "}
              / {RESOLUTION_UNLOCK_MAX_ATTEMPTS}
            </span>
          </div>

          {error ? <p className="text-xs text-[var(--primary)]">{error}</p> : null}

          {attemptsExhausted ? (
            <Button
              type="button"
              onClick={handleReset}
              className="w-full"
              variant="outline"
            >
              다시 도전하기 (기회 리셋)
            </Button>
          ) : (
            <Button type="submit" className="w-full" disabled={!submittable}>
              제출
            </Button>
          )}
        </form>
      )}
    </ModalShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Mission complete overlay                                            */
/* ------------------------------------------------------------------ */

function MissionCompleteOverlay({ mission }: { mission: string }) {
  return (
    <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-[rgba(15,17,19,0.85)] backdrop-blur-sm">
      <div className="mx-4 max-w-md rounded-2xl border border-[var(--accent)]/70 bg-[rgba(15,17,19,0.98)] p-8 text-center shadow-2xl">
        <CheckCircle2
          className="mx-auto mb-4 h-16 w-16 text-[var(--accent)]"
          aria-hidden
        />
        <h2 className="mb-2 text-2xl font-bold text-[var(--accent)]">미션 완료!</h2>
        {mission ? (
          <p className="text-sm text-[var(--muted-foreground)]">{mission}</p>
        ) : null}
        <p className="mt-4 text-xs text-[var(--muted-foreground)]">
          교사가 다음 단계로 진행할 때까지 잠시 기다려주세요.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Modal shell                                                         */
/* ------------------------------------------------------------------ */

function ModalShell({
  title,
  closable = true,
  onClose,
  children,
}: {
  title: string;
  /** false 면 닫기(X) 버튼을 숨겨 학생이 모달을 우회하지 못하게 한다 */
  closable?: boolean;
  onClose?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-[rgba(15,17,19,0.78)] backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="mx-4 w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--background)] p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-[var(--foreground)]">{title}</h3>
          {closable && onClose ? (
            <Button
              type="button"
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="h-8 px-2"
            >
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
        <div className="space-y-3">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

/**
 * 한국어 목적격 조사(을/를)를 마지막 글자의 받침 유무로 자동 선택해서 붙인다.
 * 한글이 아닌 글자로 끝나면 안전하게 "을(를)" 을 붙인다.
 *
 * 예) "보물상자" → "보물상자를", "책상 아래" → "책상 아래를", "책" → "책을"
 */
function withObjectParticle(noun: string): string {
  const trimmed = noun.trim();
  if (!trimmed) return trimmed;
  const last = trimmed.charCodeAt(trimmed.length - 1);
  if (last >= 0xac00 && last <= 0xd7a3) {
    const hasJongseong = (last - 0xac00) % 28 !== 0;
    return `${trimmed}${hasJongseong ? "을" : "를"}`;
  }
  return `${trimmed}을(를)`;
}
