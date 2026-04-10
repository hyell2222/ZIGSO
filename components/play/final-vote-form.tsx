"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPlayerVoteCharacterId, submitPlayerFinalVote } from "@/lib/api/play";
import { cn } from "@/lib/utils";

export type VoteCharacterOption = { id: string; name: string | null; role: string | null };

type FinalVoteFormProps = {
  playerId: string | null;
  characters: VoteCharacterOption[];
  /** 본인 캐릭터 — 선택 목록에서 제외(타인만 범인 후보로) */
  ownCharacterId: string | null;
};

export function FinalVoteForm({ playerId, characters, ownCharacterId }: FinalVoteFormProps) {
  const queryClient = useQueryClient();
  const [choice, setChoice] = useState("");

  const voteQuery = useQuery({
    queryKey: ["play-player-vote", playerId],
    queryFn: async () => getPlayerVoteCharacterId(playerId as string),
    enabled: Boolean(playerId),
  });

  const voteMutation = useMutation({
    mutationFn: submitPlayerFinalVote,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["play-player-vote", playerId] });
    },
  });

  const options = useMemo(() => {
    const list = [...characters].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
    if (ownCharacterId) {
      return list.filter((c) => c.id !== ownCharacterId);
    }
    return list;
  }, [characters, ownCharacterId]);

  const submittedId = voteQuery.data ?? null;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!choice || !playerId) return;
    voteMutation.mutate({ playerId, voteCharacterId: choice });
  };

  const submittedName =
    characters.find((c) => c.id === submittedId)?.name ??
    (submittedId ? submittedId.slice(0, 8) + "…" : null);

  if (!playerId) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6 text-sm text-slate-400">
        플레이어 정보를 불러오는 중입니다.
      </div>
    );
  }

  if (voteQuery.isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-6 text-sm text-slate-400">
        투표 기록을 확인하는 중…
      </div>
    );
  }

  if (voteQuery.isError) {
    return (
      <Card className="mx-auto w-full max-w-md border-red-900/50 bg-slate-900/90">
        <CardHeader>
          <CardTitle className="text-red-300">불러오기 실패</CardTitle>
          <p className="mt-1 text-sm text-slate-400">
            {voteQuery.error instanceof Error ? voteQuery.error.message : "알 수 없는 오류"}
          </p>
        </CardHeader>
      </Card>
    );
  }

  if (submittedId) {
    return (
      <Card className="mx-auto w-full max-w-md border-slate-700 bg-slate-900/90">
        <CardHeader>
          <CardTitle className="text-cyan-200">투표가 접수되었습니다</CardTitle>
          <p className="mt-1 text-sm text-slate-400">선택: {submittedName ?? "—"}</p>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="mx-auto w-full max-w-md border-slate-700 bg-slate-900/90">
      <CardHeader>
        <CardTitle className="text-cyan-200">최종 투표 — 범인 지목</CardTitle>
        <p className="mt-1 text-sm text-slate-400">
          시나리오에 등장하는 캐릭터 중 범인으로 생각되는 인물을 한 명 선택하세요.
        </p>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label htmlFor="vote-target" className="text-sm font-medium text-slate-200">
              지목할 캐릭터
            </label>
            <select
              id="vote-target"
              required
              value={choice}
              onChange={(e) => setChoice(e.target.value)}
              disabled={voteMutation.isPending}
              className={cn(
                "flex h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100",
                "ring-offset-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:ring-offset-2",
                "disabled:opacity-60",
              )}
            >
              <option value="">캐릭터를 선택하세요</option>
              {options.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name ?? "이름 없음"}
                  {c.role ? ` · ${c.role}` : ""}
                </option>
              ))}
            </select>
          </div>
          {options.length === 0 ? (
            <p className="text-sm text-amber-300">이 시나리오에 투표할 다른 캐릭터가 없습니다.</p>
          ) : null}
          {voteMutation.isError ? (
            <p className="text-sm text-red-300">
              {voteMutation.error instanceof Error ? voteMutation.error.message : "투표 저장에 실패했습니다."}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={!choice || options.length === 0 || voteMutation.isPending}>
            {voteMutation.isPending ? "제출 중…" : "투표 제출"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
