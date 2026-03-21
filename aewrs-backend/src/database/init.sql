-- AEWRS Database Initialization Script
-- Run this script to set up the complete database schema

-- Drop existing tables if they exist (for fresh setup)
DROP TABLE IF EXISTS access_logs CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS lockers CASCADE;
DROP TABLE IF EXISTS equipment CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    sit_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'staff', 'admin')),
    rfid_uid VARCHAR(50) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create equipment table
CREATE TABLE equipment (
    equipment_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    total_quantity INTEGER NOT NULL DEFAULT 0,
    available_quantity INTEGER NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT quantity_check CHECK (available_quantity >= 0 AND available_quantity <= total_quantity)
);

-- Create lockers table
CREATE TABLE lockers (
    locker_id SERIAL PRIMARY KEY,
    compartment_number INTEGER UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance')),
    current_equipment_id INTEGER REFERENCES equipment(equipment_id) ON DELETE SET NULL,
    current_transaction_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create transactions table with new states
CREATE TABLE transactions (
    transaction_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    equipment_id INTEGER NOT NULL REFERENCES equipment(equipment_id) ON DELETE CASCADE,
    locker_id INTEGER REFERENCES lockers(locker_id) ON DELETE SET NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('borrow', 'return', 'replenish')),
    status VARCHAR(30) NOT NULL DEFAULT 'pending_pickup'
        CHECK (status IN ('pending_pickup', 'active', 'pending_return', 'completed', 'cancelled', 'expired')),
    borrow_time TIMESTAMP,
    return_time TIMESTAMP,
    due_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key for current_transaction_id (after transactions table exists)
ALTER TABLE lockers
    ADD CONSTRAINT fk_current_transaction
    FOREIGN KEY (current_transaction_id)
    REFERENCES transactions(transaction_id)
    ON DELETE SET NULL;

-- Create access_logs table for RFID access tracking
CREATE TABLE access_logs (
    log_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    rfid_uid VARCHAR(50),
    locker_id INTEGER REFERENCES lockers(locker_id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    access_granted BOOLEAN NOT NULL,
    reason VARCHAR(255),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_users_sit_id ON users(sit_id);
CREATE INDEX idx_users_rfid ON users(rfid_uid);
CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_equipment_available ON equipment(available_quantity);
CREATE INDEX idx_lockers_status ON lockers(status);
CREATE INDEX idx_access_logs_timestamp ON access_logs(timestamp);

-- Insert sample users
INSERT INTO users (sit_id, name, email, role, rfid_uid) VALUES
('2301234', 'John Student', 'john.student@sit.edu.sg', 'student', 'A1B2C3D4'),
('2301235', 'Jane Smith', 'jane.smith@sit.edu.sg', 'student', 'E5F6G7H8'),
('LAB001', 'Lab Technician', 'lab.tech@sit.edu.sg', 'staff', 'LAB12345'),
('ADMIN001', 'System Admin', 'admin@sit.edu.sg', 'admin', 'ADM12345');

-- Insert sample equipment
INSERT INTO equipment (name, description, category, total_quantity, available_quantity, low_stock_threshold) VALUES
('Arduino Uno R3', 'Microcontroller board based on ATmega328P', 'Electronics', 20, 15, 5),
('Raspberry Pi 4', '4GB RAM single-board computer', 'Computing', 10, 8, 3),
('Digital Multimeter', 'Fluke 117 True RMS multimeter', 'Measurement', 15, 12, 5),
('Breadboard Kit', '830 tie-points solderless breadboard with jumper wires', 'Electronics', 25, 20, 8),
('Oscilloscope Probe', '100MHz oscilloscope probe set', 'Measurement', 8, 3, 3),
('Logic Analyzer', '8-channel USB logic analyzer', 'Electronics', 5, 4, 2),
('Soldering Iron', 'Temperature-controlled soldering station', 'Tools', 10, 7, 3),
('3D Printer Filament', 'PLA filament 1kg spool', 'Materials', 12, 2, 5);

-- Insert sample lockers
INSERT INTO lockers (compartment_number, status) VALUES
(101, 'available'),
(102, 'available'),
(103, 'available'),
(104, 'available'),
(105, 'available'),
(106, 'available'),
(107, 'available'),
(108, 'available'),
(109, 'available'),
(110, 'available'),
(201, 'available'),
(202, 'available'),
(203, 'available'),
(204, 'available'),
(205, 'available');

-- Create view for low-stock equipment (for lab tech dashboard)
CREATE OR REPLACE VIEW low_stock_equipment AS
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

-- Create view for active transactions with details
CREATE OR REPLACE VIEW active_transactions_view AS
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

-- Grant permissions (adjust username as needed)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO binfinity;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO binfinity;

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON equipment
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lockers_updated_at BEFORE UPDATE ON lockers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'AEWRS Database initialized successfully!';
    RAISE NOTICE 'Total Equipment Types: %', (SELECT COUNT(*) FROM equipment);
    RAISE NOTICE 'Total Lockers: %', (SELECT COUNT(*) FROM lockers);
    RAISE NOTICE 'Total Users: %', (SELECT COUNT(*) FROM users);
END $$;
