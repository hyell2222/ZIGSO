"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { getCurrentSession } from "@/lib/api/auth";
import { AUTH_SESSION_QUERY_KEY } from "@/lib/auth-session-query";
import { ROUTES } from "@/lib/routes";
import { hasSupabaseEnv } from "@/lib/supabase";

/**
 * 교사 페이지 공통 — Supabase 세션이 없으면 로그인으로 보냅니다.
 * `AuthSessionListener` 와 같은 `AUTH_SESSION_QUERY_KEY` 로 캐시를 공유합니다.
 */
export function useRequireTeacherSession() {
  const router = useRouter();
  const sessionQuery = useQuery({
    queryKey: AUTH_SESSION_QUERY_KEY,
    queryFn: async () => {
      if (!hasSupabaseEnv) return null;
      return getCurrentSession();
    },
  });

  useEffect(() => {
    if (sessionQuery.isLoading) return;
    if (sessionQuery.isFetching && !sessionQuery.data) return;
    if (!hasSupabaseEnv) {
      router.replace(ROUTES.login);
      return;
    }
    if (!sessionQuery.data) router.replace(ROUTES.login);
  }, [router, sessionQuery.data, sessionQuery.isLoading, sessionQuery.isFetching]);

  return sessionQuery;
}
