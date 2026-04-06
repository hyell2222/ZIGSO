"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { AdminAuthForm } from "@/app/admin/auth/components/admin-auth-form";
import { SupabaseConfigNotice } from "@/app/admin/auth/components/supabase-config-notice";
import { hasSupabaseEnv, supabase } from "@/lib/supabase";

export default function AdminSignInPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const sessionQuery = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
    enabled: hasSupabaseEnv,
  });

  const signInMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["auth-session"] });
      router.replace("/admin");
    },
  });

  useEffect(() => {
    if (!hasSupabaseEnv || sessionQuery.isLoading) return;
    if (sessionQuery.data) router.replace("/admin");
  }, [router, sessionQuery.data, sessionQuery.isLoading]);

  if (!hasSupabaseEnv) return <SupabaseConfigNotice />;

  return (
    <AdminAuthForm
      mode="sign-in"
      onSubmit={async (email, password) => {
        await signInMutation.mutateAsync({ email, password });
      }}
      isLoading={signInMutation.isPending}
      message={signInMutation.error?.message ?? null}
      switchHref="/admin/sign-up"
      switchPrompt="No account yet?"
      switchLabel="Sign up"
    />
  );
}
