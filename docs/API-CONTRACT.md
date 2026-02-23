# UberFoods API Contract (MVP)

Abgleich: Frontend-API-Calls vs. Backend-Routen. Fokus: Auth, Restaurants, Dishes, Orders, Driver Accept/Status, Restaurant Status.

**Legende:** OK = Frontend-Call trifft Backend-Route. MISMATCH = Pfad/Method unterschiedlich. MISSING = Backend bietet Route nicht.

---

## MVP-relevante Endpoints

| App | Frontend-Call | Backend-Route | Status | Fix-Entscheidung |
|-----|----------------|---------------|--------|------------------|
| All | GET /api/health | GET /api/health (health.controller) | OK | - |
| Admin | POST /api/auth/login | POST /api/auth/login (auth.controller) | OK | - |
| Customer | POST /api/auth/customer/register | POST /api/auth/customer/register | OK | - |
| Customer | POST /api/auth/customer/login | POST /api/auth/customer/login | OK | - |
| Customer | GET /api/restaurants/public | GET /api/restaurants/public (restaurant.controller) | OK | - |
| Customer | GET /api/dishes/restaurant/:id | GET /api/dishes/restaurant/:id (dish.controller) | OK | - |
| Customer | GET /api/restaurants/:id/dishes | GET /api/restaurants/:id/dishes (restaurant.controller) | OK | - |
| Customer | POST /api/orders oder /api/orders/customer | POST /api/orders/customer (order.controller) | OK | Script nutzt /orders/customer |
| Restaurant | POST /api/auth/restaurant/login | POST /api/auth/restaurant/login | OK | - |
| Restaurant | GET /api/restaurants/:id/orders | GET /api/restaurants/:id/orders (restaurant.controller :id/orders) | OK | - |
| Restaurant | PATCH /api/orders/:id/status | PATCH /api/orders/:id/status (order.controller) | OK | - |
| Driver | GET /api/drivers/:driverId/orders/available (oder pending) | GET /api/drivers/orders/available (ohne driverId) | MISMATCH | Backend Alias: GET /drivers/:driverId/orders/available → gleiche Logik |
| Driver | POST /api/drivers/:driverId/orders/:orderId/accept | POST /api/drivers/orders/:orderId/accept | MISMATCH | Backend Alias: POST /drivers/:driverId/orders/:orderId/accept |
| Driver | PUT /api/drivers/:driverId/orders/:orderId/status | PUT /api/drivers/orders/:orderId/status | MISMATCH | Backend Alias: PUT /drivers/:driverId/orders/:orderId/status |
| Admin | GET /api/admin/orders | GET /api/admin/orders (admin.controller) | OK | - |
| Admin | GET /api/orders/:id | GET /api/orders/:id (order.controller) | OK | - |
| Admin | GET /api/admin/audit | GET /api/admin/audit | OK | - |

---

## Weitere Frontend-Calls (außerhalb MVP-Kern)

- customer-web: /orders/my, /customers/me/*, /dishes/:id/nutrition, /analytics/*, /meal-planner/*, /social/*, /gamification/*, etc. – je nach Backend-Modul OK oder MISSING.
- restaurant-web: /restaurants/me, /restaurants/:id/orders, /restaurants/:id/menu, /orders/:id/cancel-restaurant – Backend teils unter anderen Pfaden (z. B. orders über order.controller).
- driver-app: viele /drivers/:driverId/* (performance, gamification, routes, shifts, …) – Backend teils nur unter /admin/drivers oder nicht implementiert; für MVP reichen orders/available, accept, status.

---

## Kanonische MVP-Endpoints (nach Fixes)

- **Health:** GET /api/health
- **Auth:** POST /api/auth/login, /api/auth/customer/register, /api/auth/customer/login, /api/auth/restaurant/login, /api/auth/driver/login
- **Restaurants:** GET /api/restaurants/public
- **Dishes:** GET /api/dishes/restaurant/:id (oder GET /api/restaurants/:id/dishes)
- **Orders:** POST /api/orders/customer, GET /api/orders/:id, PATCH /api/orders/:id/status
- **Driver:** GET /api/drivers/orders/available (oder GET /api/drivers/:driverId/orders/available), POST /api/drivers/orders/:orderId/accept (oder …/drivers/:driverId/orders/:orderId/accept), PUT /api/drivers/orders/:orderId/status (oder …/drivers/:driverId/orders/:orderId/status)
- **Admin:** GET /api/admin/orders, GET /api/admin/audit
