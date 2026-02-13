-- Basic tables needed for E2E tests
CREATE TABLE IF NOT EXISTS restaurants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    address TEXT NOT NULL,
    status TEXT DEFAULT 'OPEN',
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dishes (
    id TEXT PRIMARY KEY,
    "restaurantId" TEXT REFERENCES restaurants(id),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) DEFAULT 0,
    category TEXT,
    "isAvailable" BOOLEAN DEFAULT true,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert test data
INSERT INTO restaurants (id, name, email, address, status, "isActive", "createdAt", "updatedAt")
VALUES ('rest_001', 'Pizza Palace', 'restaurant@uberfoods.local', '123 Main St, Berlin', 'OPEN', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

INSERT INTO dishes (id, "restaurantId", name, description, price, category, "isAvailable", "isActive", "createdAt", "updatedAt")
VALUES ('dish_001', 'rest_001', 'Margherita Pizza', 'Classic pizza with tomatoes, mozzarella and basil', 12.99, 'Pizza', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;