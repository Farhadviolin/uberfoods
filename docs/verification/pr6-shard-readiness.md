# PR-6 Shard-Readiness Implementation

## Tenant Context Resolution
**Primary Shard Key**: `restaurantId` (determines data distribution)
**Secondary Keys**: `tenantId`, `userId` (for future multi-tenancy)
**Resolution Sources**: JWT token, URL parameters, query parameters

## Tenant Context Structure
```typescript
interface TenantContext {
  tenantId?: string;      // Future: Global tenant identifier
  restaurantId?: string;  // Primary: Restaurant-specific sharding
  userId?: string;        // Secondary: User-scoped operations
  region: string;         // Multi-region awareness
  role: string;           // Primary/secondary role
}
```

## Guard Rails (Feature-Flag Controlled)
**Environment Variable**: `FEATURE_REQUIRE_TENANT_FILTER=true`
**Default**: `false` (disabled, no breaking changes)

When enabled:
- **Orders.list**: Must include `restaurantId` filter
- **Dashboard.aggregations**: Must be scoped to tenant
- **Analytics.reports**: Must include tenant context

## Query Filtering Logic
```typescript
// Before: Unscoped query
const orders = await prisma.order.findMany({ where });

// After: Tenant-scoped query
const context = tenantContextService.resolveTenantContext(request);
const filteredWhere = tenantContextService.applyTenantFilter(where, context, 'orders.list');
const orders = await prisma.order.findMany({ where: filteredWhere });
```

## Migration Strategy
### Phase 1: Foundation (Current)
- Tenant context resolution implemented
- Filtering logic ready but disabled
- No behavioral changes

### Phase 2: Guard Rails (Next)
- Enable `FEATURE_REQUIRE_TENANT_FILTER=true` in staging
- Test that required filters are enforced
- Fix any missing tenant context in queries

### Phase 3: Sharding (Future)
- Implement actual data distribution
- Update connection routing based on tenantId/restaurantId
- Enable cross-region replication

## Index Strategy (Prepared)
**Current Indexes**:
- `orders(created_at DESC, id DESC)` - Global
- Foreign key indexes

**Future Sharded Indexes**:
- Per-tenant indexes on sharded tables
- Global indexes for cross-tenant queries (limited)

## Testing Approach
**Unit Tests**:
- Tenant context resolution from various sources
- Filter application logic
- Permission validation

**Integration Tests**:
- API calls with tenant context
- Filter enforcement when feature flag enabled
- Cross-tenant data isolation