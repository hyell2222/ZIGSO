"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { AdminAuthForm } from "@/components/admin/admin-auth-form";
import { getCurrentSession, signInTeacher } from "@/lib/api/auth";
import { ROUTES } from "@/lib/routes";
import { hasSupabaseEnv } from "@/lib/supabase";
import { TopNav } from "@/components/layout/top-nav";

export default function AdminSignInPage() {
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
          "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.",
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
      <main className="flex items-center justify-center py-40">
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
              ? "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env."
              : null)
          }
          switchHref={ROUTES.admin.signUp}
          switchPrompt="No account yet?"
          switchLabel="Sign up"
        />
      </main>
    </>
  );
}
