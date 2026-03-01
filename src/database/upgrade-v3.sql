-- AEWRS Database Upgrade v3
-- Fixed locker assignment: each equipment type gets a dedicated locker
-- Run this on existing databases (do NOT run on a fresh init.sql setup)

-- Replace current_equipment_id with assigned_equipment_id (permanent assignment)
ALTER TABLE lockers RENAME COLUMN current_equipment_id TO assigned_equipment_id;

-- Reset all lockers to available first (clean slate)
UPDATE lockers SET status = 'available', assigned_equipment_id = NULL;

-- Assign each equipment type to a fixed locker by ordering
-- (nth equipment by equipment_id → nth locker by compartment_number)
UPDATE lockers l
SET assigned_equipment_id = e.equipment_id
FROM (
  SELECT equipment_id, ROW_NUMBER() OVER (ORDER BY equipment_id) AS rn FROM equipment
) e
JOIN (
  SELECT locker_id, ROW_NUMBER() OVER (ORDER BY compartment_number) AS rn FROM lockers
) lk ON e.rn = lk.rn
WHERE l.locker_id = lk.locker_id;
-- Any remaining lockers (more lockers than equipment) stay NULL (unassigned)

DO $$
BEGIN
    RAISE NOTICE 'Upgrade v3 complete: fixed locker assignments applied.';
END $$;
