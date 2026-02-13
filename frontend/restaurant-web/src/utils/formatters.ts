import { format, formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
};

export const formatDate = (date: string | Date): string => {
  return format(new Date(date), "dd.MM.yyyy", { locale: de });
};

export const formatDateTime = (date: string | Date): string => {
  return format(new Date(date), "dd.MM.yyyy HH:mm", { locale: de });
};

export const formatTime = (date: string | Date): string => {
  return format(new Date(date), "HH:mm", { locale: de });
};

export const formatRelativeTime = (date: string | Date): string => {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: de });
};

export const formatOrderStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    PENDING: "Ausstehend",
    CONFIRMED: "Bestätigt",
    PREPARING: "In Zubereitung",
    READY: "Fertig",
    ACCEPTED: "Zugewiesen",
    PICKED_UP: "Abgeholt",
    IN_TRANSIT: "Unterwegs",
    DELIVERED: "Geliefert",
    CANCELLED: "Storniert",
  };
  return statusMap[status] || status;
};
