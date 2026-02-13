# 🧪 UberFoods - Testing Guide & Best Practices

**Version:** 1.0  
**Datum:** 11. Dezember 2025  
**Aktueller Coverage**: ~30% (Ziel: 80%+)

---

## 📋 **Testing Strategy**

### **Test-Pyramide**
```
        /\
       /  \
      / E2E \ (10%)
     /------\
    / Integration \ (20%)
   /-------------\
  / Unit Tests (70%) \
 /-------------------\
```

---

## ✅ **Unit Tests**

### **Backend Unit Tests**

#### **Service Test Template**
```typescript
// backend/src/modules/order/order.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from './order.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('OrderService', () => {
  let service: OrderService;
  let prisma: PrismaService;

  const mockPrismaService = {
    order: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return an array of orders', async () => {
      const mockOrders = [
        { id: '1', status: 'PENDING', totalAmount: 25.50 },
        { id: '2', status: 'DELIVERED', totalAmount: 45.00 },
      ];

      mockPrismaService.order.findMany.mockResolvedValue(mockOrders);

      const result = await service.findAll();
      
      expect(result).toEqual(mockOrders);
      expect(prisma.order.findMany).toHaveBeenCalledTimes(1);
    });

    it('should handle errors', async () => {
      mockPrismaService.order.findMany.mockRejectedValue(
        new Error('Database error')
      );

      await expect(service.findAll()).rejects.toThrow('Database error');
    });
  });

  describe('create', () => {
    it('should create a new order', async () => {
      const createDto = {
        restaurantId: 'rest_123',
        customerId: 'cust_456',
        items: [{ dishId: 'dish_789', quantity: 2 }],
      };

      const mockCreatedOrder = {
        id: 'order_999',
        ...createDto,
        status: 'PENDING',
        totalAmount: 25.50,
      };

      mockPrismaService.order.create.mockResolvedValue(mockCreatedOrder);

      const result = await service.create(createDto);
      
      expect(result).toEqual(mockCreatedOrder);
      expect(prisma.order.create).toHaveBeenCalledWith({
        data: expect.objectContaining(createDto),
      });
    });
  });
});
```

#### **Controller Test Template**
```typescript
// backend/src/modules/order/order.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';

describe('OrderController', () => {
  let controller: OrderController;
  let service: OrderService;

  const mockOrderService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [
        {
          provide: OrderService,
          useValue: mockOrderService,
        },
      ],
    }).compile();

    controller = module.get<OrderController>(OrderController);
    service = module.get<OrderService>(OrderService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return array of orders', async () => {
      const mockOrders = [{ id: '1', status: 'PENDING' }];
      mockOrderService.findAll.mockResolvedValue(mockOrders);

      const result = await controller.findAll();
      
      expect(result).toEqual(mockOrders);
      expect(service.findAll).toHaveBeenCalled();
    });
  });
});
```

### **Frontend Unit Tests**

#### **Component Test Template (React)**
```typescript
// frontend/admin-panel/src/components/__tests__/Dashboard.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dashboard } from '../Dashboard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('Dashboard', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  it('renders dashboard title', () => {
    render(<Dashboard />, { wrapper });
    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
  });

  it('displays loading state', () => {
    render(<Dashboard />, { wrapper });
    expect(screen.getByText(/Loading.../i)).toBeInTheDocument();
  });

  it('handles user interaction', async () => {
    const user = userEvent.setup();
    render(<Dashboard />, { wrapper });

    const button = screen.getByRole('button', { name: /Refresh/i });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Updated/i)).toBeInTheDocument();
    });
  });
});
```

#### **Hook Test Template**
```typescript
// frontend/admin-panel/src/hooks/__tests__/useOrders.test.tsx
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useOrders } from '../useOrders';
import * as api from '../../utils/api';

jest.mock('../../utils/api');

describe('useOrders', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  it('fetches orders successfully', async () => {
    const mockOrders = [
      { id: '1', status: 'PENDING', totalAmount: 25.50 },
    ];

    (api.default.get as jest.Mock).mockResolvedValue({
      data: { data: mockOrders },
    });

    const { result } = renderHook(() => useOrders(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockOrders);
  });

  it('handles error', async () => {
    (api.default.get as jest.Mock).mockRejectedValue(
      new Error('Network error')
    );

    const { result } = renderHook(() => useOrders(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });
});
```

---

## 🔗 **Integration Tests**

### **API Integration Test Template**
```typescript
// test/integration/orders.integration.test.ts
import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';

describe('Orders API (Integration)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    // Login to get auth token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'admin@uberfoods.com',
        password: 'AdminPass123!',
      });

    authToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /orders', () => {
    it('should return array of orders', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
    });

    it('should return 401 without auth', async () => {
      await request(app.getHttpServer())
        .get('/api/orders')
        .expect(401);
    });
  });

  describe('POST /orders', () => {
    it('should create a new order', async () => {
      const createDto = {
        restaurantId: 'rest_123',
        items: [{ dishId: 'dish_456', quantity: 2 }],
        deliveryAddress: {
          street: 'Teststrasse 1',
          city: 'Wien',
          zipCode: '1010',
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createDto)
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.status).toBe('PENDING');
    });

    it('should validate input', async () => {
      const invalidDto = {
        restaurantId: '',
        items: [],
      };

      await request(app.getHttpServer())
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidDto)
        .expect(400);
    });
  });
});
```

---

## 🎭 **E2E Tests (Playwright)**

### **Frontend E2E Test Template**
```typescript
// frontend/admin-panel/e2e/orders.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Orders Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('http://localhost:3002/login');
    await page.fill('[name="email"]', 'admin@uberfoods.com');
    await page.fill('[name="password"]', 'AdminPass123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('should display orders list', async ({ page }) => {
    await page.goto('http://localhost:3002');
    await page.click('text=Orders');

    await expect(page.locator('h2:has-text("Orders")')).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
  });

  test('should filter orders by status', async ({ page }) => {
    await page.goto('http://localhost:3002');
    await page.click('text=Orders');

    await page.selectOption('[name="statusFilter"]', 'PENDING');
    await page.waitForTimeout(500);

    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should create new order', async ({ page }) => {
    await page.goto('http://localhost:3002');
    await page.click('text=Orders');
    await page.click('text=New Order');

    await page.fill('[name="restaurantId"]', 'rest_123');
    await page.click('text=Add Item');
    await page.fill('[name="dishId"]', 'dish_456');
    await page.fill('[name="quantity"]', '2');
    await page.click('button:has-text("Create Order")');

    await expect(page.locator('text=Order created successfully')).toBeVisible();
  });
});
```

---

## 📊 **Test Coverage Goals**

### **Current Coverage**
```bash
# Run tests with coverage
cd backend
npm run test:cov

# Expected Output:
# ----------------------------|---------|----------|---------|---------|
# File                        | % Stmts | % Branch | % Funcs | % Lines |
# ----------------------------|---------|----------|---------|---------|
# All files                   |   32.14 |    28.43 |   31.25 |   32.14 |
# ----------------------------|---------|----------|---------|---------|
```

### **Target Coverage**
| Component | Current | Target | Priority |
|-----------|---------|--------|----------|
| **Backend Services** | 35% | 80%+ | High |
| **Backend Controllers** | 25% | 75%+ | High |
| **Frontend Components** | 30% | 70%+ | Medium |
| **Frontend Hooks** | 40% | 80%+ | High |
| **Utils/Helpers** | 50% | 90%+ | High |

---

## 🚀 **Running Tests**

### **Backend**
```bash
cd backend

# Unit Tests
npm run test

# Watch Mode
npm run test:watch

# Coverage
npm run test:cov

# E2E Tests
npm run test:e2e

# Specific Test
npm run test -- order.service.spec.ts
```

### **Frontend (Admin Panel)**
```bash
cd frontend/admin-panel

# Unit Tests
npm run test

# Watch Mode
npm run test:watch

# Coverage
npm run test:coverage

# E2E Tests
npm run test:e2e

# E2E with UI
npm run test:e2e:ui
```

---

## 📝 **Best Practices**

### **General**
1. ✅ **AAA Pattern** - Arrange, Act, Assert
2. ✅ **One assertion per test** (when possible)
3. ✅ **Descriptive test names** - "should do X when Y"
4. ✅ **Mock external dependencies**
5. ✅ **Clean up after tests** (afterEach, afterAll)
6. ✅ **Test edge cases** (null, undefined, empty arrays)

### **Backend**
1. ✅ **Test services, not controllers** (business logic)
2. ✅ **Mock Prisma** (don't hit real DB)
3. ✅ **Test error handling**
4. ✅ **Test validation** (DTOs)
5. ✅ **Test authentication/authorization**

### **Frontend**
1. ✅ **Test user interactions** (clicks, inputs)
2. ✅ **Test async operations** (waitFor)
3. ✅ **Test error states**
4. ✅ **Test loading states**
5. ✅ **Test accessibility** (screen reader support)

### **E2E**
1. ✅ **Test critical user journeys**
2. ✅ **Test happy path first**
3. ✅ **Test error scenarios**
4. ✅ **Use data-testid for selectors** (not text)
5. ✅ **Clean up test data**

---

## 🎯 **Testing Roadmap**

### **Phase 1: Critical Path (1-2 Wochen)**
- [ ] Order Service (Backend)
- [ ] Restaurant Service (Backend)
- [ ] Auth Service (Backend)
- [ ] Dashboard Component (Frontend)
- [ ] Order List Component (Frontend)

### **Phase 2: Core Features (2-3 Wochen)**
- [ ] Payment Service
- [ ] Driver Service
- [ ] Notification Service
- [ ] All Custom Hooks
- [ ] Critical Components

### **Phase 3: Comprehensive Coverage (4-6 Wochen)**
- [ ] All Services (80%+)
- [ ] All Controllers (75%+)
- [ ] All Components (70%+)
- [ ] E2E Tests für alle User Flows
- [ ] Integration Tests für alle APIs

---

## 🔗 **Resources**

- **Jest Docs**: https://jestjs.io/
- **React Testing Library**: https://testing-library.com/react
- **Playwright**: https://playwright.dev/
- **NestJS Testing**: https://docs.nestjs.com/fundamentals/testing

---

**Happy Testing! 🧪**
