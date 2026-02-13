INSERT INTO restaurants (id, name, email, address, status, "isActive", "createdAt", "updatedAt")
VALUES
  ('rest_001', 'Pizza Palace', 'restaurant@uberfoods.local', '123 Main St, Berlin', 'OPEN', true, NOW(), NOW()),
  ('rest_002', 'Burger Kingdom', 'burger-kingdom@example.com', '456 Burger Ave, Berlin', 'OPEN', true, NOW(), NOW()),
  ('rest_003', 'Sushi Express', 'sushi@example.com', '789 Sushi Blvd, Berlin', 'OPEN', true, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Insert dishes for Pizza Palace
INSERT INTO dishes (id, name, description, price, category, "isAvailable", "restaurantId", "isActive", "createdAt", "updatedAt")
VALUES
  ('dish_pizza_001', 'Margherita Pizza', 'Classic pizza with tomato sauce, mozzarella, and basil', 12.99, 'Pizza', true, 'rest_001', true, NOW(), NOW()),
  ('dish_pizza_002', 'Pepperoni Pizza', 'Pizza with tomato sauce, mozzarella, and pepperoni', 15.99, 'Pizza', true, 'rest_001', true, NOW(), NOW()),
  ('dish_pasta_001', 'Spaghetti Carbonara', 'Pasta with eggs, cheese, pancetta, and black pepper', 13.99, 'Pasta', true, 'rest_001', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert dishes for Burger Kingdom
INSERT INTO dishes (id, name, description, price, category, "isAvailable", "restaurantId", "isActive", "createdAt", "updatedAt")
VALUES
  ('dish_burger_001', 'Classic Burger', 'Beef patty with lettuce, tomato, onion, and special sauce', 10.99, 'Burgers', true, 'rest_002', true, NOW(), NOW()),
  ('dish_burger_002', 'Cheeseburger', 'Beef patty with cheese, lettuce, tomato, onion, and special sauce', 12.99, 'Burgers', true, 'rest_002', true, NOW(), NOW()),
  ('dish_fries_001', 'French Fries', 'Crispy golden fries', 4.99, 'Sides', true, 'rest_002', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert dishes for Sushi Express
INSERT INTO dishes (id, name, description, price, category, "isAvailable", "restaurantId", "isActive", "createdAt", "updatedAt")
VALUES
  ('dish_sushi_001', 'California Roll', 'Crab, avocado, and cucumber roll', 8.99, 'Rolls', true, 'rest_003', true, NOW(), NOW()),
  ('dish_sushi_002', 'Spicy Tuna Roll', 'Spicy tuna with cucumber', 10.99, 'Rolls', true, 'rest_003', true, NOW(), NOW()),
  ('dish_sushi_003', 'Salmon Sashimi', 'Fresh salmon slices', 14.99, 'Sashimi', true, 'rest_003', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;