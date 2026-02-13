import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            padding: "var(--fb-space-8)",
            textAlign: "center",
            color: "var(--fb-text-primary)",
          }}
        >
          <h2
            style={{
              color: "var(--fb-error)",
              marginBottom: "var(--fb-space-4)",
            }}
          >
            ⚠️ Ein Fehler ist aufgetreten
          </h2>
          <p
            style={{
              marginBottom: "var(--fb-space-4)",
              color: "var(--fb-text-secondary)",
            }}
          >
            Entschuldigung, etwas ist schiefgelaufen. Bitte laden Sie die Seite
            neu.
          </p>
          {this.state.error && (
            <details
              style={{
                marginTop: "var(--fb-space-4)",
                padding: "var(--fb-space-4)",
                backgroundColor: "var(--fb-bg-secondary)",
                borderRadius: "var(--fb-radius-base)",
                textAlign: "left",
                fontSize: "var(--fb-font-size-sm)",
              }}
            >
              <summary
                style={{ cursor: "pointer", marginBottom: "var(--fb-space-2)" }}
              >
                Fehlerdetails anzeigen
              </summary>
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  color: "var(--fb-text-secondary)",
                }}
              >
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
          <button
            onClick={() => window.location.reload()}
            className="fb-button"
            style={{ marginTop: "var(--fb-space-4)" }}
          >
            Seite neu laden
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
