"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

import { TeacherAuthForm } from "@/components/teacher/teacher-auth-form";
import { getCurrentSession, signInTeacher, signInWithGoogle } from "@/lib/api/auth";
import { AUTH_SESSION_QUERY_KEY } from "@/lib/auth/use-require-teacher-session";
import { getKoreanAuthErrorMessage } from "@/lib/auth/errors";
import { ROUTES } from "@/lib/routes";
import { hasSupabaseEnv } from "@/lib/supabase";
import { toast } from "sonner";

export default function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const sessionQuery = useQuery({
    queryKey: AUTH_SESSION_QUERY_KEY,
    queryFn: async () => {
      if (!hasSupabaseEnv) return null;
      return getCurrentSession();
    },
  });

  const signInMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      if (!hasSupabaseEnv) {
        throw new Error(
          "Supabase가 설정되지 않았습니다. .env 파일에 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 설정해 주세요.",
        );
      }
      await signInTeacher(email, password);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: AUTH_SESSION_QUERY_KEY });
      navigate(ROUTES.activities, { replace: true });
    },
    onError: (error) => {
      toast.error(getKoreanAuthErrorMessage(error));
    },
  });

  const googleSignInMutation = useMutation({
    mutationFn: async () => {
      if (!hasSupabaseEnv) {
        throw new Error(
          "Supabase가 설정되지 않았습니다. .env 파일에 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 설정해 주세요.",
        );
      }
      await signInWithGoogle();
    },
    onError: (error) => {
      toast.error(getKoreanAuthErrorMessage(error));
    },
  });

  useEffect(() => {
    if (sessionQuery.data) {
      navigate(ROUTES.activities, { replace: true });
      return;
    }

    if (sessionQuery.isLoading) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === "SIGNED_IN" || event === "USER_UPDATED") && session) {
        await queryClient.invalidateQueries({ queryKey: AUTH_SESSION_QUERY_KEY });
        navigate(ROUTES.activities, { replace: true });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, sessionQuery.data, sessionQuery.isLoading, queryClient]);

  return (
    <>
      <main className="flex min-h-svh flex-1 items-center justify-center px-4 py-20 sm:px-6 sm:py-24">
        <TeacherAuthForm
          onSubmit={(email: string, password: string) => {
            signInMutation.mutate({ email, password });
            return Promise.resolve();
          }}
          onGoogleSignIn={() => {
            googleSignInMutation.mutate();
          }}
          isLoading={signInMutation.isPending}
          isGooglePending={googleSignInMutation.isPending}
        />
      </main>
    </>
  );
}
