import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import "./ChangePassword.css";

export function ChangePassword() {
  const { changePassword } = useAuth();
  const { showToast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    if (password.length < 8) {
      errors.push("Mindestens 8 Zeichen");
    }
    if (!/[A-Z]/.test(password)) {
      errors.push("Mindestens ein Großbuchstabe (A-Z)");
    }
    if (!/[a-z]/.test(password)) {
      errors.push("Mindestens ein Kleinbuchstabe (a-z)");
    }
    if (!/[0-9]/.test(password)) {
      errors.push("Mindestens eine Zahl (0-9)");
    }
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validierung
    const validationErrors: { [key: string]: string } = {};

    if (!currentPassword) {
      validationErrors.currentPassword = "Aktuelles Passwort ist erforderlich";
    }

    if (!newPassword) {
      validationErrors.newPassword = "Neues Passwort ist erforderlich";
    } else {
      const passwordErrors = validatePassword(newPassword);
      if (passwordErrors.length > 0) {
        validationErrors.newPassword = passwordErrors.join(", ");
      }
    }

    if (!confirmPassword) {
      validationErrors.confirmPassword =
        "Passwort-Bestätigung ist erforderlich";
    } else if (newPassword !== confirmPassword) {
      validationErrors.confirmPassword = "Passwörter stimmen nicht überein";
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      showToast("Passwort erfolgreich geändert!", "success");
      // Formular zurücksetzen
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      showToast(error.message || "Änderung fehlgeschlagen", "error");
      if (
        error.message?.includes("Aktuelles Passwort") ||
        error.message?.includes("current password")
      ) {
        // Generische Fehlermeldung ohne hartcodierte Werte
        setErrors({ currentPassword: "" });
      }
    } finally {
      setLoading(false);
    }
  };

  const passwordRequirements = [
    "Mindestens 8 Zeichen",
    "Mindestens ein Großbuchstabe (A-Z)",
    "Mindestens ein Kleinbuchstabe (a-z)",
    "Mindestens eine Zahl (0-9)",
  ];

  return (
    <div className="change-password-overlay">
      <div className="change-password-modal">
        <div className="change-password-header">
          <h2>Passwort ändern erforderlich</h2>
          <p>
            Aus Sicherheitsgründen müssen Sie Ihr Passwort beim ersten Login
            ändern.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="change-password-form">
          <div className="form-group">
            <label>Aktuelles Passwort</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={`fb-input ${errors.currentPassword ? "error" : ""}`}
              placeholder="Aktuelles Passwort"
              required
              disabled={loading}
            />
            {errors.currentPassword && (
              <span className="error-message">{errors.currentPassword}</span>
            )}
          </div>

          <div className="form-group">
            <label>Neues Passwort</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={`fb-input ${errors.newPassword ? "error" : ""}`}
              placeholder="Neues Passwort"
              required
              disabled={loading}
            />
            {errors.newPassword && (
              <span className="error-message">{errors.newPassword}</span>
            )}
            <div className="password-requirements">
              <p>Passwort-Anforderungen:</p>
              <ul>
                {passwordRequirements.map((req, index) => (
                  <li key={index}>{req}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="form-group">
            <label>Passwort bestätigen</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`fb-input ${errors.confirmPassword ? "error" : ""}`}
              placeholder="Passwort bestätigen"
              required
              disabled={loading}
            />
            {errors.confirmPassword && (
              <span className="error-message">{errors.confirmPassword}</span>
            )}
          </div>

          <button
            type="submit"
            className="fb-button"
            disabled={loading}
            style={{ width: "100%", marginTop: "16px" }}
          >
            {loading ? "Wird geändert..." : "Passwort ändern"}
          </button>
        </form>
      </div>
    </div>
  );
}
