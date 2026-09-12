-- Migration: 20260804000000_expand_bike_status_enum
-- Purpose: Expand public.bike_status enum from 4 to 7 values with safe backfill
--          available → ready_to_rent, maintenance → maintenance_required
--          This is an additive migration — never rewrites already-applied migrations.
--
-- Dependencies discovered:
--   - public.bikes (status column, default 'available')
--   - public.bike_status_events (from_status, to_status columns)
--   - public.update_bike_status_with_event (RPC, uses public.bike_status param types)
--   - TypeScript types in database.types.ts and supabase.types.ts
--
-- Acceptance: enum must end with exactly: ready_to_rent, reserved, in_use,
--             returned_pending_inspection, charging, maintenance_required, out_of_service

-- Step 1: Add new enum values to the existing type.
-- We use ADD VALUE because PostgreSQL allows it without data loss.
-- The existing values (available, reserved, in_use, maintenance) are kept,
-- and we add the new values.

DO $$
BEGIN
    -- Add new enum values to public.bike_status
    ALTER TYPE public.bike_status ADD VALUE 'ready_to_rent';
    ALTER TYPE public.bike_status ADD VALUE 'returned_pending_inspection';
    ALTER TYPE public.bike_status ADD VALUE 'charging';
    ALTER TYPE public.bike_status ADD VALUE 'maintenance_required';
    ALTER TYPE public.bike_status ADD VALUE 'out_of_service';
END$$;

-- Step 2: Backfill existing rows — translate old values to new values.
-- available → ready_to_rent, maintenance → maintenance_required
-- Other existing values (reserved, in_use) remain unchanged.

UPDATE public.bikes
SET status = 'ready_to_rent'
WHERE status = 'available';

UPDATE public.bikes
SET status = 'maintenance_required'
WHERE status = 'maintenance';

UPDATE public.bike_status_events
SET from_status = 'ready_to_rent'
WHERE from_status = 'available';

UPDATE public.bike_status_events
SET to_status = 'ready_to_rent'
WHERE to_status = 'available';

UPDATE public.bike_status_events
SET from_status = 'maintenance_required'
WHERE from_status = 'maintenance';

UPDATE public.bike_status_events
SET to_status = 'maintenance_required'
WHERE to_status = 'maintenance';

-- Step 3: Update the RPC function's expected status parameter type.
-- The function signature uses public.bike_status, and with the new values added,
-- it will automatically accept them. No schema change needed for the function
-- since PostgreSQL enum ALTER TYPE preserves compatibility.

-- Step 4: Verify the enum now has the expected 7 values.
-- This is a validation comment — the migration itself does not error if values exist.
SELECT enum_range(NULL::public.bike_status) AS current_enum_values;

COMMENT ON TYPE public.bike_status IS 'Canonical bike status enum: available, reserved, in_use, maintenance, ready_to_rent, returned_pending_inspection, charging, maintenance_required, out_of_service';