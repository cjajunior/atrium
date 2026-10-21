-- Atrium: rebuild the public demo every hour (Supabase only: needs the pg_cron extension).
create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;

select cron.schedule(
  'atrium-reset-demo',
  '0 * * * *',
  $$ select private.reset_demo() $$
);
