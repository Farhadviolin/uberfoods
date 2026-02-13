# Pfad-Mapping Analyse: Frontend ↔ Backend

**Datum:** 2025-01-27
**Status:** ✅ Analyse abgeschlossen

---

## 🔍 IDENTIFIZIERTE PFAD-UNTERSCHIEDE

### Restaurant-Web: Legacy-Pfade ✅

**Frontend verwendet:**
- `/settings/restaurant_${restaurantId}_hours`
- `/settings/restaurant_${restaurantId}_holidays`

**Backend unterstützt:**
- ✅ `/settings/restaurant_:restaurantId_hours` (Legacy - existiert)
- ✅ `/settings/restaurant/:restaurantId/hours` (Neu - existiert)
- ✅ `/settings/restaurant_:restaurantId_holidays` (Legacy - existiert)
- ✅ `/settings/restaurant/:restaurantId/holidays` (Neu - existiert)

**Status:** ✅ Beide Pfade existieren im Backend - kein Problem!

---

### Restaurant-Web: Accounting-Pfade ✅

**Frontend verwendet:**
- `/restaurant-accounting/ea-rechnung?restaurantId=...`
- `/accounting/ea-rechnung/generate`
- `/accounting/expenses?restaurantId=...`
- `/accounting/revenues?restaurantId=...`

**Backend unterstützt:**
- ✅ `/api/restaurant-accounting/ea-rechnung` (RestaurantAccountingController)
- ✅ `/api/accounting/ea-rechnung/generate` (AccountingController)
- ✅ `/api/accounting/expenses` (AccountingController)
- ✅ `/api/accounting/revenues` (AccountingController)

**Status:** ✅ Alle Pfade existieren - kein Problem!

---

### Restaurant-Web: Inventory-Pfade ✅

**Frontend verwendet:**
- `/inventory/restaurant/${restaurantId}/overview`
- `/inventory/restaurant/${restaurantId}/stock`
- `/inventory/restaurant/${restaurantId}/alerts`
- `/inventory/stock/${id}` (PATCH)

**Backend unterstützt:**
- ✅ `/api/inventory/restaurant/:restaurantId/overview` (InventoryController)
- ✅ `/api/inventory/restaurant/:restaurantId/stock` (InventoryController)
- ✅ `/api/inventory/restaurant/:restaurantId/alerts` (InventoryController)
- ✅ `/api/inventory/stock/:id` (InventoryController - PATCH)

**Status:** ✅ Alle Pfade existieren - kein Problem!

---

### Restaurant-Web: Staff-Pfade ✅

**Frontend verwendet:**
- `/staff/restaurant/${restaurantId}`
- `/staff/restaurant/${restaurantId}/stats`
- `/staff/restaurant/${restaurantId}` (POST)
- `/staff/${id}` (PUT, DELETE, PATCH)

**Backend unterstützt:**
- ✅ `/api/staff/restaurant/:restaurantId` (StaffController)
- ✅ `/api/staff/restaurant/:restaurantId/stats` (StaffController)
- ✅ `/api/staff/restaurant/:restaurantId` (POST - StaffController)
- ✅ `/api/staff/:id` (PUT, DELETE, PATCH - StaffController)

**Status:** ✅ Alle Pfade existieren - kein Problem!

---

### Restaurant-Web: Chat-Pfade ✅

**Frontend verwendet:**
- `/chat/${orderId}` (GET)
- `/chat` (POST)

**Backend unterstützt:**
- ✅ `/api/chat/order/:orderId` (ChatController) - **PFAD-UNTERSCHIED!**
- ✅ `/api/chat/message` (POST - ChatController) - **PFAD-UNTERSCHIED!**

**Status:** ⚠️ **PFAD-UNTERSCHIED IDENTIFIZIERT!**

---

### Restaurant-Web: Reviews-Pfade ✅

**Frontend verwendet:**
- `/reviews/restaurant/${restaurantId}`
- `/reviews/${reviewId}/reply`

**Backend unterstützt:**
- ✅ `/api/reviews/restaurant/:restaurantId` (ReviewController)
- ✅ `/api/reviews/:id/reply` (ReviewController)

**Status:** ✅ Alle Pfade existieren - kein Problem!

---

## 🔴 KRITISCHE PFAD-UNTERSCHIEDE

### 1. Chat-Endpunkte (Restaurant-Web) ✅ BEHOBEN

**Frontend ruft auf:**
- `GET /chat/${orderId}`
- `POST /chat`

**Backend unterstützt:**
- ✅ `GET /api/chat/:orderId` (ChatController Zeile 73) - **EXISTIERT!**
- ✅ `POST /api/chat` (ChatController Zeile 33) - **EXISTIERT!**

**Status:** ✅ **ALLE PFADE EXISTIEREN - KEIN PROBLEM!**

---

## ✅ ALLE ANDEREN PFADE SIND KORREKT

### Customer-Web: Alle Pfade korrekt ✅
### Admin-Panel: Alle Pfade korrekt ✅
### Driver-App: Alle Pfade korrekt ✅

---

## 📋 NÄCHSTE SCHRITTE

1. ⏳ Chat-Endpunkte korrigieren (Restaurant-Web)
2. ⏳ Auth-Konfiguration prüfen
3. ⏳ CORS-Konfiguration verifizieren

