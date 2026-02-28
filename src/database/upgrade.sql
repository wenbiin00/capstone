-- AEWRS Database Upgrade Script
-- This adds the missing features to your existing database
-- Safe to run - won't delete existing data

BEGIN;

-- 1. Add low_stock_threshold to equipment table (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='equipment' AND column_name='low_stock_threshold'
    ) THEN
        ALTER TABLE equipment ADD COLUMN low_stock_threshold INTEGER DEFAULT 5;
        UPDATE equipment SET low_stock_threshold = 5 WHERE low_stock_threshold IS NULL;
        RAISE NOTICE 'Added low_stock_threshold column to equipment';
    ELSE
        RAISE NOTICE 'low_stock_threshold column already exists';
    END IF;
END $$;

-- 2. Add updated_at columns (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='equipment' AND column_name='updated_at'
    ) THEN
        ALTER TABLE equipment ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE 'Added updated_at to equipment';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='lockers' AND column_name='updated_at'
    ) THEN
        ALTER TABLE lockers ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE 'Added updated_at to lockers';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='transactions' AND column_name='updated_at'
    ) THEN
        ALTER TABLE transactions ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE 'Added updated_at to transactions';
    END IF;
END $$;

-- 3. Update transaction status constraint to include new states
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_status_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_status_check
    CHECK (status IN ('pending_pickup', 'active', 'pending_return', 'completed', 'cancelled', 'expired'));

RAISE NOTICE 'Updated transaction status constraint with new states';

-- 4. Update transaction action constraint
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_action_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_action_check
    CHECK (action IN ('borrow', 'return', 'replenish'));

-- 5. Add current_transaction_id to lockers if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='lockers' AND column_name='current_transaction_id'
    ) THEN
        ALTER TABLE lockers ADD COLUMN current_transaction_id INTEGER REFERENCES transactions(transaction_id) ON DELETE SET NULL;
        RAISE NOTICE 'Added current_transaction_id to lockers';
    END IF;
END $$;

-- 6. Update existing transaction statuses to new format
UPDATE transactions
SET status = CASE
    WHEN status = 'pending' THEN 'pending_pickup'
    WHEN status = 'borrowed' THEN 'active'
    WHEN status = 'returned' THEN 'completed'
    ELSE status
END
WHERE status IN ('pending', 'borrowed', 'returned');

RAISE NOTICE 'Updated existing transaction statuses';

-- 7. Add more lockers if needed (up to 15 total)
DO $$
DECLARE
    locker_count INTEGER;
    i INTEGER;
BEGIN
    SELECT COUNT(*) INTO locker_count FROM lockers;

    IF locker_count < 15 THEN
        FOR i IN (locker_count + 101)..115 LOOP
            INSERT INTO lockers (compartment_number, status)
            VALUES (i, 'available')
            ON CONFLICT (compartment_number) DO NOTHING;
        END LOOP;
        RAISE NOTICE 'Added lockers, total now: %', (SELECT COUNT(*) FROM lockers);
    ELSE
        RAISE NOTICE 'Sufficient lockers exist: %', locker_count;
    END IF;
END $$;

-- 8. Create low_stock_equipment view
DROP VIEW IF EXISTS low_stock_equipment;
CREATE VIEW low_stock_equipment AS
SELECT
    equipment_id,
    name,
    description,
    category,
    total_quantity,
    available_quantity,
    low_stock_threshold,
    (low_stock_threshold - available_quantity) as units_needed
FROM equipment
WHERE available_quantity < low_stock_threshold
ORDER BY available_quantity ASC;

RAISE NOTICE 'Created low_stock_equipment view';

-- 9. Create active_transactions_view
DROP VIEW IF EXISTS active_transactions_view;
CREATE VIEW active_transactions_view AS
SELECT
    t.transaction_id,
    t.user_id,
    u.sit_id,
    u.name as user_name,
    u.email,
    t.equipment_id,
    e.name as equipment_name,
    e.category,
    t.locker_id,
    l.compartment_number,
    t.action,
    t.status,
    t.borrow_time,
    t.due_date,
    t.created_at,
    CASE
        WHEN t.due_date < CURRENT_DATE AND t.status = 'active' THEN true
        ELSE false
    END as is_overdue
FROM transactions t
JOIN users u ON t.user_id = u.user_id
JOIN equipment e ON t.equipment_id = e.equipment_id
LEFT JOIN lockers l ON t.locker_id = l.locker_id
WHERE t.status IN ('pending_pickup', 'active', 'pending_return')
ORDER BY t.created_at DESC;

RAISE NOTICE 'Created active_transactions_view';

-- 10. Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 11. Create triggers for updated_at
DROP TRIGGER IF EXISTS update_equipment_updated_at ON equipment;
CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON equipment
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lockers_updated_at ON lockers;
CREATE TRIGGER update_lockers_updated_at BEFORE UPDATE ON lockers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

RAISE NOTICE 'Created updated_at triggers';

-- 12. Ensure RFID UIDs exist for sample users
UPDATE users SET rfid_uid = 'A1B2C3D4' WHERE sit_id = '2301234' AND rfid_uid IS NULL;
UPDATE users SET rfid_uid = 'LAB12345' WHERE role = 'staff' AND rfid_uid IS NULL LIMIT 1;

COMMIT;

-- Final verification
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'UPGRADE COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total Users: %', (SELECT COUNT(*) FROM users);
    RAISE NOTICE 'Total Equipment: %', (SELECT COUNT(*) FROM equipment);
    RAISE NOTICE 'Total Lockers: %', (SELECT COUNT(*) FROM lockers);
    RAISE NOTICE 'Total Transactions: %', (SELECT COUNT(*) FROM transactions);
    RAISE NOTICE 'Low Stock Items: %', (SELECT COUNT(*) FROM low_stock_equipment);
    RAISE NOTICE '========================================';
END $$;
