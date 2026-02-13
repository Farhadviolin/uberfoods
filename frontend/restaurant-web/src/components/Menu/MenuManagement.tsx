import { useState } from "react";
import {
  useRestaurantDishes,
  useCreateDish,
  useUpdateDish,
  useDeleteDish,
  Dish,
} from "../../hooks/useMenu";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { useRetry } from "../../hooks/useRetry";
import { formatCurrency } from "../../utils/formatters";
import { validateImageUrl } from "../../utils/security";
import { getAccessibleButtonProps } from "../../utils/accessibility";
import { DishForm } from "./DishForm";
import { OptimizedImage } from "../common/OptimizedImage";
import { Skeleton, SkeletonCard } from "../common/Skeleton";
import "./MenuManagement.css";

export function MenuManagement() {
  const { restaurantId } = useAuth();
  const { data: dishes = [], isLoading } = useRestaurantDishes(restaurantId);
  const { showToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const createDish = useCreateDish();
  const updateDish = useUpdateDish();
  const deleteDish = useDeleteDish();

  // Retry-Logik für Mutations
  const retryCreate = useRetry(
    async (data: FormData) => {
      return await createDish.mutateAsync(data);
    },
    { maxRetries: 3, retryDelay: 1000, exponentialBackoff: true },
  );

  const retryUpdate = useRetry(
    async ({
      id,
      updates,
    }: {
      id: string;
      updates: FormData | Partial<Dish>;
    }) => {
      return await updateDish.mutateAsync({ id, updates });
    },
    { maxRetries: 3, retryDelay: 1000, exponentialBackoff: true },
  );

  const retryDelete = useRetry(
    async (id: string) => {
      return await deleteDish.mutateAsync(id);
    },
    { maxRetries: 3, retryDelay: 1000, exponentialBackoff: true },
  );

  const categories = Array.from(new Set(dishes.map((d) => d.category))).sort();
  const filteredDishes =
    categoryFilter === "all"
      ? dishes
      : dishes.filter((d) => d.category === categoryFilter);

  const handleCreate = async (data: FormData) => {
    try {
      await retryCreate.execute(data);
      showToast("Gericht erfolgreich erstellt!", "success");
      setShowForm(false);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Fehler beim Erstellen";
      showToast(errorMessage, "error");
    }
  };

  const handleUpdate = async (id: string, data: FormData | Partial<Dish>) => {
    try {
      await retryUpdate.execute({ id, updates: data });
      showToast("Gericht erfolgreich aktualisiert!", "success");
      setEditingDish(null);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Fehler beim Aktualisieren";
      showToast(errorMessage, "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Möchten Sie dieses Gericht wirklich löschen?")) return;
    try {
      await retryDelete.execute(id);
      showToast("Gericht erfolgreich gelöscht!", "success");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Fehler beim Löschen";
      showToast(errorMessage, "error");
    }
  };

  const handleToggleAvailability = async (dish: Dish) => {
    await handleUpdate(dish.id, { isAvailable: !dish.isAvailable });
  };

  if (isLoading) {
    return (
      <div className="menu-management">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <Skeleton variant="text" width="250px" height={32} />
          <div style={{ display: "flex", gap: "12px" }}>
            <Skeleton variant="rectangular" width="150px" height={40} />
            <Skeleton variant="rectangular" width="140px" height={40} />
          </div>
        </div>
        <div className="dishes-grid">
          {Array.from({ length: 6 }).map((_, idx) => (
            <SkeletonCard key={idx} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="menu-management">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <h1
          style={{
            fontSize: "var(--fb-font-size-2xl)",
            fontWeight: 700,
            margin: 0,
          }}
        >
          Menü-Verwaltung ({dishes.length} Gerichte)
        </h1>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="fb-input"
            style={{ width: "auto" }}
          >
            <option value="all">Alle Kategorien</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              setEditingDish(null);
              setShowForm(true);
            }}
            className="fb-button"
            {...getAccessibleButtonProps(
              "Neues Gericht erstellen",
              "Öffnet das Formular zum Erstellen eines neuen Gerichts",
            )}
          >
            + Neues Gericht
          </button>
        </div>
      </div>

      {showForm && (
        <DishForm
          dish={editingDish}
          restaurantId={restaurantId || ""}
          onSubmit={
            editingDish
              ? (data) => handleUpdate(editingDish.id, data)
              : handleCreate
          }
          onCancel={() => {
            setShowForm(false);
            setEditingDish(null);
          }}
        />
      )}

      <div className="dishes-grid">
        {filteredDishes.map((dish) => (
          <div key={dish.id} className="dish-card">
            {dish.imageUrl && (
              <OptimizedImage
                src={dish.imageUrl}
                alt={dish.name}
                className="dish-image"
                aspectRatio="16/9"
                objectFit="cover"
              />
            )}
            <div className="dish-content">
              <div className="dish-header">
                <h3>{dish.name}</h3>
                <span
                  className={`dish-status ${dish.isAvailable ? "available" : "unavailable"}`}
                >
                  {dish.isAvailable ? "✓ Verfügbar" : "✕ Nicht verfügbar"}
                </span>
              </div>
              <p className="dish-description">{dish.description}</p>
              <div className="dish-footer">
                <div className="dish-info">
                  <span className="dish-category">{dish.category}</span>
                  <span className="dish-price">
                    {formatCurrency(dish.price)}
                  </span>
                </div>
                <div className="dish-actions">
                  <button
                    onClick={() => handleToggleAvailability(dish)}
                    className={`fb-button-secondary ${dish.isAvailable ? "unavailable-btn" : "available-btn"}`}
                    style={{
                      fontSize: "var(--fb-font-size-sm)",
                      padding: "6px 12px",
                    }}
                    {...getAccessibleButtonProps(
                      dish.isAvailable
                        ? `Verfügbarkeit für ${dish.name} ausschalten`
                        : `Verfügbarkeit für ${dish.name} einschalten`,
                    )}
                  >
                    {dish.isAvailable
                      ? "Verfügbarkeit aus"
                      : "Verfügbarkeit an"}
                  </button>
                  <button
                    onClick={() => {
                      setEditingDish(dish);
                      setShowForm(true);
                    }}
                    className="fb-button-secondary"
                    style={{
                      fontSize: "var(--fb-font-size-sm)",
                      padding: "6px 12px",
                    }}
                    {...getAccessibleButtonProps(
                      `Gericht ${dish.name} bearbeiten`,
                    )}
                  >
                    Bearbeiten
                  </button>
                  <button
                    onClick={() => handleDelete(dish.id)}
                    className="fb-button-secondary"
                    style={{
                      fontSize: "var(--fb-font-size-sm)",
                      padding: "6px 12px",
                      color: "var(--fb-error)",
                    }}
                    {...getAccessibleButtonProps(
                      `Gericht ${dish.name} löschen`,
                      "Löscht das Gericht dauerhaft",
                    )}
                  >
                    Löschen
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredDishes.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "var(--fb-space-8)",
            color: "var(--fb-text-secondary)",
          }}
        >
          {categoryFilter === "all"
            ? "Keine Gerichte vorhanden"
            : "Keine Gerichte in dieser Kategorie"}
        </div>
      )}
    </div>
  );
}
