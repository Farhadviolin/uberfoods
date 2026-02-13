import { useState, useCallback, useMemo } from "react";
import { useToast } from "../contexts/ToastContext";

interface UseOrderNotificationsProps {
  restaurantId: string | null;
  activeTab: string;
}

export const useOrderNotifications = ({
  restaurantId,
  activeTab,
}: UseOrderNotificationsProps) => {
  const { showToast } = useToast();
  const [newOrdersCount, setNewOrdersCount] = useState(0);

  const handleNewOrder = useCallback(
    (order: any) => {
      if (
        order.restaurantId === restaurantId ||
        order.restaurant?.id === restaurantId
      ) {
        setNewOrdersCount((prev) => prev + 1);
        showToast("Neue Bestellung eingegangen!", "info");

        // Sound-Benachrichtigung (optional)
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Neue Bestellung", {
            body: `Bestellung #${order.id.slice(0, 8)} von ${order.customer?.name || "Kunde"}`,
            icon: "/vite.svg",
          });
        }
      }
    },
    [restaurantId, showToast],
  );

  // Reset new orders count when viewing orders tab
  useMemo(() => {
    if (activeTab === "orders") {
      setNewOrdersCount(0);
    }
  }, [activeTab]);

  return {
    newOrdersCount,
    handleNewOrder,
  };
};
