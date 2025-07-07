-- Drop tables in reverse order of dependency to ensure clean slate on restart
DROP TABLE IF EXISTS recycling_log;
DROP TABLE IF EXISTS customer_frequent_items;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS suppliers;

-- Create suppliers table to track ethical sourcing
CREATE TABLE suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    ethical_sourcing_score INTEGER
);

-- Update products table to include supplier link
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    expiry_date TIMESTAMP NOT NULL,
    status VARCHAR(50) DEFAULT 'Fresh',
    supplier_id INTEGER REFERENCES suppliers(id)
);

-- Customers table remains the same
CREATE TABLE customers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

-- Customer frequent items table remains the same
CREATE TABLE customer_frequent_items (
    customer_id VARCHAR(50) REFERENCES customers(id),
    product_id INTEGER REFERENCES products(id),
    PRIMARY KEY (customer_id, product_id)
);

-- NEW: Table to log recycling activities
CREATE TABLE recycling_log (
    id SERIAL PRIMARY KEY,
    customer_id VARCHAR(50) REFERENCES customers(id),
    product_id INTEGER REFERENCES products(id),
    recycled_at TIMESTAMP DEFAULT NOW()
);

-- Insert sample data
INSERT INTO suppliers (name, ethical_sourcing_score) VALUES
('Fresh Farms Inc.', 92),
('Dairy Best', 85),
('Global Foods Co.', 75);

INSERT INTO products (name, price, expiry_date, supplier_id) VALUES
('Organic Milk', 3.50, NOW() + INTERVAL '3 days', 2),
('Avocado', 1.20, NOW() + INTERVAL '5 days', 1),
('Cheddar Cheese', 5.00, NOW() + INTERVAL '1 day', 2),
('Whole Wheat Bread', 2.80, NOW() + INTERVAL '2 days', 3);

INSERT INTO customers (id, name) VALUES ('12345', 'Jane Doe'), ('67890', 'John Smith');

INSERT INTO customer_frequent_items (customer_id, product_id) VALUES
('12345', 1),
('12345', 4),
('67890', 2),
('67890', 3);

-- Add some initial recycling logs
INSERT INTO recycling_log (customer_id, product_id) VALUES
('12345', 1),
('67890', 2),
('12345', 4);
