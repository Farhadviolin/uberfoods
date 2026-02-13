import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import "./Login.css";

export function Login() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      showToast("Bitte füllen Sie alle Felder aus", "error");
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      showToast("Erfolgreich eingeloggt!", "success");
    } catch (error: any) {
      showToast(error.message || "Login fehlgeschlagen", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Restaurant Login</h1>
          <p>Melden Sie sich mit Ihren Zugangsdaten an</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>E-Mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="fb-input"
              placeholder="restaurant@example.com"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Passwort</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="fb-input"
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="fb-button"
            disabled={loading}
            style={{ width: "100%", marginTop: "16px" }}
          >
            {loading ? "Wird geladen..." : "Anmelden"}
          </button>
        </form>

        <div className="login-footer">
          <p>
            Haben Sie Ihre Zugangsdaten vergessen? Kontaktieren Sie den
            Administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
