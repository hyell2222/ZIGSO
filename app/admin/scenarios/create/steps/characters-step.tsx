"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import type { DraftCharacter } from "./types";

type Props = {
  characters: DraftCharacter[];
  onAdd: (character: Omit<DraftCharacter, "tempId">) => void;
  onUpdate: (tempId: string, patch: Partial<Omit<DraftCharacter, "tempId">>) => void;
  onRemove: (tempId: string) => void;
};

export function CharactersStep({ characters, onAdd, onUpdate, onRemove }: Props) {
  const didSeedEmptyList = useRef(false);
  useEffect(() => {
    if (characters.length > 0) {
      didSeedEmptyList.current = false;
      return;
    }
    if (didSeedEmptyList.current) return;
    didSeedEmptyList.current = true;
    onAdd({ name: "", role: "" });
  }, [characters.length, onAdd]);

  const normalizedNameCount = new Map<string, number>();
  for (const character of characters) {
    const normalized = character.name.trim().toLocaleLowerCase();
    if (!normalized) continue;
    normalizedNameCount.set(normalized, (normalizedNameCount.get(normalized) ?? 0) + 1);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>2. 캐릭터 추가</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <ul className="grid gap-3">
            {characters.map((c, index) => {
              const isLast = index === characters.length - 1;
              const normalizedName = c.name.trim().toLocaleLowerCase();
              const isDuplicateName = normalizedName
                ? (normalizedNameCount.get(normalizedName) ?? 0) > 1
                : false;
              const canCreateNext =
                c.name.trim().length > 0 && c.role.trim().length > 0 && !isDuplicateName;
              return (
                <li
                  key={c.tempId}
                  className="space-y-3 rounded-md border border-[var(--border)] bg-[rgba(15,23,42,0.45)] px-3 py-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                      캐릭터 {index + 1}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemove(c.tempId)}
                      disabled={characters.length === 1}
                      className="text-[var(--muted-foreground,#94a3b8)] hover:bg-[rgba(239,68,68,0.15)] hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={`캐릭터 ${index + 1} 삭제`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold text-[var(--muted-foreground,#94a3b8)]">
                        이름<span className="ml-0.5 text-red-400">*</span>
                      </p>
                      <Input
                        value={c.name}
                        onChange={(event) => onUpdate(c.tempId, { name: event.target.value })}
                        onKeyDown={(event) => {
                          if (event.key !== "Enter" || !isLast || !canCreateNext) return;
                          event.preventDefault();
                          onAdd({ name: "", role: "" });
                        }}
                        placeholder="예: Sally"
                      />
                      {isDuplicateName ? (
                        <p className="text-xs text-red-300">이미 존재하는 이름입니다.</p>
                      ) : null}
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold text-[var(--muted-foreground,#94a3b8)]">
                        역할<span className="ml-0.5 text-red-400">*</span>
                      </p>
                      <Input
                        value={c.role}
                        onChange={(event) => onUpdate(c.tempId, { role: event.target.value })}
                        onKeyDown={(event) => {
                          if (event.key !== "Enter" || !isLast || !canCreateNext) return;
                          event.preventDefault();
                          onAdd({ name: "", role: "" });
                        }}
                        placeholder="예: 학생회장"
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={() => onAdd({ name: "", role: "" })}>
              캐릭터 추가
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
