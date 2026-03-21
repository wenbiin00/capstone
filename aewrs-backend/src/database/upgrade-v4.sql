-- AEWRS Database Upgrade v4
-- Adds sensor state columns to lockers table for IR + weight sensor readings
-- Run on existing databases (do NOT run on a fresh init.sql setup)

ALTER TABLE lockers
  ADD COLUMN IF NOT EXISTS item_present     BOOLEAN   DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS weight_grams     FLOAT     DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ir_detected      BOOLEAN   DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_sensor_update TIMESTAMPTZ DEFAULT NULL;
