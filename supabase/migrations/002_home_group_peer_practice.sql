-- 서로 알려주기(홈 집단) — 모둠원 파트 연습(점수 없음) 완료 추적
alter table public.players add column if not exists peer_practice_completed jsonb not null default '[]'::jsonb;
alter table public.players add column if not exists home_group_completed_at timestamptz;
