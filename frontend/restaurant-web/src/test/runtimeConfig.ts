interface RestaurantRuntimeConfig {
  apiUrl: string;
  wsUrl: string;
  appName: string;
  isDevelopment: boolean;
  isProduction: boolean;
}

const localTestUrl = "http://localhost:3000";

export const config: Readonly<RestaurantRuntimeConfig> = Object.freeze({
  apiUrl: localTestUrl,
  wsUrl: localTestUrl,
  appName: "UberFoods Restaurant",
  isDevelopment: true,
  isProduction: false,
});
