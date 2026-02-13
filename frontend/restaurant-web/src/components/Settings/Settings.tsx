import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../utils/api";
import { useRetry } from "../../hooks/useRetry";
import { handleApiError } from "../../utils/errorUtils";
import {
  useRestaurant,
  useOperatingHours,
  useUpdateOperatingHours,
  useDeliveryZones,
  useCreateDeliveryZone,
  useDeleteDeliveryZone,
  useDeliveryFees,
  useSetDeliveryFees,
  useMinimumOrder,
  useUpdateMinimumOrder,
  useCapacity,
  useUpdateCapacity,
  Coordinate,
  DeliveryZone,
  DeliveryFees,
} from "../../hooks/useRestaurant";
import { useToast } from "../../contexts/ToastContext";
import { BusinessHours } from "./BusinessHours";
import { Skeleton, SkeletonCard } from "../common/Skeleton";
import "./Settings.css";

interface BusinessHoursType {
  [key: string]: {
    open: string;
    close: string;
    isClosed: boolean;
  };
}

export function Settings() {
  const { restaurantId } = useAuth();
  const { isLoading } = useRestaurant();
  const { showToast } = useToast();

  // Retry-Logik für Mutations
  const retryUpdateHours = useRetry(
    async ({ restaurantId, hours }: { restaurantId: string; hours: any }) => {
      return await updateOperatingHours.mutateAsync({ restaurantId, hours });
    },
    { maxRetries: 3, retryDelay: 1000, exponentialBackoff: true },
  );

  const retryCreateZone = useRetry(
    async ({ restaurantId, zone }: { restaurantId: string; zone: any }) => {
      return await createDeliveryZone.mutateAsync({ restaurantId, zone });
    },
    { maxRetries: 3, retryDelay: 1000, exponentialBackoff: true },
  );

  const retryDeleteZone = useRetry(
    async ({
      restaurantId,
      zoneId,
    }: {
      restaurantId: string;
      zoneId: string;
    }) => {
      return await deleteDeliveryZone.mutateAsync({ restaurantId, zoneId });
    },
    { maxRetries: 3, retryDelay: 1000, exponentialBackoff: true },
  );

  const retrySetFees = useRetry(
    async ({
      restaurantId,
      fees,
    }: {
      restaurantId: string;
      fees: DeliveryFees;
    }) => {
      return await setDeliveryFees.mutateAsync({ restaurantId, fees });
    },
    { maxRetries: 3, retryDelay: 1000, exponentialBackoff: true },
  );

  const retryUpdateMinOrder = useRetry(
    async ({
      restaurantId,
      minOrderAmount,
    }: {
      restaurantId: string;
      minOrderAmount: number;
    }) => {
      return await updateMinimumOrder.mutateAsync({
        restaurantId,
        minOrderAmount,
      });
    },
    { maxRetries: 3, retryDelay: 1000, exponentialBackoff: true },
  );

  const retryUpdateCapacity = useRetry(
    async ({
      restaurantId,
      capacity,
    }: {
      restaurantId: string;
      capacity: any;
    }) => {
      return await updateCapacity.mutateAsync({ restaurantId, capacity });
    },
    { maxRetries: 3, retryDelay: 1000, exponentialBackoff: true },
  );
  // Use new hooks
  const { data: operatingHoursData } = useOperatingHours(restaurantId);
  const updateOperatingHours = useUpdateOperatingHours();
  const { data: deliveryZones = [] } = useDeliveryZones(restaurantId);
  const createDeliveryZone = useCreateDeliveryZone();
  const deleteDeliveryZone = useDeleteDeliveryZone();
  const { data: deliveryFeesData } = useDeliveryFees(restaurantId);
  const setDeliveryFees = useSetDeliveryFees();
  const { data: minimumOrderData } = useMinimumOrder(restaurantId);
  const updateMinimumOrder = useUpdateMinimumOrder();
  const { data: capacityData } = useCapacity(restaurantId);
  const updateCapacity = useUpdateCapacity();

  const [businessHours, setBusinessHours] = useState<BusinessHoursType>({
    monday: { open: "09:00", close: "22:00", isClosed: false },
    tuesday: { open: "09:00", close: "22:00", isClosed: false },
    wednesday: { open: "09:00", close: "22:00", isClosed: false },
    thursday: { open: "09:00", close: "22:00", isClosed: false },
    friday: { open: "09:00", close: "22:00", isClosed: false },
    saturday: { open: "10:00", close: "23:00", isClosed: false },
    sunday: { open: "10:00", close: "22:00", isClosed: false },
  });
  const [holidays, setHolidays] = useState<string[]>([]);
  const [newHoliday, setNewHoliday] = useState("");
  const [editingHours, setEditingHours] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "hours" | "delivery" | "capacity" | "fees"
  >("hours");

  // Delivery Zones State
  const [showZoneDialog, setShowZoneDialog] = useState(false);
  const [_editingZone, _setEditingZone] = useState<DeliveryZone | null>(null);
  const [zoneName, setZoneName] = useState("");
  const [zoneFee, setZoneFee] = useState(0);
  const [zoneCoordinatesInput, setZoneCoordinatesInput] = useState("");

  // Delivery Fees State
  const [fees, setFees] = useState<DeliveryFees>({
    baseFee: 0,
    perKmFee: 0,
    minOrderAmount: 0,
  });
  const [editingFees, setEditingFees] = useState(false);

  // Minimum Order State
  const [minOrderAmount, setMinOrderAmount] = useState(0);
  const [editingMinOrder, setEditingMinOrder] = useState(false);

  // Capacity State
  const [capacity, setCapacity] = useState({
    maxOrders: 50,
    maxConcurrentOrders: 10,
  });
  const [editingCapacity, setEditingCapacity] = useState(false);

  // Load operating hours from API
  useEffect(() => {
    if (operatingHoursData) {
      setBusinessHours(operatingHoursData as any);
    }
  }, [operatingHoursData]);

  // Load delivery fees
  useEffect(() => {
    if (deliveryFeesData) {
      setFees(deliveryFeesData);
    }
  }, [deliveryFeesData]);

  // Load minimum order
  useEffect(() => {
    if (minimumOrderData) {
      setMinOrderAmount(minimumOrderData.minOrderAmount);
    }
  }, [minimumOrderData]);

  // Load capacity
  useEffect(() => {
    if (capacityData) {
      setCapacity({
        maxOrders: capacityData.maxOrders,
        maxConcurrentOrders: capacityData.maxConcurrentOrders,
      });
    }
  }, [capacityData]);

  const saveBusinessHours = async () => {
    if (!restaurantId) return;
    try {
      setSaving(true);
      await retryUpdateHours.execute({
        restaurantId,
        hours: businessHours as any,
      });
      showToast("Öffnungszeiten erfolgreich gespeichert!", "success");
      setEditingHours(false);
    } catch (error: unknown) {
      const appError = handleApiError(error);
      showToast(appError.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const isRestaurantOpen = () => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    if (holidays.includes(todayStr)) return false;

    const day = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ][now.getDay()];
    const hours = businessHours[day];

    if (hours.isClosed) return false;

    const [openHour, openMin] = hours.open.split(":").map(Number);
    const [closeHour, closeMin] = hours.close.split(":").map(Number);
    const nowTime = now.getHours() * 60 + now.getMinutes();
    const openTime = openHour * 60 + openMin;
    const closeTime = closeHour * 60 + closeMin;

    return nowTime >= openTime && nowTime <= closeTime;
  };

  const addHoliday = async () => {
    if (!newHoliday || !restaurantId) return;
    if (holidays.includes(newHoliday)) {
      showToast("Dieses Datum ist bereits als Feiertag eingetragen", "error");
      return;
    }
    const updated = [...holidays, newHoliday].sort();
    setHolidays(updated);
    setNewHoliday("");

    try {
      await api.put(`/settings/restaurant_${restaurantId}_holidays`, {
        value: JSON.stringify(updated),
        category: "RESTAURANT",
        description: "Feiertage des Restaurants",
      });
      showToast("Feiertag hinzugefügt", "success");
    } catch (error: unknown) {
      const appError = handleApiError(error);
      showToast(appError.message, "error");
      setHolidays(holidays);
    }
  };

  const removeHoliday = async (date: string) => {
    if (!restaurantId) return;
    const updated = holidays.filter((h) => h !== date);
    setHolidays(updated);

    try {
      await api.put(`/settings/restaurant_${restaurantId}_holidays`, {
        value: JSON.stringify(updated),
        category: "RESTAURANT",
        description: "Feiertage des Restaurants",
      });
      showToast("Feiertag entfernt", "success");
    } catch (error: unknown) {
      const appError = handleApiError(error);
      showToast(appError.message, "error");
      setHolidays(holidays);
    }
  };

  if (isLoading) {
    return (
      <div className="settings">
        <div style={{ marginBottom: "24px" }}>
          <Skeleton
            variant="text"
            width="200px"
            height={32}
          />
        </div>
        <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton
              key={idx}
              variant="rectangular"
              width="120px"
              height={40}
            />
          ))}
        </div>
        <SkeletonCard />
      </div>
    );
  }

  const handleSaveDeliveryFees = async () => {
    if (!restaurantId) return;
    try {
      await retrySetFees.execute({ restaurantId, fees });
      setEditingFees(false);
      showToast("Liefergebühren gespeichert", "success");
    } catch (error: unknown) {
      const appError = handleApiError(error);
      showToast(appError.message, "error");
    }
  };

  const handleSaveMinimumOrder = async () => {
    if (!restaurantId) return;
    try {
      await retryUpdateMinOrder.execute({ restaurantId, minOrderAmount });
      setEditingMinOrder(false);
      showToast("Mindestbestellwert gespeichert", "success");
    } catch (error: unknown) {
      const appError = handleApiError(error);
      showToast(appError.message, "error");
    }
  };

  const handleSaveCapacity = async () => {
    if (!restaurantId) return;
    try {
      await retryUpdateCapacity.execute({ restaurantId, capacity });
      setEditingCapacity(false);
      showToast("Kapazität gespeichert", "success");
    } catch (error: unknown) {
      const appError = handleApiError(error);
      showToast(appError.message, "error");
    }
  };

  const parseZoneCoordinates = (value: string): Coordinate[] => {
    const lines = value
      .replace(/;/g, "\n")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const coords = lines.map((line) => {
      const [latStr, lngStr] = line.split(",").map((p) => p.trim());
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);

      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
      ) {
        throw new Error(`Ungültige Koordinate: "${line}"`);
      }

      return { lat, lng };
    });

    if (coords.length < 3) {
      throw new Error("Mindestens 3 Koordinaten für eine Zone angeben");
    }

    return coords;
  };

  const handleCreateZone = async () => {
    if (!restaurantId || !zoneName.trim() || zoneFee < 0) {
      showToast("Bitte füllen Sie alle Felder aus", "error");
      return;
    }

    let coordinates: Coordinate[] = [];
    try {
      coordinates = parseZoneCoordinates(zoneCoordinatesInput);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Koordinaten konnten nicht gelesen werden";
      showToast(errorMessage, "error");
      return;
    }

    try {
      await retryCreateZone.execute({
        restaurantId,
        zone: {
          name: zoneName,
          coordinates,
          fee: zoneFee,
        },
      });
      setShowZoneDialog(false);
      setZoneName("");
      setZoneFee(0);
      setZoneCoordinatesInput("");
      showToast("Lieferzone erstellt", "success");
    } catch (error: unknown) {
      const appError = handleApiError(error);
      showToast(appError.message, "error");
    }
  };

  const handleDeleteZone = async (zoneId: string) => {
    if (!restaurantId || !confirm("Lieferzone wirklich löschen?")) return;
    try {
      await retryDeleteZone.execute({ restaurantId, zoneId });
      showToast("Lieferzone gelöscht", "success");
    } catch (error: unknown) {
      const appError = handleApiError(error);
      showToast(appError.message, "error");
    }
  };

  return (
    <div className="settings">
      <h1
        style={{
          fontSize: "var(--fb-font-size-2xl)",
          fontWeight: 700,
          marginBottom: "24px",
        }}
      >
        Einstellungen
      </h1>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--fb-border)",
          marginBottom: "24px",
        }}
      >
        {["hours", "delivery", "capacity", "fees"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            style={{
              padding: "12px 20px",
              border: "none",
              background: "none",
              borderBottom:
                activeTab === tab
                  ? "2px solid var(--fb-primary)"
                  : "2px solid transparent",
              color:
                activeTab === tab
                  ? "var(--fb-primary)"
                  : "var(--fb-text-secondary)",
              fontWeight: activeTab === tab ? 600 : 400,
              cursor: "pointer",
            }}
          >
            {tab === "hours"
              ? "Öffnungszeiten"
              : tab === "delivery"
                ? "Lieferzonen"
                : tab === "capacity"
                  ? "Kapazität"
                  : "Gebühren"}
          </button>
        ))}
      </div>

      {activeTab === "hours" && (
        <div className="settings-section">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            <h2>Öffnungszeiten</h2>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  padding: "6px 12px",
                  borderRadius: "var(--fb-radius-base)",
                  backgroundColor: isRestaurantOpen()
                    ? "var(--fb-success)"
                    : "var(--fb-error)",
                  color: "white",
                  fontSize: "var(--fb-font-size-sm)",
                  fontWeight: 600,
                }}
              >
                {isRestaurantOpen()
                  ? "🟢 Jetzt geöffnet"
                  : "🔴 Jetzt geschlossen"}
              </div>
              {!editingHours && (
                <button
                  onClick={() => setEditingHours(true)}
                  className="fb-button"
                >
                  Bearbeiten
                </button>
              )}
            </div>
          </div>

          {!editingHours ? (
            <div
              style={{
                padding: "16px",
                backgroundColor: "var(--fb-bg-secondary)",
                borderRadius: "var(--fb-radius-md)",
              }}
            >
              <div style={{ display: "grid", gap: "8px" }}>
                {Object.entries(businessHours).map(([day, hours]) => (
                  <div
                    key={day}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "var(--fb-font-size-base)",
                    }}
                  >
                    <span
                      style={{ textTransform: "capitalize", fontWeight: 600 }}
                    >
                      {day === "monday"
                        ? "Montag"
                        : day === "tuesday"
                          ? "Dienstag"
                          : day === "wednesday"
                            ? "Mittwoch"
                            : day === "thursday"
                              ? "Donnerstag"
                              : day === "friday"
                                ? "Freitag"
                                : day === "saturday"
                                  ? "Samstag"
                                  : "Sonntag"}
                    </span>
                    <span>
                      {hours.isClosed
                        ? "Geschlossen"
                        : `${hours.open} - ${hours.close}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <BusinessHours
              businessHours={businessHours}
              setBusinessHours={setBusinessHours}
              holidays={holidays}
              newHoliday={newHoliday}
              setNewHoliday={setNewHoliday}
              onSave={saveBusinessHours}
              onCancel={() => {
                setEditingHours(false);
                if (operatingHoursData) {
                  setBusinessHours(operatingHoursData as any);
                }
              }}
              onAddHoliday={addHoliday}
              onRemoveHoliday={removeHoliday}
              saving={saving}
            />
          )}
        </div>
      )}

      {activeTab === "delivery" && (
        <div className="settings-section">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            <h2>Lieferzonen</h2>
            <button
              onClick={() => setShowZoneDialog(true)}
              className="fb-button"
            >
              + Neue Zone
            </button>
          </div>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            {deliveryZones.map((zone) => (
              <div
                key={zone.id}
                style={{
                  padding: "16px",
                  backgroundColor: "var(--fb-bg-secondary)",
                  borderRadius: "var(--fb-radius-md)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, marginBottom: "4px" }}>
                    {zone.name}
                  </div>
                  <div
                    style={{
                      fontSize: "var(--fb-font-size-sm)",
                      color: "var(--fb-text-secondary)",
                    }}
                  >
                    Gebühr:{" "}
                    {new Intl.NumberFormat("de-DE", {
                      style: "currency",
                      currency: "EUR",
                    }).format(zone.fee)}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteZone(zone.id)}
                  className="fb-button-secondary"
                  style={{ backgroundColor: "var(--fb-error)" }}
                >
                  Löschen
                </button>
              </div>
            ))}
            {deliveryZones.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  padding: "48px",
                  color: "var(--fb-text-secondary)",
                }}
              >
                Noch keine Lieferzonen erstellt
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "capacity" && (
        <div className="settings-section">
          <h2 style={{ marginBottom: "20px" }}>Kapazität</h2>
          {capacityData && (
            <div
              style={{
                padding: "16px",
                backgroundColor: "var(--fb-bg-secondary)",
                borderRadius: "var(--fb-radius-md)",
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <span>Aktuelle Bestellungen:</span>
                <span style={{ fontWeight: 600 }}>
                  {capacityData.currentOrders}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <span>Maximale Bestellungen:</span>
                <span style={{ fontWeight: 600 }}>
                  {capacityData.maxOrders}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Max. gleichzeitige Bestellungen:</span>
                <span style={{ fontWeight: 600 }}>
                  {capacityData.maxConcurrentOrders}
                </span>
              </div>
            </div>
          )}
          {!editingCapacity ? (
            <button
              onClick={() => setEditingCapacity(true)}
              className="fb-button"
            >
              Bearbeiten
            </button>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: 600,
                  }}
                >
                  Maximale Bestellungen
                </label>
                <input
                  type="number"
                  value={capacity.maxOrders}
                  onChange={(e) =>
                    setCapacity({
                      ...capacity,
                      maxOrders: parseInt(e.target.value) || 0,
                    })
                  }
                  className="fb-input"
                  min="0"
                  max="1000"
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: 600,
                  }}
                >
                  Max. gleichzeitige Bestellungen
                </label>
                <input
                  type="number"
                  value={capacity.maxConcurrentOrders}
                  onChange={(e) =>
                    setCapacity({
                      ...capacity,
                      maxConcurrentOrders: parseInt(e.target.value) || 0,
                    })
                  }
                  className="fb-input"
                  min="0"
                  max="100"
                />
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={handleSaveCapacity}
                  className="fb-button"
                  disabled={updateCapacity.isPending}
                >
                  Speichern
                </button>
                <button
                  onClick={() => {
                    setEditingCapacity(false);
                    if (capacityData)
                      setCapacity({
                        maxOrders: capacityData.maxOrders,
                        maxConcurrentOrders: capacityData.maxConcurrentOrders,
                      });
                  }}
                  className="fb-button-secondary"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "fees" && (
        <div className="settings-section">
          <h2 style={{ marginBottom: "20px" }}>
            Liefergebühren & Mindestbestellwert
          </h2>

          {/* Delivery Fees */}
          <div style={{ marginBottom: "32px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <h3>Liefergebühren</h3>
              {!editingFees && (
                <button
                  onClick={() => setEditingFees(true)}
                  className="fb-button"
                >
                  Bearbeiten
                </button>
              )}
            </div>
            {!editingFees ? (
              <div
                style={{
                  padding: "16px",
                  backgroundColor: "var(--fb-bg-secondary)",
                  borderRadius: "var(--fb-radius-md)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <span>Basisgebühr:</span>
                  <span style={{ fontWeight: 600 }}>
                    {new Intl.NumberFormat("de-DE", {
                      style: "currency",
                      currency: "EUR",
                    }).format(fees.baseFee)}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <span>Gebühr pro Kilometer:</span>
                  <span style={{ fontWeight: 600 }}>
                    {new Intl.NumberFormat("de-DE", {
                      style: "currency",
                      currency: "EUR",
                    }).format(fees.perKmFee)}
                  </span>
                </div>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span>Mindestbestellwert:</span>
                  <span style={{ fontWeight: 600 }}>
                    {new Intl.NumberFormat("de-DE", {
                      style: "currency",
                      currency: "EUR",
                    }).format(fees.minOrderAmount)}
                  </span>
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  padding: "16px",
                  backgroundColor: "var(--fb-bg-secondary)",
                  borderRadius: "var(--fb-radius-md)",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: 600,
                    }}
                  >
                    Basisgebühr (€)
                  </label>
                  <input
                    type="number"
                    value={fees.baseFee}
                    onChange={(e) =>
                      setFees({
                        ...fees,
                        baseFee: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="fb-input"
                    min="0"
                    max="100"
                    step="0.01"
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: 600,
                    }}
                  >
                    Gebühr pro Kilometer (€)
                  </label>
                  <input
                    type="number"
                    value={fees.perKmFee}
                    onChange={(e) =>
                      setFees({
                        ...fees,
                        perKmFee: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="fb-input"
                    min="0"
                    max="10"
                    step="0.01"
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: 600,
                    }}
                  >
                    Mindestbestellwert (€)
                  </label>
                  <input
                    type="number"
                    value={fees.minOrderAmount}
                    onChange={(e) =>
                      setFees({
                        ...fees,
                        minOrderAmount: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="fb-input"
                    min="0"
                    max="1000"
                    step="0.01"
                  />
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={handleSaveDeliveryFees}
                    className="fb-button"
                    disabled={setDeliveryFees.isPending}
                  >
                    Speichern
                  </button>
                  <button
                    onClick={() => {
                      setEditingFees(false);
                      if (deliveryFeesData) setFees(deliveryFeesData);
                    }}
                    className="fb-button-secondary"
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Minimum Order */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <h3>Mindestbestellwert</h3>
              {!editingMinOrder && (
                <button
                  onClick={() => setEditingMinOrder(true)}
                  className="fb-button"
                >
                  Bearbeiten
                </button>
              )}
            </div>
            {!editingMinOrder ? (
              <div
                style={{
                  padding: "16px",
                  backgroundColor: "var(--fb-bg-secondary)",
                  borderRadius: "var(--fb-radius-md)",
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: "var(--fb-font-size-lg)",
                  }}
                >
                  {new Intl.NumberFormat("de-DE", {
                    style: "currency",
                    currency: "EUR",
                  }).format(minOrderAmount)}
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  padding: "16px",
                  backgroundColor: "var(--fb-bg-secondary)",
                  borderRadius: "var(--fb-radius-md)",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: 600,
                    }}
                  >
                    Mindestbestellwert (€)
                  </label>
                  <input
                    type="number"
                    value={minOrderAmount}
                    onChange={(e) =>
                      setMinOrderAmount(parseFloat(e.target.value) || 0)
                    }
                    className="fb-input"
                    min="0"
                    max="1000"
                    step="0.01"
                  />
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={handleSaveMinimumOrder}
                    className="fb-button"
                    disabled={updateMinimumOrder.isPending}
                  >
                    Speichern
                  </button>
                  <button
                    onClick={() => {
                      setEditingMinOrder(false);
                      if (minimumOrderData)
                        setMinOrderAmount(minimumOrderData.minOrderAmount);
                    }}
                    className="fb-button-secondary"
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Zone Dialog */}
      {showZoneDialog && (
        <div className="modal-overlay" onClick={() => setShowZoneDialog(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: "500px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Neue Lieferzone</h2>
              <button
                onClick={() => setShowZoneDialog(false)}
                className="modal-close"
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: 600,
                  }}
                >
                  Zonenname
                </label>
                <input
                  type="text"
                  value={zoneName}
                  onChange={(e) => setZoneName(e.target.value)}
                  className="fb-input"
                  placeholder="z.B. Innenstadt"
                />
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: 600,
                  }}
                >
                  Gebühr (€)
                </label>
                <input
                  type="number"
                  value={zoneFee}
                  onChange={(e) => setZoneFee(parseFloat(e.target.value) || 0)}
                  className="fb-input"
                  min="0"
                  max="50"
                  step="0.01"
                />
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: 600,
                  }}
                >
                  Koordinaten (lat,lng pro Zeile)
                </label>
                <textarea
                  value={zoneCoordinatesInput}
                  onChange={(e) => setZoneCoordinatesInput(e.target.value)}
                  className="fb-input"
                  style={{ minHeight: "100px", fontFamily: "monospace" }}
                  placeholder={
                    "52.5200,13.4050\n52.5150,13.4100\n52.5180,13.4150"
                  }
                />
                <div
                  style={{
                    marginTop: "6px",
                    fontSize: "var(--fb-font-size-sm)",
                    color: "var(--fb-text-secondary)",
                  }}
                >
                  Mindestens 3 Punkte, jeweils „Breite,Länge“, getrennt durch
                  Zeilen.
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => setShowZoneDialog(false)}
                className="fb-button-secondary"
              >
                Abbrechen
              </button>
              <button
                onClick={handleCreateZone}
                className="fb-button"
                disabled={
                  !zoneName.trim() ||
                  zoneFee < 0 ||
                  !zoneCoordinatesInput.trim() ||
                  createDeliveryZone.isPending
                }
              >
                Erstellen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
