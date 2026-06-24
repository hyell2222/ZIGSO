import { supabase } from "@/lib/supabase";

export async function fetchAiExplanation(params: {
  passage: string;
  question: string;
  choices: string[];
  correctIndex: number;
  wrongChoices: number[];
}) {
  const { data, error } = await supabase.functions.invoke("explain", {
    body: params,
  });
  if (error) {
    throw new Error(error.message || "Failed to fetch AI explanation from Edge Function");
  }
  return data;
}
