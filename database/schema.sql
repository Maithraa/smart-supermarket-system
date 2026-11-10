-- ========================================================
-- SMART SUPERMARKET BILLING VERIFICATION & AUTOMATED COMPLAINT RESOLUTION SYSTEM
-- COMPLETE RELATIONAL DATABASE SCHEMA & DEMO DATA
-- Compatible with MySQL 8.0+ / MariaDB
-- ========================================================

CREATE DATABASE IF NOT EXISTS smart_supermarket;
USE smart_supermarket;

-- Disable foreign key checks for clean teardown/setup
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS complaint_updates;
DROP TABLE IF EXISTS resolutions;
DROP TABLE IF EXISTS investigation_notes;
DROP TABLE IF EXISTS complaint_assignments;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS complaints;
DROP TABLE IF EXISTS received_items;
DROP TABLE IF EXISTS bill_items;
DROP TABLE IF EXISTS bills;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS admins;
DROP TABLE IF EXISTS cashiers;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS users;

-- --------------------------------------------------------
-- 1. USERS TABLE (Core authentication for Customer, Cashier, Admin)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    role ENUM('Customer', 'Cashier', 'Admin') NOT NULL DEFAULT 'Customer',
    phone VARCHAR(20),
    status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_email (email),
    INDEX idx_user_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 2. CUSTOMERS TABLE
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    customer_code VARCHAR(30) UNIQUE,
    phone VARCHAR(20) NOT NULL,
    address TEXT,
    membership_tier VARCHAR(30) DEFAULT 'Standard',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 3. CASHIERS TABLE
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS cashiers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    cashier_name VARCHAR(120) NOT NULL,
    cashier_code VARCHAR(30) NOT NULL UNIQUE,
    counter_no INT NOT NULL DEFAULT 1,
    phone VARCHAR(20),
    shift ENUM('Morning', 'Evening', 'Night') DEFAULT 'Morning',
    status ENUM('Active', 'Inactive') DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_cashier_counter (counter_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 4. ADMINS TABLE
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    admin_name VARCHAR(120) NOT NULL,
    department VARCHAR(100) DEFAULT 'Supermarket Management',
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 5. PRODUCTS TABLE (Inventory catalog)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_code VARCHAR(50) NOT NULL UNIQUE,
    product_name VARCHAR(150) NOT NULL,
    category VARCHAR(80) NOT NULL,
    barcode VARCHAR(80) NOT NULL UNIQUE,
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    stock_quantity INT NOT NULL DEFAULT 100,
    image_url VARCHAR(255),
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_product_barcode (barcode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 6. BILLS TABLE
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS bills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bill_no VARCHAR(50) NOT NULL UNIQUE,
    customer_id INT NULL,
    customer_name VARCHAR(120) NOT NULL,
    customer_phone VARCHAR(20),
    cashier_id INT NULL,
    cashier_name VARCHAR(120) NOT NULL,
    counter_no INT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    qr_data VARCHAR(255),
    is_verified BOOLEAN DEFAULT FALSE,
    verification_status VARCHAR(50) DEFAULT 'Pending Verification',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (cashier_id) REFERENCES cashiers(id) ON DELETE SET NULL,
    INDEX idx_bill_no (bill_no),
    INDEX idx_bill_cashier (cashier_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 7. BILL_ITEMS TABLE (Products listed on the official invoice)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS bill_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bill_id INT NOT NULL,
    product_id INT NULL,
    product_name VARCHAR(150) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 8. RECEIVED_ITEMS TABLE (Physical products received in shopping bag)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS received_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bill_id INT NOT NULL,
    product_name VARCHAR(150) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 9. COMPLAINTS TABLE
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS complaints (
    id INT AUTO_INCREMENT PRIMARY KEY,
    complaint_no VARCHAR(30) NOT NULL UNIQUE,
    bill_id INT NOT NULL,
    bill_no VARCHAR(50) NOT NULL,
    customer_id INT NULL,
    customer_name VARCHAR(120) NOT NULL,
    customer_email VARCHAR(120),
    customer_phone VARCHAR(20),
    issue_type VARCHAR(100) NOT NULL,
    product_name VARCHAR(150),
    expected_product VARCHAR(150),
    received_product VARCHAR(150),
    expected_quantity INT DEFAULT 1,
    received_quantity INT DEFAULT 1,
    description TEXT NOT NULL,
    image_url VARCHAR(255),
    status ENUM(
        'Submitted',
        'Under Review',
        'Assigned to Cashier',
        'Investigation in Progress',
        'Awaiting Manager Approval',
        'Resolution Offered',
        'Resolved',
        'Closed'
    ) NOT NULL DEFAULT 'Submitted',
    assigned_cashier_id INT NULL,
    assigned_cashier_name VARCHAR(120),
    recommended_resolution VARCHAR(100),
    approved_resolution VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE RESTRICT,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_cashier_id) REFERENCES cashiers(id) ON DELETE SET NULL,
    INDEX idx_complaint_no (complaint_no),
    INDEX idx_complaint_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 10. COMPLAINT_ASSIGNMENTS TABLE (Tracks automatic & manual assignments)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS complaint_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    complaint_id INT NOT NULL,
    cashier_id INT NOT NULL,
    cashier_name VARCHAR(120) NOT NULL,
    assigned_by VARCHAR(120) DEFAULT 'System (Automatic)',
    notes TEXT,
    status ENUM('Active', 'Reassigned', 'Completed') DEFAULT 'Active',
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
    FOREIGN KEY (cashier_id) REFERENCES cashiers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 11. INVESTIGATION_NOTES TABLE (Cashier & Admin audit trail)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS investigation_notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    complaint_id INT NOT NULL,
    author_name VARCHAR(120) NOT NULL,
    author_role VARCHAR(50) NOT NULL,
    note TEXT NOT NULL,
    recommended_action VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 12. RESOLUTIONS TABLE
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS resolutions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    complaint_id INT NOT NULL UNIQUE,
    resolution_type ENUM('Product Replacement', 'Refund', 'Home Delivery', 'Store Pickup') NOT NULL,
    status ENUM('Proposed', 'Approved', 'Rejected', 'Customer Confirmed', 'Closed') DEFAULT 'Proposed',
    approved_by VARCHAR(120),
    resolution_details TEXT,
    customer_feedback TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 13. NOTIFICATIONS TABLE (Real-time & persisted notifications)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    recipient_role ENUM('All', 'Customer', 'Cashier', 'Admin') DEFAULT 'All',
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    complaint_no VARCHAR(30),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 14. COMPLAINT_UPDATES TABLE (Backward compatibility with MVP)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS complaint_updates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    complaint_id INT NOT NULL,
    status VARCHAR(50) NOT NULL,
    note TEXT,
    updated_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ========================================================
-- SEED DATA: USERS (Admin, Cashiers, Customers)
-- Passwords:
-- Admin:    Admin@123
-- Cashier:  Cashier@123
-- Customer: Customer@123
-- ========================================================

-- Insert Admin
INSERT INTO users (id, email, password_hash, full_name, role, phone, status)
VALUES (1, 'admin@freshmart.com', 'scrypt:32768:8:1$4hXzkkYt5AWM1f5Z$b7db9e7e7b9734303d7bb15b78d8c587a30a37db3739eba7debe9bda778b074b80b0f1f83349690518970f60b1184ba49d688d1910c8011cee924034cf2a6b79', 'System Administrator', 'Admin', '+91 98765 00001', 'Active')
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name);

INSERT INTO admins (user_id, admin_name, department, phone)
VALUES (1, 'System Administrator', 'Operations & Grievance', '+91 98765 00001')
ON DUPLICATE KEY UPDATE admin_name=VALUES(admin_name);

-- Insert Cashier Priya (Counter 2)
INSERT INTO users (id, email, password_hash, full_name, role, phone, status)
VALUES (2, 'priya@freshmart.com', 'scrypt:32768:8:1$YHEhRTO0xDSZCmUx$ad398bf18ac7a5428f00507e18f6a6f3f971f3abb2d72eec553caf74d496dc9e6344429c7b22dc0097a4fe8982063b163cfea5f803c2c3ffa833f5763c0fa1a9', 'Priya Sharma', 'Cashier', '+91 98765 00002', 'Active')
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name);

INSERT INTO cashiers (id, user_id, cashier_name, cashier_code, counter_no, phone, shift, status)
VALUES (1, 2, 'Priya', 'CSH-101', 2, '+91 98765 00002', 'Morning', 'Active')
ON DUPLICATE KEY UPDATE cashier_name=VALUES(cashier_name), counter_no=VALUES(counter_no);

-- Insert Cashier Rahul (Counter 1)
INSERT INTO users (id, email, password_hash, full_name, role, phone, status)
VALUES (3, 'rahul@freshmart.com', 'scrypt:32768:8:1$YHEhRTO0xDSZCmUx$ad398bf18ac7a5428f00507e18f6a6f3f971f3abb2d72eec553caf74d496dc9e6344429c7b22dc0097a4fe8982063b163cfea5f803c2c3ffa833f5763c0fa1a9', 'Rahul Verma', 'Cashier', '+91 98765 00003', 'Active')
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name);

INSERT INTO cashiers (id, user_id, cashier_name, cashier_code, counter_no, phone, shift, status)
VALUES (2, 3, 'Rahul', 'CSH-102', 1, '+91 98765 00003', 'Evening', 'Active')
ON DUPLICATE KEY UPDATE cashier_name=VALUES(cashier_name), counter_no=VALUES(counter_no);

-- Insert Customer 01
INSERT INTO users (id, email, password_hash, full_name, role, phone, status)
VALUES (4, 'customer01@gmail.com', 'scrypt:32768:8:1$S2eTeZ9NnhMAaijn$33c84db8ed7cd763cc3af02d85676dc3cf1bf8eff1e6b5c3720009695c0ceafa134d6271c594dab73fc78b37cd2218aab4be22326dcc707d0f7d32deab629940', 'Customer 01', 'Customer', '+91 98765 11111', 'Active')
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name);

INSERT INTO customers (id, user_id, customer_code, phone, membership_tier)
VALUES (1, 4, 'CUST-001', '+91 98765 11111', 'Gold')
ON DUPLICATE KEY UPDATE phone=VALUES(phone);

-- Insert Customer 02 (Arun Kumar)
INSERT INTO users (id, email, password_hash, full_name, role, phone, status)
VALUES (5, 'arun@gmail.com', 'scrypt:32768:8:1$S2eTeZ9NnhMAaijn$33c84db8ed7cd763cc3af02d85676dc3cf1bf8eff1e6b5c3720009695c0ceafa134d6271c594dab73fc78b37cd2218aab4be22326dcc707d0f7d32deab629940', 'Arun Kumar', 'Customer', '+91 98765 22222', 'Active')
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name);

INSERT INTO customers (id, user_id, customer_code, phone, membership_tier)
VALUES (2, 5, 'CUST-002', '+91 98765 22222', 'Standard')
ON DUPLICATE KEY UPDATE phone=VALUES(phone);

-- ========================================================
-- SEED DATA: PRODUCTS INVENTORY
-- ========================================================
INSERT INTO products (id, product_code, product_name, category, barcode, price, stock_quantity, description) VALUES
(1, 'PRD-101', 'Dove Soap', 'Personal Care', 'BAR-8901030', 55.00, 150, 'Dove Cream Beauty Bathing Bar 100g'),
(2, 'PRD-102', 'Lux Soap', 'Personal Care', 'BAR-8901031', 45.00, 120, 'Lux Rose & Vitamin E Bath Soap 100g'),
(3, 'PRD-103', 'Kellogg\'s Corn Flakes', 'Breakfast', 'BAR-8901032', 185.00, 80, 'Original Corn Flakes with Iron & Vitamins 475g'),
(4, 'PRD-104', 'Amul Butter 500g', 'Dairy', 'BAR-8901033', 275.00, 95, 'Pasteurized Salted Pure Milk Butter'),
(5, 'PRD-105', 'Tata Salt 1kg', 'Grocery & Staples', 'BAR-8901034', 28.00, 200, 'Vacuum Evaporated Iodized Salt'),
(6, 'PRD-106', 'Aashirvaad Atta 5kg', 'Grocery & Staples', 'BAR-8901035', 320.00, 60, '100% Whole Wheat Flour Atta'),
(7, 'PRD-107', 'Tropicana Orange Juice 1L', 'Beverages', 'BAR-8901036', 120.00, 75, '100% Real Squeezed Fruit Juice'),
(8, 'PRD-108', 'Britannia Good Day Cookies', 'Snacks & Biscuits', 'BAR-8901037', 35.00, 140, 'Cashew Rich Delight Butter Cookies 120g')
ON DUPLICATE KEY UPDATE product_name=VALUES(product_name), price=VALUES(price), stock_quantity=VALUES(stock_quantity);

-- ========================================================
-- SEED DATA: BILLS & ITEMS (Including B1025 mismatch demo)
-- ========================================================

-- 1. Bill B1025: Priya (Counter 2), Customer 01
-- Expected: Dove Soap x2, Kellogg's Corn Flakes x1
-- Received: Lux Soap x2 (Wrong product!), Kellogg's Corn Flakes x1
INSERT INTO bills (id, bill_no, customer_id, customer_name, customer_phone, cashier_id, cashier_name, counter_no, total_amount, qr_data, is_verified, verification_status)
VALUES (1, 'B1025', 1, 'Customer 01', '+91 98765 11111', 1, 'Priya', 2, 295.00, 'B1025', FALSE, 'Mismatch Detected')
ON DUPLICATE KEY UPDATE customer_name=VALUES(customer_name), cashier_name=VALUES(cashier_name), counter_no=VALUES(counter_no);

DELETE FROM bill_items WHERE bill_id=1;
INSERT INTO bill_items (bill_id, product_id, product_name, quantity, unit_price, total_price) VALUES
(1, 1, 'Dove Soap', 2, 55.00, 110.00),
(1, 3, 'Kellogg\'s Corn Flakes', 1, 185.00, 185.00);

DELETE FROM received_items WHERE bill_id=1;
INSERT INTO received_items (bill_id, product_name, quantity) VALUES
(1, 'Lux Soap', 2),
(1, 'Kellogg\'s Corn Flakes', 1);

-- 2. Bill B1026: Rahul (Counter 1), Arun Kumar
-- Expected: Amul Butter x2, Tata Salt x1
-- Received: Amul Butter x1 (Quantity mismatch: missing 1), Tata Salt x1
INSERT INTO bills (id, bill_no, customer_id, customer_name, customer_phone, cashier_id, cashier_name, counter_no, total_amount, qr_data, is_verified, verification_status)
VALUES (2, 'B1026', 2, 'Arun Kumar', '+91 98765 22222', 2, 'Rahul', 1, 578.00, 'B1026', FALSE, 'Mismatch Detected')
ON DUPLICATE KEY UPDATE customer_name=VALUES(customer_name), cashier_name=VALUES(cashier_name), counter_no=VALUES(counter_no);

DELETE FROM bill_items WHERE bill_id=2;
INSERT INTO bill_items (bill_id, product_id, product_name, quantity, unit_price, total_price) VALUES
(2, 4, 'Amul Butter 500g', 2, 275.00, 550.00),
(2, 5, 'Tata Salt 1kg', 1, 28.00, 28.00);

DELETE FROM received_items WHERE bill_id=2;
INSERT INTO received_items (bill_id, product_name, quantity) VALUES
(2, 'Amul Butter 500g', 1),
(2, 'Tata Salt 1kg', 1);

-- 3. Bill B1027: Priya (Counter 2), Customer 01
-- Expected: Tropicana x2, Britannia Good Day x3
-- Received: Tropicana x2, Britannia Good Day x3 (Perfect Match)
INSERT INTO bills (id, bill_no, customer_id, customer_name, customer_phone, cashier_id, cashier_name, counter_no, total_amount, qr_data, is_verified, verification_status)
VALUES (3, 'B1027', 1, 'Customer 01', '+91 98765 11111', 1, 'Priya', 2, 345.00, 'B1027', TRUE, 'Verified Successfully')
ON DUPLICATE KEY UPDATE customer_name=VALUES(customer_name), cashier_name=VALUES(cashier_name), counter_no=VALUES(counter_no);

DELETE FROM bill_items WHERE bill_id=3;
INSERT INTO bill_items (bill_id, product_id, product_name, quantity, unit_price, total_price) VALUES
(3, 7, 'Tropicana Orange Juice 1L', 2, 120.00, 240.00),
(3, 8, 'Britannia Good Day Cookies', 3, 35.00, 105.00);

DELETE FROM received_items WHERE bill_id=3;
INSERT INTO received_items (bill_id, product_name, quantity) VALUES
(3, 'Tropicana Orange Juice 1L', 2),
(3, 'Britannia Good Day Cookies', 3);

-- ========================================================
-- SEED DATA: COMPLAINTS & WORKFLOW DEMO
-- ========================================================
INSERT INTO complaints (
    id, complaint_no, bill_id, bill_no, customer_id, customer_name, customer_email, customer_phone,
    issue_type, product_name, expected_product, received_product, expected_quantity, received_quantity,
    description, status, assigned_cashier_id, assigned_cashier_name, recommended_resolution, approved_resolution
) VALUES (
    1, 'CMP-B1025-01', 1, 'B1025', 1, 'Customer 01', 'customer01@gmail.com', '+91 98765 11111',
    'Wrong Product Received', 'Dove Soap', 'Dove Soap', 'Lux Soap', 2, 2,
    'I purchased 2 packs of Dove Soap as indicated on the bill, but inside the sealed bag I received 2 packs of Lux Soap instead.',
    'Investigation in Progress', 1, 'Priya', 'Product Replacement', NULL
) ON DUPLICATE KEY UPDATE status=VALUES(status);

-- Assignment record
INSERT INTO complaint_assignments (complaint_id, cashier_id, cashier_name, assigned_by, notes)
VALUES (1, 1, 'Priya', 'System (Automatic Cashier Assignment)', 'Automatically assigned based on Bill B1025 processed at Counter 2 by Cashier Priya')
ON DUPLICATE KEY UPDATE cashier_name=VALUES(cashier_name);

-- Investigation note
DELETE FROM investigation_notes WHERE complaint_id=1;
INSERT INTO investigation_notes (complaint_id, author_name, author_role, note, recommended_action)
VALUES (1, 'Priya Sharma', 'Cashier', 'Reviewed POS counter 2 scan log. Customer requested Dove Soap, but Lux Soap was placed in billing tray by mistake. Recommend replacement with authentic Dove Soap.', 'Product Replacement');

-- Complaint update log
DELETE FROM complaint_updates WHERE complaint_id=1;
INSERT INTO complaint_updates (complaint_id, status, note, updated_by) VALUES
(1, 'Submitted', 'Customer submitted complaint via verification portal', 'Customer 01'),
(1, 'Assigned to Cashier', 'Auto-assigned to Priya (Cashier at Counter 2)', 'System'),
(1, 'Investigation in Progress', 'Cashier Priya opened investigation and verified physical stock barcode discrepancy', 'Priya (Cashier)');

-- Notifications
DELETE FROM notifications WHERE id <= 2;
INSERT INTO notifications (id, recipient_role, title, message, complaint_no) VALUES
(1, 'Cashier', 'New Complaint Auto-Assigned', 'Complaint CMP-B1025-01 for Bill B1025 has been assigned to you for investigation.', 'CMP-B1025-01'),
(2, 'Admin', 'Investigation Note Added', 'Cashier Priya added an investigation note for complaint CMP-B1025-01: Product Replacement recommended.', 'CMP-B1025-01');
