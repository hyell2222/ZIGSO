"use client";

import { supabase } from "@/lib/supabase";

export async function getCurrentSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function signInTeacher(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOutTeacher() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function signInWithGoogle() {
  const targetOrigin = typeof window !== "undefined" && window.location.protocol === "file:"
    ? "https://zigso.vercel.app"
    : window.location.origin;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${targetOrigin}/login`,
    },
  });
  if (error) throw error;
}
