import { useMemo } from "react";
import { Order } from "../../hooks/useOrders";
import { formatCurrency } from "../../utils/formatters";
import "./TopDishes.css";

interface TopDishesProps {
  orders: Order[];
}

export function TopDishes({ orders }: TopDishesProps) {
  const topDishes = useMemo(() => {
    const dishRevenue: {
      [key: string]: { name: string; revenue: number; count: number };
    } = {};

    orders
      .filter((o) => o.status === "DELIVERED")
      .forEach((order) => {
        order.items.forEach((item) => {
          const dishId = item.dish.id;
          if (!dishRevenue[dishId]) {
            dishRevenue[dishId] = {
              name: item.dish.name,
              revenue: 0,
              count: 0,
            };
          }
          dishRevenue[dishId].revenue += item.price * item.quantity;
          dishRevenue[dishId].count += item.quantity;
        });
      });

    return Object.values(dishRevenue)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [orders]);

  if (topDishes.length === 0) {
    return null;
  }

  return (
    <div className="top-dishes-container">
      <h3
        style={{
          marginBottom: "20px",
          fontSize: "var(--fb-font-size-lg)",
          fontWeight: 600,
        }}
      >
        Top-Gerichte (Umsatz)
      </h3>
      <div className="top-dishes-list">
        {topDishes.map((dish, idx) => (
          <div key={idx} className="top-dish-item">
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  backgroundColor: "var(--fb-primary)",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                  fontSize: "14px",
                }}
              >
                {idx + 1}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: "15px" }}>
                  {dish.name}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--fb-text-secondary)",
                  }}
                >
                  {dish.count}x verkauft
                </div>
              </div>
            </div>
            <div
              style={{
                fontWeight: 600,
                fontSize: "16px",
                color: "var(--fb-success)",
              }}
            >
              {formatCurrency(dish.revenue)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
