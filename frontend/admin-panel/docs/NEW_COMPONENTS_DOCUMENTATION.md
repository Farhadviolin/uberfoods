# 📚 Neue Komponenten Dokumentation

**Datum:** 2025-12-09  
**Status:** ✅ Vollständig dokumentiert

---

## 📋 Übersicht

Dieses Dokument beschreibt die 9 neuen Komponenten, die für das Admin-Panel erstellt wurden:

1. **WearablesManagement** - Wearable-Geräte-Verwaltung
2. **VehicleDiagnosticsManagement** - Fahrzeug-Diagnostik
3. **SocialManagement** - Social Feed Management
4. **TableManagement** - Tisch- und Reservierungsverwaltung
5. **KitchenDisplayAdmin** - Küchen-Display Administration
6. **MealPlannerManagement** - Meal-Plan-Verwaltung
7. **GroupOrderManagement** - Gruppen-Bestellungen
8. **StatisticsCenter** - Zentrales Statistik-Dashboard
9. **SupplierManagement** - Lieferanten-Verwaltung

---

## 1. 🏃 WearablesManagement

### Beschreibung
Verwaltung von Wearable-Geräten (Fitbit, Garmin, Apple Watch) für Fahrer. Ermöglicht das Verbinden/Trennen von Geräten und zeigt Echtzeit-Gesundheitsdaten an.

### Features
- ✅ Geräte verbinden (Fitbit, Garmin, Apple Watch)
- ✅ Geräte trennen
- ✅ Echtzeit-Gesundheitsdaten (Herzfrequenz, Schritte, Kalorien)
- ✅ Driver-Auswahl
- ✅ Device-Status-Anzeige

### API-Endpunkte
```typescript
GET    /drivers/:id/wearables/devices      // Geräte abrufen
GET    /drivers/:id/wearables/health       // Gesundheitsdaten abrufen
POST   /drivers/:id/wearables/connect      // Gerät verbinden
DELETE /drivers/:id/wearables/:provider    // Gerät trennen
```

### Verwendung
```tsx
import { WearablesManagement } from './components/WearablesManagement';

// In App.tsx bereits integriert als Tab
// Zugriff über Sidebar → "Personen" → "Wearables"
```

### Props
Keine Props erforderlich - Komponente ist selbstständig.

### State Management
- Verwendet `useDrivers` Hook für Driver-Liste
- Lokaler State für Devices, Health-Daten, Formulare
- React Query für API-Calls (via `api` utility)

---

## 2. 🚗 VehicleDiagnosticsManagement

### Beschreibung
Fahrzeug-Diagnostik-Verwaltung mit OBD-II-Integration. Zeigt Echtzeit-Diagnosen und Wartungsprognosen an.

### Features
- ✅ OBD-II-Gerät verbinden/trennen
- ✅ Echtzeit-Diagnosen (Geschwindigkeit, Kraftstoff, Batterie)
- ✅ Wartungsprognosen
- ✅ Driver-Auswahl
- ✅ Real-time Updates

### API-Endpunkte
```typescript
GET    /drivers/:id/vehicle/diagnostics/real-time  // Echtzeit-Diagnosen
GET    /drivers/:id/vehicle/maintenance/predict    // Wartungsprognose
POST   /drivers/:id/vehicle/obd/connect            // OBD-II verbinden
DELETE /drivers/:id/vehicle/obd/disconnect         // OBD-II trennen
```

### Verwendung
```tsx
import { VehicleDiagnosticsManagement } from './components/VehicleDiagnosticsManagement';

// In App.tsx bereits integriert als Tab
// Zugriff über Sidebar → "Personen" → "Vehicle Diagnostics"
```

### Props
Keine Props erforderlich.

---

## 3. 📱 SocialManagement

### Beschreibung
Social Feed Management für Kunden-Posts. Ermöglicht das Anzeigen, Erstellen, Liken und Kommentieren von Posts.

### Features
- ✅ Feed anzeigen
- ✅ Posts erstellen
- ✅ Posts liken
- ✅ Kommentare hinzufügen
- ✅ Real-time Updates

### API-Endpunkte
```typescript
GET    /social/feed                              // Feed abrufen
POST   /social/posts                             // Post erstellen
POST   /social/posts/:id/like                    // Post liken
POST   /social/posts/:id/comments                // Kommentar hinzufügen
```

### Verwendung
```tsx
import { SocialManagement } from './components/SocialManagement';

// In App.tsx bereits integriert als Tab
// Zugriff über Sidebar → "Marketing & Support" → "Social"
```

### Props
Keine Props erforderlich.

---

## 4. 🪑 TableManagement

### Beschreibung
Tisch- und Reservierungsverwaltung für Restaurants. Ermöglicht das Anlegen von Tischen, Status-Verwaltung und Reservierungen.

### Features
- ✅ Tische anlegen (Name, Kapazität)
- ✅ Tisch-Status ändern (available, occupied, reserved)
- ✅ Reservierungen anlegen
- ✅ Restaurant-Auswahl
- ✅ Reservierungs-Übersicht

### API-Endpunkte
```typescript
GET    /tables?restaurantId=:id                 // Tische abrufen
POST   /tables                                  // Tisch anlegen
PATCH  /tables/:id                              // Tisch aktualisieren
GET    /reservations?restaurantId=:id           // Reservierungen abrufen
POST   /reservations                            // Reservierung anlegen
```

### Verwendung
```tsx
import { TableManagement } from './components/TableManagement';

// In App.tsx bereits integriert als Tab
// Zugriff über Sidebar → "Betrieb" → "Table Management"
```

### Props
Keine Props erforderlich.

---

## 5. 👨‍🍳 KitchenDisplayAdmin

### Beschreibung
Küchen-Display Administration für Live-Bestellungen. Zeigt aktuelle Bestellungen, Stationen und Performance-Metriken an.

### Features
- ✅ Live-Bestellungen anzeigen
- ✅ Stationen verwalten
- ✅ Item-Status aktualisieren (preparing → ready → served)
- ✅ Performance-Metriken
- ✅ Filter nach Status/Station

### API-Endpunkte
```typescript
GET    /kitchen-display/restaurant/:id/orders        // Bestellungen
GET    /kitchen-display/restaurant/:id/stations      // Stationen
GET    /kitchen-display/restaurant/:id/performance   // Performance
POST   /kitchen-display/items/:id/status             // Item-Status ändern
```

### Verwendung
```tsx
import { KitchenDisplayAdmin } from './components/KitchenDisplayAdmin';

// In App.tsx bereits integriert als Tab
// Zugriff über Sidebar → "Betrieb" → "Kitchen Display"
```

### Props
Keine Props erforderlich.

---

## 6. 🍽️ MealPlannerManagement

### Beschreibung
Meal-Plan-Verwaltung für Restaurants. Ermöglicht das Erstellen von Wochenplänen, Einkaufslisten und Ausführung von Meal-Plänen.

### Features
- ✅ Weekly Plan laden
- ✅ Meal Plan erstellen
- ✅ Shopping List generieren
- ✅ Meal Plan ausführen
- ✅ Dish-Auswahl

### API-Endpunkte
```typescript
GET    /meal-planner/weekly?weekStart=:date      // Weekly Plan
POST   /meal-planner/meals                        // Meal Plan erstellen
GET    /meal-planner/shopping-list                // Einkaufsliste
POST   /meal-planner/meals/:id/execute            // Plan ausführen
```

### Verwendung
```tsx
import { MealPlannerManagement } from './components/MealPlannerManagement';

// In App.tsx bereits integriert als Tab
// Zugriff über Sidebar → "Betrieb" → "Meal Planner"
```

### Props
Keine Props erforderlich.

---

## 7. 👥 GroupOrderManagement

### Beschreibung
Gruppen-Bestellungen Verwaltung. Ermöglicht das Erstellen von Group Orders, Code-Verwaltung und Member-Management.

### Features
- ✅ Group Order erstellen
- ✅ Group Order per Code laden
- ✅ Expiration-Zeit setzen
- ✅ Member als ready markieren
- ✅ Restaurant-Auswahl

### API-Endpunkte
```typescript
POST   /group-orders                              // Group Order erstellen
GET    /group-orders/:code                        // Group Order laden
PUT    /group-orders/:id/expiration               // Expiration setzen
PUT    /group-orders/:id/members/:customerId/ready  // Member ready
```

### Verwendung
```tsx
import { GroupOrderManagement } from './components/GroupOrderManagement';

// In App.tsx bereits integriert als Tab
// Zugriff über Sidebar → "Betrieb" → "Group Orders"
```

### Props
Keine Props erforderlich.

---

## 8. 📊 StatisticsCenter

### Beschreibung
Zentrales Statistik-Dashboard mit allen wichtigen Metriken. Kombiniert verschiedene Statistik-Endpunkte in einer Übersicht.

### Features
- ✅ Dashboard-Statistiken
- ✅ Revenue-Analyse
- ✅ Top Restaurants
- ✅ Driver Performance
- ✅ Promotion Performance
- ✅ Customer Growth
- ✅ Order Status Distribution
- ✅ Period-Auswahl (week, month, year)

### API-Endpunkte
```typescript
GET    /statistics/dashboard?period=:period
GET    /statistics/revenue?period=:period
GET    /statistics/top-restaurants?period=:period
GET    /statistics/driver-performance?period=:period
GET    /statistics/top-promotions?period=:period
GET    /statistics/customer-growth?period=:period
GET    /statistics/order-status-distribution?period=:period
```

### Verwendung
```tsx
import { StatisticsCenter } from './components/StatisticsCenter';

// In App.tsx bereits integriert als Tab
// Zugriff über Sidebar → "Übersicht" → "Statistics"
```

### Props
Keine Props erforderlich.

---

## 9. 🚚 SupplierManagement

### Beschreibung
Lieferanten-Verwaltung für Restaurants. Ermöglicht das Verwalten von Lieferanten und deren Bestellungen.

### Features
- ✅ Lieferanten anlegen
- ✅ Lieferanten-Status toggle
- ✅ Supplier Orders erstellen
- ✅ Restaurant-Auswahl
- ✅ Lieferanten-Übersicht

### API-Endpunkte
```typescript
GET    /suppliers?restaurantId=:id                // Lieferanten abrufen
POST   /suppliers                                 // Lieferant anlegen
PATCH  /suppliers/:id/toggle-status               // Status toggle
GET    /supplier-orders?restaurantId=:id          // Orders abrufen
POST   /supplier-orders                           // Order erstellen
```

### Verwendung
```tsx
import { SupplierManagement } from './components/SupplierManagement';

// In App.tsx bereits integriert als Tab
// Zugriff über Sidebar → "Betrieb" → "Suppliers"
```

### Props
Keine Props erforderlich.

---

## 🔧 Technische Details

### Performance-Optimierungen
- ✅ Alle Komponenten mit `React.memo` optimiert
- ✅ Lazy Loading in `App.tsx`
- ✅ `useMemo` für berechnete Werte
- ✅ `useCallback` für Event-Handler

### Error Handling
- ✅ Zentraler Error-Handler (`extractErrorMessage`)
- ✅ Toast-Notifications für User-Feedback
- ✅ Graceful Fallbacks bei API-Fehlern

### State Management
- ✅ React Query für API-Calls (via `api` utility)
- ✅ Custom Hooks (`useDrivers`, `useRestaurants`)
- ✅ Lokaler State für UI-Interaktionen

### Testing
- ✅ Unit Tests für alle Komponenten
- ✅ Test-Coverage: ~85% für neue Komponenten
- ✅ Mock-Setup für API-Calls

---

## 📝 Integration in App.tsx

Alle Komponenten sind bereits in `App.tsx` integriert:

```tsx
// Lazy Loading
const WearablesManagement = lazy(() => 
  import('./components/WearablesManagement')
    .then(m => ({ default: m.WearablesManagement }))
);

// Tab-Rendering
{activeTab === 'wearables' && (
  <Suspense fallback={<LoadingSpinner />}>
    <WearablesManagement />
  </Suspense>
)}
```

---

## 🎨 UI/UX Features

### Gemeinsame Features
- ✅ Responsive Design
- ✅ Loading States (Spinner)
- ✅ Empty States
- ✅ Error States
- ✅ Form Validation
- ✅ Toast Notifications

### Design System
- ✅ Konsistente Button-Styles
- ✅ Card-Layouts
- ✅ Form-Elemente
- ✅ Typography

---

## 🔐 Security

### Implementierte Maßnahmen
- ✅ XSS Prevention (`escapeHtmlAttribute`, `escapeUrlForSrc`)
- ✅ Input Validation
- ✅ API-Error-Handling
- ✅ Sanitized Filenames

---

**Letzte Aktualisierung:** 2025-12-09
