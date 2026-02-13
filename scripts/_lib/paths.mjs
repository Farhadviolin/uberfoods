/**
 * Cross-platform Path Resolution Helper
 * Ensures deterministic paths regardless of working directory
 */

import { resolve, dirname, join, normalize } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Repository root (scripts directory parent)
export const repoRoot = resolve(__dirname, '..', '..');

// Backend root
export const backendRoot = join(repoRoot, 'backend');

// Customer web root (if exists)
export const customerWebRoot = join(repoRoot, 'frontend', 'customer-web');

// Simple .env parser
export function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }

  const content = readFileSync(filePath, 'utf8');
  const env = {};

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const equalIndex = trimmed.indexOf('=');
      if (equalIndex > 0) {
        const key = trimmed.substring(0, equalIndex).trim();
        const value = trimmed.substring(equalIndex + 1).trim().replace(/^["']|["']$/g, '');
        env[key] = value;
      }
    }
  }

  return env;
}

// Cross-platform binary resolution
export function resolveBin(name) {
  const isWindows = process.platform === 'win32';

  // Map common binaries to Windows equivalents
  const binMap = {
    'npm': isWindows ? 'npm.cmd' : 'npm',
    'npx': isWindows ? 'npx.cmd' : 'npx',
    'prisma': isWindows ? 'prisma.cmd' : 'prisma',
    'node': isWindows ? 'node.exe' : 'node',
    'ts-node': isWindows ? 'ts-node.cmd' : 'ts-node'
  };

  return binMap[name] || name;
}

// Get current working directory info
export function getCwdInfo() {
  return {
    cwd: process.cwd(),
    isRepoRoot: normalize(process.cwd()) === normalize(repoRoot),
    isBackend: normalize(process.cwd()) === normalize(backendRoot),
    isCustomerWeb: normalize(process.cwd()) === normalize(customerWebRoot)
  };
}