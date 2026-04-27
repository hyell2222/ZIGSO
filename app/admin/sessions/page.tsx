"use client";

import { useQuery } from "@tanstack/react-query";
import { ExternalLink, FileText, Loader2, Radio } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { getCurrentSession } from "@/lib/api/auth";
import { AUTH_SESSION_QUERY_KEY } from "@/lib/auth-session-query";
import { listHostSessions } from "@/lib/api/game-sessions";
import { TopNav } from "@/components/layout/top-nav";
import { ROUTES } from "@/lib/routes";
import { hasSupabaseEnv } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const PHASE_KR: Record<string, string> = {
  waiting: "대기",
  briefing: "브리핑",
  investigation: "조사",
  final_report: "최종 보고",
  session_end: "종료",
};

function formatWhen(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ko-KR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}

export default function AdminSessionsPage() {
  const router = useRouter();

  const sessionQuery = useQuery({
    queryKey: AUTH_SESSION_QUERY_KEY,
    queryFn: async () => {
      if (!hasSupabaseEnv) return null;
      return getCurrentSession();
    },
  });

  const hostId = sessionQuery.data?.user.id;

  const listQuery = useQuery({
    queryKey: ["host-sessions", hostId],
    queryFn: () => listHostSessions(hostId!),
    enabled: Boolean(hostId),
  });

  useEffect(() => {
    if (sessionQuery.isLoading) return;
    if (sessionQuery.isFetching && !sessionQuery.data) return;
    if (!hasSupabaseEnv) {
      router.replace(ROUTES.admin.login);
      return;
    }
    if (!sessionQuery.data) router.replace(ROUTES.admin.login);
  }, [router, sessionQuery.data, sessionQuery.isLoading, sessionQuery.isFetching]);

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8">
        {sessionQuery.data ? (
          <>
            <div>
              <h1 className="text-xl font-semibold text-[var(--foreground)]">세션 · 보고서</h1>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                내가 연 플레이 세션입니다. <span className="font-medium">보고서</span>에서 팀·플레이어 제출·정답 여부를
                볼 수 있어요.
              </p>
            </div>

            {listQuery.isLoading ? (
              <p className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                <Loader2 className="h-4 w-4 animate-spin" />
                세션을 불러오는 중…
              </p>
            ) : listQuery.isError ? (
              <p className="text-sm text-[var(--error)]">목록을 불러오지 못했습니다.</p>
            ) : (listQuery.data?.length ?? 0) === 0 ? (
              <p className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--tint-accent-weak)] px-4 py-8 text-center text-sm text-[var(--muted-foreground)]">
                아직 연 세션이 없습니다. <Link className="font-medium text-[var(--accent)] underline" href={ROUTES.admin.cases}>사건 목록</Link>에서「수사 세션 시작」을 눌러 주세요.
              </p>
            ) : (
              <ul className="space-y-3">
                {listQuery.data?.map((row) => {
                  const title = row.cases?.title?.trim() || "제목 없는 사건";
                  const phase = row.phase ? PHASE_KR[row.phase] ?? row.phase : "—";
                  return (
                    <li
                      key={row.id}
                      className="flex flex-col gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 space-y-1">
                        <p className="font-medium text-[var(--foreground)]">{title}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          <span className="font-mono text-[var(--accent)]">{row.join_code}</span>
                          {" · "}
                          {formatWhen(row.created_at)}
                          {" · "}
                          <span
                            className={cn(
                              "inline-flex items-center gap-0.5",
                              row.phase === "session_end" || row.is_active === false
                                ? "text-[var(--muted-foreground)]"
                                : "text-[var(--foreground)]",
                            )}
                          >
                            <Radio className="inline h-3 w-3" aria-hidden />
                            {phase}
                          </span>
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Link
                          href={ROUTES.admin.sessionHost(row.id)}
                          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface)]"
                        >
                          <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          세션 화면
                        </Link>
                        <Link
                          href={ROUTES.admin.sessionReport(row.id)}
                          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-[var(--primary)] px-3 text-sm font-semibold text-[var(--on-primary)] transition-colors hover:brightness-95"
                        >
                          <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          보고서
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        ) : null}
      </main>
    </div>
  );
}
