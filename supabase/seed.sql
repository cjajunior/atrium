-- Atrium: demo accounts + demo workspace.
-- Run once after the migrations (Supabase SQL editor, `supabase db reset`, or the MCP).
-- All three accounts share the public demo password "atrium-demo".

do $$
declare
  account record;
  new_id uuid;
begin
  for account in
    select * from (values
      ('demo-admin@example.com', 'Ana Ribeiro'),
      ('demo-team@example.com', 'Theo Martins'),
      ('demo-client@example.com', 'Clara Nunes')
    ) as a(email, full_name)
  loop
    if not exists (select 1 from auth.users u where u.email = account.email) then
      new_id := gen_random_uuid();

      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, recovery_token, email_change_token_new, email_change
      ) values (
        '00000000-0000-0000-0000-000000000000', new_id, 'authenticated', 'authenticated',
        account.email, extensions.crypt('atrium-demo', extensions.gen_salt('bf')), now(),
        '{"provider": "email", "providers": ["email"]}'::jsonb,
        jsonb_build_object('full_name', account.full_name, 'demo', true),
        now(), now(), '', '', '', ''
      );

      insert into auth.identities (
        id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
      ) values (
        gen_random_uuid(), new_id, new_id::text,
        jsonb_build_object('sub', new_id::text, 'email', account.email, 'email_verified', true),
        'email', now(), now(), now()
      );
    end if;
  end loop;
end;
$$;

select private.reset_demo();
