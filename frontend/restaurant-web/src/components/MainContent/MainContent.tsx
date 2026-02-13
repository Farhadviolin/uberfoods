import { lazy, Suspense } from "react";

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
const Reviews = lazy(() =>
  import("../Reviews/Reviews").then((m) => ({ default: m.Reviews })),
);
const Promotions = lazy(() =>
  import("../Promotions/Promotions").then((m) => ({ default: m.Promotions })),
);
const CustomerSupport = lazy(() =>
  import("../CustomerSupport").then((m) => ({ default: m.CustomerSupport })),
);
const SupplierManagement = lazy(() =>
  import("../Supplier/SupplierManagement").then((m) => ({
    default: m.SupplierManagement,
  })),
);
const Finance = lazy(() =>
  import("../Finance/Finance").then((m) => ({ default: m.Finance })),
);
const EARechnung = lazy(() =>
  import("../Accounting/EARechnung").then((m) => ({ default: m.EARechnung })),
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
const UnifiedMonitoring = lazy(() =>
  import("../UnifiedMonitoring").then((m) => ({
    default: m.UnifiedMonitoring,
  })),
);
const Inventory = lazy(() =>
  import("../Inventory/Inventory").then((m) => ({ default: m.Inventory })),
);
const StaffManagement = lazy(() =>
  import("../Staff/Staff").then((m) => ({ default: m.StaffManagement })),
);
const StaffScheduling = lazy(() =>
  import("../Staff/StaffScheduling").then((m) => ({
    default: m.StaffScheduling,
  })),
);
const CampaignManager = lazy(() =>
  import("../Marketing/CampaignManager").then((m) => ({
    default: m.CampaignManager,
  })),
);
const TableManagement = lazy(() =>
  import("../TableManagement/TableManagement").then((m) => ({
    default: m.TableManagement,
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
        return <Reviews />;
      case "promotions":
        return <Promotions />;
      case "support":
        return <CustomerSupport />;
      case "suppliers":
        return <SupplierManagement />;
      case "finance":
        return <Finance />;
      case "accounting":
        return <EARechnung />;
      case "analytics":
        return <AdvancedAnalytics />;
      case "reporting":
        return <AdvancedReporting />;
      case "monitoring":
        return <UnifiedMonitoring />;
      case "inventory":
        return <Inventory />;
      case "staff":
        return <StaffManagement />;
      case "staff-scheduling":
        return <StaffScheduling />;
      case "marketing":
        return <CampaignManager />;
      case "tables":
        return <TableManagement />;
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
