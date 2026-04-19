"use client";

import { Trash2, UserPlus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import type { DraftCharacter } from "./types";

type Props = {
  characters: DraftCharacter[];
  onAdd: (character: Omit<DraftCharacter, "tempId">) => void;
  onRemove: (tempId: string) => void;
};

export function CharactersStep({ characters, onAdd, onRemove }: Props) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");

  const canAdd = name.trim().length > 0 && role.trim().length > 0;

  const handleAdd = () => {
    if (!canAdd) return;
    onAdd({ name: name.trim(), role: role.trim() });
    setName("");
    setRole("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>2. 캐릭터 추가</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="이름 (예: Sally)"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleAdd();
              }
            }}
          />
          <Input
            value={role}
            onChange={(event) => setRole(event.target.value)}
            placeholder="역할 (예: 학생회장)"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleAdd();
              }
            }}
          />
          <Button type="button" onClick={handleAdd} disabled={!canAdd} variant="outline">
            <UserPlus className="mr-1 h-4 w-4" />
            추가
          </Button>
        </div>

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wider text-[var(--accent)]">
            등록된 캐릭터 ({characters.length})
          </p>
          {characters.length === 0 ? (
            <p className="rounded-md border border-dashed border-[var(--border)] px-3 py-6 text-center text-sm text-[var(--muted-foreground,#94a3b8)]">
              아직 캐릭터가 없습니다. 위에서 이름과 역할을 입력하고 추가해주세요.
            </p>
          ) : (
            <ul className="grid gap-2 md:grid-cols-2">
              {characters.map((c) => (
                <li
                  key={c.tempId}
                  className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[rgba(15,23,42,0.45)] px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                      {c.name}
                    </p>
                    <p className="truncate text-xs text-[var(--muted-foreground,#94a3b8)]">
                      {c.role}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(c.tempId)}
                    aria-label={`${c.name} 삭제`}
                    className="rounded p-1 text-[var(--muted-foreground,#94a3b8)] hover:bg-[rgba(239,68,68,0.15)] hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
