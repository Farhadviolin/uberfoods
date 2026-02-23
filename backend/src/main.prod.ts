/**
 * Production entry: Full stack with NODE_ENV=production.
 * Use: node dist/main.prod.js
 */
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "production";
}

import "./main.full";
