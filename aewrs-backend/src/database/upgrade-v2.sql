-- AEWRS Database Upgrade Script v2
-- This adds the missing features to your existing database
-- Fixes for existing data

-- Step 1: Add missing columns
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 5;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE lockers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE lockers ADD COLUMN IF NOT EXISTS current_transaction_id INTEGER;

-- Step 2: Update existing transaction statuses BEFORE adding constraints
UPDATE transactions SET status = 'pending_pickup' WHERE status = 'pending';
UPDATE transactions SET status = 'active' WHERE status = 'borrowed';
UPDATE transactions SET status = 'completed' WHERE status = 'returned';

-- Step 3: Drop old constraints and add new ones
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_status_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_status_check
    CHECK (status IN ('pending_pickup', 'active', 'pending_return', 'completed', 'cancelled', 'expired'));

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_action_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_action_check
    CHECK (action IN ('borrow', 'return', 'replenish'));

-- Step 4: Add foreign key for current_transaction_id
ALTER TABLE lockers DROP CONSTRAINT IF EXISTS fk_current_transaction;
ALTER TABLE lockers ADD CONSTRAINT fk_current_transaction
    FOREIGN KEY (current_transaction_id) REFERENCES transactions(transaction_id) ON DELETE SET NULL;

-- Step 5: Add more lockers (compartment numbers 101-115)
INSERT INTO lockers (compartment_number, status) VALUES
(101, 'available'), (102, 'available'), (103, 'available'),
(104, 'available'), (105, 'available'), (106, 'available'),
(107, 'available'), (108, 'available'), (109, 'available'),
(110, 'available'), (111, 'available'), (112, 'available'),
(113, 'available'), (114, 'available'), (115, 'available')
ON CONFLICT (compartment_number) DO NOTHING;

-- Step 6: Create low_stock_equipment view
DROP VIEW IF EXISTS low_stock_equipment CASCADE;
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

-- Step 7: Create active_transactions_view
DROP VIEW IF EXISTS active_transactions_view CASCADE;
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

-- Step 8: Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 9: Create triggers for updated_at
DROP TRIGGER IF EXISTS update_equipment_updated_at ON equipment;
CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON equipment
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lockers_updated_at ON lockers;
CREATE TRIGGER update_lockers_updated_at BEFORE UPDATE ON lockers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 10: Add sample RFID UIDs to users (if missing)
UPDATE users SET rfid_uid = 'A1B2C3D4' WHERE sit_id = '2301234' AND rfid_uid IS NULL;

-- Done!
\echo '✅ Database upgrade complete!'
\echo ''
SELECT 'Users: ' || COUNT(*)::text FROM users
UNION ALL SELECT 'Equipment: ' || COUNT(*)::text FROM equipment
UNION ALL SELECT 'Lockers: ' || COUNT(*)::text FROM lockers
UNION ALL SELECT 'Transactions: ' || COUNT(*)::text FROM transactions
UNION ALL SELECT 'Low Stock Items: ' || COUNT(*)::text FROM low_stock_equipment;
