import * as express from "express";
import * as cors from "cors";

const app = express();
const PORT = 3005;

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:3002",
      "http://localhost:3001",
      "http://localhost:3003",
      "http://localhost:3004",
      "http://localhost:3005",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true,
  }),
);

app.use(express.json());

// Mock Data
const mockRestaurants = [
  {
    id: "rest-1",
    name: "Pizza Palace Wien",
    description: "Authentische italienische Pizza seit 1985",
    address: "Stephansplatz 1, 1010 Wien",
    phone: "+43 1 23456789",
    email: "info@pizzapalace.at",
    imageUrl:
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400",
    status: "OPEN",
    rating: 4.5,
    totalOrders: 1250,
    avgPrepTime: 15,
    minOrderAmount: 10.0,
    deliveryFee: 2.5,
    freeDeliveryThreshold: 25.0,
    estimatedDeliveryTime: 30,
    cuisines: ["Italienisch", "Pizza"],
    tags: ["beliebt", "schnell"],
    isActive: true,
    createdAt: "2024-01-01T10:00:00Z",
    updatedAt: "2025-12-20T10:00:00Z",
  },
  {
    id: "rest-2",
    name: "Burger Barn",
    description: "Die besten Burger der Stadt",
    address: "Karlsplatz 2, 1040 Wien",
    phone: "+43 1 98765432",
    email: "hello@burgerbarn.at",
    imageUrl:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400",
    status: "OPEN",
    rating: 4.2,
    totalOrders: 890,
    avgPrepTime: 12,
    minOrderAmount: 8.0,
    deliveryFee: 1.5,
    freeDeliveryThreshold: 20.0,
    estimatedDeliveryTime: 25,
    cuisines: ["Amerikanisch", "Burger"],
    tags: ["schnell", "familienfreundlich"],
    isActive: true,
    createdAt: "2024-02-15T10:00:00Z",
    updatedAt: "2025-12-20T10:00:00Z",
  },
  {
    id: "rest-3",
    name: "Sushi Spot",
    description: "Frisches Sushi und asiatische Küche",
    address: "Naschmarkt 3, 1060 Wien",
    phone: "+43 1 55512345",
    email: "contact@sushispot.at",
    imageUrl:
      "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400",
    status: "OPEN",
    rating: 4.7,
    totalOrders: 650,
    avgPrepTime: 20,
    minOrderAmount: 15.0,
    deliveryFee: 3.0,
    freeDeliveryThreshold: 35.0,
    estimatedDeliveryTime: 35,
    cuisines: ["Asiatisch", "Sushi", "Japanisch"],
    tags: ["premium", "frisch"],
    isActive: true,
    createdAt: "2024-03-10T10:00:00Z",
    updatedAt: "2025-12-20T10:00:00Z",
  },
];

const mockRestaurantStats = {
  totalOrders: 1250,
  totalRevenue: 45670.5,
  averageOrderValue: 36.54,
  totalDishes: 45,
  activeDishes: 42,
  averageRating: 4.5,
  totalReviews: 234,
};

const mockBusinessHours = {
  monday: { open: "11:00", close: "22:00", isClosed: false },
  tuesday: { open: "11:00", close: "22:00", isClosed: false },
  wednesday: { open: "11:00", close: "22:00", isClosed: false },
  thursday: { open: "11:00", close: "22:00", isClosed: false },
  friday: { open: "11:00", close: "23:00", isClosed: false },
  saturday: { open: "12:00", close: "23:00", isClosed: false },
  sunday: { open: "12:00", close: "22:00", isClosed: false },
};

const mockHolidays = [
  { date: "2025-12-25", name: "Weihnachten" },
  { date: "2025-12-26", name: "Stefanitag" },
  { date: "2026-01-01", name: "Neujahr" },
];

const mockDashboardStats = {
  orders: {
    total: 1250,
    completed: 1180,
    completionRate: 94.4,
  },
  revenue: {
    total: 45670.5,
    average: 38.7,
  },
  customers: {
    total: 890,
    new: 45,
  },
  restaurants: {
    total: 25,
  },
  drivers: {
    total: 120,
    active: 95,
  },
};

const mockRevenueData = [
  { date: "2025-12-14", revenue: 1250.5 },
  { date: "2025-12-15", revenue: 1450.75 },
  { date: "2025-12-16", revenue: 1350.25 },
  { date: "2025-12-17", revenue: 1550.0 },
  { date: "2025-12-18", revenue: 1650.5 },
  { date: "2025-12-19", revenue: 1750.75 },
  { date: "2025-12-20", revenue: 1850.25 },
];

const mockTopRestaurants = [
  { id: "1", name: "Pizza Palace", orders: 145, revenue: 12500.5 },
  { id: "2", name: "Burger Barn", orders: 132, revenue: 11800.75 },
  { id: "3", name: "Sushi Spot", orders: 98, revenue: 15600.25 },
  { id: "4", name: "Taco Town", orders: 87, revenue: 9200.0 },
  { id: "5", name: "Pasta Place", orders: 76, revenue: 8100.5 },
];

const mockDriverPerformance = [
  {
    id: "1",
    name: "John Smith",
    completedOrders: 89,
    totalRevenue: 4250.75,
    averageOrderValue: 47.76,
  },
  {
    id: "2",
    name: "Maria Garcia",
    completedOrders: 76,
    totalRevenue: 3890.25,
    averageOrderValue: 51.19,
  },
  {
    id: "3",
    name: "Ahmed Hassan",
    completedOrders: 68,
    totalRevenue: 3520.0,
    averageOrderValue: 51.76,
  },
  {
    id: "4",
    name: "Lisa Johnson",
    completedOrders: 62,
    totalRevenue: 3180.5,
    averageOrderValue: 51.3,
  },
  {
    id: "5",
    name: "David Chen",
    completedOrders: 58,
    totalRevenue: 2950.75,
    averageOrderValue: 50.88,
  },
];

const mockTopPromotions = [
  {
    id: "1",
    name: "Student Discount",
    code: "STUDENT20",
    uses: 145,
    maxUses: 500,
    totalDiscount: 2900.0,
    totalRevenue: 14500.0,
  },
  {
    id: "2",
    name: "First Order Free",
    code: "FIRSTFREE",
    uses: 89,
    maxUses: null,
    totalDiscount: 4450.0,
    totalRevenue: 8900.0,
  },
  {
    id: "3",
    name: "Weekend Special",
    code: "WEEKEND15",
    uses: 67,
    maxUses: 200,
    totalDiscount: 1005.0,
    totalRevenue: 6700.0,
  },
];

const mockPromotionPerformance = {
  promotion: {
    id: "1",
    name: "Student Discount",
    code: "STUDENT20",
    discountType: "PERCENTAGE",
    discount: 20,
    startDate: "2025-01-01T00:00:00Z",
    endDate: "2025-12-31T23:59:59Z",
    isActive: true,
  },
  totalUses: 145,
  totalDiscount: 2900.0,
  totalRevenue: 14500.0,
  conversionRate: 29.0,
  avgOrderValue: 100.0,
};

const mockCustomerGrowth = [
  { date: "2025-12-14", newCustomers: 12 },
  { date: "2025-12-15", newCustomers: 15 },
  { date: "2025-12-16", newCustomers: 8 },
  { date: "2025-12-17", newCustomers: 22 },
  { date: "2025-12-18", newCustomers: 18 },
  { date: "2025-12-19", newCustomers: 25 },
  { date: "2025-12-20", newCustomers: 30 },
];

const mockOrderStatusDistribution = {
  distribution: [
    { status: "DELIVERED", count: 1180, percentage: 94.4 },
    { status: "PENDING", count: 35, percentage: 2.8 },
    { status: "IN_PROGRESS", count: 25, percentage: 2.0 },
    { status: "CANCELLED", count: 10, percentage: 0.8 },
  ],
  total: 1250,
};

// Restaurant Management Routes
app.get("/api/restaurants", (req, res) => {
  const { status, isActive, search } = req.query;
  let filtered = [...mockRestaurants];

  if (status) {
    filtered = filtered.filter((r) => r.status === status);
  }

  if (isActive !== undefined) {
    filtered = filtered.filter((r) => r.isActive === (isActive === "true"));
  }

  if (search && typeof search === "string") {
    const searchTerm = search.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.name.toLowerCase().includes(searchTerm) ||
        r.description?.toLowerCase().includes(searchTerm) ||
        r.cuisines.some((c) => c.toLowerCase().includes(searchTerm)),
    );
  }

  res.json(filtered);
});

app.get("/api/restaurants/:id", (req, res) => {
  const { id } = req.params;
  const restaurant = mockRestaurants.find((r) => r.id === id);

  if (!restaurant) {
    return res.status(404).json({ message: "Restaurant not found" });
  }

  res.json(restaurant);
});

app.post("/api/restaurants", (req, res) => {
  const newRestaurant = {
    id: `rest-${Date.now()}`,
    ...req.body,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  mockRestaurants.push(newRestaurant);
  res.status(201).json(newRestaurant);
});

app.put("/api/restaurants/:id", (req, res) => {
  const { id } = req.params;
  const index = mockRestaurants.findIndex((r) => r.id === id);

  if (index === -1) {
    return res.status(404).json({ message: "Restaurant not found" });
  }

  mockRestaurants[index] = {
    ...mockRestaurants[index],
    ...req.body,
    updatedAt: new Date().toISOString(),
  };

  res.json(mockRestaurants[index]);
});

app.delete("/api/restaurants/:id", (req, res) => {
  const { id } = req.params;
  const index = mockRestaurants.findIndex((r) => r.id === id);

  if (index === -1) {
    return res.status(404).json({ message: "Restaurant not found" });
  }

  const deleted = mockRestaurants.splice(index, 1)[0];
  res.json(deleted);
});

// Statistics Routes
app.get("/api/statistics/dashboard", (req, res) => {
  res.json(mockDashboardStats);
});

app.get("/api/statistics/revenue", (req, res) => {
  res.json(mockRevenueData);
});

app.get("/api/statistics/top-restaurants", (req, res) => {
  res.json(mockTopRestaurants);
});

app.get("/api/statistics/driver-performance", (req, res) => {
  res.json(mockDriverPerformance);
});

app.get("/api/statistics/top-promotions", (req, res) => {
  res.json(mockTopPromotions);
});

app.get("/api/statistics/promotion-performance", (req, res) => {
  const promotionId = req.query.promotionId;
  if (promotionId) {
    res.json(mockPromotionPerformance);
  } else {
    res.json({
      promotion: null,
      totalUses: 0,
      totalDiscount: 0,
      totalRevenue: 0,
      conversionRate: null,
      avgOrderValue: 0,
    });
  }
});

app.get("/api/statistics/customer-growth", (req, res) => {
  res.json(mockCustomerGrowth);
});

app.get("/api/statistics/order-status-distribution", (req, res) => {
  res.json(mockOrderStatusDistribution);
});

app.get("/api/statistics/restaurant/:id", (req, res) => {
  const { id } = req.params;
  // Return restaurant-specific statistics
  res.json(mockRestaurantStats);
});

// Mock other endpoints
app.get("/api/dishes", (req, res) => {
  res.json([]);
});

app.get("/api/drivers", (req, res) => {
  res.json(mockDriverPerformance);
});

app.get("/api/promotions", (req, res) => {
  res.json(mockTopPromotions);
});

// Settings Routes
app.get("/api/settings/restaurant/:id/hours", (req, res) => {
  // Return business hours for a specific restaurant
  res.json(mockBusinessHours);
});

app.put("/api/settings/restaurant/:id/hours", (req, res) => {
  // Update business hours for a specific restaurant
  const updatedHours = req.body;
  // In a real app, this would save to database
  res.json({
    message: "Business hours updated successfully",
    data: updatedHours,
  });
});

app.get("/api/settings/restaurant/:id/holidays", (req, res) => {
  // Return holidays for a specific restaurant
  res.json(mockHolidays);
});

app.put("/api/settings/restaurant/:id/holidays", (req, res) => {
  // Update holidays for a specific restaurant
  const updatedHolidays = req.body.holidays || [];
  // In a real app, this would save to database
  res.json({ message: "Holidays updated successfully", data: updatedHolidays });
});

app.get("/api/support/tickets", (req, res) => {
  res.json([]);
});

app.get("/api/support/chat/sessions", (req, res) => {
  res.json([]);
});

app.get("/api/support/analytics", (req, res) => {
  res.json({});
});

app.get("/api/admin/users/subscriptions/tier-configs", (req, res) => {
  res.json([]);
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(
    `🚀 Mock Statistics API Server läuft auf http://localhost:${PORT}`,
  );
  console.log(
    `🏥 Health Check verfügbar unter http://localhost:${PORT}/api/health`,
  );
  console.log(
    `📊 Statistics API verfügbar unter http://localhost:${PORT}/api/statistics/*`,
  );
});
