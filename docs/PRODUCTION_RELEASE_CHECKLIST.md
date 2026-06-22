# UberFoods Production Release Checklist

## Pre-Deploy Checklist

- [ ] `npm run typecheck` passed
- [ ] `npm run build` passed
- [ ] `npm run test:smoke` passed
- [ ] `npm --prefix backend run test:backend:detect-open-handles` passed
- [ ] `npm --prefix backend test -- --runInBand src/modules/payment/__tests__/payment-webhook.controller.spec.ts` passed
- [ ] `backend/prisma/migrations/0001_initial/migration.sql` is present
- [ ] `backend/prisma/migrations/migration_lock.toml` is present
- [ ] `.env.example` files are up to date

## ENV Checklist

- [ ] `DATABASE_URL`
- [ ] `REDIS_URL`
- [ ] `JWT_SECRET`
- [ ] `JWT_REFRESH_SECRET`
- [ ] `ALLOWED_ORIGINS`
- [ ] `STRIPE_SECRET_KEY`
- [ ] `STRIPE_WEBHOOK_SECRET`
- [ ] `STRIPE_PRICE_BASIC`
- [ ] `STRIPE_PRICE_PRO`
- [ ] `STRIPE_PRICE_FULLTIME`
- [ ] `STRIPE_PRICE_ENTERPRISE`
- [ ] `PAYPAL_CLIENT_ID`
- [ ] `PAYPAL_CLIENT_SECRET`
- [ ] `PAYPAL_WEBHOOK_ID`
- [ ] `GOOGLE_MAPS_API_KEY`
- [ ] `VAPID_PUBLIC_KEY`
- [ ] `VAPID_PRIVATE_KEY`
- [ ] `SMTP_HOST`
- [ ] `SMTP_PASSWORD`
- [ ] `SMTP_FROM_EMAIL`
- [ ] `SMTP_FROM_NAME`

## Stripe Checklist

- [ ] Secret key is from the correct environment
- [ ] Webhook secret matches the deployed endpoint
- [ ] Price IDs are mapped to the live product catalog
- [ ] Webhook endpoint receives raw body
- [ ] Payment webhook test passes locally and in CI

## PayPal Checklist

- [ ] Client ID present
- [ ] Client secret present
- [ ] Webhook ID present
- [ ] Sandbox/live mode matches deployment target

## Database Checklist

- [ ] Fresh DB can run `npm --prefix backend run prisma:migrate:dev`
- [ ] CI/production uses `npm --prefix backend run prisma:migrate:deploy`
- [ ] Seed succeeds on a clean database
- [ ] Test accounts are available after seed
- [ ] Backups are configured before production migration

## Redis Checklist

- [ ] Redis URL is configured
- [ ] Backend connects successfully on boot
- [ ] WebSocket adapter can use Redis if enabled
- [ ] Redis is documented as required for live updates

## Build Checklist

- [ ] Backend build succeeds
- [ ] Admin panel build succeeds
- [ ] Customer web build succeeds
- [ ] Restaurant web build succeeds
- [ ] Driver app build succeeds

## Smoke-Test Checklist

- [ ] Admin login works
- [ ] Customer login works
- [ ] Restaurant list loads
- [ ] Product list loads
- [ ] Cart and checkout work
- [ ] Order can be created
- [ ] Restaurant can change order status
- [ ] Driver can accept and complete order
- [ ] Admin can see the order

## Role Checklists

### Admin Test

- [ ] Dashboard loads
- [ ] Users can be managed
- [ ] Restaurants can be managed
- [ ] Drivers can be managed
- [ ] Orders can be reviewed
- [ ] Reports and exports work

### Customer Test

- [ ] Register
- [ ] Login
- [ ] Browse restaurants
- [ ] Open restaurant details
- [ ] Add items to cart
- [ ] Checkout
- [ ] See order history

### Restaurant Test

- [ ] Login
- [ ] View dashboard
- [ ] Manage menu
- [ ] Update order status
- [ ] Review revenue/profile

### Driver Test

- [ ] Login
- [ ] View available orders
- [ ] Accept order
- [ ] Update status
- [ ] View earnings/history

## Payment Test

- [ ] Stripe checkout works in test mode
- [ ] Webhook signature verification passes
- [ ] Order/payment status updates correctly
- [ ] Failures are logged without secrets

## Rollback Plan

- [ ] Stop rollout
- [ ] Repoint traffic to previous image/tag
- [ ] Restore database backup if schema migration was harmful
- [ ] Re-run smoke test after rollback

## Backup Plan

- [ ] Database backup taken before deployment
- [ ] Env secrets backed up in secret manager
- [ ] Release tag recorded
- [ ] Migration SQL archived with the release

## Go-Live Decision

- [ ] All checks green
- [ ] Manual tests complete
- [ ] Production secrets verified
- [ ] Monitoring and alerting enabled
- [ ] Rollback path rehearsed

Status guidance:

- `not ready` if any critical check fails
- `MVP ready` if core flows work but operations are incomplete
- `staging ready` if deployment path is stable but production secrets are not all confirmed
- `production ready with caveats` if only manual live-provider checks remain
- `production ready` if all checks and manual items are complete
