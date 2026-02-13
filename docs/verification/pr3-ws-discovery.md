# PR-3 WebSocket Implementation Discovery

## Gateway Configuration
**File**: `backend/src/modules/websocket/websocket.gateway.ts`
**Class**: `WebsocketGateway`
**Gateway Options**:
- namespace: "/"
- path: "/socket.io/"
- transports: ['websocket', 'polling']
- allowEIO3: true
- cors: origin: "*" (development), specific origins (production)

## Authentication
- Token-based authentication via `client.handshake.auth.token` or `client.handshake.query.token`
- JWT verification with userId and userType extraction
- Room joins: `user_${userId}`, role-based rooms, `drivers` room for driver userType

## Key Events (SubscribeMessage)
### Location Updates (Driver)
- **Event**: `update_location`
- **Handler**: `handleUpdateLocation`
- **Body**: `{ latitude: number, longitude: number }`
- **Restriction**: Only authenticated drivers (`client.userType === "driver"`)
- **Action**: Updates driver location, applies rate limiting, broadcasts to assigned customers

### Order Tracking (Customer)
- **Event**: `join_order`
- **Handler**: `handleJoinOrder`
- **Body**: `{ orderId: string }`
- **Action**: Joins `order_${orderId}` room, emits initial order status

- **Event**: `leave_order`
- **Handler**: `handleLeaveOrder`
- **Body**: `{ orderId: string }`
- **Action**: Leaves order room

## Emit Events
### Driver Location Broadcasts
- **Event**: `driver_location_update`
- **Target**: `order_${orderId}` rooms (assigned customers)
- **Payload**: `{ v: 1, type: 'driver_location_update', orderId, driverId, location, timestamp, sequence }`

### Order Status Updates
- **Event**: `order_status_change`
- **Target**: `order_${orderId}` room
- **Also broadcasts**: `new_order` to `drivers` room when status === "placed"

### Other Events
- `driver_assigned` (to order room)
- `order_assigned` (to driver room)
- `new_order` (to restaurant room)

## Rooms Structure
- `user_${userId}` - User-specific notifications
- `customer|driver|restaurant` - Role-based broadcasts
- `drivers` - Driver-specific notifications
- `order_${orderId}` - Order tracking
- `restaurant_${restaurantId}` - Restaurant notifications

## Rate Limiting
- **Service**: `DriverRateLimiterService`
- **Limit**: 2 updates per second per driver
- **Implementation**: In-memory (not distributed)
- **Behavior**: Updates database but skips broadcast if rate limited

## Driver Location Update Event (For Testing)
**Perfect for testing multi-instance broadcasting**:
- Producer: Emit `update_location` from driver client
- Consumer: Listen for `driver_location_update` in order `order_${orderId}` rooms
- Requires: Driver authentication + assigned order