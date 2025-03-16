/*
  # Create Test User

  1. Changes
    - Add unique constraint on auth.users email column if it doesn't exist
    - Create a test user with email/password authentication
    - Email: test@example.com
    - Password: password123
*/

-- Create test user safely
DO $$ 
DECLARE
  test_user_id uuid;
BEGIN
  -- Generate a new UUID for the user
  test_user_id := gen_random_uuid();
  
  -- Insert the test user if they don't exist
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_current,
    email_change_token_new,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    is_sso_user,
    deleted_at
  ) 
  SELECT
    test_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'test@example.com',
    crypt('password123', gen_salt('bf')),
    now(),
    now(),
    now(),
    encode(gen_random_bytes(32), 'hex'),
    encode(gen_random_bytes(32), 'hex'),
    encode(gen_random_bytes(32), 'hex'),
    encode(gen_random_bytes(32), 'hex'),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{}',
    FALSE,
    FALSE,
    NULL
  WHERE NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'test@example.com'
  );

  -- Create identities record for the user
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  SELECT
    test_user_id,
    test_user_id,
    jsonb_build_object('sub', test_user_id::text, 'email', 'test@example.com'),
    'email',
    now(),
    now(),
    now()
  WHERE NOT EXISTS (
    SELECT 1 FROM auth.identities 
    WHERE user_id = test_user_id AND provider = 'email'
  );
END $$;