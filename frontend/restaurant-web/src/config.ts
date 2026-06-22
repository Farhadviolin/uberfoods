// Supports Vite in the browser and guarded process.env access in Jest/Node.
const nodeEnv =
  typeof process !== "undefined" && process.env ? process.env : {};
const viteEnv = import.meta.env ?? {
  VITE_API_URL: nodeEnv.VITE_API_URL || "http://localhost:3000",
  VITE_WS_URL:
    nodeEnv.VITE_WS_URL ||
    nodeEnv.VITE_API_URL ||
    "http://localhost:3000",
  VITE_APP_NAME: nodeEnv.VITE_APP_NAME || "UberFoods Restaurant",
  DEV: nodeEnv.NODE_ENV !== "production",
  PROD: nodeEnv.NODE_ENV === "production",
};

const validateUrl = (url: string, name: string) => {
  if (
    viteEnv.PROD &&
    (url.includes("localhost") || url.includes("127.0.0.1"))
  ) {
    throw new Error(`Ungültige ${name} für Production: ${url}`);
  }
  return url;
};

const resolveApiUrl = () => {
  const url = viteEnv.VITE_API_URL || "http://localhost:3000";
  return validateUrl(url, "API URL");
};

const resolveWsUrl = () => {
  const url =
    viteEnv.VITE_WS_URL || viteEnv.VITE_API_URL || "http://localhost:3000";
  return validateUrl(url, "WebSocket URL");
};

export const config = {
  apiUrl: resolveApiUrl(),
  wsUrl: resolveWsUrl(),
  appName: viteEnv.VITE_APP_NAME || "UberFoods Restaurant",
  isDevelopment: !!viteEnv.DEV,
  isProduction: !!viteEnv.PROD,
};
