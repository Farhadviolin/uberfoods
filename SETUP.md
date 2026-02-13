# 🚀 Setup-Anleitung für UberFoods

## Schritt-für-Schritt Installation

### 1. Voraussetzungen prüfen

Stellen Sie sicher, dass Sie haben:
- Node.js 18+ installiert
- Docker & Docker Compose installiert
- npm oder yarn installiert

### 2. Datenbank starten

```bash
docker-compose up -d
```

Warten Sie ca. 10 Sekunden, bis PostgreSQL bereit ist.

### 3. Backend einrichten

```bash
cd backend

# Dependencies installieren
npm install

# .env Datei erstellen
cat > .env << EOF
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/UberFood_food?schema=public"
PORT=3000
UPLOAD_DIR="./uploads"
EOF

# Prisma Client generieren
npm run prisma:generate

# Datenbank-Migrationen ausführen
npm run prisma:migrate

# Seed-Daten einfügen (optional, aber empfohlen)
npm run prisma:seed

# Backend starten
npm run start:dev
```

Das Backend sollte jetzt auf `http://localhost:3000` laufen.

### 4. Frontend-Apps starten

Öffnen Sie **4 separate Terminal-Fenster**:

#### Terminal 1 - Kunden Web
```bash
cd frontend/customer-web
npm install
npm run dev
```
→ Läuft auf `http://localhost:3001`

#### Terminal 2 - Admin Panel
```bash
cd frontend/admin-panel
npm install
npm run dev
```
→ Läuft auf `http://localhost:3002`

#### Terminal 3 - Restaurant Web
```bash
cd frontend/restaurant-web
npm install
npm run dev
```
→ Läuft auf `http://localhost:3003`

#### Terminal 4 - Fahrer App
```bash
cd frontend/driver-app
npm install
npm run dev
```
→ Läuft auf `http://localhost:3004`

## 🧪 Testen des Systems

### 1. Admin Panel verwenden
1. Öffnen Sie `http://localhost:3002`
2. Erstellen Sie ein neues Restaurant mit Bild
3. Erstellen Sie Gerichte für das Restaurant

### 2. Kunden Web testen
1. Öffnen Sie `http://localhost:3001`
2. Wählen Sie ein Restaurant aus
3. Fügen Sie Gerichte zum Warenkorb hinzu
4. Geben Sie eine Bestellung auf

### 3. Restaurant Web testen
1. Öffnen Sie `http://localhost:3003`
2. Sehen Sie die eingehenden Bestellungen
3. Aktualisieren Sie den Status (PREPARING → READY)

### 4. Fahrer App testen
1. Öffnen Sie `http://localhost:3004`
2. Sehen Sie zugewiesene Bestellungen
3. Aktualisieren Sie den Status (PICKED_UP → IN_TRANSIT → DELIVERED)

## 🔍 Prisma Studio (Datenbank-Viewer)

Um die Datenbank visuell zu betrachten:

```bash
cd backend
npm run prisma:studio
```

Öffnet einen Browser auf `http://localhost:5555`

## 🐛 Troubleshooting

### Problem: Datenbank-Verbindungsfehler
```bash
# Prüfen Sie, ob Docker läuft
docker ps

# Prüfen Sie die Logs
docker-compose logs postgres
```

### Problem: Port bereits belegt
Ändern Sie die Ports in den `vite.config.ts` Dateien der Frontend-Apps.

### Problem: Prisma-Fehler
```bash
cd backend
npm run prisma:generate
npm run prisma:migrate
```

### Problem: Bilder werden nicht angezeigt
Stellen Sie sicher, dass das Backend läuft und die Upload-Verzeichnisse existieren:
```bash
cd backend
mkdir -p uploads/restaurants uploads/dishes
```

## 📝 Wichtige Hinweise

- **Restaurant-ID und Fahrer-ID** sind aktuell hardcoded in den Frontend-Apps
  - Restaurant Web: `RESTAURANT_ID = 'restaurant-1'` in `App.tsx`
  - Fahrer App: `DRIVER_ID = 'driver-1'` in `App.tsx`
  
  Für Production sollten Sie diese aus der Authentifizierung beziehen.

- **Bilder** werden lokal im `backend/uploads/` Verzeichnis gespeichert
  - Für Production sollten Sie S3, Cloudinary oder ähnliche Services verwenden

- **Real-time Updates** erfolgen aktuell über Polling (alle 5 Sekunden)
  - Für Production sollten Sie WebSockets implementieren

## ✅ Checkliste für Production

- [ ] Authentifizierung implementieren (JWT)
- [ ] Restaurant-ID und Fahrer-ID aus Auth beziehen
- [ ] Bild-Upload zu Cloud-Service migrieren
- [ ] WebSockets für Real-time Updates
- [ ] Umgebungsvariablen für Production konfigurieren
- [ ] HTTPS aktivieren
- [ ] Rate Limiting implementieren
- [ ] Logging und Monitoring einrichten
- [ ] Tests schreiben
- [ ] CI/CD Pipeline einrichten

## 🎉 Fertig!

Ihr System sollte jetzt vollständig funktionieren. Viel Erfolg! 🚀

