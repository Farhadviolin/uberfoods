# FINALIZATION ROADMAP

Stand: 2026-02-04

## Block A — Fehlende Feature-Pakete
- [x] A1 Admin Advanced Analytics & Automation & Reporting (Backend + Frontend Tests)
- [ ] A2 Driver Performance Analytics, Gamification, Shifts/Scheduling
- [ ] A3 General: Chat, Reviews/Ratings, Geocoding/Zones, Upload/Media, Compliance, Monitoring, Payment/Financial

## Block B — „In Production“/TODO/FIXME eliminieren
- [ ] Entfernen/implementieren aller „In Production“ Stellen
- [ ] Alle TODO/FIXME/Stub/Mock-Flags in Produktionscode

## Block C — Qualitätssicherung & Tests
- [ ] ESLint/TSConfig Stabilisierung
- [ ] Frontend Test Wrapper Konsolidierung (`renderWithProviders`)
- [ ] Backend Unit/Integration/E2E Testabdeckung laut Strategie
- [ ] Coverage Gates definieren und in CI erzwingen

## Block D — Datenbank & Schema
- [ ] Prisma Modelle: MenuCategory, MenuTemplate, Cart, ReviewStatus System
- [ ] Migrationen + Backfill Scripts
- [ ] Indizes/Query Performance + optional PostGIS

## Block E — Security & Code Audits
- [ ] 4 gemeldete Security Issues reproduzieren und fixen
- [ ] AuthN/AuthZ Review + Rate Limiting + Headers
- [ ] Secret Handling + Example Env
- [ ] Dependency Audits (npm/pnpm)

## Block F — Infrastruktur & Betrieb
- [ ] HTTPS/SSL + HSTS + Proxy Setup
- [ ] S3 Signed URLs + Lifecycle
- [ ] CDN Caching Config
- [ ] CI/CD Pipeline (Lint/Typecheck/Tests/Build/Docker)
- [ ] Observability (Sentry + Metrics)
- [ ] Performance (DB Pooling, Redis Cache)

## Owner (pro Block)
- A: Backend + Frontend
- B: Backend + Frontend + Security
- C: QA + Backend + Frontend
- D: Backend + DB
- E: Security + Backend + DevOps
- F: DevOps + Backend + Frontend
