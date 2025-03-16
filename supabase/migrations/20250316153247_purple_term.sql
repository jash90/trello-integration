/*
  # Create Test User Migration

  1. Changes
    - Creates a test user with email 'test@example.com' and password 'password123'
    - Ensures proper identity record creation with provider_id
    - Handles existing user gracefully
*/

DO $$ 
DECLARE
  test_user_id uuid;
  existing_user_id uuid;
BEGIN
  -- Check if user already exists
  SELECT id INTO existing_user_id 
  FROM auth.users 
  WHERE email = 'test@example.com';

  IF existing_user_id IS NULL THEN
    -- Generate a new UUID for the user
    test_user_id := gen_random_uuid();
    
    -- Insert the test user
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
    ) VALUES (
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
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      '{}'::jsonb,
      FALSE,
      FALSE,
      NULL
    );

    -- Create identities record for the user
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      test_user_id,
      test_user_id,
      jsonb_build_object('sub', test_user_id::text, 'email', 'test@example.com'),
      'email',
      'test@example.com',
      now(),
      now(),
      now()
    );
  ELSE
    -- Update existing user's password if needed
    UPDATE auth.users
    SET encrypted_password = crypt('password123', gen_salt('bf'))
    WHERE id = existing_user_id;
  END IF;
END $$;