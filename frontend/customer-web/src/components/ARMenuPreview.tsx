import { useState, useRef, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useToast } from "../contexts/ToastContext";
import api from "../utils/api";
import { validateImageUrl } from "../utils/security";
import { extractErrorMessage } from "../utils/errorHandler";
import { logError } from "../utils/errorReporting";
import "./ARMenuPreview.css";

interface Dish {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  dimensions?: {
    width: number;
    height: number;
    depth: number;
  };
  nutritionalInfo?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export function ARMenuPreview() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const { showToast } = useToast();
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [arSupported, setArSupported] = useState(false);
  const [isArActive, setIsArActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const checkARSupport = useCallback(() => {
    // Check for WebXR or AR.js support
    if (
      navigator.xr ||
      window.ARjs ||
      window.THREE
    ) {
      setArSupported(true);
    } else {
      setArSupported(false);
    }
  }, []);

  const fetchDishes = useCallback(async () => {
    if (!restaurantId) return;
    try {
      const response = await api.get(`/restaurants/${restaurantId}/dishes`);
      setDishes(response.data || []);
    } catch (error: unknown) {
      logError(error, { component: 'ARMenuPreview', action: 'fetchDishes', metadata: { restaurantId } });
      showToast(extractErrorMessage(error), "error");
    }
  }, [restaurantId, showToast]);

  useEffect(() => {
    checkARSupport();
    if (restaurantId) {
      fetchDishes();
    }
  }, [restaurantId, checkARSupport, fetchDishes]);

  const startAR = async () => {
    if (!selectedDish) {
      showToast("Bitte wählen Sie ein Gericht aus", "error");
      return;
    }

    try {
      // Initialize AR using WebXR or AR.js
      if (navigator.xr) {
        await navigator.xr.requestSession("immersive-ar", {
          requiredFeatures: ["local"],
        });
        setIsArActive(true);
        // AR session handling would go here
      } else if (window.ARjs) {
        // AR.js initialization
        setIsArActive(true);
        showToast("AR-Modus aktiviert", "success");
      } else {
        // Fallback: Show 3D preview
        showToast("AR nicht verfügbar, zeige 3D-Vorschau", "info");
        show3DPreview();
      }
    } catch (error: unknown) {
      logError(error, { component: 'ARMenuPreview', action: 'startAR', metadata: { dishId: selectedDish?.id } });
      showToast(extractErrorMessage(error), "error");
      show3DPreview();
    }
  };

  const show3DPreview = () => {
    // Fallback 3D preview using Three.js or similar
    if (canvasRef.current && selectedDish) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Simple 3D preview placeholder
        ctx.fillStyle = "#4338CA";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "white";
        ctx.font = "20px Arial";
        ctx.textAlign = "center";
        ctx.fillText(
          selectedDish.name,
          canvas.width / 2,
          canvas.height / 2
        );
      }
    }
  };

  const stopAR = () => {
    setIsArActive(false);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  return (
    <div className="ar-menu-preview">
      <div className="ar-header">
        <h1>AR-Menü-Vorschau</h1>
        <p className="ar-subtitle">
          Sehen Sie Gerichte in Augmented Reality
        </p>
      </div>

      {!arSupported && (
        <div className="ar-warning">
          <p>
            ⚠️ AR wird auf Ihrem Gerät nicht unterstützt. Sie können trotzdem die
            3D-Vorschau verwenden.
          </p>
        </div>
      )}

      <div className="ar-content">
        <div className="ar-dish-selector">
          <h2>Gericht auswählen</h2>
          <div className="dishes-grid">
            {dishes.map((dish) => (
              <div
                key={dish.id}
                className={`dish-card ${selectedDish?.id === dish.id ? "selected" : ""}`}
                onClick={() => setSelectedDish(dish)}
              >
                <img
                  src={validateImageUrl(dish.imageUrl) || "/placeholder-dish.jpg"}
                  alt={dish.name}
                  className="dish-image"
                />
                <div className="dish-info">
                  <h3>{dish.name}</h3>
                  <p className="dish-price">€{dish.price.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="ar-preview-area">
          <h2>AR-Vorschau</h2>
          {selectedDish ? (
            <>
              <div className="ar-viewport">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="ar-video"
                  style={{ display: isArActive ? "block" : "none" }}
                />
                <canvas
                  ref={canvasRef}
                  className="ar-canvas"
                  width={640}
                  height={480}
                  style={{ display: !isArActive ? "block" : "none" }}
                />
                {!isArActive && (
                  <div className="ar-placeholder">
                    <div className="ar-placeholder-icon">📱</div>
                    <p>Wählen Sie ein Gericht und starten Sie AR</p>
                  </div>
                )}
              </div>

              <div className="ar-controls">
                {!isArActive ? (
                  <button onClick={startAR} className="ar-button">
                    AR starten
                  </button>
                ) : (
                  <button onClick={stopAR} className="ar-button ar-button-stop">
                    AR beenden
                  </button>
                )}
              </div>

              <div className="ar-dish-details">
                <h3>{selectedDish.name}</h3>
                <p>{selectedDish.description}</p>
                {selectedDish.nutritionalInfo && (
                  <div className="nutritional-info">
                    <h4>Nährwerte</h4>
                    <div className="nutrition-grid">
                      <div>
                        <span>Kalorien:</span>
                        <strong>{selectedDish.nutritionalInfo.calories} kcal</strong>
                      </div>
                      <div>
                        <span>Protein:</span>
                        <strong>{selectedDish.nutritionalInfo.protein}g</strong>
                      </div>
                      <div>
                        <span>Kohlenhydrate:</span>
                        <strong>{selectedDish.nutritionalInfo.carbs}g</strong>
                      </div>
                      <div>
                        <span>Fett:</span>
                        <strong>{selectedDish.nutritionalInfo.fat}g</strong>
                      </div>
                    </div>
                  </div>
                )}
                {selectedDish.dimensions && (
                  <div className="dimensions-info">
                    <h4>Größe</h4>
                    <p>
                      {selectedDish.dimensions.width} × {selectedDish.dimensions.height} ×{" "}
                      {selectedDish.dimensions.depth} cm
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="ar-placeholder">
              <div className="ar-placeholder-icon">👆</div>
              <p>Wählen Sie ein Gericht aus, um die AR-Vorschau zu starten</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
