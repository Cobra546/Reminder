-- Run in Supabase SQL Editor after enabling pg_cron, pg_net and Vault.
create table if not exists public.birthday_push_log (
  scheduled_key text primary key,
  message text not null,
  status text not null default 'pending' check (status in ('pending','sent','failed')),
  response jsonb,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

alter table public.birthday_push_log enable row level security;
-- No public read/write policies: only the Edge Function service role should access this table.

-- Replace both example values with real values before running:
select vault.create_secret('https://YOUR_PROJECT_REF.supabase.co', 'birthday_project_url');
select vault.create_secret('REPLACE_WITH_THE_SAME_RANDOM_CRON_SECRET', 'birthday_cron_secret');

-- Schedules a check once per minute. If rerunning setup, unschedule the old job first.
select cron.schedule(
  'keenoo-birthday-push-every-minute',
  '* * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'birthday_project_url')
           || '/functions/v1/birthday-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'birthday_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- To stop the job after the birthday:
-- select cron.unschedule('keenoo-birthday-push-every-minute');
