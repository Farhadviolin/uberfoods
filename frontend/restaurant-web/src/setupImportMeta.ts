// Mock import.meta für Jest Tests
const mockEnv = {
  VITE_API_URL: "http://localhost:3000",
  MODE: "development",
  DEV: true,
  PROD: false,
};

if (typeof (globalThis as any).import === "undefined") {
  (globalThis as any).import = { meta: { env: mockEnv } };
}

if (typeof (globalThis as any).import === "undefined") {
  (globalThis as any).import = { meta: { env: mockEnv } };
}
