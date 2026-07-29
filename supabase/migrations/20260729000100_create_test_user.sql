-- Test user para desarrollo local (NO aplicar en el proyecto hosted).
-- El trigger on_auth_user_created_terrain crea terrain.profiles automaticamente.

DO $$
DECLARE
  test_user_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
BEGIN
  DELETE FROM auth.users WHERE id = test_user_id;

  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_sent_at,
    aud,
    role,
    is_sso_user
  ) VALUES (
    test_user_id,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'test@local.dev',
    crypt('test-password-dev-only', gen_salt('bf')),
    NOW(),
    '',  -- Empty string instead of NULL
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Test User","avatar_url":"https://api.dicebear.com/7.x/avataaars/svg?seed=test"}'::jsonb,
    NOW(),
    NOW(),
    NOW(),
    'authenticated',
    'authenticated',
    false
  );

  UPDATE terrain.profiles SET ai_enabled = true WHERE id = test_user_id;

  RAISE NOTICE 'Test user created: test@local.dev';
END $$;
