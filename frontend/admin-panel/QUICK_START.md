# ⚡ Quick Start - Admin Panel Localhost

**Schnellstart-Anleitung für lokale Entwicklung**

---

## 🚀 In 3 Schritten zum laufenden Admin Panel

### 1️⃣ Backend starten

```bash
cd backend
npm run start:dev
```

**Prüfe:** Backend läuft auf http://localhost:3000

---

### 2️⃣ Admin Panel Setup (einmalig)

```bash
cd frontend/admin-panel
./setup-localhost.sh
```

**Oder manuell:**
```bash
npm install
# .env Datei ist bereits erstellt
```

---

### 3️⃣ Admin Panel starten

```bash
npm run dev
```

**Öffne:** http://localhost:3002

---

## 🔐 Login

**Standard-Login:**
- Email: `admin@uberfoods.com`
- Passwort: `admin123`

**Auto-Login (Development):**
- Mit `VITE_SKIP_AUTH=true` in `.env` → Automatischer Login
- Kein Passwort nötig

---

## ✅ Checkliste

- [ ] Backend läuft auf Port 3000
- [ ] `.env` Datei existiert
- [ ] Dependencies installiert (`npm install`)
- [ ] Admin Panel startet ohne Fehler

---

## 🆘 Probleme?

**Backend läuft nicht:**
```bash
cd backend
npm install
npm run start:dev
```

**Port 3002 belegt:**
```bash
lsof -ti:3002 | xargs kill -9
```

**CORS-Fehler:**
- Prüfe Backend `.env` enthält `ALLOWED_ORIGINS=http://localhost:3002`

---

**Detaillierte Anleitung:** Siehe [LOCALHOST_SETUP.md](./LOCALHOST_SETUP.md)

