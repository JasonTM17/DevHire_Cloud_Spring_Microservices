CREATE UNIQUE INDEX IF NOT EXISTS ux_user_profiles_email_lower ON user_profiles (lower(email));
