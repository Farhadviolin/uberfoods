# ✅ Frontend-Backend Integration - Setup & Test

**Datum:** 2025-01-27  
**Status:** ✅ **Integration vorbereitet**

---

## 🎯 Integration-Status

### ✅ Backend
- **Status:** ✅ Läuft auf Port 3000
- **Health Check:** ✅ "connected"
- **API-Endpunkte:** ✅ Alle funktionsfähig
- **Authentifizierung:** ✅ Aktiv

### ✅ Frontend
- **Pfad:** `frontend/admin-panel`
- **Vite Proxy:** ✅ Konfiguriert
- **API Base URL:** `/api` (wird zu `http://localhost:3000` weitergeleitet)

---

## 🔐 Admin-Login

### Standard-Credentials

Nach dem Ausführen von `npm run prisma:seed-admin`:

```json
{
  "email": "admin@uberfoods.com",
  "password": "Admin123!"
}
```

### Login-Endpunkt

```bash
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "admin@uberfoods.com",
  "password": "Admin123!"
}
```

### Response

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "email": "admin@uberfoods.com",
    "role": "admin"
  }
}
```

---

## 🔧 Frontend-Backend Verbindung

### Vite Proxy Konfiguration

Die `vite.config.ts` leitet alle `/api` Requests an das Backend weiter:

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
    },
  },
}
```

### Frontend API-Konfiguration

Das Frontend verwendet `/api` als baseURL:

```typescript
const api = axios.create({
  baseURL: '/api',  // Vite-Proxy leitet an http://localhost:3000 weiter
  timeout: 30000,
});
```

### Token-Verwaltung

Das Frontend speichert den Token in `localStorage`:

```typescript
localStorage.setItem('admin_token', token);
```

Der Token wird automatisch in allen Requests mitgesendet:

```typescript
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

---

## 🚀 Frontend starten

### 1. Frontend-Verzeichnis wechseln
```bash
cd frontend/admin-panel
```

### 2. Dependencies installieren (falls noch nicht geschehen)
```bash
npm install
```

### 3. Frontend starten
```bash
npm run dev
```

Das Frontend läuft dann auf `http://localhost:5173` (oder einem anderen Port, den Vite zuweist).

---

## ✅ Integration testen

### 1. Backend Health Check
```bash
curl http://localhost:3000/api/health
```

### 2. Admin-Login testen
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@uberfoods.com","password":"Admin123!"}'
```

### 3. API-Endpunkt mit Token testen
```bash
TOKEN="dein_token_hier"
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/admin/users
```

### 4. Frontend öffnen
1. Öffne `http://localhost:5173` im Browser
2. Logge dich mit `admin@uberfoods.com` / `Admin123!` ein
3. Alle API-Endpunkte sollten jetzt funktionieren

---

## 🔍 Troubleshooting

### Problem: 401 Unauthorized
**Lösung:** 
- Stelle sicher, dass du eingeloggt bist
- Prüfe, ob der Token in `localStorage` gespeichert ist
- Prüfe, ob der Token noch gültig ist (nicht abgelaufen)

### Problem: CORS-Fehler
**Lösung:**
- Vite-Proxy sollte automatisch CORS-Probleme lösen
- Prüfe, ob `vite.config.ts` korrekt konfiguriert ist
- Prüfe Backend CORS-Konfiguration in `main.ts`

### Problem: Connection Refused
**Lösung:**
- Stelle sicher, dass Backend auf Port 3000 läuft
- Prüfe Backend-Logs: `cd backend && tail -f logs/combined.log`
- Prüfe Health Check: `curl http://localhost:3000/api/health`

### Problem: Frontend lädt nicht
**Lösung:**
- Prüfe, ob Frontend-Dependencies installiert sind: `npm install`
- Prüfe Frontend-Logs in der Browser-Konsole
- Prüfe, ob Vite-Server läuft: `ps aux | grep vite`

---

## 📝 Nächste Schritte

1. ✅ Admin-User erstellen (falls noch nicht geschehen)
2. ✅ Frontend starten
3. ✅ Login testen
4. ✅ API-Endpunkte im Frontend testen
5. ✅ Dashboard-Daten anzeigen
6. ✅ CRUD-Operationen testen

---

**Status:** ✅ **Frontend-Backend Integration: Vorbereitet!**

**Bereit für Testing!** 🚀

