"use client";

import { Timer } from "lucide-react";
import { useMemo, useState } from "react";

import {
  GroupAssignmentDashboard,
  type GroupAssignmentGroup,
} from "@/components/teacher/group-assignment-dashboard";
import {
  SessionResultsDashboard,
  type SessionResultsMember,
} from "@/components/teacher/session-results-dashboard";
import { SessionHostLayout } from "@/components/teacher/session-host-layout";
import { SessionHostWaitingRoster } from "@/components/teacher/session-host-waiting-roster";
import { PhaseTimerContent } from "@/components/teacher/phase-timer-content";
import { SessionQuestionsReviewModal } from "@/components/teacher/session-questions-review-modal";
import { activityBannerButtonClass, activityGuideModalScope } from "@/components/activity/activity-layout-chrome";
import { GuideModalScope } from "@/components/play/guide-modal-scope";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Z } from "@/lib/ui/z-index";
import { cn } from "@/lib/utils";
import type { ActivityPhase } from "@/lib/api/activities";
import type { ActivityPack } from "@/lib/activity-pack/types";
import { hasReviewQuestions } from "@/lib/activity-pack/engine";
import {
  SANDBOX_JOIN_CODE,
  buildSandboxWaitingRoster,
  type SandboxPlayer,
  type SandboxGroup,
} from "@/lib/sandbox/state";
import type { SessionStatus } from "@/lib/types";
import { isSessionEnded, isTimedPhase, RESULTS_COPY, type TimedPhase } from "@/lib/activity-phases";
import { hostSessionNextPhaseLabel } from "@/lib/api/sessions";
import { buildRoleCodenameMap } from "@/lib/play/role-codenames";
import { formatAssignedRoleLabels } from "@/lib/activity-pack/roles";
import { isPlayerPhaseComplete } from "@/lib/teacher/phase-completion";

type Props = {
  activityTitle: string | null;
  pack: ActivityPack;
  activityId: string;
  phase: ActivityPhase;
  sessionStatus: SessionStatus;
  groups: SandboxGroup[];
  players: SandboxPlayer[];
  realStudentNickname: string | null;
  onBegin: () => void;
  onAdvance: () => void;
};

export function SandboxTeacherPanel({
  activityTitle,
  pack,
  activityId,
  phase,
  sessionStatus,
  groups,
  players,
  realStudentNickname,
  onBegin,
  onAdvance,
}: Props) {
  const [timerModalOpen, setTimerModalOpen] = useState<{
    open: boolean;
    phaseAtOpen: ActivityPhase | null;
  }>({ open: false, phaseAtOpen: null });
  const [questionsReviewOpen, setQuestionsReviewOpen] = useState(false);

  const sessionStarted = phase !== "waiting";
  const sessionEnded = isSessionEnded(sessionStatus);
  const hasNextPhase = Boolean(
    phase === "waiting" ||
      phase === "overview" ||
      phase === "expert_group" ||
      phase === "home_group" ||
      phase === "individual_quiz",
  );

  const waitingOnlinePlayers = useMemo(
    () => buildSandboxWaitingRoster(activityId, realStudentNickname, pack.roles.length),
    [activityId, realStudentNickname, pack.roles.length],
  );

  const playercount = sessionStarted ? players.length : waitingOnlinePlayers.length;

  const roleCodenameById = useMemo(
    () => buildRoleCodenameMap(`sandbox-${activityId}`, pack.roles.map((r) => r.id)),
    [activityId, pack.roles],
  );
  const assignmentGroups = useMemo<GroupAssignmentGroup[]>(() => {
    const byGroup = new Map<string, SandboxPlayer[]>();
    for (const p of players) {
      const list = byGroup.get(p.groupId) ?? [];
      list.push(p);
      byGroup.set(p.groupId, list);
    }
    return groups.map((group) => {
      const groupMembers = byGroup.get(group.id) ?? [];
      const memberRoleIds = groupMembers.map((m) => m.roleId);
      return {
        group: { id: group.id, name: group.name },
        members: groupMembers.map((m) => ({
          id: m.id,
          nickname: m.nickname,
          zoneName:
            formatAssignedRoleLabels(pack, [m.roleId], `sandbox-${activityId}`) ??
            roleCodenameById.get(m.roleId) ??
            null,
          phaseComplete: isPlayerPhaseComplete(
            phase,
            {
              group_id: m.groupId,
              assigned_role_id: m.roleId,
              practice_results: m.practice_results,
              practice_submitted_at: m.practice_submitted_at,
              peer_practice_completed: m.peer_practice_completed,
              home_group_completed_at: m.home_group_completed_at,
              individual_quiz_answers: m.individual_quiz_answers,
              individual_quiz_submitted_at: m.individual_quiz_submitted_at,
            },
            { pack, memberRoleIds },
          ),
        })),
      };
    });
  }, [players, groups, pack, activityId, roleCodenameById, phase]);

  const resultsMembers = useMemo<SessionResultsMember[]>(
    () =>
      players.map((p) => ({
        id: p.id,
        nickname: p.nickname,
        groupId: p.groupId,
        assignedRoleId: p.roleId,
        baseScore: p.base_score,
        individual_quiz_answers: p.individual_quiz_answers,
        individual_quiz_submitted_at: p.individual_quiz_submitted_at,
      })),
    [players],
  );

  const resultsGroups = useMemo(
    () =>
      groups.map((group) => ({
        id: group.id,
        session_id: null as string | null,
        name: group.name,
      })),
    [groups],
  );

  const shouldShowTimer = isTimedPhase(phase);
  const timerToolOpen =
    timerModalOpen.open &&
    timerModalOpen.phaseAtOpen === phase &&
    shouldShowTimer;

  const timerButton = shouldShowTimer ? (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className={cn("shrink-0", activityBannerButtonClass)}
      aria-haspopup="dialog"
      aria-expanded={timerToolOpen}
      onClick={() => setTimerModalOpen({ open: true, phaseAtOpen: phase })}
    >
      <Timer className="h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden />
      타이머
    </Button>
  ) : null;

  const startButton = !sessionStarted ? (
    <Button type="button" size="sm" className={activityBannerButtonClass} onClick={onBegin}>
      시작하기
    </Button>
  ) : null;

  const nextButton =
    sessionStarted && !sessionEnded && hasNextPhase ? (
      <Button type="button" size="sm" className={activityBannerButtonClass} onClick={onAdvance}>
        {hostSessionNextPhaseLabel(phase)}
      </Button>
    ) : null;

  const reviewQuestionsButton =
    phase === "results" && hasReviewQuestions(pack) ? (
      <Button
        type="button"
        size="sm"
        className={activityBannerButtonClass}
        onClick={() => setQuestionsReviewOpen(true)}
      >
        {RESULTS_COPY.reviewQuestions}
      </Button>
    ) : null;

  const headerActionButton = reviewQuestionsButton ?? nextButton;

  return (
    <GuideModalScope className={activityGuideModalScope}>
      <SessionHostLayout
        activityTitle={activityTitle}
        playerCount={playercount}
        joinCode={SANDBOX_JOIN_CODE}
        sessionEnded={sessionEnded}
        phase={phase}
        timerButton={timerButton}
        startButton={startButton}
        nextButton={headerActionButton}
      >
        {phase === "waiting" ? (
          <SessionHostWaitingRoster players={waitingOnlinePlayers} />
        ) : null}

        {phase === "overview" ||
        phase === "expert_group" ||
        phase === "home_group" ||
        phase === "individual_quiz" ? (
          <GroupAssignmentDashboard
            groups={assignmentGroups}
            loading={false}
            groupBy={phase === "expert_group" ? "item" : "group"}
          />
        ) : null}

        {phase === "results" ? (
          <SessionResultsDashboard
            groups={resultsGroups}
            members={resultsMembers}
            pack={pack}
            roleScopeKey={`sandbox-${activityId}`}
            loading={false}
          />
        ) : null}
      </SessionHostLayout>

      <Modal
        open={timerToolOpen}
        onClose={() => setTimerModalOpen({ open: false, phaseAtOpen: null })}
        title="타이머"
        titleId="sandbox-timer-heading"
        zIndexClassName={Z.hostTool}
        contentClassName="py-5"
      >
        <PhaseTimerContent key={phase} phase={phase as TimedPhase} />
      </Modal>

      <SessionQuestionsReviewModal
        open={questionsReviewOpen}
        onClose={() => setQuestionsReviewOpen(false)}
        pack={pack}
        roleScopeKey={`sandbox-${activityId}`}
      />
    </GuideModalScope>
  );
}
