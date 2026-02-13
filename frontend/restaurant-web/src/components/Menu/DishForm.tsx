import { useState, useEffect } from "react";
import { Dish } from "../../hooks/useMenu";
import { useToast } from "../../contexts/ToastContext";
import "./DishForm.css";

interface DishFormProps {
  dish?: Dish | null;
  restaurantId: string;
  onSubmit: (data: FormData) => void;
  onCancel: () => void;
}

const ALLERGEN_OPTIONS = [
  "gluten",
  "lactose",
  "nuts",
  "soy",
  "eggs",
  "fish",
  "shellfish",
  "sesame",
];

const DIETARY_OPTIONS = [
  "vegetarian",
  "vegan",
  "halal",
  "kosher",
  "glutenFree",
  "dairyFree",
];

const TAG_OPTIONS = [
  "vegetarisch",
  "vegan",
  "glutenfrei",
  "laktosefrei",
  "scharf",
  "mild",
  "gesund",
  "schnell",
  "empfohlen",
  "neu",
  "beliebt",
];

export function DishForm({
  dish,
  restaurantId,
  onSubmit,
  onCancel,
}: DishFormProps) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<"basic" | "details" | "nutrition">(
    "basic",
  );

  const [formData, setFormData] = useState({
    name: dish?.name || "",
    description: dish?.description || "",
    price: dish?.price || 0,
    category: dish?.category || "",
    isAvailable: dish?.isAvailable ?? true,
    // Erweiterte Felder
    ingredients: dish?.ingredients || "",
    preparationTime: dish?.preparationTime || null,
    spiceLevel: dish?.spiceLevel || null,
    servingSize: dish?.servingSize || "",
    tags: dish?.tags || [],
    allergens: dish?.allergens || {},
    dietaryInfo: dish?.dietaryInfo || {},
    calories: dish?.calories || null,
    protein: dish?.protein || null,
    carbs: dish?.carbs || null,
    fat: dish?.fat || null,
    fiber: dish?.fiber || null,
    sugar: dish?.sugar || null,
    sodium: dish?.sodium || null,
  });

  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    dish?.imageUrl || null,
  );

  useEffect(() => {
    if (dish) {
      setFormData({
        name: dish.name,
        description: dish.description,
        price: dish.price,
        category: dish.category,
        isAvailable: dish.isAvailable,
        ingredients: dish.ingredients || "",
        preparationTime: dish.preparationTime || null,
        spiceLevel: dish.spiceLevel || null,
        servingSize: dish.servingSize || "",
        tags: dish.tags || [],
        allergens: dish.allergens || {},
        dietaryInfo: dish.dietaryInfo || {},
        calories: dish.calories || null,
        protein: dish.protein || null,
        carbs: dish.carbs || null,
        fat: dish.fat || null,
        fiber: dish.fiber || null,
        sugar: dish.sugar || null,
        sodium: dish.sodium || null,
      });
      setImagePreview(dish.imageUrl || null);
    }
  }, [dish]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTagToggle = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.includes(tag)
        ? formData.tags.filter((t) => t !== tag)
        : [...formData.tags, tag],
    });
  };

  const handleAllergenToggle = (allergen: string) => {
    setFormData({
      ...formData,
      allergens: {
        ...formData.allergens,
        [allergen]: !formData.allergens[allergen],
      },
    });
  };

  const handleDietaryToggle = (dietary: string) => {
    setFormData({
      ...formData,
      dietaryInfo: {
        ...formData.dietaryInfo,
        [dietary]: !formData.dietaryInfo[dietary],
      },
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.category || formData.price <= 0) {
      showToast("Bitte füllen Sie alle Pflichtfelder aus", "error");
      return;
    }

    const data = new FormData();
    data.append("restaurantId", restaurantId);
    data.append("name", formData.name);
    data.append("description", formData.description || "");
    data.append("price", formData.price.toString());
    data.append("category", formData.category);
    data.append("isAvailable", formData.isAvailable.toString());

    // Erweiterte Felder
    if (formData.ingredients) {
      data.append("ingredients", formData.ingredients);
    }
    if (formData.preparationTime) {
      data.append("preparationTime", formData.preparationTime.toString());
    }
    if (formData.spiceLevel !== null) {
      data.append("spiceLevel", formData.spiceLevel.toString());
    }
    if (formData.servingSize) {
      data.append("servingSize", formData.servingSize);
    }
    if (formData.tags.length > 0) {
      data.append("tags", JSON.stringify(formData.tags));
    }
    if (Object.keys(formData.allergens).length > 0) {
      data.append("allergens", JSON.stringify(formData.allergens));
    }
    if (Object.keys(formData.dietaryInfo).length > 0) {
      data.append("dietaryInfo", JSON.stringify(formData.dietaryInfo));
    }
    if (formData.calories) {
      data.append("calories", formData.calories.toString());
    }
    if (formData.protein) {
      data.append("protein", formData.protein.toString());
    }
    if (formData.carbs) {
      data.append("carbs", formData.carbs.toString());
    }
    if (formData.fat) {
      data.append("fat", formData.fat.toString());
    }
    if (formData.fiber) {
      data.append("fiber", formData.fiber.toString());
    }
    if (formData.sugar) {
      data.append("sugar", formData.sugar.toString());
    }
    if (formData.sodium) {
      data.append("sodium", formData.sodium.toString());
    }

    if (image) {
      data.append("image", image);
    }

    onSubmit(data);
  };

  return (
    <div className="dish-form-container">
      <form onSubmit={handleSubmit} className="dish-form">
        <div className="form-header">
          <h2>{dish ? "Gericht bearbeiten" : "Neues Gericht"}</h2>
          <button type="button" onClick={onCancel} className="modal-close">
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="form-tabs">
          <button
            type="button"
            className={activeTab === "basic" ? "active" : ""}
            onClick={() => setActiveTab("basic")}
          >
            Grunddaten
          </button>
          <button
            type="button"
            className={activeTab === "details" ? "active" : ""}
            onClick={() => setActiveTab("details")}
          >
            Details
          </button>
          <button
            type="button"
            className={activeTab === "nutrition" ? "active" : ""}
            onClick={() => setActiveTab("nutrition")}
          >
            Nährwerte
          </button>
        </div>

        <div className="form-body">
          {/* Tab: Grunddaten */}
          {activeTab === "basic" && (
            <>
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="fb-input"
                  required
                />
              </div>

              <div className="form-group">
                <label>Beschreibung</label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="fb-input"
                  rows={3}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                }}
              >
                <div className="form-group">
                  <label>Preis (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        price: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="fb-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Kategorie *</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className="fb-input"
                    placeholder="z.B. Pizza, Burger, Salat"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Bild</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="fb-input"
                />
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="image-preview"
                  />
                )}
              </div>

              <div className="form-group">
                <label
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <input
                    type="checkbox"
                    checked={formData.isAvailable}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        isAvailable: e.target.checked,
                      })
                    }
                  />
                  Verfügbar
                </label>
              </div>
            </>
          )}

          {/* Tab: Details */}
          {activeTab === "details" && (
            <>
              <div className="form-group">
                <label>Zutaten</label>
                <textarea
                  value={formData.ingredients}
                  onChange={(e) =>
                    setFormData({ ...formData, ingredients: e.target.value })
                  }
                  className="fb-input"
                  rows={4}
                  placeholder="Kommagetrennte Liste, z.B. Tomaten, Mozzarella, Basilikum"
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                }}
              >
                <div className="form-group">
                  <label>Zubereitungszeit (Minuten)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.preparationTime || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        preparationTime: parseInt(e.target.value) || null,
                      })
                    }
                    className="fb-input"
                  />
                </div>

                <div className="form-group">
                  <label>Portionsgröße</label>
                  <input
                    type="text"
                    value={formData.servingSize}
                    onChange={(e) =>
                      setFormData({ ...formData, servingSize: e.target.value })
                    }
                    className="fb-input"
                    placeholder="z.B. 300g, 1 Portion"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Schärfegrad (0-5)</label>
                <input
                  type="range"
                  min="0"
                  max="5"
                  value={formData.spiceLevel || 0}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      spiceLevel: parseInt(e.target.value),
                    })
                  }
                  className="fb-input"
                />
                <div style={{ textAlign: "center", marginTop: "8px" }}>
                  {formData.spiceLevel || 0} / 5
                </div>
              </div>

              <div className="form-group">
                <label>Tags</label>
                <div className="tag-list">
                  {TAG_OPTIONS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className={`tag-button ${formData.tags.includes(tag) ? "active" : ""}`}
                      onClick={() => handleTagToggle(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Allergene</label>
                <div className="checkbox-list">
                  {ALLERGEN_OPTIONS.map((allergen) => (
                    <label
                      key={allergen}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={formData.allergens[allergen] || false}
                        onChange={() => handleAllergenToggle(allergen)}
                      />
                      {allergen}
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Diät-Informationen</label>
                <div className="checkbox-list">
                  {DIETARY_OPTIONS.map((dietary) => (
                    <label
                      key={dietary}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={formData.dietaryInfo[dietary] || false}
                        onChange={() => handleDietaryToggle(dietary)}
                      />
                      {dietary}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Tab: Nährwerte */}
          {activeTab === "nutrition" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
              }}
            >
              <div className="form-group">
                <label>Kalorien (kcal)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.calories || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      calories: parseFloat(e.target.value) || null,
                    })
                  }
                  className="fb-input"
                />
              </div>

              <div className="form-group">
                <label>Protein (g)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.protein || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      protein: parseFloat(e.target.value) || null,
                    })
                  }
                  className="fb-input"
                />
              </div>

              <div className="form-group">
                <label>Kohlenhydrate (g)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.carbs || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      carbs: parseFloat(e.target.value) || null,
                    })
                  }
                  className="fb-input"
                />
              </div>

              <div className="form-group">
                <label>Fett (g)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.fat || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      fat: parseFloat(e.target.value) || null,
                    })
                  }
                  className="fb-input"
                />
              </div>

              <div className="form-group">
                <label>Ballaststoffe (g)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.fiber || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      fiber: parseFloat(e.target.value) || null,
                    })
                  }
                  className="fb-input"
                />
              </div>

              <div className="form-group">
                <label>Zucker (g)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.sugar || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sugar: parseFloat(e.target.value) || null,
                    })
                  }
                  className="fb-input"
                />
              </div>

              <div className="form-group">
                <label>Natrium (mg)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.sodium || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sodium: parseFloat(e.target.value) || null,
                    })
                  }
                  className="fb-input"
                />
              </div>
            </div>
          )}
        </div>

        <div className="form-footer">
          <button
            type="button"
            onClick={onCancel}
            className="fb-button-secondary"
          >
            Abbrechen
          </button>
          <button type="submit" className="fb-button">
            {dish ? "Aktualisieren" : "Erstellen"}
          </button>
        </div>
      </form>
    </div>
  );
}
