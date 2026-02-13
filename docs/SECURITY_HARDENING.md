# SECURITY HARDENING

Stand: 2026-02-04

## Tooling
- `snyk_code_scan`: nicht verfügbar in dieser Umgebung.
- `npm audit`: durchgeführt (Backend + Admin Panel).

## npm audit – Backend

**Command:** `npm audit --json`  
**Summary:** 39 Vulnerabilities (Low 6, Moderate 4, High 29, Critical 0)

**Auszug (fixable):**
- AWS SDK v3 Komponenten (`@aws-sdk/*`) – High (fix available)
- `@nestjs/serve-static` / `path-to-regexp` – High (major update verfügbar)
- `@nestjs/swagger` / `js-yaml` / `lodash` – Moderate (major update verfügbar)
- `qs` (DoS) – High (fix available)
- `firebase-admin` / `fast-xml-parser` – High (major update verfügbar)

## npm audit – Admin Panel

**Command:** `npm audit --json`  
**Summary:** 7 Vulnerabilities (Low 1, Moderate 3, High 1, Critical 2)

**Auszug (fixable):**
- `jspdf` (Critical/High/Moderate) – major update verfügbar (`>=4.1.0`)
- `react-router` – High/Moderate (update verfügbar)
- `lodash` / `lodash-es` – Moderate (update verfügbar)
- `diff` – Low (update verfügbar)

## Nächste Schritte (Block E)
- Abhängigkeiten gezielt aktualisieren (Major-Updates evaluieren).
- Re-Run `npm audit` nach Fixes und dokumentieren.
