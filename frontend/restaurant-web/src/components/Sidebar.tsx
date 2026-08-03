import "./Sidebar.css";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "orders", label: "Bestellungen", icon: "📦" },
    { id: "kitchen", label: "Küche (KDS)", icon: "👨‍🍳" },
    { id: "menu", label: "Menü", icon: "🍕" },
    { id: "meal-planner", label: "Meal Planner", icon: "🥗" },
    {
      id: "reviews",
      label: "Bewertungen",
      icon: "⭐",
      available: false,
    },
    { id: "promotions", label: "Aktionen", icon: "🎁", available: false },
    { id: "support", label: "Support", icon: "🎧", available: false },
    {
      id: "suppliers",
      label: "Lieferanten",
      icon: "🚚",
      available: false,
    },
    { id: "finance", label: "Finanzen", icon: "💰", available: false },
    {
      id: "accounting",
      label: "Buchhaltung (E/A)",
      icon: "📊",
      available: false,
    },
    { id: "analytics", label: "Analytics", icon: "📊" },
    { id: "reporting", label: "Berichte", icon: "📈" },
    {
      id: "monitoring",
      label: "Monitoring",
      icon: "📊",
      available: false,
    },
    { id: "inventory", label: "Inventar", icon: "📦", available: false },
    { id: "staff", label: "Mitarbeiter", icon: "👥", available: false },
    {
      id: "staff-scheduling",
      label: "Schichtplanung",
      icon: "📅",
      available: false,
    },
    { id: "marketing", label: "Marketing", icon: "📢", available: false },
    { id: "tables", label: "Tische", icon: "🪑", available: false },
    { id: "locations", label: "Standorte", icon: "📍" },
    { id: "profile", label: "Profil", icon: "🏪" },
    { id: "chat", label: "Chat", icon: "💬" },
    { id: "settings", label: "Einstellungen", icon: "⚙️" },
  ];

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`sidebar-item ${activeTab === item.id ? "active" : ""}`}
            disabled={item.available === false}
            title={item.available === false ? "Noch nicht verfügbar" : undefined}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
            {item.available === false && (
              <span className="sidebar-status">Nicht verfügbar</span>
            )}
          </button>
        ))}
      </nav>
    </aside>
  );
}
