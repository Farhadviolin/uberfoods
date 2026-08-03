import { lazy, Suspense } from "react";
import { FeatureNotAvailable } from "../common/FeatureNotAvailable";

// Lazy load heavy components for better performance
const Dashboard = lazy(() =>
  import("../Dashboard/Dashboard").then((m) => ({ default: m.Dashboard })),
);
const OrderList = lazy(() =>
  import("../Orders/OrderList").then((m) => ({ default: m.OrderList })),
);
const KitchenDisplay = lazy(() =>
  import("../Kitchen/KitchenDisplay").then((m) => ({
    default: m.KitchenDisplay,
  })),
);
const MenuManagement = lazy(() =>
  import("../Menu/MenuManagement").then((m) => ({ default: m.MenuManagement })),
);
const MealPlannerManagement = lazy(() =>
  import("../MealPlannerManagement").then((m) => ({
    default: m.MealPlannerManagement,
  })),
);
const AdvancedAnalytics = lazy(() =>
  import("../Analytics/AdvancedAnalytics").then((m) => ({
    default: m.AdvancedAnalytics,
  })),
);
const AdvancedReporting = lazy(() =>
  import("../Reporting/AdvancedReporting").then((m) => ({
    default: m.AdvancedReporting,
  })),
);
const MultiLocationManagement = lazy(() =>
  import("../MultiLocation/MultiLocationManagement").then((m) => ({
    default: m.MultiLocationManagement,
  })),
);
const Profile = lazy(() =>
  import("../Profile/Profile").then((m) => ({ default: m.Profile })),
);
const Chat = lazy(() =>
  import("../Chat/Chat").then((m) => ({ default: m.Chat })),
);
const Settings = lazy(() =>
  import("../Settings/Settings").then((m) => ({ default: m.Settings })),
);

// Loading fallback component
const LoadingFallback = () => (
  <div className="loading" style={{ padding: "2rem", textAlign: "center" }}>
    <div>Lädt...</div>
  </div>
);

interface MainContentProps {
  activeTab: string;
}

export const MainContent = ({ activeTab }: MainContentProps) => {
  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard />;
      case "orders":
        return <OrderList />;
      case "kitchen":
        return <KitchenDisplay />;
      case "menu":
        return <MenuManagement />;
      case "meal-planner":
        return <MealPlannerManagement />;
      case "reviews":
        return <FeatureNotAvailable feature="Bewertungen" />;
      case "promotions":
        return <FeatureNotAvailable feature="Aktionen" />;
      case "support":
        return <FeatureNotAvailable feature="Support" />;
      case "suppliers":
        return <FeatureNotAvailable feature="Lieferanten" />;
      case "finance":
        return <FeatureNotAvailable feature="Finanzen" />;
      case "accounting":
        return <FeatureNotAvailable feature="Buchhaltung (E/A)" />;
      case "analytics":
        return <AdvancedAnalytics />;
      case "reporting":
        return <AdvancedReporting />;
      case "monitoring":
        return <FeatureNotAvailable feature="Monitoring" />;
      case "inventory":
        return <FeatureNotAvailable feature="Inventar" />;
      case "staff":
        return <FeatureNotAvailable feature="Mitarbeiter" />;
      case "staff-scheduling":
        return <FeatureNotAvailable feature="Schichtplanung" />;
      case "marketing":
        return <FeatureNotAvailable feature="Marketing" />;
      case "tables":
        return <FeatureNotAvailable feature="Tische" />;
      case "locations":
        return <MultiLocationManagement />;
      case "profile":
        return <Profile />;
      case "chat":
        return <Chat />;
      case "settings":
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return <Suspense fallback={<LoadingFallback />}>{renderContent()}</Suspense>;
};
