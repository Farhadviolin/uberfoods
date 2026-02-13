import React, { useEffect, useState, FormEvent, useCallback } from "react";
import { useToast } from "../contexts/ToastContext";
import { extractErrorMessage } from "../utils/errorUtils";
import { LoadingSpinner } from "../design-system/Spinner";
import { EmptyState } from "./common/Skeleton";

interface MealPlan {
  id: string;
  title?: string;
  restaurantId?: string;
  notes?: string;
  dishIds?: string[];
}

export const MealPlannerManagement = React.memo(
  function MealPlannerManagement() {
    const { showToast } = useToast();

    const [plans, setPlans] = useState<MealPlan[]>([]);
    const [loading, setLoading] = useState(false);
    const [weekStart, setWeekStart] = useState("");
    const [shoppingRange, setShoppingRange] = useState({ start: "", end: "" });
    const [newPlan, setNewPlan] = useState({
      title: "",
      restaurantId: "",
      dishIds: "",
      notes: "",
    });
    const [executeId, setExecuteId] = useState("");

    const loadWeeklyPlan = useCallback(async () => {
      if (!weekStart) return;
      setLoading(true);
      try {
        const res = await fetch(
          `/api/meal-planner/weekly?weekStart=${weekStart}`,
        );
        if (!res.ok) throw new Error("Failed to load weekly plan");
        const responseData = await res.json();
        const data = Array.isArray(responseData)
          ? responseData
          : responseData &&
              typeof responseData === "object" &&
              "meals" in responseData &&
              Array.isArray(responseData.meals)
            ? responseData.meals
            : [];
        setPlans(data);
      } catch (error) {
        showToast(extractErrorMessage(error), "error");
        setPlans([]);
      } finally {
        setLoading(false);
      }
    }, [weekStart, showToast]);

    const fetchShoppingList = useCallback(async () => {
      if (!shoppingRange.start || !shoppingRange.end) return;
      try {
        const res = await fetch(
          `/api/meal-planner/shopping-list?startDate=${shoppingRange.start}&endDate=${shoppingRange.end}`,
        );
        if (!res.ok) throw new Error("Failed to fetch shopping list");
        const data = await res.json();
        showToast(
          `Einkaufsliste geladen (${(data?.items || []).length || 0} Einträge)`,
          "success",
        );
      } catch (error) {
        showToast(extractErrorMessage(error), "error");
      }
    }, [shoppingRange, showToast]);

    const createMealPlan = useCallback(
      async (e: FormEvent) => {
        e.preventDefault();
        if (!newPlan.title.trim()) {
          showToast("Bitte geben Sie einen Titel ein", "error");
          return;
        }
        if (!newPlan.dishIds.trim()) {
          showToast("Bitte geben Sie mindestens eine Dish ID ein", "error");
          return;
        }
        const dishIds = newPlan.dishIds
          .split(",")
          .map((d) => d.trim())
          .filter(Boolean);
        if (dishIds.length === 0) {
          showToast("Bitte geben Sie gültige Dish IDs ein", "error");
          return;
        }
        try {
          const res = await fetch("/api/meal-planner/meals", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: newPlan.title.trim(),
              restaurantId: newPlan.restaurantId.trim() || undefined,
              dishIds,
              notes: newPlan.notes.trim() || undefined,
            }),
          });
          if (!res.ok) throw new Error("Failed to create meal plan");
          showToast("Meal-Plan erstellt", "success");
          setNewPlan({ title: "", restaurantId: "", dishIds: "", notes: "" });
          loadWeeklyPlan();
        } catch (error) {
          showToast(extractErrorMessage(error), "error");
        }
      },
      [newPlan, showToast, loadWeeklyPlan],
    );

    const executePlan = useCallback(async () => {
      if (!executeId) return;
      try {
        const res = await fetch(
          `/api/meal-planner/meals/${executeId}/execute`,
          {
            method: "POST",
          },
        );
        if (!res.ok) throw new Error("Failed to execute plan");
        showToast("Meal-Plan ausgeführt (Order erstellt)", "success");
      } catch (error) {
        showToast(extractErrorMessage(error), "error");
      }
    }, [executeId, showToast]);

    useEffect(() => {
      // Optional: Auto-laden, wenn Woche gesetzt
      if (weekStart) {
        loadWeeklyPlan();
      }
    }, [weekStart, loadWeeklyPlan]);

    return (
      <div className="card">
        <div className="card-header">
          <h2>Meal Planner</h2>
          <p className="text-muted">
            Meal-Pläne anlegen, Woche abrufen, Einkaufsliste generieren.
          </p>
        </div>

        <div className="grid three-cols gap card-section">
          <div>
            <label htmlFor="meal-week-start">Woche (weekStart)</label>
            <input
              id="meal-week-start"
              type="date"
              value={weekStart}
              onChange={(e) => setWeekStart(e.target.value)}
              placeholder="2025-01-06"
              aria-label="Wochenstart für Meal-Plan"
            />
            <button
              type="button"
              className="btn"
              onClick={loadWeeklyPlan}
              aria-label="Weekly Plan laden"
            >
              Weekly laden
            </button>
          </div>
          <div>
            <label htmlFor="shopping-start">Einkaufsliste Start</label>
            <input
              id="shopping-start"
              type="date"
              value={shoppingRange.start}
              onChange={(e) =>
                setShoppingRange((prev) => ({ ...prev, start: e.target.value }))
              }
              placeholder="2025-01-06"
              aria-label="Startdatum für Einkaufsliste"
            />
          </div>
          <div>
            <label htmlFor="shopping-end">Einkaufsliste Ende</label>
            <input
              id="shopping-end"
              type="date"
              value={shoppingRange.end}
              onChange={(e) =>
                setShoppingRange((prev) => ({ ...prev, end: e.target.value }))
              }
              placeholder="2025-01-12"
              aria-label="Enddatum für Einkaufsliste"
            />
            <button
              type="button"
              className="btn"
              onClick={fetchShoppingList}
              aria-label="Einkaufsliste abrufen"
            >
              Einkaufsliste abrufen
            </button>
          </div>
        </div>

        <form
          className="card-section"
          onSubmit={createMealPlan}
          aria-label="Meal-Plan anlegen"
        >
          <h3>Meal-Plan anlegen</h3>
          <label htmlFor="meal-plan-title">Titel</label>
          <input
            id="meal-plan-title"
            value={newPlan.title}
            onChange={(e) =>
              setNewPlan((prev) => ({ ...prev, title: e.target.value }))
            }
            aria-required="true"
            aria-label="Meal-Plan Titel"
          />
          <label htmlFor="meal-plan-restaurant">Restaurant ID (optional)</label>
          <input
            id="meal-plan-restaurant"
            value={newPlan.restaurantId}
            onChange={(e) =>
              setNewPlan((prev) => ({ ...prev, restaurantId: e.target.value }))
            }
            placeholder="restaurant-123"
            aria-label="Restaurant ID (optional)"
          />
          <label htmlFor="meal-plan-dishes">Dish IDs (kommagetrennt)</label>
          <input
            id="meal-plan-dishes"
            value={newPlan.dishIds}
            onChange={(e) =>
              setNewPlan((prev) => ({ ...prev, dishIds: e.target.value }))
            }
            placeholder="dish-1,dish-2"
            aria-required="true"
            aria-label="Dish IDs kommagetrennt"
          />
          <label htmlFor="meal-plan-notes">Notizen</label>
          <input
            id="meal-plan-notes"
            value={newPlan.notes}
            onChange={(e) =>
              setNewPlan((prev) => ({ ...prev, notes: e.target.value }))
            }
            aria-label="Notizen (optional)"
          />
          <button
            type="submit"
            className="btn primary"
            aria-label="Meal-Plan speichern"
          >
            Speichern
          </button>
        </form>

        <div className="card-section">
          <div className="card-header-row">
            <h3>Meal-Pläne (Woche)</h3>
            {loading && <LoadingSpinner />}
          </div>
          {plans.length === 0 ? (
            <EmptyState
              title={
                weekStart
                  ? "Keine Pläne für diese Woche gefunden. Erstellen Sie einen neuen Meal-Plan."
                  : "Wählen Sie eine Woche aus, um Pläne zu laden."
              }
              icon="📋"
              action={
                weekStart
                  ? ({
                      label: "Meal-Plan erstellen",
                      onClick: () => {
                        const form = document.querySelector(
                          'form[aria-label="Meal-Plan anlegen"]',
                        );
                        form?.scrollIntoView({
                          behavior: "smooth",
                          block: "nearest",
                        });
                      },
                    } as any)
                  : undefined
              }
            />
          ) : (
            <div className="stack">
              {plans.map((plan) => (
                <div key={plan.id} className="card nested">
                  <div className="card-header-row">
                    <strong>{plan.title || plan.id}</strong>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setExecuteId(plan.id)}
                    >
                      Ausführen vorbereiten
                    </button>
                  </div>
                  {plan.notes && <p className="text-muted">{plan.notes}</p>}
                  {plan.dishIds && (
                    <p className="text-muted">
                      Dishes: {plan.dishIds.join(", ")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card-section">
          <h3>Plan ausführen</h3>
          <div className="input-row">
            <input
              value={executeId}
              onChange={(e) => setExecuteId(e.target.value)}
              placeholder="meal-plan-id"
            />
            <button type="button" className="btn primary" onClick={executePlan}>
              Ausführen
            </button>
          </div>
        </div>
      </div>
    );
  },
);
