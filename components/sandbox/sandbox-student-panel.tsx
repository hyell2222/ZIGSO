"use client";

import { useMemo, useState } from "react";

import { ExpertPhasePanel } from "@/components/play/expert-group-panel";
import { GroupPhasePanel, type GroupMember } from "@/components/play/home-group-panel";
import { IndividualQuizPanel } from "@/components/play/individual-quiz-panel";
import { OverviewPhasePanel } from "@/components/play/overview-phase-panel";
import { PlayJoinModal } from "@/components/play/play-join-modal";
import type { PracticeQuestionResult } from "@/lib/activity-pack/types";
import { ResultsPhasePanel } from "@/components/play/results-phase-panel";
import { buildSessionResults } from "@/lib/activity-pack/session-results";
import { PlayAtmosphere } from "@/components/play/play-atmosphere";
import { activityLoaderRegion } from "@/components/activity/activity-layout-chrome";
import { PlayPhaseShell } from "@/components/play/play-phase-shell";
import { WaitingLobbyBlock } from "@/components/play/waiting-lobby-block";
import type { ActivityPhase } from "@/lib/api/activities";
import type { ActivityPack, QuizAnswer } from "@/lib/activity-pack/types";
import {
  SANDBOX_JOIN_CODE,
  type SandboxPlayer,
  type SandboxGroup,
} from "@/lib/sandbox/state";
import { activityLayoutType } from "@/components/activity/activity-layout-typography";
import { formatAssignedRoleLabels } from "@/lib/activity-pack/roles";
import { cn } from "@/lib/utils";

type Props = {
  activityId: string;
  activityTitle: string | null;
  pack: ActivityPack;
  phase: ActivityPhase;
  groups: SandboxGroup[];
  players: SandboxPlayer[];
  realStudentNickname: string | null;
  realStudentPlayerId: string;
  onJoinAsStudent: (nickname: string) => void;
  onLeaveAsStudent: () => void;
  onSubmitPractice: (playerId: string, results: PracticeQuestionResult[], baseScore: number) => void;
  onSubmitIndividualQuiz: (playerId: string, answers: QuizAnswer[]) => void;
  onPeerQuestionComplete: (playerId: string, questionId: string) => void;
  onEnsureHomeGroupComplete: (playerId: string) => void;
};

export function SandboxStudentPanel(props: Props) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <SandboxStudentPanelView {...props} />
    </div>
  );
}

function SandboxStudentPanelView({
  activityId,
  activityTitle,
  pack,
  phase,
  groups,
  players,
  realStudentNickname,
  onJoinAsStudent,
  onLeaveAsStudent,
  onSubmitPractice,
  onSubmitIndividualQuiz,
  onPeerQuestionComplete,
  onEnsureHomeGroupComplete,
}: Props) {
  void onLeaveAsStudent;
  const [nickname, setNickname] = useState("");
  const [joined, setJoined] = useState(Boolean(realStudentNickname?.trim()));

  const showJoinModal = !joined && !realStudentNickname;
  const activeNickname = realStudentNickname?.trim() || nickname.trim();
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
    if (phase !== "results" || showJoinModal) return null;
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
  }, [phase, pack, groups, players, showJoinModal, scopeKey]);

  if (showJoinModal) {
    return (
      <PlayAtmosphere variant="contained">
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
      </PlayAtmosphere>
    );
  }

  if (phase === "waiting") {
    return (
      <PlayPhaseShell contained>
        <div className={activityLoaderRegion}>
          <WaitingLobbyBlock
            joinCode={SANDBOX_JOIN_CODE}
            nickname={activeNickname}
            sessionTitle={activityTitle}
            state="waiting"
          />
        </div>
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
        contained
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
        homeGroupCompletedAt={primaryPlayer.home_group_completed_at ?? null}
        onPeerQuestionComplete={(questionId) =>
          onPeerQuestionComplete(primaryPlayer.id, questionId)
        }
        onEnsureHomeGroupComplete={() => onEnsureHomeGroupComplete(primaryPlayer.id)}
        contained
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
        submittedAnswers={primaryPlayer.individual_quiz_answers}
        submittedAt={primaryPlayer.individual_quiz_submitted_at ?? null}
        onSubmit={(answers) => onSubmitIndividualQuiz(primaryPlayer.id, answers)}
        contained
      />
    );
  }

  if (phase === "overview") {
    return (
      <OverviewPhasePanel
        contained
        groupName={group?.name ?? null}
        roleLabel={roleLabel}
      />
    );
  }

  if (phase === "results" && primaryPlayer) {
    return (
      <ResultsPhasePanel
        contained
        loading={false}
        title={activityTitle}
        results={sessionResults}
        highlightGroupId={primaryPlayer.groupId}
        groupName={group?.name ?? null}
        roleLabel={roleLabel}
        currentPlayerId={primaryPlayer.id}
      />
    );
  }
}
