"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { AUTH_SESSION_QUERY_KEY } from "@/lib/auth-session-query";
import { hasSupabaseEnv, supabase } from "@/lib/supabase";

/**
 * Supabase auth 상태 변화(초기 세션 포함) 시 `auth-session` 쿼리를 갱신해
 * 로그인 직후·새로고침 직후에도 `useQuery`가 실제 세션을 반영하도록 합니다.
 */
export function AuthSessionListener() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!hasSupabaseEnv) return;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void queryClient.invalidateQueries({ queryKey: AUTH_SESSION_QUERY_KEY });
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  return null;
}
