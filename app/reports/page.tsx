"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FileText, Radio } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, type ReactNode } from "react";

import { deleteSession, listHostSessions, type HostSessionListRow } from "@/lib/api/activities";
import { useRequireTeacherSession } from "@/lib/auth/use-require-teacher-session";
import { GroupAssignmentDashboard } from "@/components/teacher/group-assignment-dashboard";
import {
  SessionStudentReportList,
} from "@/components/teacher/session-student-reports";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { KebabMenu } from "@/components/ui/kebab-menu";
import { PageHeader } from "@/components/layout/page-header";
import { TopNav } from "@/components/layout/top-nav";
import { LoadingState } from "@/components/ui/loading-state";
import { ACTIVITY_PHASE_LABELS } from "@/lib/activity-phases";
import type { ActivityPhase } from "@/lib/types";
import { ROUTES } from "@/lib/routes";
import { useSessionReportData } from "@/lib/teacher/use-session-report-data";
import { activityLayoutType } from "@/components/activity/activity-layout-typography";
import { cn } from "@/lib/utils";

const PHASE_KR = ACTIVITY_PHASE_LABELS;

type SessionTab = "scores" | "roster";

function formatWhen(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
}

function ReportBackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden />
      {label}
    </Link>
  );
}

function ReportSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className={cn(activityLayoutType.sectionTitle, "text-[var(--foreground)]")}>{title}</h3>
        {description ? (
          <p className={cn(activityLayoutType.bodyMuted, "mt-1")}>{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function SessionReportHeader({
  title,
  joinCode,
  createdAt,
  phase,
  studentCount,
  teamCount,
}: {
  title: string;
  joinCode: string;
  createdAt: string | null;
  phase: ActivityPhase;
  studentCount: number;
  teamCount: number;
}) {
  return (
    <div>
      <h2 className="font-mono text-2xl font-semibold text-[var(--accent)]">{title}</h2>
      <p className="text-sm text-[var(--muted-foreground)]">
        코드 {joinCode} · {formatWhen(createdAt)} · 학생 {studentCount}명 · 모둠 {teamCount}개
      </p>
    </div>
  );
}

function ReportsSessionsListPanel({ teacherUserId }: { teacherUserId: string }) {
  const queryClient = useQueryClient();
  const [pendingDeleteRow, setPendingDeleteRow] = useState<HostSessionListRow | null>(null);

  const listQuery = useQuery({
    queryKey: ["host-sessions", teacherUserId],
    queryFn: () => listHostSessions(teacherUserId),
    enabled: Boolean(teacherUserId),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSession(id),
    onSuccess: async (_, id) => {
      await queryClient.invalidateQueries({ queryKey: ["host-sessions"] });
      await queryClient.removeQueries({ queryKey: ["host-session", id] });
    },
    onError: (e: Error) => window.alert(e.message),
  });

  const handleDelete = (row: HostSessionListRow) => {
    setPendingDeleteRow(row);
  };

  const pendingDeleteTitle =
    pendingDeleteRow?.activities?.title?.trim() || "제목 없는 활동";

  return (
    <>
      <ConfirmModal
        open={pendingDeleteRow !== null}
        title="활동 기록 삭제"
        onClose={() => setPendingDeleteRow(null)}
        onConfirm={() => {
          if (!pendingDeleteRow) return;
          deleteMutation.mutate(pendingDeleteRow.id);
          setPendingDeleteRow(null);
        }}
      >
        <p>「{pendingDeleteTitle}」 활동 기록을 삭제할까요?</p>
        <p>모둠·참가 데이터가 삭제되며 되돌릴 수 없습니다. 활동 원본은 유지됩니다.</p>
      </ConfirmModal>

      <ul className="space-y-3">
      {listQuery.data?.map((row) => {
        const title = row.activities?.title?.trim() || "제목 없는 활동";
        const phase = row.phase
          ? (PHASE_KR[row.phase as ActivityPhase] ?? row.phase)
          : "—";
        return (
          <li
            key={row.id}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="font-medium text-[var(--foreground)]">{title}</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  <span className="font-mono text-[var(--accent)]">{row.join_code}</span>
                  {" · "}
                  {formatWhen(row.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-1 sm:ml-auto">
                <Link
                  href={ROUTES.reportsForSession(row.id)}
                  className="inline-flex h-10 items-center gap-1.5 rounded-md bg-[var(--primary)] px-3 text-sm font-semibold text-[var(--on-primary)]"
                >
                  <FileText className="h-3.5 w-3.5" aria-hidden />
                  리포트 보기
                </Link>
                <KebabMenu onDelete={() => handleDelete(row)} />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
    </>
  );
}

function ReportsSessionOverviewPanel({
  sessionId,
  teacherUserId,
}: {
  sessionId: string;
  teacherUserId: string;
}) {
  const [tab, setTab] = useState<SessionTab>("scores");
  const report = useSessionReportData(sessionId);

  if (report.sessionQuery.isLoading) {
    return <LoadingState variant="section" label="불러오는 중…" className="min-h-[min(32rem,55dvh)]" />;
  }

  if (report.sessionQuery.isError || !report.sessionQuery.data) {
    return <p className="text-sm text-[var(--danger)]">활동 기록을 불러오지 못했습니다.</p>;
  }

  if (report.sessionQuery.data.host_id !== teacherUserId) {
    return <p className="text-sm text-[var(--accent)]">이 활동 기록을 볼 권한이 없습니다.</p>;
  }

  const session = report.sessionQuery.data;
  const phase = (session.phase ?? "waiting") as ActivityPhase;

  return (
    <div className="space-y-6">

      <SessionReportHeader
        title={session.activities?.title ?? "세션"}
        joinCode={session.join_code}
        createdAt={session.created_at ?? null}
        phase={phase}
        studentCount={report.players.length}
        teamCount={report.groupRows.length}
      />

      <SessionStudentReportList
        students={report.studentRows}
        loading={report.dataLoading}
      />
    </div>
  );
}

function ReportsPageInner() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session")?.trim() ?? "";
  const teacherSession = useRequireTeacherSession();
  const teacherUserId = teacherSession.data?.user.id ?? "";

  const listQuery = useQuery({
    queryKey: ["host-sessions", teacherUserId],
    queryFn: () => listHostSessions(teacherUserId),
    enabled: Boolean(teacherUserId) && !sessionId,
  });

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8">
        <PageHeader title="활동 기록" />
        {sessionId ? (
          <ReportsSessionOverviewPanel sessionId={sessionId} teacherUserId={teacherUserId} />
        ) : listQuery.isLoading ? (
          <LoadingState variant="section" label="불러오는 중…" />
        ) : (listQuery.data?.length ?? 0) === 0 ? (
          <p className="rounded-lg border border-dashed border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--muted-foreground)]">
            아직 진행한 활동이 없습니다.{" "}
            <Link className="underline text-[var(--accent)]" href={ROUTES.activities}>
              내 활동
            </Link>
            에서 활동을 시작해 주세요.
          </p>
        ) : (
          <ReportsSessionsListPanel teacherUserId={teacherUserId} />
        )}
      </main>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="app-page">
          <TopNav />
          <LoadingState variant="page" className="min-h-0 flex-1" />
        </div>
      }
    >
      <ReportsPageInner />
    </Suspense>
  );
}
