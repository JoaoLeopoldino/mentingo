-- Run ONCE as the database owner AFTER migrations, on the isolated demo database.
-- Create utu_control beforehand with a securely generated password outside source control.
-- It supports the code's deliberate DB_ADMIN operations, but cannot migrate or create roles.
ALTER ROLE utu_control NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION BYPASSRLS;
ALTER ROLE lms_app_user NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
GRANT CONNECT ON DATABASE mentingo_demo TO utu_control, lms_app_user;
GRANT USAGE ON SCHEMA public TO utu_control, lms_app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO utu_control, lms_app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO utu_control, lms_app_user;
-- Do not grant schema ownership/CREATE, role administration or migration-schema access.
-- Reapply DML grants after every schema migration; review new RLS policies before release.
