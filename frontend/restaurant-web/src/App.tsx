import { useEffect, useMemo, useState, useCallback } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ToastProvider, useToast } from "./contexts/ToastContext";
import {
  registerGlobalToastFunction,
  unregisterGlobalToastFunction,
} from "./utils/api";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { MainContent } from "./components/MainContent/MainContent";
import { ChangePassword } from "./components/ChangePassword/ChangePassword";
import { OfflineBanner } from "./components/common/OfflineBanner";
import { useWebSocket } from "./hooks/useWebSocket";
import { useOrderNotifications } from "./hooks/useOrderNotifications";
import { OnboardingWizard } from "./components/Onboarding/OnboardingWizard";
import "./App.css";

type RestaurantOrderUpdate = {
  id: string;
  status?: string;
};

// Component to register global toast function
function GlobalToastRegistrar({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();

  useEffect(() => {
    registerGlobalToastFunction(showToast);
    return () => {
      unregisterGlobalToastFunction();
    };
  }, [showToast]);

  return <>{children}</>;
}

function AppContent() {
  const { restaurantId, mustChangePassword } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [onboardingDone, setOnboardingDone] = useState(false);

  const onboardingKey = useMemo(
    () => (restaurantId ? `restaurant_onboarding_done_${restaurantId}` : ""),
    [restaurantId],
  );

  useEffect(() => {
    if (!onboardingKey) return;
    const stored = localStorage.getItem(onboardingKey);
    setOnboardingDone(stored === "true");
  }, [onboardingKey]);

  const { newOrdersCount, handleNewOrder } = useOrderNotifications({
    restaurantId,
    activeTab,
  });

  const handleOrderUpdate = useCallback((_order: RestaurantOrderUpdate) => {
    // Order wurde aktualisiert
  }, []);

  useWebSocket({
    restaurantId,
    onNewOrder: handleNewOrder,
    onOrderUpdate: handleOrderUpdate,
  });

  // Zeige Passwort-Änderung, wenn erforderlich
  if (mustChangePassword) {
    return <ChangePassword />;
  }

  // Onboarding vor dem eigentlichen UI anzeigen
  if (!onboardingDone) {
    return (
      <OnboardingWizard
        onComplete={() => {
          if (onboardingKey) {
            localStorage.setItem(onboardingKey, "true");
          }
          setOnboardingDone(true);
        }}
      />
    );
  }

  return (
    <div className="app">
      <a href="#main-content" className="skip-to-main">
        Zum Hauptinhalt springen
      </a>
      <OfflineBanner />
      <Header
        newOrdersCount={newOrdersCount}
        onNotificationClick={() => setActiveTab("orders")}
      />
      <div className="app-content">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <main id="main-content" className="app-main" role="main" tabIndex={-1}>
          <MainContent activeTab={activeTab} />
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <GlobalToastRegistrar>
          <AppContent />
        </GlobalToastRegistrar>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
