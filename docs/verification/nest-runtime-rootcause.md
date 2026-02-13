# Nest Runtime Root Cause Analysis

## Evidence Summary

### PID1 Analysis
- **PID1 Process**: `node server.minimal.js`
- **Expected Process**: `node dist/main.js` (NestJS application)

### Container Structure
- **Working Directory**: `/app`
- **dist/ Directory**: ✅ EXISTS (compiled NestJS files present)
- **src/ Directory**: ✅ EXISTS (TypeScript source)
- **server.minimal.js**: ✅ EXISTS (fallback Express server)

### Docker Configuration Analysis

#### docker-compose.yml (Backend Service)
```yaml
backend:
  build:
    context: ./backend
    dockerfile: Dockerfile.dev
  volumes:
    - ./backend/src:/app/src        # Bind mount source
    - ./backend/dist:/app/dist      # Bind mount compiled code
    - ./backend/prisma:/app/prisma
    - ./backend/package.json:/app/package.json
    - ./backend/tsconfig.json:/app/tsconfig.json
    - /app/node_modules             # Named volume for node_modules
  # NO command/entrypoint override specified
```

#### Dockerfile.dev
```dockerfile
FROM node:20-alpine
WORKDIR /app

# Install dependencies and copy source
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install --legacy-peer-deps
RUN npx prisma generate
COPY . .

# Expose port
EXPOSE 3000

# DEFAULT COMMAND - This is the problem!
CMD ["node", "server.minimal.js"]
```

## Root Cause Identified

### CASE A: Wrong Default Command in Dockerfile
**Issue**: Dockerfile.dev specifies `CMD ["node", "server.minimal.js"]` as the default startup command.
**Impact**: Container always starts the fallback Express server instead of the compiled NestJS application.
**Evidence**: PID1 shows fallback server process, but `dist/main.js` exists in container.

### Contributing Factors
1. **Bind Mounts Present**: Local `dist/` directory is mounted into container
2. **No Command Override**: docker-compose.yml doesn't override the CMD
3. **Fallback Server Exists**: `server.minimal.js` is present as safety net
4. **Build Succeeds**: NestJS compilation works, but startup fails

## Required Fix

### Solution: Change Default CMD in Dockerfile.dev
**Current**: `CMD ["node", "server.minimal.js"]`
**Fix**: `CMD ["node", "dist/main.js"]`

**Rationale**:
- For development, we want to run the compiled NestJS application
- The fallback server should only run if NestJS compilation fails
- Bind mounts ensure `dist/` is available with current compiled code

## Alternative Solutions Considered

### Option 2: Command Override in docker-compose.yml
```yaml
backend:
  command: ["node", "dist/main.js"]
```

### Option 3: Conditional Startup Logic
Modify Dockerfile to check if `dist/main.js` exists and start NestJS, otherwise fallback.

## Implementation Plan
1. Change CMD in `backend/Dockerfile.dev` from `server.minimal.js` to `dist/main.js`
2. Rebuild container with `docker compose up -d --build backend`
3. Verify PID1 shows NestJS process
4. Test health endpoints

---

*Generated: $(date)*