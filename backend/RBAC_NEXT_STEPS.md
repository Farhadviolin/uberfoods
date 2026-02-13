# RBAC - Nächste Schritte

## ✅ Was wurde implementiert

Die vollständige RBAC-Implementierung ist abgeschlossen:

- ✅ **25+ Controller** mit Guards gesichert
- ✅ **30+ Permissions** definiert
- ✅ **4 Rollen** implementiert (SUPER_ADMIN, ADMIN, MODERATOR, SUPPORT)
- ✅ **Migration erstellt**: `20250128000000_add_moderator_support_roles`
- ✅ **Seed-Script erstellt**: `prisma/seed-rbac.ts`
- ✅ **Zentrale AdminRole Enum**: `src/common/enums/admin-role.enum.ts`
- ✅ **npm Script hinzugefügt**: `npm run prisma:seed-rbac`
- ✅ **Vollständige Dokumentation** erstellt

## 🚀 Setup-Anleitung

### Schritt 1: Dependencies installieren (falls nötig)

```bash
cd backend
npm install
```

### Schritt 2: Prisma Client generieren

```bash
cd backend
npx prisma generate
```

### Schritt 3: Datenbank-Migration ausführen

**Option A: Mit Prisma Migrate (empfohlen)**
```bash
cd backend
npx prisma migrate deploy
```

**Option B: Migration manuell prüfen**
Die Migration existiert bereits unter:
```
prisma/migrations/20250128000000_add_moderator_support_roles/migration.sql
```

Falls die Migration bereits ausgeführt wurde, können Sie diesen Schritt überspringen.

### Schritt 4: RBAC Seed-Daten ausführen

```bash
cd backend
npm run prisma:seed-rbac
```

Oder direkt:
```bash
cd backend
npx ts-node prisma/seed-rbac.ts
```

### Schritt 5: Verifikation

**Prüfen ob Permissions erstellt wurden:**
```bash
# Mit Prisma Studio
npx prisma studio

# Oder direkt in der Datenbank
# SELECT COUNT(*) FROM "Permission";
# SELECT * FROM "Role";
```

**Backend starten:**
```bash
cd backend
npm run start:dev
```

## 📋 Was wird erstellt?

### Permissions (30+)
Der Seed erstellt alle notwendigen Permissions für:
- Admin Management
- Order Management
- Driver Management
- Restaurant Management
- Customer Management
- Financial Management
- System Management
- Analytics
- RBAC
- Support
- Marketing
- Inventory
- AI/ML
- Automation
- Monitoring
- Integrations
- Reporting
- Multi-Tenancy
- Tax Settings
- Austrian Tax Module
- Cash Register Security
- Austrian Payroll
- GoBD Archiving
- Restaurant Accounting
- Legal Pages
- Security
- Audit

### Rollen (4)
1. **SUPER_ADMIN** - Alle Permissions (`*:*`)
2. **ADMIN** - ~80+ Permissions (Vollzugriff auf Business-Operationen)
3. **MODERATOR** - ~20 Permissions (Read + Limited Update)
4. **SUPPORT** - ~8 Permissions (Read + Support-Management)

## 🔍 Troubleshooting

### Problem: "@prisma/client not found"
**Lösung:**
```bash
cd backend
npm install
npx prisma generate
```

### Problem: "DATABASE_URL not found"
**Lösung:** Stellen Sie sicher, dass `.env` existiert und `DATABASE_URL` gesetzt ist:
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
```

### Problem: "Migration already applied"
**Lösung:** Das ist normal. Fahren Sie mit dem Seed fort.

### Problem: "Permission already exists"
**Lösung:** Das ist normal. Der Seed verwendet `upsert` und überschreibt keine existierenden Daten.

## ✅ Checkliste

- [ ] Dependencies installiert (`npm install`)
- [ ] Prisma Client generiert (`npx prisma generate`)
- [ ] Migration ausgeführt (`npx prisma migrate deploy`)
- [ ] RBAC Seed ausgeführt (`npm run prisma:seed-rbac`)
- [ ] Backend gestartet (`npm run start:dev`)
- [ ] Permissions in Datenbank geprüft
- [ ] Rollen in Datenbank geprüft
- [ ] API-Endpunkte getestet

## 📚 Dokumentation

- **Vollständige Implementierung**: `RBAC_IMPLEMENTATION_SUMMARY.md`
- **Setup-Anleitung**: `RBAC_SETUP_GUIDE.md`
- **Schema**: `prisma/schema.prisma`
- **Seed-Script**: `prisma/seed-rbac.ts`

## 🎯 Status

**✅ Vollständig implementiert und bereit für Setup!**

Alle Code-Änderungen sind abgeschlossen. Führen Sie einfach die Setup-Schritte aus, um das RBAC-System zu aktivieren.

## 💡 Tipp

Falls Sie Probleme haben, können Sie auch Prisma Studio verwenden, um die Datenbank manuell zu prüfen:

```bash
npx prisma studio
```

Dies öffnet eine Web-Oberfläche, in der Sie die Permissions und Rollen sehen können.

