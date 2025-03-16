/*
  # Create Test User

  1. Changes
    - Create a test user with email/password authentication
    - Email: test@example.com
    - Password: password123
*/

-- Create a test user with a hashed password
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'test@example.com',
  crypt('password123', gen_salt('bf')),
  now(),
  now(),
  now(),
  encode(gen_random_bytes(32), 'hex'),
  encode(gen_random_bytes(32), 'hex')
)
ON CONFLICT (email) DO NOTHING;