"use client";

import { useMemo, useState } from "react";

import {
  activityBodyPaddingBottomContained,
  activityBodyPaddingY,
  activityGuideModalScope,
  activityLayoutFrame,
  activityPageColumn,
} from "@/components/activity/activity-layout-chrome";
import { ExpertPhasePanel } from "@/components/play/expert-group-panel";
import { GroupPhasePanel, type GroupMember } from "@/components/play/home-group-panel";
import { IndividualQuizPanel } from "@/components/play/individual-quiz-panel";
import { OverviewPhasePanel } from "@/components/play/overview-phase-panel";
import { PlayJoinModal } from "@/components/play/play-join-modal";
import type { PracticeQuestionResult } from "@/lib/activity-pack/types";
import { ResultsPhasePanel } from "@/components/play/results-phase-panel";
import { buildSessionResults } from "@/lib/activity-pack/session-results";
import { PlayAtmosphere } from "@/components/play/play-atmosphere";
import { PlayPhaseShell } from "@/components/play/play-phase-shell";
import { GuideModalScope } from "@/components/play/guide-modal-scope";
import { LoadingState } from "@/components/ui/loading-state";
import type { ActivityPhase } from "@/lib/api/activities";
import type { ActivityPack, QuizAnswer } from "@/lib/activity-pack/types";
import {
  SANDBOX_JOIN_CODE,
  type SandboxPlayer,
  type SandboxGroup,
} from "@/lib/sandbox/state";
import { LOADING_COPY } from "@/lib/activity-phases";
import { formatAssignedRoleLabels } from "@/lib/play/role-codenames";
import { cn } from "@/lib/utils";

type Props = {
  activityId: string;
  pack: ActivityPack;
  phase: ActivityPhase;
  groups: SandboxGroup[];
  players: SandboxPlayer[];
  realStudentNickname: string | null;
  onJoinAsStudent: (nickname: string) => void;
  onSubmitPractice: (playerId: string, results: PracticeQuestionResult[], baseScore: number) => void;
  onSubmitIndividualQuiz: (playerId: string, answers: QuizAnswer[]) => void;
  onPeerQuestionComplete: (
    playerId: string,
    questionId: string,
    wrongAttempts: number,
    wrongChoices?: number[]
  ) => void;
  onEnsureHomeGroupComplete: (playerId: string) => void;
};

export function SandboxStudentPanel(props: Props) {
  return (
    <GuideModalScope className={activityGuideModalScope}>
      <SandboxStudentPanelView {...props} />
    </GuideModalScope>
  );
}

function SandboxStudentPanelView({
  activityId,
  pack,
  phase,
  groups,
  players,
  realStudentNickname,
  onJoinAsStudent,
  onSubmitPractice,
  onSubmitIndividualQuiz,
  onPeerQuestionComplete,
  onEnsureHomeGroupComplete,
}: Props) {
  const [nickname, setNickname] = useState("");
  const [joined, setJoined] = useState(Boolean(realStudentNickname?.trim()));

  const showJoinModal = !joined && !realStudentNickname;
  const scopeKey = `sandbox-${activityId}`;

  const primaryPlayer = useMemo(() => {
    if (!players.length || showJoinModal) return null;
    return players.find((p) => p.isReal) ?? players[0]!;
  }, [players, showJoinModal]);

  const group = useMemo(
    () => (primaryPlayer ? groups.find((t) => t.id === primaryPlayer.groupId) ?? null : null),
    [primaryPlayer, groups],
  );

  const groupMembers = useMemo<GroupMember[]>(() => {
    if (!group) return [];
    return players
      .filter((p) => p.groupId === group.id)
      .map((p, index) => ({
        id: p.id,
        nickname: p.nickname,
        assigned_role_id: p.roleId,
        created_at: new Date(1_000 + index).toISOString(),
      }));
  }, [group, players]);

  const roleLabel = primaryPlayer
    ? formatAssignedRoleLabels(pack, [primaryPlayer.roleId], scopeKey)
    : null;

  const sessionResults = useMemo(() => {
    return buildSessionResults(
      pack,
      groups.map((g) => ({
        id: g.id,
        name: g.name,
      })),
      players
        .filter((p) => p.groupId)
        .map((p) => ({
          id: p.id,
          nickname: p.nickname,
          groupId: p.groupId,
          assignedRoleId: p.roleId,
          baseScore: p.base_score,
          individual_quiz_answers: p.individual_quiz_answers,
          individual_quiz_submitted_at: p.individual_quiz_submitted_at,
        })),
      scopeKey,
    );
  }, [pack, groups, players, scopeKey]);

  if (showJoinModal) {
    return (
      <PlayAtmosphere className="relative min-h-0 flex-1">
        <div className={activityLayoutFrame}>
          <main
            className={cn(
              activityPageColumn,
              activityBodyPaddingY,
              "flex min-h-0 flex-1 flex-col",
              activityBodyPaddingBottomContained,
            )}
          >
            <PlayJoinModal
              open
              titleId="sandbox-play-join"
              joinCode={SANDBOX_JOIN_CODE}
              nickname={nickname}
              modalVariant="contained"
              joinCodeEditable={false}
              showMissingCodeClue={false}
              onNicknameChange={setNickname}
              onSubmit={() => {
                const nick = nickname.trim();
                if (!nick) return;
                onJoinAsStudent(nick);
                setJoined(true);
              }}
            />
          </main>
        </div>
      </PlayAtmosphere>
    );
  }

  if (phase === "waiting") {
    return (
      <PlayPhaseShell mainClassName="flex min-h-0 flex-1 flex-col">
        <LoadingState
          variant="section"
          label={LOADING_COPY.sessionStarting}
          className="min-h-0 flex-1"
        />
      </PlayPhaseShell>
    );
  }

  if (phase === "expert_group" && primaryPlayer && group) {
    return (
      <ExpertPhasePanel
        key={primaryPlayer.id}
        pack={pack}
        roleId={primaryPlayer.roleId}
        groupName={group.name}
        roleScopeKey={scopeKey}
        onSubmitPractice={(results, baseScore) =>
          onSubmitPractice(primaryPlayer.id, results, baseScore)
        }
        practiceSubmitted={Boolean(primaryPlayer.practice_submitted_at)}
        practiceResults={primaryPlayer.practice_results ?? []}
        practiceBaseScore={primaryPlayer.base_score ?? null}
      />
    );
  }

  if (phase === "home_group" && group && primaryPlayer) {
    return (
      <GroupPhasePanel
        key={group.id}
        pack={pack}
        groupName={group.name}
        playerId={primaryPlayer.id}
        ownRoleId={primaryPlayer.roleId}
        members={groupMembers}
        roleScopeKey={scopeKey}
        peerPracticeCompleted={primaryPlayer.peer_practice_completed ?? []}
        practiceResults={primaryPlayer.practice_results ?? []}
        baseScore={primaryPlayer.base_score ?? null}
        homeGroupCompletedAt={primaryPlayer.home_group_completed_at ?? null}
        onPeerQuestionComplete={(questionId, wrongAttempts, wrongChoices) =>
          onPeerQuestionComplete(primaryPlayer.id, questionId, wrongAttempts, wrongChoices)
        }
        onEnsureHomeGroupComplete={() => onEnsureHomeGroupComplete(primaryPlayer.id)}
      />
    );
  }

  if (phase === "individual_quiz" && primaryPlayer) {
    return (
      <IndividualQuizPanel
        key={primaryPlayer.id}
        pack={pack}
        groupName={group?.name ?? null}
        roleLabel={roleLabel}
        roleScopeKey={scopeKey}
        baseScore={primaryPlayer.base_score ?? null}
        submittedAnswers={primaryPlayer.individual_quiz_answers}
        submittedAt={primaryPlayer.individual_quiz_submitted_at ?? null}
        onSubmit={(answers) => onSubmitIndividualQuiz(primaryPlayer.id, answers)}
      />
    );
  }

  if (phase === "overview") {
    return (
      <OverviewPhasePanel
        groupName={group?.name ?? null}
        roleLabel={roleLabel}
      />
    );
  }

  if (phase === "results" && primaryPlayer) {
    return (
      <ResultsPhasePanel
        loading={false}
        results={sessionResults}
        highlightGroupId={primaryPlayer.groupId}
        groupName={group?.name ?? null}
        roleLabel={roleLabel}
        currentPlayerId={primaryPlayer.id}
      />
    );
  }
}
