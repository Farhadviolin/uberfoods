# 🔧 FEHLENDE ENDPOINTS IMPLEMENTIERUNG

## ✅ BEREITS IMPLEMENTIERT (Stand: 2025-01-26)

### Admin Panel Endpoints
- ✅ Settings Management (10 Endpoints)
- ✅ Inventory Management (10 Endpoints)  
- ✅ Support Management (10 Endpoints)
- ✅ Reporting Advanced (10 Endpoints)
- ✅ Automation Management (10 Endpoints)

### Chat & Upload Endpoints
- ✅ Chat Conversations
- ✅ Chat Mark as Read
- ✅ Upload Delete
- ✅ Upload Menu Item

### Driver App Endpoints
- ✅ Driver Orders (Pending, Active, Completed, Cancelled)
- ✅ Driver Order Details, Timeline, Notes
- ✅ Driver Navigation Extended
- ✅ Driver Earnings Extended
- ✅ Driver Performance Extended
- ✅ Driver Gamification Extended
- ✅ Driver Subscription Extended
- ✅ Driver Emergency Extended
- ✅ Driver Chat Extended
- ✅ Driver Notifications Extended
- ✅ Driver Shifts Extended
- ✅ Driver Documents Extended
- ✅ Driver Security Extended (20 Features)
- ✅ Driver AI/ML Extended (25+ Features)

## 📋 NOCH ZU IMPLEMENTIEREN (ca. 300+ Endpoints)

### Customer-Web Endpoints (ca. 100 Endpoints)

#### Restaurant & Menu (50 Endpoints)
1. GET /api/restaurants/:id/menu/categories
2. GET /api/restaurants/:id/menu/items/:itemId
3. GET /api/restaurants/:id/menu/search?q=
4. GET /api/restaurants/:id/menu/filter?category=&dietary=
5. GET /api/restaurants/:id/menu/recommendations
6. GET /api/restaurants/:id/menu/popular
7. GET /api/restaurants/:id/menu/new
8. GET /api/restaurants/:id/menu/specials
9. POST /api/restaurants/:id/menu/items/:itemId/customize
10. GET /api/restaurants/:id/reviews/recent
11. GET /api/restaurants/:id/reviews/filter?rating=&sort=
12. POST /api/restaurants/:id/favorite
13. DELETE /api/restaurants/:id/favorite
14. GET /api/restaurants/nearby?lat=&lng=&radius=
15. GET /api/restaurants/search?q=&cuisine=&priceRange=
16. GET /api/restaurants/filter?cuisine=&rating=&deliveryTime=
17. GET /api/restaurants/:id/delivery-zones/check
18. GET /api/restaurants/:id/operating-hours/current
19. GET /api/restaurants/:id/promotions/active
20. GET /api/restaurants/:id/ratings/breakdown
21. GET /api/restaurants/:id/photos
22. GET /api/restaurants/:id/menu/export
23. GET /api/cuisines
24. GET /api/cuisines/:id/restaurants
25. GET /api/dietary-options
26. GET /api/allergens
27. POST /api/menu-items/:id/nutrition/calculate
28. GET /api/menu-items/:id/alternatives
29. POST /api/menu-items/:id/report
30. GET /api/restaurants/:id/similar
31. GET /api/restaurants/:id/trending
32. GET /api/restaurants/:id/estimated-wait
33. GET /api/restaurants/:id/queue-status
34. GET /api/restaurants/:id/peak-hours
35. GET /api/restaurants/:id/delivery-fee/calculate
36. GET /api/restaurants/:id/minimum-order/check
37. GET /api/restaurants/:id/availability
38. GET /api/restaurants/:id/ratings/summary
39. GET /api/restaurants/:id/reviews/stats
40. GET /api/restaurants/:id/menu/categories/:categoryId
41. GET /api/restaurants/:id/menu/items/:itemId/variations
42. POST /api/restaurants/:id/menu/items/:itemId/add-to-cart
43. GET /api/restaurants/:id/menu/items/:itemId/related
44. GET /api/restaurants/:id/menu/items/:itemId/reviews
45. POST /api/restaurants/:id/menu/items/:itemId/question
46. GET /api/restaurants/:id/menu/items/:itemId/nutrition
47. GET /api/restaurants/:id/menu/items/:itemId/allergens
48. GET /api/restaurants/:id/menu/items/:itemId/ingredients
49. GET /api/restaurants/:id/menu/items/:itemId/preparation-time
50. GET /api/restaurants/:id/menu/items/:itemId/availability

#### Payment & Order (50 Endpoints)
1. POST /api/orders/preview
2. POST /api/orders/validate
3. GET /api/orders/:id/status
4. GET /api/orders/:id/tracking
5. GET /api/orders/:id/estimated-delivery
6. POST /api/orders/:id/cancel
7. POST /api/orders/:id/modify
8. POST /api/orders/:id/reorder
9. GET /api/orders/:id/receipt
10. GET /api/orders/:id/invoice
11. POST /api/orders/:id/rate
12. POST /api/orders/:id/complain
13. POST /api/orders/:id/refund-request
14. GET /api/orders/:id/refund-status
15. POST /api/orders/:id/tip
16. GET /api/orders/:id/tip-options
17. POST /api/orders/:id/change-delivery-address
18. POST /api/orders/:id/change-delivery-time
19. GET /api/orders/:id/driver
20. GET /api/orders/:id/restaurant
21. GET /api/orders/:id/chat
22. POST /api/orders/:id/chat/message
23. GET /api/orders/history?page=&limit=
24. GET /api/orders/active
25. GET /api/orders/pending
26. GET /api/orders/completed
27. GET /api/orders/cancelled
28. GET /api/orders/search?q=
29. GET /api/orders/filter?status=&dateFrom=&dateTo=
30. GET /api/orders/export?format=&startDate=&endDate=
31. POST /api/payment/methods
32. GET /api/payment/methods
33. DELETE /api/payment/methods/:id
34. PUT /api/payment/methods/:id/default
35. POST /api/payment/intent
36. POST /api/payment/confirm
37. GET /api/payment/transactions
38. GET /api/payment/transactions/:id
39. POST /api/payment/refund
40. GET /api/payment/refunds
41. GET /api/payment/methods/available
42. POST /api/payment/save-method
43. GET /api/payment/saved-methods
44. DELETE /api/payment/saved-methods/:id
45. POST /api/payment/validate
46. GET /api/payment/history
47. GET /api/payment/invoices
48. GET /api/payment/invoices/:id
49. POST /api/payment/invoices/:id/download
50. GET /api/payment/methods/validate

### Driver-App Endpoints (ca. 75 Endpoints - viele bereits vorhanden)

#### Noch fehlend:
1. GET /api/drivers/:id/orders/available
2. GET /api/drivers/:id/orders/suggested
3. POST /api/drivers/:id/orders/:orderId/accept/smart
4. GET /api/drivers/:id/orders/:orderId/route/optimize
5. GET /api/drivers/:id/orders/:orderId/navigation/start
6. GET /api/drivers/:id/orders/:orderId/navigation/stop
7. GET /api/drivers/:id/earnings/daily
8. GET /api/drivers/:id/earnings/weekly
9. GET /api/drivers/:id/earnings/monthly
10. GET /api/drivers/:id/earnings/yearly
11. GET /api/drivers/:id/earnings/breakdown/by-type
12. GET /api/drivers/:id/earnings/breakdown/by-restaurant
13. GET /api/drivers/:id/earnings/breakdown/by-time
14. GET /api/drivers/:id/performance/score
15. GET /api/drivers/:id/performance/rank
16. GET /api/drivers/:id/performance/improvements
17. GET /api/drivers/:id/performance/coaching
18. GET /api/drivers/:id/performance/trends
19. GET /api/drivers/:id/performance/goals
20. POST /api/drivers/:id/performance/goals
21. PUT /api/drivers/:id/performance/goals/:goalId
22. DELETE /api/drivers/:id/performance/goals/:goalId
23. GET /api/drivers/:id/ratings/breakdown
24. GET /api/drivers/:id/ratings/trends
25. GET /api/drivers/:id/ratings/comparison
26. GET /api/drivers/:id/ratings/details
27. GET /api/drivers/:id/shifts/current
28. GET /api/drivers/:id/shifts/history
29. GET /api/drivers/:id/shifts/statistics
30. POST /api/drivers/:id/shifts/start
31. POST /api/drivers/:id/shifts/end
32. POST /api/drivers/:id/shifts/pause
33. POST /api/drivers/:id/shifts/resume
34. GET /api/drivers/:id/vehicles/current
35. GET /api/drivers/:id/vehicles/history
36. GET /api/drivers/:id/vehicles/maintenance
37. POST /api/drivers/:id/vehicles/maintenance/schedule
38. GET /api/drivers/:id/expenses/categories
39. GET /api/drivers/:id/expenses/recent
40. GET /api/drivers/:id/expenses/statistics
41. POST /api/drivers/:id/expenses
42. PUT /api/drivers/:id/expenses/:expenseId
43. DELETE /api/drivers/:id/expenses/:expenseId
44. GET /api/drivers/:id/expenses/export
45. GET /api/drivers/:id/documents/required
46. GET /api/drivers/:id/documents/expiring
47. GET /api/drivers/:id/documents/verification-status
48. POST /api/drivers/:id/documents/upload
49. PUT /api/drivers/:id/documents/:documentId
50. DELETE /api/drivers/:id/documents/:documentId
51. GET /api/drivers/:id/notifications/unread-count
52. GET /api/drivers/:id/notifications/recent
53. GET /api/drivers/:id/notifications/history
54. PUT /api/drivers/:id/notifications/:notificationId/read
55. PUT /api/drivers/:id/notifications/mark-all-read
56. GET /api/drivers/:id/notifications/preferences
57. PUT /api/drivers/:id/notifications/preferences
58. GET /api/drivers/:id/support/tickets
59. POST /api/drivers/:id/support/tickets
60. GET /api/drivers/:id/support/tickets/:ticketId
61. POST /api/drivers/:id/support/tickets/:ticketId/messages
62. GET /api/drivers/:id/support/faq
63. GET /api/drivers/:id/support/knowledge-base
64. GET /api/drivers/:id/achievements/unlocked
65. GET /api/drivers/:id/achievements/in-progress
66. GET /api/drivers/:id/achievements/:achievementId
67. POST /api/drivers/:id/achievements/:achievementId/claim
68. GET /api/drivers/:id/badges
69. GET /api/drivers/:id/badges/equipped
70. PUT /api/drivers/:id/badges/:badgeId/equip
71. GET /api/drivers/:id/leaderboard
72. GET /api/drivers/:id/leaderboard/position
73. GET /api/drivers/:id/leaderboard/category/:category
74. GET /api/drivers/:id/referrals
75. POST /api/drivers/:id/referrals/generate

### Restaurant-Web Endpoints (ca. 75 Endpoints)

#### Noch fehlend:
1. GET /api/restaurants/:id/orders/dashboard
2. GET /api/restaurants/:id/orders/today
3. GET /api/restaurants/:id/orders/pending
4. GET /api/restaurants/:id/orders/preparing
5. GET /api/restaurants/:id/orders/ready
6. GET /api/restaurants/:id/orders/completed
7. GET /api/restaurants/:id/orders/cancelled
8. GET /api/restaurants/:id/orders/statistics
9. GET /api/restaurants/:id/orders/revenue
10. GET /api/restaurants/:id/orders/average-time
11. GET /api/restaurants/:id/orders/peak-hours
12. GET /api/restaurants/:id/orders/popular-items
13. GET /api/restaurants/:id/orders/customer-feedback
14. POST /api/restaurants/:id/orders/:orderId/accept
15. POST /api/restaurants/:id/orders/:orderId/reject
16. POST /api/restaurants/:id/orders/:orderId/prepare
17. POST /api/restaurants/:id/orders/:orderId/ready
18. POST /api/restaurants/:id/orders/:orderId/complete
19. POST /api/restaurants/:id/orders/:orderId/cancel
20. GET /api/restaurants/:id/orders/:orderId/details
21. GET /api/restaurants/:id/orders/:orderId/timeline
22. GET /api/restaurants/:id/orders/:orderId/customer
23. GET /api/restaurants/:id/orders/:orderId/driver
24. GET /api/restaurants/:id/orders/:orderId/payment
25. POST /api/restaurants/:id/orders/:orderId/notes
26. GET /api/restaurants/:id/orders/:orderId/notes
27. PUT /api/restaurants/:id/orders/:orderId/notes/:noteId
28. DELETE /api/restaurants/:id/orders/:orderId/notes/:noteId
29. POST /api/restaurants/:id/orders/:orderId/delay
30. GET /api/restaurants/:id/orders/:orderId/delivery-time
31. GET /api/restaurants/:id/menu/categories
32. POST /api/restaurants/:id/menu/categories
33. PUT /api/restaurants/:id/menu/categories/:categoryId
34. DELETE /api/restaurants/:id/menu/categories/:categoryId
35. GET /api/restaurants/:id/menu/items
36. POST /api/restaurants/:id/menu/items
37. PUT /api/restaurants/:id/menu/items/:itemId
38. DELETE /api/restaurants/:id/menu/items/:itemId
39. POST /api/restaurants/:id/menu/items/:itemId/toggle-availability
40. GET /api/restaurants/:id/menu/items/:itemId/statistics
41. GET /api/restaurants/:id/menu/items/:itemId/reviews
42. GET /api/restaurants/:id/menu/export
43. POST /api/restaurants/:id/menu/import
44. GET /api/restaurants/:id/menu/templates
45. POST /api/restaurants/:id/menu/templates
46. GET /api/restaurants/:id/reviews/pending
47. GET /api/restaurants/:id/reviews/approved
48. GET /api/restaurants/:id/reviews/rejected
49. POST /api/restaurants/:id/reviews/:reviewId/approve
50. POST /api/restaurants/:id/reviews/:reviewId/reject
51. POST /api/restaurants/:id/reviews/:reviewId/reply
52. GET /api/restaurants/:id/reviews/statistics
53. GET /api/restaurants/:id/reviews/trends
54. GET /api/restaurants/:id/analytics/revenue
55. GET /api/restaurants/:id/analytics/orders
56. GET /api/restaurants/:id/analytics/customers
57. GET /api/restaurants/:id/analytics/items
58. GET /api/restaurants/:id/analytics/performance
59. GET /api/restaurants/:id/analytics/export
60. GET /api/restaurants/:id/staff/members
61. POST /api/restaurants/:id/staff/members
62. PUT /api/restaurants/:id/staff/members/:memberId
63. DELETE /api/restaurants/:id/staff/members/:memberId
64. GET /api/restaurants/:id/staff/shifts
65. POST /api/restaurants/:id/staff/shifts
66. PUT /api/restaurants/:id/staff/shifts/:shiftId
67. DELETE /api/restaurants/:id/staff/shifts/:shiftId
68. GET /api/restaurants/:id/staff/statistics
69. GET /api/restaurants/:id/inventory/overview
70. GET /api/restaurants/:id/inventory/items
71. GET /api/restaurants/:id/inventory/alerts
72. GET /api/restaurants/:id/inventory/low-stock
73. GET /api/restaurants/:id/inventory/expiring
74. GET /api/restaurants/:id/promotions/active
75. GET /api/restaurants/:id/promotions/statistics

## 📝 HINWEISE

1. **Viele Endpoints existieren bereits** - Der Driver Controller hat bereits 4000+ Zeilen Code mit vielen Endpoints
2. **Systematische Implementierung** - Endpoints sollten in logischen Gruppen implementiert werden
3. **Service-Methoden** - Für jeden Endpoint müssen entsprechende Service-Methoden erstellt werden
4. **DTOs** - Für komplexe Endpoints sollten DTOs erstellt werden
5. **Validierung** - Alle Endpoints sollten mit ValidationPipe validiert werden
6. **Auth Guards** - Alle Endpoints sollten mit entsprechenden Auth Guards geschützt werden

## 🚀 NÄCHSTE SCHRITTE

1. Customer-Web Restaurant & Menu Endpoints implementieren
2. Customer-Web Payment & Order Endpoints implementieren
3. Verbleibende Driver-App Endpoints implementieren
4. Restaurant-Web Endpoints implementieren
5. Testing aller implementierten Endpoints
6. Dokumentation aktualisieren

