# 🧠 Mega-Analyse Admin-Panel · Customer-Web · Driver-App · Restaurant-Web

Status-Update und Handlungsempfehlungen für alle vier Kern-Frontends inkl. Zuordnung der 300 fehlenden Backend-Bausteine.

---

## 1. Admin-Panel (`frontend/admin-panel`)
- Quelle: `frontend/admin-panel/API_ENDPOINT_ANALYSE.md`
- 178 Frontend-Aufrufe → 178 produktive Backend-Endpunkte (NestJS). Einziger Konflikt (Order-Priority Enum) bereits behoben.
- Optional markierte Analytics-Routen liefern bei Ausfällen Fallbacks → keine Blocker.

**Empfehlungen**
1. Regression- & Integrationstests für kritische Flows (Orders, Financial, Accounting) ergänzen.
2. Monitoring-Endpunkte (`/api/monitoring/*`) mit synthetischen Checks absichern, damit Fallbacks nicht unbemerkt aktiv bleiben.

---

## 2. Customer-Web (`frontend/customer-web`)
- Basis-Workflows (Auth, Restaurants, Orders, Payments, Favorites) sind vollständig angebunden.
- Premium-Features laufen auf Mock/Fallback, da die im Dokument `frontend/customer-web/BACKEND_ENDPOINTS_REQUIRED.md` gelisteten Endpunkte fehlen.
- `backend/MISSING_BACKEND_FEATURES.md` beschreibt exakt **300** fehlende Artefakte (REST, WebSocket, Background-Jobs, Prisma-Schema, Tests, Observability) für diese Features.

**P0-Gaps (Blocker)**
1. Delivery-Fee-Location-Fix (präzise Gebühren & ETA).
2. Meal-Planner-Backend (Planung + Checkout).

**P1-Gaps (Premium)**
- Social Food Network, Group Ordering, Predictive Delivery, Nutrition Tracker.

**P2-Gaps (Nice-to-have)**
- Personalized Chef, Gamification, Predictive Ordering, Expense Analytics.

**Empfehlungen**
1. Vertikale Umsetzung je Feature (Schema → Controller → Background Jobs → Observability) statt Single-Endpoints, um das 300er-Backlog effizient abzubauen.
2. Contract-Tests + vereinheitlichte Error-Struktur (`{ message, code }`) bereits jetzt implementieren, damit Frontend-Fallbacks entfernt werden können.
3. Für WebSockets Rooms (`live-orders`, `group-orders/:id`) direkt Socket.IO-Namespace + Replay-Puffer bauen, sonst laufen die Live-Widgets ins Leere.

---

## 3. Driver-App (`frontend/driver-app`)
- Quelle: `frontend/driver-app/BACKEND_ENDPOINTS.md`
- Alle kritischen Endpunkte (Auth, Orders, Geofencing, Earnings, Routing, Chat, Dokumente, Foto-Upload, Gamification, Subscriptions) existieren produktiv.
- Fallbacks (Geofencing-Haversine, lokale Route-Optimierung) sind nur für Dev/Test vorgesehen.

**Empfehlungen**
1. TomTom Traffic API (Vorbereitung vorhanden) produktiv schalten, falls `VITE_TOMTOM_API_KEY` gesetzt ist, um ETA/TSP weiter zu verbessern.
2. Observability erweitern: Telemetrie für Route-Optimierung & KI-Akzeptanzquote im Backend prominenter auswerten (Prometheus/Grafana).

---

## 4. Restaurant-Web (`frontend/restaurant-web`)
- Echtbetrieb via `src/utils/api.ts` (Axios, `/api`, Auth-Token). DEV-Fallback unterdrückt 401-Redirects → Auth-Fehler bleiben unentdeckt.
- Umfangreicher Order-Stack (`src/hooks/useOrders.ts`) fordert >20 Routen (Timeline, Notes CRUD, Refunds, Delay, Proof, Customer Insights, Call/SMS, Payment/Tip, Bulk Status). Vergleichbare Tiefe existiert für Inventory, Finance, Reviews etc., allerdings ohne dokumentierte Backend-Audit-Datei.

**Empfehlungen**
1. Neues Dokument `frontend/restaurant-web/API_ENDPOINT_AUDIT.md` aufsetzen (analog zum Admin-Panel), um jede Frontend-Funktion einem Backend-Controller zuzuordnen.
2. DEV-Authorization-Fallback abschalten und 401-Redirect wieder aktivieren, sobald das Audit grünes Licht gibt – sonst bleiben Token-Probleme unsichtbar.
3. Für kritische Mutations (Order Status, Delay, Notes) Optimistic Locking + Version-Conflicts serverseitig validieren (Frontend liefert `version` bereits mit).

---

## 5. Zuordnung „300 fehlende Backend-Bausteine“
- Dokument `backend/MISSING_BACKEND_FEATURES.md` listet 30 Feature-Domänen × 10 Artefakte = 300 Items.
- Diese decken sich mit den Mock-Bereichen der Customer-Web-App (Intelligente Suche, Social Feed, Live Social Ordering, Predictive Delivery, Group Orders, Nutrition, Personalized Chef, Gamification, Predictive Ordering, Expense Analytics, Delivery Fee, Loyalty, Chat+, Voice, Image Intelligence, Driver Ops Insights, Forecasting, Inventory 2.0, Sustainability, Security/RBAC, Monitoring & Alerts, Notifications, Localization, Payments 2.0, Compliance/GDPR, AI Explainability, Data Sync, Experimentation, Partner-Integrationen).
- Priorisierung: zuerst P0+P1 Features produktionsreif machen, dann restliche Items nach Business Value abarbeiten.

---

## 6. Zusätzliche Empfehlungen
1. **Roadmap-Board**: Die 300 Items in Jira/Linear importieren, gruppiert nach Feature-Domänen, damit Fortschritt visibel wird.
2. **Feature Flags**: Für Customer-Web Premium-Module Flags einführen; sobald Backend live ist, kann Frontend toggeln, ohne Deploys abzuwarten.
3. **Schema Registry**: Gemeinsames Zod/OpenAPI-Schema-Paket erstellen, das alle Frontends konsumieren ⇒ verhindert Divergenzen zwischen Admin/Restaurant/Customer.
4. **Observability-Paket**: Einheitliche Dashboards (Latency, Error-Rate, WS-Clients) pro Feature-Domäne, damit Fallback-Aktivierungen sofort auffallen.
5. **Security Review**: Nach Entfernung der DEV-Auth-Fallbacks Penetration-Tests fahren (insbesondere Restaurant-Web & Customer-Web Social Features).

---

### Fazit
| App            | Backend-Abdeckung | Blocker | Dringende Schritte |
|----------------|-------------------|---------|--------------------|
| Admin-Panel    | 100% (178/178)    | Keine   | Tests & Monitoring härten |
| Customer-Web   | Basis fertig, Premium fehlt | 300 Artefakte | P0 Delivery Fee & Meal Planner zuerst liefern |
| Driver-App     | 100%              | Keine   | Traffic/Observability erweitern |
| Restaurant-Web | Großteils vorhanden, aber un-auditiert | Auth-Fallback kaschiert Bugs | Endpoint-Audit + Auth-Härtung |

Mit diesem Plan lassen sich die offenen Premium-Features strukturiert schließen, ohne die bereits produktiven Flows zu gefährden.


