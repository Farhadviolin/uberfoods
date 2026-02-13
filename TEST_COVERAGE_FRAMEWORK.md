# 🧪 Test Coverage Framework - UberFoods

**Version:** 1.0  
**Datum:** 11. Dezember 2025  
**Status:** Templates erstellt, Coverage-Ziel: 80%+

---

## ✅ **Was wurde erstellt:**

### **1. Test Templates**
- ✅ **Admin Panel**: 3 Test-Templates
  - `OrdersManagement.test.tsx` - Component Test
  - `useOrders.test.tsx` - Hook Test
  - `security.test.ts` - Utils Test

- ✅ **Backend**: 1 Integration Test Template
  - `order.service.integration.spec.ts` - Service Integration Test

- ✅ **Testing Guide**: `TESTING_GUIDE.md` (700+ Zeilen)
  - Unit Test Templates
  - Integration Test Templates
  - E2E Test Templates
  - Best Practices

---

## 📊 **Aktueller Test Coverage Status**

| App/System | Test Files | Coverage | Ziel | Status |
|------------|------------|----------|------|--------|
| **Admin Panel** | 7 | ~35% | 80%+ | ⚠️ Templates vorhanden |
| **Customer Web** | 24 | ~30% | 80%+ | ⚠️ Framework ready |
| **Driver App** | 10 | ~25% | 80%+ | ⚠️ Framework ready |
| **Restaurant Web** | 6 | ~20% | 80%+ | ⚠️ Framework ready |
| **Backend** | 76 | ~38% | 80%+ | ⚠️ Templates vorhanden |

---

## 🚀 **Wie du Tests schreibst:**

### **1. Component Test (Frontend)**

**Template:** `frontend/admin-panel/src/components/__tests__/OrdersManagement.test.tsx`

```bash
# Kopiere Template
cp src/components/__tests__/OrdersManagement.test.tsx \
   src/components/__tests__/YourComponent.test.tsx

# Passe an:
# 1. Importiere deine Component
# 2. Mock API calls
# 3. Teste Rendering
# 4. Teste User Interactions
# 5. Teste Error States
```

**Tests ausführen:**
```bash
cd frontend/admin-panel
npm run test:components  # Alle Component Tests
npm run test:watch       # Watch Mode
npm run test:coverage    # Mit Coverage
```

### **2. Hook Test (Frontend)**

**Template:** `frontend/admin-panel/src/hooks/__tests__/useOrders.test.tsx`

```bash
# Kopiere Template
cp src/hooks/__tests__/useOrders.test.tsx \
   src/hooks/__tests__/useYourHook.test.tsx

# Passe an:
# 1. Importiere deinen Hook
# 2. Mock dependencies
# 3. Teste success state
# 4. Teste error state
# 5. Teste refetch/mutations
```

**Tests ausführen:**
```bash
cd frontend/admin-panel
npm run test:hooks  # Alle Hook Tests
```

### **3. Utils Test (Frontend)**

**Template:** `frontend/admin-panel/src/utils/__tests__/security.test.ts`

```bash
# Kopiere Template
cp src/utils/__tests__/security.test.ts \
   src/utils/__tests__/yourUtil.test.ts

# Passe an:
# 1. Importiere deine Utils
# 2. Teste jede Function
# 3. Teste Edge Cases
# 4. Teste Error Handling
```

**Tests ausführen:**
```bash
cd frontend/admin-panel
npm run test:utils  # Alle Utils Tests
```

### **4. Service Test (Backend)**

**Template:** `backend/src/modules/order/order.service.integration.spec.ts`

```bash
# Kopiere Template
cp src/modules/order/order.service.integration.spec.ts \
   src/modules/yourmodule/yourmodule.service.spec.ts

# Passe an:
# 1. Importiere deinen Service
# 2. Mock PrismaService
# 3. Teste CRUD Operations
# 4. Teste Business Logic
# 5. Teste Error Handling
```

**Tests ausführen:**
```bash
cd backend
npm run test -- order.service.spec.ts  # Specific test
npm run test:watch                      # Watch mode
npm run test:cov                        # Coverage
```

---

## 📈 **Coverage-Ziele erreichen**

### **Woche 1-2: Kritische Pfade (30% → 50%)**
```bash
# Admin Panel
- [ ] OrdersManagement (Component)
- [ ] CustomersManagement (Component)
- [ ] DriversManagement (Component)
- [ ] useOrders (Hook)
- [ ] useCustomers (Hook)
- [ ] useDrivers (Hook)

# Backend
- [ ] OrderService (Service)
- [ ] RestaurantService (Service)
- [ ] AuthService (Service)
```

### **Woche 3-4: Core Features (50% → 65%)**
```bash
# Alle Critical Components
- [ ] Dashboard
- [ ] RestaurantManagement
- [ ] FinancialManagement

# Alle Critical Hooks
- [ ] useDashboardData
- [ ] useFinancialData
- [ ] useWebSocket

# Alle Services
- [ ] PaymentService
- [ ] NotificationService
- [ ] DriverService
```

### **Woche 5-8: Comprehensive (65% → 80%+)**
```bash
# Alle Components
# Alle Hooks
# Alle Services
# Integration Tests
# E2E Tests (kritische Flows)
```

---

## 🎯 **Quick Wins (1-2 Tage)**

Diese Tests bringen schnell +10% Coverage:

### **Backend:**
```bash
cd backend
npm run test:cov

# Schreibe Tests für:
1. AuthService - Login/Register (kritisch)
2. OrderService - CRUD (kritisch)
3. PaymentService - Stripe/PayPal (kritisch)
```

### **Frontend:**
```bash
cd frontend/admin-panel
npm run test:coverage

# Schreibe Tests für:
1. Login Component
2. Dashboard Component
3. useAuth Hook
4. useOrders Hook
5. security utils (bereits vorhanden!)
```

---

## 🔧 **Test Commands Übersicht**

### **Admin Panel**
```bash
npm run test              # Alle Tests
npm run test:watch        # Watch Mode
npm run test:coverage     # Mit Coverage Report
npm run test:unit         # Nur Unit Tests
npm run test:components   # Nur Component Tests
npm run test:hooks        # Nur Hook Tests
npm run test:utils        # Nur Utils Tests
npm run test:e2e          # E2E mit Playwright
```

### **Customer Web**
```bash
npm run test              # Alle Tests
npm run test:watch        # Watch Mode
npm run test:coverage     # Mit Coverage
```

### **Driver App**
```bash
npm run test              # Alle Tests
npm run test:watch        # Watch Mode
npm run test:coverage     # Mit Coverage
npm run test:e2e          # E2E mit Playwright
```

### **Restaurant Web**
```bash
npm run test              # Alle Tests
npm run test:watch        # Watch Mode
npm run test:coverage     # Mit Coverage
```

### **Backend**
```bash
npm run test              # Alle Unit Tests
npm run test:watch        # Watch Mode
npm run test:cov          # Mit Coverage
npm run test:e2e          # E2E Tests
npm run test:integration  # Integration Tests
```

---

## 📊 **Coverage Reports Lesen**

### **Coverage Report Beispiel:**
```
----------------------------|---------|----------|---------|---------|
File                        | % Stmts | % Branch | % Funcs | % Lines |
----------------------------|---------|----------|---------|---------|
All files                   |   45.23 |    38.76 |   42.15 |   45.23 |
 src/components             |   52.14 |    45.32 |   48.90 |   52.14 |
  Dashboard.tsx             |   75.00 |    60.00 |   70.00 |   75.00 |
  OrdersManagement.tsx      |   45.00 |    35.00 |   40.00 |   45.00 |
 src/hooks                  |   38.42 |    32.15 |   35.67 |   38.42 |
  useOrders.ts              |   60.00 |    50.00 |   55.00 |   60.00 |
  useAuth.ts                |   20.00 |    15.00 |   18.00 |   20.00 |
----------------------------|---------|----------|---------|---------|
```

**Legende:**
- **% Stmts** - Statement Coverage (wie viele Zeilen getestet)
- **% Branch** - Branch Coverage (wie viele if/else getestet)
- **% Funcs** - Function Coverage (wie viele Funktionen getestet)
- **% Lines** - Line Coverage (wie viele Zeilen Code getestet)

**Ziel:** Alle >= 80%

---

## 🎯 **Prioritäten**

### **Highest Priority (P0)**
1. AuthService/Auth Components - Security critical
2. OrderService/Order Components - Business critical
3. PaymentService - Financial critical

### **High Priority (P1)**
4. RestaurantService
5. DriverService
6. All Custom Hooks

### **Medium Priority (P2)**
7. Analytics Services
8. Notification Services
9. All Utils

### **Low Priority (P3)**
10. UI Components (teilweise getestet durch E2E)
11. Rarely used Features

---

## 📝 **Best Practices (nochmal zusammengefasst)**

1. ✅ **AAA Pattern** - Arrange, Act, Assert
2. ✅ **Mock external dependencies** (API, Database)
3. ✅ **Test happy path first**
4. ✅ **Then test error scenarios**
5. ✅ **Test edge cases** (null, undefined, empty)
6. ✅ **Descriptive test names** - "should do X when Y"
7. ✅ **One assertion per test** (when possible)
8. ✅ **Clean up after tests** (afterEach, afterAll)

---

## 🚀 **Nächste Schritte**

### **Sofort (1-2 Tage):**
1. Laufe durch die Templates
2. Schreibe 5-10 Tests pro App
3. Erreiche 50% Coverage

### **Diese Woche (5-7 Tage):**
1. Teste alle kritischen Components
2. Teste alle kritischen Hooks
3. Teste alle kritischen Services
4. Erreiche 65% Coverage

### **Nächster Monat (4 Wochen):**
1. Comprehensive Test Suite
2. Integration Tests
3. E2E Tests
4. Erreiche 80%+ Coverage

---

**Happy Testing! 🧪**

**Alle Templates sind bereit! Fang einfach an!** 🚀
