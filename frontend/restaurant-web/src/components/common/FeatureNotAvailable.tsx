interface FeatureNotAvailableProps {
  feature: string;
  reason?: string;
}

export function FeatureNotAvailable({
  feature,
  reason = "Für diese lokale Restaurant-Runtime ist noch kein Backend-Vertrag registriert.",
}: FeatureNotAvailableProps) {
  return (
    <section
      role="status"
      aria-label={`${feature} nicht verfügbar`}
      style={{
        maxWidth: "720px",
        margin: "48px auto",
        padding: "32px",
        border: "1px solid var(--fb-border-primary)",
        borderRadius: "var(--fb-radius-lg)",
        background: "var(--fb-bg-primary)",
        textAlign: "center",
      }}
    >
      <h1>{feature}</h1>
      <p style={{ color: "var(--fb-text-secondary)" }}>
        Noch nicht verfügbar
      </p>
      <p style={{ color: "var(--fb-text-secondary)" }}>{reason}</p>
    </section>
  );
}
