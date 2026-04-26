"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { AdminAuthForm } from "@/components/admin/admin-auth-form";
import { TopNav } from "@/components/layout/top-nav";
import { getCurrentSession, signInTeacher } from "@/lib/api/auth";
import { ROUTES } from "@/lib/routes";
import { hasSupabaseEnv } from "@/lib/supabase";

export default function HomePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const sessionQuery = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => {
      if (!hasSupabaseEnv) return null;
      return getCurrentSession();
    },
  });

  const signInMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      if (!hasSupabaseEnv) {
        throw new Error(
          "Supabase가 설정되지 않았습니다. .env에 NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY를 넣어 주세요.",
        );
      }
      await signInTeacher(email, password);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["auth-session"] });
      router.replace(ROUTES.admin.cases);
    },
  });

  useEffect(() => {
    if (sessionQuery.isLoading) return;
    if (sessionQuery.data) router.replace(ROUTES.admin.cases);
  }, [router, sessionQuery.data, sessionQuery.isLoading]);

  return (
    <>
      <TopNav />
      <main className="flex min-h-[calc(100dvh-3.75rem)] items-center justify-center px-4 py-16">
        <AdminAuthForm
          mode="sign-in"
          onSubmit={(email, password) => {
            signInMutation.mutate({ email, password });
            return Promise.resolve();
          }}
          isLoading={signInMutation.isPending || !hasSupabaseEnv}
          message={
            signInMutation.error?.message ??
            (!hasSupabaseEnv
              ? "Supabase가 설정되지 않았습니다. .env에 NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY를 추가하세요."
              : null)
          }
          switchHref={ROUTES.admin.signUp}
          switchPrompt="계정이 없으신가요?"
          switchLabel="회원가입"
        />
      </main>
    </>
  );
}
