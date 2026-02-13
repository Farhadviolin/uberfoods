import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useToast } from "../contexts/ToastContext";
import api from "../utils/api";
import { validateImageUrl } from "../utils/security";
import { extractErrorMessage } from "../utils/errorHandler";
import { logError } from "../utils/errorReporting";
import "./RecipeIntegration.css";

interface Recipe {
  id: string;
  dishId: string;
  dishName: string;
  title: string;
  description: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: "EINFACH" | "MITTEL" | "SCHWER";
  ingredients: Array<{
    name: string;
    amount: string;
    unit: string;
  }>;
  instructions: Array<{
    step: number;
    description: string;
    imageUrl?: string;
  }>;
  tips?: string[];
  nutritionalInfo?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  videoUrl?: string;
}

interface Dish {
  id: string;
  name: string;
  imageUrl: string;
  price: number;
  hasRecipe: boolean;
}

export function RecipeIntegration() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(0);

  const fetchDishes = useCallback(async () => {
    if (!restaurantId) return;
    try {
      const response = await api.get(`/restaurants/${restaurantId}/dishes`);
      setDishes(response.data || []);
    } catch (error: unknown) {
      logError(error, { component: 'RecipeIntegration', action: 'fetchDishes', metadata: { restaurantId } });
      showToast(extractErrorMessage(error), "error");
    } finally {
      setLoading(false);
    }
  }, [restaurantId, showToast]);

  useEffect(() => {
    if (restaurantId) {
      fetchDishes();
    }
  }, [restaurantId, fetchDishes]);

  const fetchRecipe = async (dishId: string) => {
    try {
      const response = await api.get(`/dishes/${dishId}/recipe`);
      setSelectedRecipe(response.data);
      setActiveStep(0);
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number } };
        if (axiosError.response?.status === 404) {
          showToast("Kein Rezept für dieses Gericht verfügbar", "info");
          return;
        }
      }
      showToast(extractErrorMessage(error), "error");
    }
  };

  const addToCart = async (dishId: string) => {
    try {
      await api.post("/cart/add", { dishId, quantity: 1 });
      showToast("Gericht wurde zum Warenkorb hinzugefügt", "success");
    } catch (error: unknown) {
      showToast(extractErrorMessage(error), "error");
    }
  };

  const orderDish = (dishId: string) => {
    navigate(`/restaurant/${restaurantId}/dish/${dishId}`);
  };

  if (loading) {
    return (
      <div className="loading">
        <div>Lädt Gerichte...</div>
      </div>
    );
  }

  return (
    <div className="recipe-integration">
      <div className="recipe-header">
        <h1>Rezepte & Kochen</h1>
        <p className="recipe-subtitle">
          Lernen Sie, wie Sie unsere Gerichte zu Hause zubereiten können
        </p>
      </div>

      {!selectedRecipe ? (
        <div className="recipe-dish-selector">
          <h2>Gericht mit Rezept auswählen</h2>
          <div className="dishes-grid">
            {dishes
              .filter((dish) => dish.hasRecipe)
              .map((dish) => (
                <div key={dish.id} className="dish-card">
                  <img
                    src={validateImageUrl(dish.imageUrl) || "/placeholder-dish.jpg"}
                    alt={dish.name}
                    className="dish-image"
                  />
                  <div className="dish-info">
                    <h3>{dish.name}</h3>
                    <p className="dish-price">€{dish.price.toFixed(2)}</p>
                    <div className="dish-actions">
                      <button
                        onClick={() => fetchRecipe(dish.id)}
                        className="recipe-button"
                      >
                        Rezept anzeigen
                      </button>
                      <button
                        onClick={() => addToCart(dish.id)}
                        className="cart-button"
                      >
                        Zum Warenkorb
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            {dishes.filter((dish) => dish.hasRecipe).length === 0 && (
              <div className="empty-state">
                <p>Keine Gerichte mit Rezepten verfügbar</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="recipe-viewer">
          <button
            onClick={() => setSelectedRecipe(null)}
            className="back-button"
          >
            ← Zurück zur Auswahl
          </button>

          <div className="recipe-header-section">
            <div className="recipe-title-section">
              <h2>{selectedRecipe.title}</h2>
              <p className="recipe-description">{selectedRecipe.description}</p>
              <div className="recipe-meta">
                <div className="meta-item">
                  <span className="meta-label">Zubereitungszeit:</span>
                  <span className="meta-value">{selectedRecipe.prepTime} min</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Kochzeit:</span>
                  <span className="meta-value">{selectedRecipe.cookTime} min</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Portionen:</span>
                  <span className="meta-value">{selectedRecipe.servings}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Schwierigkeit:</span>
                  <span
                    className={`meta-value difficulty-${selectedRecipe.difficulty.toLowerCase()}`}
                  >
                    {selectedRecipe.difficulty}
                  </span>
                </div>
              </div>
            </div>
            <div className="recipe-actions">
              <button
                onClick={() => orderDish(selectedRecipe.dishId)}
                className="order-button"
              >
                Gericht bestellen
              </button>
            </div>
          </div>

          {(() => {
            const safeVideoUrl = validateImageUrl(selectedRecipe.videoUrl);
            return safeVideoUrl ? (
              <div className="recipe-video">
                <iframe
                  src={safeVideoUrl}
                  title="Rezept-Video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : null;
          })()}

          <div className="recipe-content">
            <div className="ingredients-section">
              <h3>Zutaten</h3>
              <ul className="ingredients-list">
                {selectedRecipe.ingredients.map((ingredient, index) => (
                  <li key={index}>
                    <span className="ingredient-amount">
                      {ingredient.amount} {ingredient.unit}
                    </span>
                    <span className="ingredient-name">{ingredient.name}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="instructions-section">
              <h3>Zubereitung</h3>
              <div className="instructions-steps">
                {selectedRecipe.instructions.map((instruction, index) => (
                  <div
                    key={instruction.step}
                    className={`instruction-step ${activeStep === index ? "active" : ""}`}
                    onClick={() => setActiveStep(index)}
                  >
                    <div className="step-number">{instruction.step}</div>
                    <div className="step-content">
                      <p>{instruction.description}</p>
                      {(() => {
                        const safeStepImage = validateImageUrl(instruction.imageUrl);
                        return safeStepImage ? (
                          <img
                            src={safeStepImage}
                            alt={`Schritt ${instruction.step}`}
                            className="step-image"
                          />
                        ) : null;
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedRecipe.tips && selectedRecipe.tips.length > 0 && (
              <div className="tips-section">
                <h3>💡 Tipps</h3>
                <ul className="tips-list">
                  {selectedRecipe.tips.map((tip, index) => (
                    <li key={index}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}

            {selectedRecipe.nutritionalInfo && (
              <div className="nutritional-section">
                <h3>Nährwerte (pro Portion)</h3>
                <div className="nutrition-grid">
                  <div className="nutrition-item">
                    <span className="nutrition-label">Kalorien</span>
                    <span className="nutrition-value">
                      {selectedRecipe.nutritionalInfo.calories} kcal
                    </span>
                  </div>
                  <div className="nutrition-item">
                    <span className="nutrition-label">Protein</span>
                    <span className="nutrition-value">
                      {selectedRecipe.nutritionalInfo.protein}g
                    </span>
                  </div>
                  <div className="nutrition-item">
                    <span className="nutrition-label">Kohlenhydrate</span>
                    <span className="nutrition-value">
                      {selectedRecipe.nutritionalInfo.carbs}g
                    </span>
                  </div>
                  <div className="nutrition-item">
                    <span className="nutrition-label">Fett</span>
                    <span className="nutrition-value">
                      {selectedRecipe.nutritionalInfo.fat}g
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
