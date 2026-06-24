"use client";

import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

import { getCurrentSession } from "@/lib/api/auth";
import { ROUTES } from "@/lib/routes";
import { hasSupabaseEnv } from "@/lib/supabase";

export const AUTH_SESSION_QUERY_KEY = ["auth-session"] as const;

/**
 * 교사 페이지 공통 — Supabase 세션이 없으면 로그인으로 보냅니다.
 * `AuthSessionListener` 와 같은 `AUTH_SESSION_QUERY_KEY` 로 캐시를 공유합니다.
 */
export function useRequireTeacherSession() {
  const navigate = useNavigate();
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
      navigate(ROUTES.home, { replace: true });
      return;
    }
    if (!sessionQuery.data) navigate(ROUTES.home, { replace: true });
  }, [navigate, sessionQuery.data, sessionQuery.isLoading, sessionQuery.isFetching]);

  return sessionQuery;
}
