# UberFoods MVP Smoke Test

Automatisierter Smoke Test für die 4-Rollen-MVP-Journey (Admin, Customer, Restaurant, Driver). Beweist, dass die Plattform lokal real nutzbar ist.

---

## Relevante API-Endpunkte (Backend)

Alle Routen mit Global-Prefix `/api`. Quelle: `backend/src/modules/**/*.controller.ts`.

| Route | Method | Controller | Beschreibung |
|-------|--------|------------|--------------|
| `/api/health` | GET | health.controller.ts | Health Check |
| `/api/auth/login` | POST | auth.controller.ts | Admin/Universal Login |
| `/api/auth/customer/register` | POST | auth.controller.ts | Kunden-Registrierung |
| `/api/auth/customer/login` | POST | auth.controller.ts | Kunden-Login |
| `/api/auth/customer/me` | GET | auth.controller.ts | Kunden-Profil (JWT) |
| `/api/auth/restaurant/login` | POST | auth.controller.ts | Restaurant-Login |
| `/api/auth/driver/login` | POST | auth.controller.ts | Fahrer-Login |
| `/api/restaurants/public` | GET | restaurant.controller.ts | Öffentliche Restaurant-Liste |
| `/api/restaurants/:id/dishes` | GET | restaurant.controller.ts | Gerichte eines Restaurants |
| `/api/dishes/restaurant/:id` | GET | dish.controller.ts | Gerichte nach Restaurant-ID |
| `/api/orders/customer` | POST | order.controller.ts | Bestellung anlegen (JWT) |
| `/api/orders/:id` | GET | order.controller.ts | Bestelldetails |
| `/api/orders/:id/status` | PATCH | order.controller.ts | Status ändern (z. B. PREPARING, READY, READY_FOR_PICKUP) |
| `/api/drivers/orders/available` | GET | driver-endpoints.controller.ts | Für Fahrer: verfügbare Orders (READY_FOR_PICKUP) |
| `/api/drivers/orders/:orderId/accept` | POST | driver-endpoints.controller.ts | Order annehmen (JWT = Fahrer) |
| `/api/drivers/orders/:orderId/status` | PUT | driver-endpoints.controller.ts | Lieferstatus (DELIVERING, DELIVERED) |
| `/api/admin/restaurants` | GET | admin.controller.ts | Admin: Restaurants (JWT) |
| `/api/admin/orders` | GET | admin.controller.ts | Admin: Orders (JWT) |
| `/api/admin/audit` | GET | admin.controller.ts | Admin: Audit-Logs (JWT) |

---

## Voraussetzungen

1. **Docker** (Postgres + Redis):  
   `docker compose up -d` (aus Repo-Root).

2. **Backend** (Full-Stack):  
   - `cd backend`  
   - `.env` mit z. B. `DATABASE_URL=postgresql://postgres:postgres123@localhost:5434/uberfoods`, `JWT_SECRET=…`, `REDIS_URL=…`  
   - `npm run build`  
   - `npm run prisma:deploy`  
   - `npm run prisma:seed` (mit gesetzten `SEED_CUSTOMER_PASSWORD`, `SEED_RESTAURANT_PASSWORD`, `SEED_DRIVER_PASSWORD`; Admin-Passwort im Seed fest `admin123`)  
   - `npm run start:full` (oder `node dist/main.full.js`).

3. **Seed-Daten** für Smoke:  
   - Admin: `admin@uberfoods.com` / `admin123`  
   - Restaurant: `restaurant@uberfoods.local` / Passwort aus `SEED_RESTAURANT_PASSWORD` (z. B. `restaurant123`)  
   - Driver: `driver@uberfoods.local` / Passwort aus `SEED_DRIVER_PASSWORD` (z. B. `driver123`)  
   Mindestens ein Restaurant und ein Dish werden vom Seed angelegt (z. B. Pizza Palace + Pizza Margherita).

---

## Ausführen (PowerShell)

### Kanonische Befehle (Repo-Root)

| Ziel | Befehl |
|------|--------|
| **Dev-Up inkl. Smoke** | `powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File .\scripts\dev-up.ps1` |
| **Dev-Up ohne Smoke** | `powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File .\scripts\dev-up.ps1 -SkipSmoke` |
| **Nur Ports + HTTP prüfen** | `powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify-local.ps1` |
| **Nur Smoke-Test** | `npm run smoke:mvp` |

`dev-up.ps1` startet Docker Compose, die 4 Frontends (Admin, Customer, Restaurant, Driver) auf festen Ports und optional den Smoke-Test. Pfade zeigen auf das echte Repo-Root (z. B. `…\UberFoods\frontend\admin-panel`), nicht auf `scripts\frontend\...`.

### Kanonischer Dev-Up-Befehl (Docker + Frontends + Smoke)

Aus dem **Repository-Root** (UberFoods) startet folgender Befehl Docker, alle 4 Frontends (Admin, Customer, Restaurant, Driver) auf festen Ports und führt danach den Smoke-Test aus:

```powershell
powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File .\scripts\dev-up.ps1
```

Ohne Smoke (nur Docker + Frontends):

```powershell
powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File .\scripts\dev-up.ps1 -SkipSmoke
```

Die Dev-Server laufen dann auf:

- Backend: `http://localhost:3000/api/health`
- Admin Panel: `http://localhost:3002`
- Customer Web: `http://localhost:5173`
- Restaurant Web: `http://localhost:3003`
- Driver App: `http://localhost:3004`

### Lokale Verifikation (Ports + HTTP) ohne Smoke

```powershell
powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify-local.ps1
```

Dieses Script zeigt:

- Listener-Tabelle für Ports `3000, 3002, 3003, 3004, 5173` inkl. PID/Prozess
- HTTP-Checks:
  - Backend Health `http://localhost:3000/api/health`
  - Customer Web `http://localhost:5173/`
  - Admin Panel `http://localhost:3002/` **und** `http://127.0.0.1:3002/`
  - Restaurant Web `http://localhost:3003/`
  - Driver App `http://localhost:3004/`

### Smoke-Test nur ausführen (ohne Frontends neu zu starten)

Aus dem **Repository-Root**:

```powershell
# Standard (Backend auf localhost:3000)
powershell -ExecutionPolicy Bypass -File .\scripts\smoke-mvp.ps1

# Mit Parametern
.\scripts\smoke-mvp.ps1 -BaseUrl "http://localhost:3000/api" -AdminEmail "admin@uberfoods.com" -AdminPassword "admin123" -DriverEmail "driver@uberfoods.local" -DriverPassword "driver123" -RestaurantEmail "restaurant@uberfoods.local" -RestaurantPassword "restaurant123"
```

Oder aus dem **Backend**-Ordner (wenn Script von dort aus aufgerufen wird):

```powershell
cd backend
npm run smoke:mvp
```

(Über `package.json` wird dasselbe Script mit `-File` relativ zum Repo-Root aufgerufen; ggf. von Repo-Root aus ausführen.)

---

## Erwartete Ausgabe

- Pro Schritt: `[PASS]` (grün) oder `[FAIL]` (rot); bei Fehler bricht das Skript mit P0 ab.
- Am Ende eine **Zusammenfassungstabelle** (Step, Status, Message) und entweder:
  - **RESULT: PASS** (exit 0) oder  
  - **RESULT: FAIL** (exit 1) mit klarer Ursache (z. B. welcher Schritt fehlgeschlagen ist).

Beispiel (gekürzt):

```
[PASS] 1.Health - Health OK (database/timestamp present)
[PASS] 2.AdminLogin - Admin token obtained
[PASS] 3.Restaurant - Using seed restaurant id=...
...
[PASS] 12.AdminAudit - GET /api/admin/audit OK (entries=...)
========== MVP SMOKE TEST SUMMARY ==========
RESULT: PASS (xx steps passed)
```

**Hinweis:** Schritt **AdminAudit** kann als `[SKIP]` erscheinen (z. B. 403), wenn Audit-Berechtigungen deaktiviert sind. Der Smoke-Test gilt weiterhin als **PASS**, sofern alle anderen Schritte bestanden sind.

---

## Wenn Backend wegen Metrics restartet (Prometheus „already been registered“)

- **Ursache:** Default-Metrics oder MetricsService wurden doppelt registriert (z. B. MetricsModule mehrfach importiert).
- **Fix im Repo:** MetricsModule wird nur noch im AppModule (Full-Stack) importiert; MetricsService hat einen Hard-Guard (getSingleMetric + try/catch + globalThis-Marker), sodass doppelte Registrierung nicht mehr zum Crash führt.
- **Erwartete Logs nach Fix:** Kein Absturz mit „already been registered“; ggf. eine Zeile wie „Default metrics already registered; continuing startup“ oder „Custom metrics already registered; reusing existing metrics“ (WARN/DEBUG). Backend bleibt **Up**, `/api/health` liefert **200**.

---

## Troubleshooting

| Fehler / Symptom | Mögliche Ursache | Maßnahme |
|------------------|------------------|----------|
| **401 Unauthorized** (Admin/Driver/Restaurant Login) | Falsche Credentials oder Seed nicht gelaufen | Seed ausführen (`npm run prisma:seed`), Passwörter wie in Voraussetzungen; für Admin `admin123` prüfen. |
| **403 Forbidden** | Rolle/Berechtigung (z. B. Admin-Guards) | Sicherstellen, dass mit Admin-Token auf `/api/admin/*` zugegriffen wird; JWT nicht abgelaufen. |
| **Connection refused / GET health failed** | Backend läuft nicht oder falscher Port | Backend mit `npm run start:full` starten; `-BaseUrl` an Port anpassen (z. B. `http://localhost:3000/api`). |
| **Leere Restaurants** | Kein Seed oder DB leer | `npm run prisma:deploy` und `npm run prisma:seed`; ggf. `SEED_*` in `.env` setzen. |
| **Dish-Route fehlt / 404** | Falscher Pfad | Öffentliche Gerichte: `GET /api/dishes/restaurant/:restaurantId` (DishController) oder `GET /api/restaurants/:id/dishes` (RestaurantController). Script nutzt zuerst `dishes/restaurant/:id`. |
| **Order create failed (customerId)** | customerId fehlt im Request | Script holt customerId aus Login-Response (`user.id`) oder `/api/auth/customer/me`. Sicherstellen, dass Customer-Login `user` mit `id` zurückgibt. |
| **Driver sieht keine Orders** | Order-Status nicht READY_FOR_PICKUP | Restaurant/Admin muss Order auf `READY`, dann `READY_FOR_PICKUP` setzen; erst dann erscheinen sie unter `GET /api/drivers/orders/available`. |
| **CORS** | Nur Browser-relevant | Für PowerShell/Invoke-RestMethod irrelevant; CORS betrifft den Smoke Test nicht. |

---

## Kurz: So startest du und führst den Smoke Test aus

1. **Docker starten:**  
   `docker compose up -d`

2. **Backend:**  
   `cd backend` → `.env` anlegen (DATABASE_URL, JWT_SECRET, ggf. REDIS_URL, SEED_*), dann:
   ```powershell
   npm install
   npm run build
   npm run prisma:deploy
   npm run prisma:seed
   npm run start:full
   ```

3. **Smoke Test (neues Terminal, Repo-Root):**  
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\scripts\smoke-mvp.ps1
   ```
   Oder mit expliziten Credentials:  
   `.\scripts\smoke-mvp.ps1 -AdminPassword "admin123" -DriverPassword "driver123" -RestaurantPassword "restaurant123"`

4. **Ergebnis:** Am Ende steht **PASS** (grün) oder **FAIL** (rot) plus Tabelle; bei FAIL zeigt die Meldung den ersten fehlgeschlagenen Schritt.
