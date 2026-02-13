@echo off
cd /d "%~dp0"
npx ts-node --project tsconfig.build.json src/main.e2e.ts