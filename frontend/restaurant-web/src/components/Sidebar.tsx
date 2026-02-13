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
    { id: "reviews", label: "Bewertungen", icon: "⭐" },
    { id: "promotions", label: "Aktionen", icon: "🎁" },
    { id: "support", label: "Support", icon: "🎧" },
    { id: "suppliers", label: "Lieferanten", icon: "🚚" },
    { id: "finance", label: "Finanzen", icon: "💰" },
    { id: "accounting", label: "Buchhaltung (E/A)", icon: "📊" },
    { id: "analytics", label: "Analytics", icon: "📊" },
    { id: "reporting", label: "Berichte", icon: "📈" },
    { id: "monitoring", label: "Monitoring", icon: "📊" },
    { id: "inventory", label: "Inventar", icon: "📦" },
    { id: "staff", label: "Mitarbeiter", icon: "👥" },
    { id: "staff-scheduling", label: "Schichtplanung", icon: "📅" },
    { id: "marketing", label: "Marketing", icon: "📢" },
    { id: "tables", label: "Tische", icon: "🪑" },
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
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
