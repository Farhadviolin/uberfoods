import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useRestaurant, useUpdateRestaurant } from "../../hooks/useRestaurant";
import { useToast } from "../../contexts/ToastContext";
import { useRetry } from "../../hooks/useRetry";
import api from "../../utils/api";
import { OptimizedImage } from "../common/OptimizedImage";
import { Skeleton, SkeletonCard } from "../common/Skeleton";
import "./Profile.css";

export function Profile() {
  const { restaurantId } = useAuth();
  const { data: restaurant, isLoading } = useRestaurant();
  const updateRestaurant = useUpdateRestaurant();
  const { showToast } = useToast();
  const [editing, setEditing] = useState(false);

  // Retry-Logik für Mutations
  const retryUpdate = useRetry(
    async (data: any) => {
      return await updateRestaurant.mutateAsync(data);
    },
    { maxRetries: 3, retryDelay: 1000, exponentialBackoff: true },
  );

  const retryUpload = useRetry(
    async (formData: FormData) => {
      return await api.post("/upload/restaurant", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    { maxRetries: 3, retryDelay: 2000, exponentialBackoff: true },
  );
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    address: "",
    phone: "",
    email: "",
  });

  useEffect(() => {
    if (restaurant && !editing) {
      setFormData({
        name: restaurant.name || "",
        description: restaurant.description || "",
        address: restaurant.address || "",
        phone: restaurant.phone || "",
        email: restaurant.email || "",
      });
      if (restaurant.imageUrl) {
        setImagePreview(
          `${(import.meta as any).env?.VITE_API_URL || "http://localhost:3000"}${restaurant.imageUrl}`,
        );
      }
    }
  }, [restaurant, editing]);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validierung: Dateityp
      if (!file.type.startsWith("image/")) {
        showToast("Bitte wählen Sie eine Bilddatei aus", "error");
        return;
      }

      // Validierung: Dateigröße (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showToast("Bild darf maximal 5MB groß sein", "error");
        return;
      }

      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = async () => {
    if (!image || !restaurantId) return;

    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append("image", image);
      formData.append("type", "restaurant");

      const response = await retryUpload.execute(formData);

      // Aktualisiere Restaurant mit neuem Bild-URL
      await retryUpdate.execute({
        imageUrl: response.data.url,
      });

      showToast("Bild erfolgreich hochgeladen!", "success");
      setImage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error: unknown) {
      let errorMessage = "Fehler beim Hochladen des Bildes";
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: { data?: { message?: string } };
        };
        errorMessage = axiosError.response?.data?.message || errorMessage;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      showToast(errorMessage, "error");
    } finally {
      setUploadingImage(false);
    }
  };

  if (isLoading) {
    return (
      <div className="profile">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <Skeleton variant="text" width="200px" height={32} />
          <Skeleton variant="rectangular" width="120px" height={40} />
        </div>
        <div style={{ marginBottom: "24px", textAlign: "center" }}>
          <Skeleton variant="circular" width={200} height={200} />
        </div>
        <SkeletonCard />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div style={{ textAlign: "center", padding: "var(--fb-space-8)" }}>
        Restaurant nicht gefunden
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId) return;

    try {
      await retryUpdate.execute(formData);
      showToast("Profil erfolgreich aktualisiert!", "success");
      setEditing(false);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Fehler beim Aktualisieren";
      showToast(errorMessage, "error");
    }
  };

  return (
    <div className="profile">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <h1
          style={{
            fontSize: "var(--fb-font-size-2xl)",
            fontWeight: 700,
            margin: 0,
          }}
        >
          Restaurant-Profil
        </h1>
        {!editing && (
          <button onClick={() => setEditing(true)} className="fb-button">
            Bearbeiten
          </button>
        )}
      </div>

      <div style={{ marginBottom: "24px", textAlign: "center" }}>
        {(imagePreview || restaurant.imageUrl) && (
          <div style={{ marginBottom: "16px" }}>
            <OptimizedImage
              src={imagePreview || restaurant.imageUrl || ""}
              alt={restaurant.name}
              style={{
                width: "200px",
                height: "200px",
                objectFit: "cover",
                borderRadius: "var(--fb-radius-md)",
                border: "2px solid var(--fb-border-primary)",
              }}
            />
          </div>
        )}
        {editing && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              style={{ display: "none" }}
              id="image-upload"
            />
            <label
              htmlFor="image-upload"
              className="fb-button-secondary"
              style={{ cursor: "pointer", display: "inline-block" }}
            >
              {image ? "Bild ändern" : "Bild hochladen"}
            </label>
            {image && (
              <button
                onClick={handleImageUpload}
                disabled={uploadingImage}
                className="fb-button"
                style={{ fontSize: "var(--fb-font-size-sm)" }}
              >
                {uploadingImage ? "Wird hochgeladen..." : "Bild speichern"}
              </button>
            )}
          </div>
        )}
      </div>

      {editing ? (
        <form onSubmit={handleSubmit} className="profile-form">
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
              rows={4}
            />
          </div>

          <div className="form-group">
            <label>Adresse *</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              className="fb-input"
              required
            />
          </div>

          <div className="form-group">
            <label>Telefon *</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              className="fb-input"
              required
            />
          </div>

          <div className="form-group">
            <label>E-Mail *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="fb-input"
              required
            />
          </div>

          <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
            <button
              type="submit"
              className="fb-button"
              disabled={updateRestaurant.isPending}
            >
              {updateRestaurant.isPending ? "Speichern..." : "Speichern"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="fb-button-secondary"
            >
              Abbrechen
            </button>
          </div>
        </form>
      ) : (
        <div className="profile-details">
          <div className="profile-section">
            <h3>Allgemeine Informationen</h3>
            <div className="profile-field">
              <span className="field-label">Name:</span>
              <span className="field-value">{restaurant.name}</span>
            </div>
            {restaurant.description && (
              <div className="profile-field">
                <span className="field-label">Beschreibung:</span>
                <span className="field-value">{restaurant.description}</span>
              </div>
            )}
            <div className="profile-field">
              <span className="field-label">Adresse:</span>
              <span className="field-value">{restaurant.address}</span>
            </div>
            <div className="profile-field">
              <span className="field-label">Telefon:</span>
              <span className="field-value">{restaurant.phone}</span>
            </div>
            <div className="profile-field">
              <span className="field-label">E-Mail:</span>
              <span className="field-value">{restaurant.email}</span>
            </div>
            <div className="profile-field">
              <span className="field-label">Status:</span>
              <span className="field-value">
                {restaurant.isActive ? "🟢 Aktiv" : "🔴 Inaktiv"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
