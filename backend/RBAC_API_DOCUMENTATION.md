# RBAC API-Dokumentation

## Übersicht

Das RBAC-System (Role-Based Access Control) verwaltet Rollen, Permissions und Benutzerzugriffe im UberFoods-Backend.

## Authentifizierung

Alle Endpunkte erfordern JWT-Authentifizierung. Füge den Token im `Authorization` Header hinzu:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

## Rollen

### Verfügbare Rollen

- **SUPER_ADMIN**: Vollzugriff auf alle Funktionen (`*:*` Permission)
- **ADMIN**: Umfassende Zugriffe (118 Permissions)
- **MODERATOR**: Lese- und begrenzte Update-Zugriffe (16 Permissions)
- **SUPPORT**: Support-relevante Zugriffe (5 Permissions)

## API-Endpunkte

### Rollen-Management

#### `GET /rbac/roles`
Ruft alle Rollen ab.

**Berechtigung**: `SUPER_ADMIN`, `ADMIN`  
**Permission**: `rbac:read`

**Response**:
```json
[
  {
    "id": "role-id",
    "name": "ADMIN",
    "description": "Administrator with most system access",
    "permissions": ["order:read", "order:update", ...],
    "createdAt": "2025-01-28T00:00:00.000Z",
    "updatedAt": "2025-01-28T00:00:00.000Z"
  }
]
```

#### `POST /rbac/roles`
Erstellt eine neue Rolle.

**Berechtigung**: `SUPER_ADMIN`  
**Permission**: `rbac:create`

**Request Body**:
```json
{
  "name": "CUSTOM_ROLE",
  "description": "Custom role description",
  "permissions": ["order:read", "order:update"]
}
```

**Response**: Erstellte Rolle

#### `PUT /rbac/roles/:id`
Aktualisiert eine Rolle.

**Berechtigung**: `SUPER_ADMIN`  
**Permission**: `rbac:update`

**Request Body**:
```json
{
  "name": "UPDATED_ROLE",
  "description": "Updated description",
  "permissions": ["order:read"]
}
```

**Response**: Aktualisierte Rolle

#### `DELETE /rbac/roles/:id`
Löscht eine Rolle.

**Berechtigung**: `SUPER_ADMIN`  
**Permission**: `rbac:delete`

**Response**: Gelöschte Rolle

### Permissions-Management

#### `GET /rbac/permissions`
Ruft alle Permissions ab.

**Berechtigung**: `SUPER_ADMIN`, `ADMIN`  
**Permission**: `rbac:read`

**Response**:
```json
[
  {
    "id": "perm-id",
    "resource": "order",
    "action": "read",
    "description": "View orders",
    "createdAt": "2025-01-28T00:00:00.000Z"
  }
]
```

#### `POST /rbac/permissions`
Erstellt eine neue Permission.

**Berechtigung**: `SUPER_ADMIN`  
**Permission**: `rbac:create`

**Request Body**:
```json
{
  "resource": "order",
  "action": "read",
  "description": "View orders"
}
```

**Response**: Erstellte Permission

### User-Management

#### `GET /rbac/users`
Ruft alle Benutzer ab.

**Berechtigung**: `SUPER_ADMIN`, `ADMIN`  
**Permission**: `rbac:read`

**Response**:
```json
{
  "admins": [...],
  "customers": [...],
  "drivers": [...],
  "restaurants": [...]
}
```

#### `GET /rbac/user-permissions/:userId`
Ruft Permissions eines Benutzers ab.

**Berechtigung**: `SUPER_ADMIN`, `ADMIN`, `MODERATOR`, `SUPPORT`  
**Permission**: `rbac:read`

**Query Parameters**:
- `role` (optional): Benutzerrolle

**Response**:
```json
{
  "userId": "user-id",
  "role": "ADMIN",
  "permissions": ["order:read", "order:update", ...],
  "roles": ["ADMIN"],
  "cached": true
}
```

### Sessions & 2FA

#### `GET /rbac/sessions`
Ruft alle aktiven Sessions ab.

**Berechtigung**: `SUPER_ADMIN`, `ADMIN`  
**Permission**: `rbac:read`

**Query Parameters**:
- `userId` (optional): Filter nach User-ID
- `userType` (optional): Filter nach User-Typ

**Response**: Array von Sessions

#### `DELETE /rbac/sessions/:id`
Löscht eine Session.

**Berechtigung**: `SUPER_ADMIN`, `ADMIN`  
**Permission**: `rbac:delete`

**Response**: Erfolgsmeldung

#### `GET /rbac/2fa/status`
Ruft 2FA-Status ab.

**Berechtigung**: `SUPER_ADMIN`, `ADMIN`  
**Permission**: `rbac:read`

**Query Parameters**:
- `userId` (optional): Spezifischer User

**Response**:
```json
{
  "enabledCount": 10,
  "totalUsers": 50
}
```

#### `POST /rbac/users/:id/enable-2fa`
Aktiviert 2FA für einen Benutzer.

**Berechtigung**: `SUPER_ADMIN`, `ADMIN`  
**Permission**: `rbac:update`

**Response**:
```json
{
  "success": true,
  "userId": "user-id",
  "secret": "base32-secret",
  "qrCode": "data:image/png;base64,...",
  "otpauthUrl": "otpauth://totp/...",
  "backupCodes": ["CODE1", "CODE2", ...]
}
```

### Cache-Management

#### `POST /rbac/cache/invalidate`
Invalidiert RBAC-Caches.

**Berechtigung**: `SUPER_ADMIN`, `ADMIN`  
**Permission**: `rbac:update`

**Request Body** (optional):
```json
{
  "userId": "user-id"  // Optional: Nur für diesen User
}
```

**Response**:
```json
{
  "success": true,
  "message": "All RBAC caches invalidated"
}
```

### Monitoring

#### `GET /rbac/metrics`
Ruft RBAC-Metriken ab.

**Berechtigung**: `SUPER_ADMIN`, `ADMIN`  
**Permission**: `rbac:read`

**Response**:
```json
{
  "permissionChecks": 1250,
  "cacheHits": 1100,
  "cacheMisses": 150,
  "cacheHitRate": "88.00%",
  "permissionDenials": 5,
  "cacheSize": 42
}
```

## Permission-Format

Permissions verwenden das Format `resource:action`:

- **resource**: Die Ressource (z.B. `order`, `admin`, `customer`)
- **action**: Die Aktion (z.B. `read`, `create`, `update`, `delete`)

### Wildcard-Permissions

- `*:*` - Alle Permissions (nur SUPER_ADMIN)
- `order:*` - Alle Order-Permissions (matcht `order:read`, `order:create`, etc.)

### Beispiele

- `order:read` - Bestellungen lesen
- `order:create` - Bestellungen erstellen
- `admin:update` - Admin-Benutzer aktualisieren
- `rbac:read` - RBAC-Daten lesen

## Fehlerbehandlung

### 401 Unauthorized
Token fehlt oder ist ungültig.

### 403 Forbidden
Benutzer hat nicht die erforderliche Rolle oder Permission.

**Response**:
```json
{
  "statusCode": 403,
  "message": "Insufficient permissions. Required: order:delete",
  "error": "Forbidden"
}
```

### 404 Not Found
Ressource nicht gefunden.

## Best Practices

1. **Caching**: Permissions werden 5 Minuten gecacht. Nach Änderungen Cache invalidieren.
2. **Monitoring**: Nutze `/rbac/metrics` für Performance-Monitoring.
3. **Sicherheit**: Verwende immer die Guards (`@Roles`, `@RequirePermission`).
4. **Logging**: Permission-Denials werden automatisch geloggt.

## Beispiel-Requests

### Rollen abrufen
```bash
curl -X GET http://localhost:3000/rbac/roles \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### User-Permissions abrufen
```bash
curl -X GET http://localhost:3000/rbac/user-permissions/USER_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Neue Rolle erstellen
```bash
curl -X POST http://localhost:3000/rbac/roles \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "CUSTOM_ROLE",
    "description": "Custom role",
    "permissions": ["order:read", "order:update"]
  }'
```

### Cache invalidieren
```bash
curl -X POST http://localhost:3000/rbac/cache/invalidate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-id"}'
```

### Metriken abrufen
```bash
curl -X GET http://localhost:3000/rbac/metrics \
  -H "Authorization: Bearer YOUR_TOKEN"
```

