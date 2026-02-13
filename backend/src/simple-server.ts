/**
 * Dev/Mock Server
 * ----------------
 * Dieser Express-Server stellt nur einfache Mock-Endpunkte für lokale Tests bereit.
 * In Produktion wird ausschließlich die NestJS-Anwendung verwendet.
 * Bitte nicht in Produktions-Pipelines oder Deployments starten.
 */
import * as express from "express";
import * as cors from "cors";

const app = express();
const port = 3000;

if (process.env.NODE_ENV === "production") {
  // Hard guard to avoid accidental prod usage
  console.warn(
    "[simple-server] Dieser Mock-Server ist nur für lokale Tests gedacht. Beende Ausführung.",
  );
  process.exit(0);
}

// Middleware
app.disable("x-powered-by");
app.use(cors());
app.use(express.json());

// Einfache Health Route
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    message: "Simple Express Server",
    predictions: "/api/analytics/predictions",
    geocoding: "/api/geocoding/geocode",
  });
});

// Predictive Ordering Route (Mock)
app.get("/api/analytics/predictions", (req, res) => {
  res.json([
    {
      id: "test-1",
      type: "time-based",
      title: "Mittagszeit-Spitze",
      description: "Jetzt ist Hochbetrieb. Bestelle frühzeitig.",
      restaurant: { id: "test-restaurant", name: "Test Restaurant" },
      dish: { id: "test-dish", name: "Test Dish" },
      confidence: 0.85,
      suggestedTime: "Jetzt bestellen",
    },
  ]);
});

// Geocoding Route (Mock)
app.post("/api/geocoding/geocode", (req, res) => {
  const { address } = req.body;
  res.json({
    lat: 48.2082,
    lng: 16.3738,
    address: address || "Wien, Austria",
    confidence: 0.9,
  });
});

app.listen(port, () => {
  console.log(`🚀 Simple Server läuft auf http://localhost:${port}`);
  console.log(`🏥 Health Check: http://localhost:${port}/api/health`);
});
