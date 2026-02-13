import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import {
  useOperatingHours,
  useUpdateOperatingHours,
  useDeliveryZones,
  useCreateDeliveryZone,
  OperatingHours,
  Coordinate,
} from "../../hooks/useRestaurant";
import { BusinessHours } from "../Settings/BusinessHours";
import "../Settings/BusinessHours.css";
import "./OnboardingWizard.css";

type Step = 1 | 2 | 3;

const DEFAULT_HOURS: OperatingHours = {
  monday: { open: "09:00", close: "22:00", isClosed: false },
  tuesday: { open: "09:00", close: "22:00", isClosed: false },
  wednesday: { open: "09:00", close: "22:00", isClosed: false },
  thursday: { open: "09:00", close: "22:00", isClosed: false },
  friday: { open: "09:00", close: "23:00", isClosed: false },
  saturday: { open: "10:00", close: "23:00", isClosed: false },
  sunday: { open: "10:00", close: "22:00", isClosed: false },
};

const DEFAULT_ZONE_COORDINATES = [
  { lat: 48.2082, lng: 16.3738 },
  { lat: 48.2182, lng: 16.3838 },
  { lat: 48.2122, lng: 16.3988 },
  { lat: 48.2022, lng: 16.3888 },
];

const extractErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === "object" && error !== null) {
    const maybeResponse = (
      error as { response?: { data?: { message?: string } } }
    ).response;
    const responseMessage = maybeResponse?.data?.message;
    if (typeof responseMessage === "string") {
      return responseMessage;
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
};

interface OnboardingWizardProps {
  onComplete: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { restaurantId } = useAuth();
  const { showToast } = useToast();

  const onboardingKey = useMemo(
    () => (restaurantId ? `restaurant_onboarding_done_${restaurantId}` : ""),
    [restaurantId],
  );

  const [step, setStep] = useState<Step>(1);
  const [businessHours, setBusinessHours] =
    useState<OperatingHours>(DEFAULT_HOURS);
  const [holidays, setHolidays] = useState<string[]>([]);
  const [newHoliday, setNewHoliday] = useState("");
  const [savingHours, setSavingHours] = useState(false);
  const [savingZone, setSavingZone] = useState(false);

  const [zoneName, setZoneName] = useState("Zone 1");
  const [zoneFee, setZoneFee] = useState(0);
  const [zoneCoordinatesInput, setZoneCoordinatesInput] = useState(
    JSON.stringify(DEFAULT_ZONE_COORDINATES, null, 2),
  );

  const { data: operatingHoursData, isLoading: hoursLoading } =
    useOperatingHours(restaurantId);
  const updateOperatingHours = useUpdateOperatingHours();

  const {
    data: deliveryZones = [],
    isLoading: zonesLoading,
    isFetched: zonesFetched,
  } = useDeliveryZones(restaurantId);
  const createDeliveryZone = useCreateDeliveryZone();

  useEffect(() => {
    if (operatingHoursData) {
      setBusinessHours(operatingHoursData as OperatingHours);
    }
  }, [operatingHoursData]);

  useEffect(() => {
    // Auto-complete onboarding if already configured
    if (deliveryZones.length > 0 && onboardingKey) {
      localStorage.setItem(onboardingKey, "true");
      onComplete();
    }
  }, [deliveryZones, onboardingKey, onComplete]);

  const handleAddHoliday = () => {
    if (!newHoliday) return;
    if (holidays.includes(newHoliday)) {
      showToast("Dieses Datum ist bereits eingetragen", "error");
      return;
    }
    setHolidays([...holidays, newHoliday]);
    setNewHoliday("");
  };

  const handleRemoveHoliday = (date: string) => {
    setHolidays(holidays.filter((d) => d !== date));
  };

  const saveHours = async () => {
    if (!restaurantId) return;
    try {
      setSavingHours(true);
      await updateOperatingHours.mutateAsync({
        restaurantId,
        hours: businessHours,
      });
      showToast("Öffnungszeiten gespeichert", "success");
      setStep(2);
    } catch (error: unknown) {
      const message = extractErrorMessage(
        error,
        "Fehler beim Speichern der Öffnungszeiten",
      );
      showToast(message, "error");
    } finally {
      setSavingHours(false);
    }
  };

  const parseCoordinates = (): Coordinate[] | null => {
    try {
      const parsed = JSON.parse(zoneCoordinatesInput);
      if (!Array.isArray(parsed)) {
        showToast("Koordinaten müssen ein Array sein", "error");
        return null;
      }
      const coords = parsed
        .map((c: Partial<Coordinate>) => ({
          lat: Number(c.lat),
          lng: Number(c.lng),
        }))
        .filter(
          (c) =>
            Number.isFinite(c.lat) &&
            Number.isFinite(c.lng) &&
            Math.abs(c.lat) <= 90 &&
            Math.abs(c.lng) <= 180,
        );
      if (coords.length === 0) {
        showToast("Mindestens eine gültige Koordinate erforderlich", "error");
        return null;
      }
      return coords;
    } catch {
      showToast("Koordinaten konnten nicht geparst werden", "error");
      return null;
    }
  };

  const saveZone = async () => {
    if (!restaurantId) return;
    const coords = parseCoordinates();
    if (!coords) return;
    try {
      setSavingZone(true);
      await createDeliveryZone.mutateAsync({
        restaurantId,
        zone: {
          name: zoneName,
          fee: zoneFee,
          coordinates: coords,
        },
      });
      showToast("Lieferzone gespeichert", "success");
      setStep(3);
    } catch (error: unknown) {
      const message = extractErrorMessage(
        error,
        "Fehler beim Speichern der Lieferzone",
      );
      showToast(message, "error");
    } finally {
      setSavingZone(false);
    }
  };

  const completeOnboarding = () => {
    if (onboardingKey) {
      localStorage.setItem(onboardingKey, "true");
    }
    onComplete();
  };

  const canSkipDelivery = zonesFetched && deliveryZones.length > 0;
  const skipDeliveryStep = canSkipDelivery ? () => setStep(3) : undefined;

  return (
    <div className="onboarding-wrapper">
      <div className="onboarding-card">
        <div className="onboarding-header">
          <div>
            <p className="onboarding-eyebrow">Onboarding</p>
            <h1>Basis-Setup für Restaurants</h1>
            <p className="onboarding-subtitle">
              Öffnungszeiten festlegen und erste Lieferzone hinzufügen. Du
              kannst später alles im Tab „Einstellungen“ anpassen.
            </p>
          </div>
          <div className="onboarding-steps">
            <span className={step >= 1 ? "active" : ""}>1</span>
            <div className="onboarding-line" />
            <span className={step >= 2 ? "active" : ""}>2</span>
            <div className="onboarding-line" />
            <span className={step >= 3 ? "active" : ""}>3</span>
          </div>
        </div>

        {step === 1 && (
          <div>
            <h2>Öffnungszeiten</h2>
            <p className="onboarding-helper">
              Lege deine regulären Öffnungszeiten fest. Feiertage kannst du
              optional ergänzen.
            </p>
            <BusinessHours
              businessHours={businessHours as any}
              setBusinessHours={setBusinessHours}
              holidays={holidays}
              newHoliday={newHoliday}
              setNewHoliday={setNewHoliday}
              onAddHoliday={handleAddHoliday}
              onRemoveHoliday={handleRemoveHoliday}
              onSave={saveHours}
              onCancel={() => setStep(2)}
              saving={savingHours || hoursLoading}
            />
            <div className="onboarding-actions">
              <button
                className="fb-button primary"
                onClick={saveHours}
                disabled={savingHours || hoursLoading}
              >
                Öffnungszeiten speichern & weiter
              </button>
              <button
                className="fb-button ghost"
                onClick={() => setStep(2)}
                disabled={savingHours || hoursLoading}
              >
                Schritt überspringen
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2>Lieferzonen</h2>
            <p className="onboarding-helper">
              Lege mindestens eine Lieferzone an. Du kannst später weitere Zonen
              hinzufügen oder anpassen.
            </p>

            {deliveryZones.length > 0 && (
              <div className="onboarding-info">
                Es existiert bereits mindestens eine Lieferzone. Du kannst diese
                übernehmen oder weitere hinzufügen.
              </div>
            )}

            <div className="onboarding-field">
              <label>Zonenname</label>
              <input
                className="fb-input"
                value={zoneName}
                onChange={(e) => setZoneName(e.target.value)}
              />
            </div>
            <div className="onboarding-field">
              <label>Liefergebühr (€)</label>
              <input
                className="fb-input"
                type="number"
                value={zoneFee}
                onChange={(e) => setZoneFee(Number(e.target.value) || 0)}
                min={0}
                step={0.5}
              />
            </div>
            <div className="onboarding-field">
              <label>Koordinaten (JSON Array von [lat, lng])</label>
              <textarea
                className="fb-input"
                rows={6}
                value={zoneCoordinatesInput}
                onChange={(e) => setZoneCoordinatesInput(e.target.value)}
              />
              <p className="onboarding-hint">
                Tipp: Mindestens drei Punkte für ein Polygon angeben.
              </p>
            </div>

            <div className="onboarding-actions">
              <button
                className="fb-button primary"
                onClick={saveZone}
                disabled={savingZone || zonesLoading}
              >
                Lieferzone speichern & weiter
              </button>
              <button
                className="fb-button ghost"
                onClick={skipDeliveryStep || undefined}
                disabled={!canSkipDelivery}
              >
                Schritt überspringen{" "}
                {canSkipDelivery
                  ? ""
                  : "(erst eine Zone speichern oder vorhandene nutzen)"}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="onboarding-summary">
            <h2>Fertig!</h2>
            <p>
              Das Basis-Setup ist abgeschlossen. Du kannst jederzeit weitere
              Einstellungen im Tab „Einstellungen“ anpassen.
            </p>
            <ul>
              <li>Öffnungszeiten gespeichert</li>
              <li>Mindestens eine Lieferzone angelegt (oder übersprungen)</li>
            </ul>
            <div className="onboarding-actions">
              <button
                className="fb-button primary"
                onClick={completeOnboarding}
              >
                Zum Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
