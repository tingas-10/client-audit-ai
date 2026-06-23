-- Client Audit AI — table privileges for the Supabase API roles.
--
-- Some Supabase projects (notably newer ones / the new API-key system) do not
-- auto-grant table privileges to the anon/authenticated/service_role roles, so
-- writes via the service-role key fail with `42501 permission denied for table`
-- even though RLS would otherwise allow them. This migration grants the needed
-- privileges explicitly. RLS (from 0001) still governs which ROWS each role sees.
--
-- Apply after 0001_init.sql (run once on the database).

begin;

grant usage on schema public to anon, authenticated, service_role;
grant all privileges on all tables in schema public to service_role;
grant select on all tables in schema public to anon, authenticated;

alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant select on tables to anon, authenticated;

commit;
