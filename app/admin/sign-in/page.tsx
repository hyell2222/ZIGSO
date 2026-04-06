"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { AdminAuthForm } from "@/app/admin/components/admin-auth-form";
import { ROUTES } from "@/lib/routes";
import { supabase } from "@/lib/supabase";
import { TopNav } from "@/components/layout/top-nav";

export default function AdminSignInPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const sessionQuery = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const signInMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["auth-session"] });
      router.replace(ROUTES.admin.root);
    },
  });

  useEffect(() => {
    if (sessionQuery.isLoading) return;
    if (sessionQuery.data) router.replace(ROUTES.admin.root);
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
          isLoading={signInMutation.isPending}
          message={signInMutation.error?.message ?? null}
          switchHref={ROUTES.admin.signUp}
          switchPrompt="No account yet?"
          switchLabel="Sign up"
        />
      </main>
    </>
  );
}
