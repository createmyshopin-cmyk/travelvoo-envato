-- Add Expo push notification token column to tenants
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS expo_push_token text DEFAULT NULL;
