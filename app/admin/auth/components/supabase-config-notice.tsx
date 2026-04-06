import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SupabaseConfigNotice() {
  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Supabase Configuration Required</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-slate-300">
        <p>Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`.</p>
        <p>This app uses client-side Supabase Auth + RLS for static-export compatibility.</p>
      </CardContent>
    </Card>
  );
}
