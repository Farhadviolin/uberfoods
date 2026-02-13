# 💡 Usage Examples - Neue Komponenten

**Datum:** 2025-12-09  
**Status:** ✅ Vollständige Beispiele

---

## 📋 Übersicht

Dieses Dokument enthält praktische Beispiele für die Verwendung der neuen Komponenten.

---

## 1. 🏃 WearablesManagement

### Beispiel: Gerät verbinden

```tsx
// Komponente ist bereits in App.tsx integriert
// Zugriff über Sidebar → "Personen" → "Wearables"

// Workflow:
// 1. Driver aus Dropdown auswählen
// 2. Provider eingeben (fitbit, garmin, apple)
// 3. Auth Token eingeben
// 4. "Verbinden" klicken
```

### API-Call Beispiel

```typescript
// Manueller API-Call (falls nötig)
const connectWearable = async (driverId: string, provider: string, token: string) => {
  try {
    const response = await api.post(`/drivers/${driverId}/wearables/connect`, {
      provider,
      authToken: token,
    });
    console.log('Gerät verbunden:', response.data);
  } catch (error) {
    console.error('Fehler:', error);
  }
};
```

---

## 2. 🚗 VehicleDiagnosticsManagement

### Beispiel: OBD-II verbinden

```tsx
// Komponente ist bereits in App.tsx integriert
// Zugriff über Sidebar → "Personen" → "Vehicle Diagnostics"

// Workflow:
// 1. Driver aus Dropdown auswählen
// 2. OBD-II Device ID eingeben
// 3. "Verbinden" klicken
// 4. Echtzeit-Diagnosen werden angezeigt
```

### API-Call Beispiel

```typescript
// Echtzeit-Diagnosen abrufen
const getDiagnostics = async (driverId: string) => {
  try {
    const response = await api.get(`/drivers/${driverId}/vehicle/diagnostics/real-time`);
    console.log('Diagnosen:', response.data);
    // { speed: 60, fuelLevel: 75, batteryHealth: 90 }
  } catch (error) {
    console.error('Fehler:', error);
  }
};
```

---

## 3. 📱 SocialManagement

### Beispiel: Post erstellen

```tsx
// Komponente ist bereits in App.tsx integriert
// Zugriff über Sidebar → "Marketing & Support" → "Social"

// Workflow:
// 1. Text in Textarea eingeben
// 2. "Posten" klicken
// 3. Post erscheint im Feed
```

### API-Call Beispiel

```typescript
// Post erstellen
const createPost = async (content: string) => {
  try {
    const response = await api.post('/social/posts', { content });
    console.log('Post erstellt:', response.data);
  } catch (error) {
    console.error('Fehler:', error);
  }
};

// Post liken
const likePost = async (postId: string) => {
  try {
    const response = await api.post(`/social/posts/${postId}/like`, {});
    console.log('Post geliked:', response.data);
  } catch (error) {
    console.error('Fehler:', error);
  }
};

// Kommentar hinzufügen
const addComment = async (postId: string, message: string) => {
  try {
    const response = await api.post(`/social/posts/${postId}/comments`, { message });
    console.log('Kommentar hinzugefügt:', response.data);
  } catch (error) {
    console.error('Fehler:', error);
  }
};
```

---

## 4. 🪑 TableManagement

### Beispiel: Tisch anlegen

```tsx
// Komponente ist bereits in App.tsx integriert
// Zugriff über Sidebar → "Betrieb" → "Table Management"

// Workflow:
// 1. Restaurant aus Dropdown auswählen
// 2. Tisch-Name eingeben
// 3. Kapazität eingeben
// 4. "Anlegen" klicken
```

### API-Call Beispiel

```typescript
// Tisch anlegen
const createTable = async (restaurantId: string, name: string, capacity: number) => {
  try {
    const response = await api.post('/tables', {
      name,
      capacity,
      restaurantId,
    });
    console.log('Tisch angelegt:', response.data);
  } catch (error) {
    console.error('Fehler:', error);
  }
};

// Reservierung anlegen
const createReservation = async (
  restaurantId: string,
  tableId: string,
  customerName: string,
  time: string
) => {
  try {
    const response = await api.post('/reservations', {
      restaurantId,
      tableId,
      customerName,
      time,
      notes: 'Window seat',
    });
    console.log('Reservierung angelegt:', response.data);
  } catch (error) {
    console.error('Fehler:', error);
  }
};
```

---

## 5. 👨‍🍳 KitchenDisplayAdmin

### Beispiel: Item-Status aktualisieren

```tsx
// Komponente ist bereits in App.tsx integriert
// Zugriff über Sidebar → "Betrieb" → "Kitchen Display"

// Workflow:
// 1. Restaurant aus Dropdown auswählen
// 2. Bestellung aus Liste auswählen
// 3. Item-Status ändern (preparing → ready → served)
```

### API-Call Beispiel

```typescript
// Item-Status aktualisieren
const updateItemStatus = async (itemId: string, status: string) => {
  try {
    const response = await api.post(`/kitchen-display/items/${itemId}/status`, {
      status, // 'preparing', 'ready', 'served'
    });
    console.log('Status aktualisiert:', response.data);
  } catch (error) {
    console.error('Fehler:', error);
  }
};

// Bestellungen mit Filter abrufen
const getOrders = async (restaurantId: string, status?: string) => {
  try {
    const response = await api.get(`/kitchen-display/restaurant/${restaurantId}/orders`, {
      params: { status }, // z.B. 'ready,served'
    });
    console.log('Bestellungen:', response.data);
  } catch (error) {
    console.error('Fehler:', error);
  }
};
```

---

## 6. 🍽️ MealPlannerManagement

### Beispiel: Meal Plan erstellen

```tsx
// Komponente ist bereits in App.tsx integriert
// Zugriff über Sidebar → "Betrieb" → "Meal Planner"

// Workflow:
// 1. Titel eingeben
// 2. Dish-IDs eingeben (comma-separated)
// 3. "Speichern" klicken
```

### API-Call Beispiel

```typescript
// Meal Plan erstellen
const createMealPlan = async (title: string, dishIds: string[]) => {
  try {
    const response = await api.post('/meal-planner/meals', {
      title,
      dishIds,
      notes: 'Optional notes',
    });
    console.log('Meal Plan erstellt:', response.data);
  } catch (error) {
    console.error('Fehler:', error);
  }
};

// Weekly Plan abrufen
const getWeeklyPlan = async (weekStart: string) => {
  try {
    const response = await api.get('/meal-planner/weekly', {
      params: { weekStart }, // '2025-01-06'
    });
    console.log('Weekly Plan:', response.data);
  } catch (error) {
    console.error('Fehler:', error);
  }
};

// Einkaufsliste generieren
const getShoppingList = async (startDate: string, endDate: string) => {
  try {
    const response = await api.get('/meal-planner/shopping-list', {
      params: { startDate, endDate },
    });
    console.log('Einkaufsliste:', response.data);
  } catch (error) {
    console.error('Fehler:', error);
  }
};
```

---

## 7. 👥 GroupOrderManagement

### Beispiel: Group Order erstellen

```tsx
// Komponente ist bereits in App.tsx integriert
// Zugriff über Sidebar → "Betrieb" → "Group Orders"

// Workflow:
// 1. Restaurant-ID eingeben
// 2. "Erstellen" klicken
// 3. Group Order Code wird generiert
```

### API-Call Beispiel

```typescript
// Group Order erstellen
const createGroupOrder = async (restaurantId: string) => {
  try {
    const response = await api.post('/group-orders', {
      restaurantId,
    });
    console.log('Group Order erstellt:', response.data);
    // { id: 'group-1', code: 'ABC123', ... }
  } catch (error) {
    console.error('Fehler:', error);
  }
};

// Group Order per Code laden
const getGroupOrder = async (code: string) => {
  try {
    const response = await api.get(`/group-orders/${code}`);
    console.log('Group Order:', response.data);
  } catch (error) {
    console.error('Fehler:', error);
  }
};

// Expiration setzen
const setExpiration = async (orderId: string, expiresAt: string) => {
  try {
    const response = await api.put(`/group-orders/${orderId}/expiration`, {
      expiresAt, // ISO-Datum
    });
    console.log('Expiration gesetzt:', response.data);
  } catch (error) {
    console.error('Fehler:', error);
  }
};
```

---

## 8. 📊 StatisticsCenter

### Beispiel: Statistiken abrufen

```tsx
// Komponente ist bereits in App.tsx integriert
// Zugriff über Sidebar → "Übersicht" → "Statistics"

// Workflow:
// 1. Period auswählen (week, month, year)
// 2. Statistiken werden automatisch geladen
// 3. "Neu laden" für Refresh
```

### API-Call Beispiel

```typescript
// Dashboard-Statistiken
const getDashboardStats = async (period: string = '7d') => {
  try {
    const response = await api.get('/statistics/dashboard', {
      params: { period },
    });
    console.log('Dashboard Stats:', response.data);
  } catch (error) {
    console.error('Fehler:', error);
  }
};

// Revenue-Statistiken
const getRevenueStats = async (period: string = '7d') => {
  try {
    const response = await api.get('/statistics/revenue', {
      params: { period },
    });
    console.log('Revenue Stats:', response.data);
  } catch (error) {
    console.error('Fehler:', error);
  }
};

// Top Restaurants
const getTopRestaurants = async (period: string = '7d') => {
  try {
    const response = await api.get('/statistics/top-restaurants', {
      params: { period },
    });
    console.log('Top Restaurants:', response.data);
  } catch (error) {
    console.error('Fehler:', error);
  }
};
```

---

## 9. 🚚 SupplierManagement

### Beispiel: Lieferant anlegen

```tsx
// Komponente ist bereits in App.tsx integriert
// Zugriff über Sidebar → "Betrieb" → "Suppliers"

// Workflow:
// 1. Restaurant aus Dropdown auswählen
// 2. Lieferant-Name eingeben
// 3. Kontakt-Email eingeben
// 4. "Speichern" klicken
```

### API-Call Beispiel

```typescript
// Lieferant anlegen
const createSupplier = async (
  restaurantId: string,
  name: string,
  contactEmail: string,
  contactPhone: string
) => {
  try {
    const response = await api.post('/suppliers', {
      name,
      contactEmail,
      contactPhone,
      restaurantId,
    });
    console.log('Lieferant angelegt:', response.data);
  } catch (error) {
    console.error('Fehler:', error);
  }
};

// Supplier Order erstellen
const createSupplierOrder = async (restaurantId: string, supplierId: string, notes: string) => {
  try {
    const response = await api.post('/supplier-orders', {
      restaurantId,
      supplierId,
      notes,
    });
    console.log('Supplier Order erstellt:', response.data);
  } catch (error) {
    console.error('Fehler:', error);
  }
};
```

---

## 🔧 Custom Hook Beispiel

### Eigener Hook für Wearables

```typescript
// hooks/useWearables.ts
import { useState, useEffect } from 'react';
import api from '../utils/api';

export function useWearables(driverId: string | null) {
  const [devices, setDevices] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!driverId) return;

    const load = async () => {
      setLoading(true);
      try {
        const [devicesRes, healthRes] = await Promise.all([
          api.get(`/drivers/${driverId}/wearables/devices`),
          api.get(`/drivers/${driverId}/wearables/health`),
        ]);
        setDevices(devicesRes.data || []);
        setHealth(healthRes.data || null);
      } catch (error) {
        console.error('Fehler beim Laden:', error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [driverId]);

  return { devices, health, loading };
}
```

---

## 🎨 Custom Component Beispiel

### Eigene Komponente mit API-Integration

```tsx
// components/CustomWearablesView.tsx
import { useWearables } from '../hooks/useWearables';
import { LoadingSpinner } from './LoadingSpinner';

export function CustomWearablesView({ driverId }: { driverId: string }) {
  const { devices, health, loading } = useWearables(driverId);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <h2>Wearable Devices</h2>
      {devices.map((device: any) => (
        <div key={device.provider}>
          <p>{device.provider} - {device.status}</p>
        </div>
      ))}
      
      {health && (
        <div>
          <h3>Health Data</h3>
          <p>Heart Rate: {health.heartRate}</p>
          <p>Steps: {health.steps}</p>
        </div>
      )}
    </div>
  );
}
```

---

## 🚀 Best Practices

### 1. Error Handling

```typescript
try {
  const response = await api.post('/endpoint', data);
  // Success handling
} catch (error) {
  // Verwende extractErrorMessage für User-freundliche Fehler
  const message = extractErrorMessage(error);
  showToast(message, 'error');
}
```

### 2. Loading States

```tsx
const [loading, setLoading] = useState(false);

const handleAction = async () => {
  setLoading(true);
  try {
    await api.post('/endpoint', data);
  } finally {
    setLoading(false);
  }
};
```

### 3. Optimistic Updates

```typescript
// UI sofort aktualisieren, dann API-Call
setLocalState(newValue);
try {
  await api.put('/endpoint', newValue);
} catch (error) {
  // Rollback bei Fehler
  setLocalState(oldValue);
  showToast('Fehler beim Speichern', 'error');
}
```

---

**Letzte Aktualisierung:** 2025-12-09
