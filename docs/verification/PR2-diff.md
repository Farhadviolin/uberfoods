# PR-2: Orders Pagination End-to-End - FILES TOUCHED & DIFFS

## FILES TOUCHED
**Backend:**
- `backend/prisma/schema.prisma` (Keyset Pagination Indexes)
- `backend/prisma/migrations/*` (DB Migration für neue Indizes)
- `backend/src/orders/orders.controller.ts` (Pagination Endpoints)
- `backend/src/orders/orders.service.ts` (findAllWithCursor Method)
- `backend/src/orders/dto/cursor-pagination.dto.ts`
- `backend/src/orders/dto/cursor-response.dto.ts`

**Frontend (admin-panel):**
- `frontend/admin-panel/src/hooks/useOrders.ts` (Infinite Query Migration)
- `frontend/admin-panel/src/components/orders/OrderList.tsx`
- `frontend/admin-panel/src/components/orders/InfiniteOrderList.tsx`

**Scripts:**
- `scripts/seed-orders.js` (Performance Seed für 100k Orders)
- `scripts/benchmark-orders.js` (Pagination Benchmarks)

## WICHTIGSTE DIFF HUNKS

### 1. `backend/prisma/schema.prisma` - Keyset Pagination Indexes
```prisma
model Order {
  // ... andere Felder ...

  @@index([customerId])
  @@index([restaurantId])
  @@index([driverId])
  @@index([promotionId])
  @@index([status])
  @@index([paymentStatus])
  @@index([createdAt])
  @@index([status, createdAt])
  @@index([restaurantId, status])
  @@index([customerId, createdAt])
  @@index([status, createdAt, restaurantId])
  @@index([driverId, status])
  @@index([status, deliveredAt])
  // Keyset Pagination Indexes für skalierbare Cursor-basierte Pagination
  @@index([status, createdAt, id])
  @@index([restaurantId, status, createdAt, id])
  @@index([customerId, createdAt, id])
  @@map("orders")
}
```

**Warum wichtig:** Composite Indizes für stabile Keyset-Pagination - verhindern Sort-Inconsistency bei gleichen createdAt Werten durch id als Tie-Breaker.

### 2. `backend/src/orders/orders.service.ts` - findAllWithCursor Method
```typescript
async findAllWithCursor(options: {
  limit?: number;
  cursor?: string;
  status?: string;
  restaurantId?: string;
  customerId?: string;
}): Promise<{ data: Order[]; nextCursor: string | null; hasMore: boolean }> {
  const { limit = 20, cursor, status, restaurantId, customerId } = options;

  // Parse cursor (format: "createdAt:id")
  let cursorCondition = {};
  if (cursor) {
    const [cursorCreatedAt, cursorId] = cursor.split(':');
    if (cursorCreatedAt && cursorId) {
      cursorCondition = {
        OR: [
          { createdAt: { lt: new Date(cursorCreatedAt) } },
          {
            AND: [
              { createdAt: { equals: new Date(cursorCreatedAt) } },
              { id: { lt: cursorId } }
            ]
          }
        ]
      };
    }
  }

  // Build where condition
  const where: any = { ...cursorCondition };
  if (status) where.status = status;
  if (restaurantId) where.restaurantId = restaurantId;
  if (customerId) where.customerId = customerId;

  // Query with cursor-based pagination
  const orders = await this.prisma.order.findMany({
    where,
    take: limit + 1, // +1 to check if there are more results
    orderBy: [
      { createdAt: 'desc' },
      { id: 'desc' }
    ],
    include: {
      customer: { select: { name: true, email: true } },
      restaurant: { select: { name: true } },
      driver: { select: { name: true } }
    }
  });

  // Check if there are more results
  const hasMore = orders.length > limit;
  const data = hasMore ? orders.slice(0, -1) : orders;

  // Generate next cursor
  const nextCursor = hasMore && data.length > 0
    ? `${data[data.length - 1].createdAt.toISOString()}:${data[data.length - 1].id}`
    : null;

  return { data, nextCursor, hasMore };
}
```

**Warum wichtig:** Implementiert stabile Keyset-Pagination mit (createdAt, id) DESC Cursor - skalierbar für Millionen Records ohne Performance-Degradation.

### 3. `frontend/admin-panel/src/hooks/useOrders.ts` - Infinite Query Migration
```typescript
export function useOrders(options: UseOrdersOptions = {}) {
  const { status, restaurantId, customerId, limit = 20 } = options;

  return useInfiniteQuery({
    queryKey: ['orders', status, restaurantId, customerId],
    queryFn: async ({ pageParam = null }) => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        ...(pageParam && { cursor: pageParam }),
        ...(status && { status }),
        ...(restaurantId && { restaurantId }),
        ...(customerId && { customerId }),
      });

      const response = await api.get(`/orders?${params}`);
      return response.data;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 30000, // 30 seconds
    cacheTime: 300000, // 5 minutes
  });
}
```

**Warum wichtig:** Migriert von Load-All zu useInfiniteQuery für effiziente Pagination - nur sichtbare Daten werden geladen, automatisches Infinite Scroll.

### 4. `scripts/seed-orders.js` - Performance Seed Script
```javascript
// Seed 100k orders for pagination performance testing
const orders = [];
for (let i = 0; i < 100000; i++) {
  orders.push({
    id: generateId(),
    customerId: randomCustomerId(),
    restaurantId: randomRestaurantId(),
    status: randomStatus(),
    totalAmount: randomAmount(),
    createdAt: randomDate(),
    // ... andere Felder
  });
}
```

**Warum wichtig:** Erstellt realistische Testdaten für Pagination-Benchmarks - prüft Performance bei großen Datasets.